import { EC2Client, RunInstancesCommand, TerminateInstancesCommand, DescribeInstancesCommand, CreateTagsCommand, waitUntilInstanceStatusOk } from "@aws-sdk/client-ec2";
import { exec } from 'child_process';
import util from 'util';
import { Command } from 'commander';

// Promisify exec to use with async/await
const execPromise = util.promisify(exec);

// Set up the EC2 client
const ec2Client = new EC2Client({ region: 'us-east-2' });

// AMI ID, key pair, security group, and instance name
const amiId = 'ami-06556f127bcadfb6b';  // Your AMI ID
const keyName = 'elastic-search-1-key';  // AWS key pair name
const pemFilePath = './elastic-search-1-key.pem';  // Local path to the PEM file
const securityGroupId = 'sg-0251aa679853915ba';  // Security Group ID for launch-wizard-1

// ProfileUploader and JobCollector configurations
const profileUploaderInfo = {
    iamProfileName: 'JobCollector',
    instancePrefix: 'ProfileUploaderInstance',
    imageName: 'profile-uploader',
};

const jobCollectorInfo = {
    iamProfileName: 'JobCollector',
    instancePrefix: 'JobCollectorInstance',
    imageName: 'job-collector',
};

// Job type mapping
const jobInfoByType = {
    'profile-updater': profileUploaderInfo,
    'job-collector': jobCollectorInfo,
};

// Function to create an EC2 instance and wait for initialization
const createInstanceAndWaitForInitialization = async (type) => {
    const { iamProfileName, instancePrefix, imageName } = jobInfoByType[type];

    try {
        // Create instance using the AMI ID and Security Group ID
        const runInstancesCommand = new RunInstancesCommand({
            ImageId: amiId,
            InstanceType: 't2.micro',  // Adjust the instance type as needed
            KeyName: keyName,
            MinCount: 1,
            MaxCount: 1,
            SecurityGroupIds: [securityGroupId],  // Assign the security group
            IamInstanceProfile: { Name: iamProfileName },  // Attach the IAM role using the instance profile
        });

        const runResponse = await ec2Client.send(runInstancesCommand);
        const instanceId = runResponse.Instances[0].InstanceId;

        console.log(`Instance created with ID: ${instanceId}`);

        // Add a name tag to the instance using first 5 characters of the instance ID
        const instanceName = `${instancePrefix}-${instanceId.slice(3, 8)}`;
        const createTagsCommand = new CreateTagsCommand({
            Resources: [instanceId],
            Tags: [{ Key: 'Name', Value: instanceName }],
        });
        await ec2Client.send(createTagsCommand);
        console.log(`Assigned name "${instanceName}" to instance ${instanceId}`);

        // Wait for instance status checks to pass (instance is fully initialized)
        await waitUntilInstanceStatusOk({ client: ec2Client, maxWaitTime: 600 }, { InstanceIds: [instanceId] });
        console.log("Instance has passed status checks and is fully initialized.");

        // Get the instance's public IP address
        const describeParams = { InstanceIds: [instanceId] };
        const describeCommand = new DescribeInstancesCommand(describeParams);
        const describeResponse = await ec2Client.send(describeCommand);
        const publicIpAddress = describeResponse.Reservations[0].Instances[0].PublicIpAddress;

        console.log(`Public IP address: ${publicIpAddress}`);

        // Return the instance ID and IP
        return { instanceId, publicIpAddress };

    } catch (error) {
        console.error("Error creating instance or retrieving IP:", error);
        throw error;
    }
};

// Function to copy .env file and deploy Docker container
const copyEnvFileAndDeployDocker = async (type, publicIpAddress) => {
    const { imageName } = jobInfoByType[type];
    try {
        // Copy the .env file to the EC2 instance
        const scpCommand = `scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "${pemFilePath}" .env ec2-user@${publicIpAddress}:~/`;

        console.log("Copying .env file to EC2 instance...");
        await execPromise(scpCommand);
        console.log(".env file copied successfully.");

        // Bash script to log in to AWS ECR, pull the Docker image, and run the container
        const bashScript = `
        #!/bin/bash
        aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 015584085679.dkr.ecr.us-east-2.amazonaws.com
        docker pull 015584085679.dkr.ecr.us-east-2.amazonaws.com/job-scraper-puppet/crawler:${imageName}
        docker run -d --restart on-failure --name ${imageName} --env-file ~/.env 015584085679.dkr.ecr.us-east-2.amazonaws.com/job-scraper-puppet/crawler:${imageName}
      `;

        // SSH into the EC2 instance and run the Docker setup script
        const sshCommand = `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "${pemFilePath}" ec2-user@${publicIpAddress} '${bashScript}'`;

        console.log("Running SSH and deploying Docker container...");
        const { stdout, stderr } = await execPromise(sshCommand);

        console.log("SSH Output:", stdout);
        if (stderr) {
            console.error("SSH Error:", stderr);
        }

    } catch (error) {
        console.error("Error copying .env file or deploying Docker container:", error);
    }
};

// Function to create multiple instances in parallel
const createInstances = async (type, count) => {
    const creationPromises = [];
    for (let i = 0; i < count; i++) {
        creationPromises.push(createInstanceAndWaitForInitialization(type));
    }

    const instances = await Promise.all(creationPromises);
    for (const { publicIpAddress } of instances) {
        await copyEnvFileAndDeployDocker(type, publicIpAddress);
    }
};

// Function to terminate instances with a given prefix
const terminateInstancesWithPrefix = async (prefix) => {
    try {
        const describeInstancesCommand = new DescribeInstancesCommand({});
        const describeResponse = await ec2Client.send(describeInstancesCommand);

        const instanceIdsToTerminate = [];
        for (const reservation of describeResponse.Reservations) {
            for (const instance of reservation.Instances) {
                const nameTag = instance.Tags.find(tag => tag.Key === 'Name');
                if (nameTag && nameTag.Value.startsWith(prefix)) {
                    instanceIdsToTerminate.push(instance.InstanceId);
                }
            }
        }

        if (instanceIdsToTerminate.length === 0) {
            console.log(`No instances found with name starting with "${prefix}".`);
            return;
        }

        const terminateCommand = new TerminateInstancesCommand({ InstanceIds: instanceIdsToTerminate });
        const terminateResponse = await ec2Client.send(terminateCommand);

        console.log('Terminated instances:', terminateResponse.TerminatingInstances);
    } catch (error) {
        console.error('Error terminating instances:', error);
    }
};

// Command-line interface using Commander
const program = new Command();

// Add "create" command to create and deploy multiple instances
program
    .command('create <jobType> <count>')
    .description('Create and deploy multiple EC2 instances for ProfileUpdater or JobCollector')
    .action(async (jobType, count) => {
        if (!jobInfoByType[jobType]) {
            console.error(`Unknown job type: ${jobType}. Available options are: ${Object.keys(jobInfoByType).join(', ')}`);
            process.exit(1);
        }

        await createInstances(jobType, parseInt(count, 10));
    });

// Add "terminate" command to terminate instances with a given prefix
program
    .command('terminate <prefix>')
    .description('Terminate EC2 instances whose names start with the given prefix')
    .action(async (prefix) => {
        await terminateInstancesWithPrefix(prefix);
    });

// Parse command-line arguments
program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
