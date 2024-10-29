import {DescribeInstancesCommand, EC2Client, TerminateInstancesCommand} from "@aws-sdk/client-ec2";
import {exec} from 'child_process';
import util from 'util';
import {Command} from 'commander';
import {createInstanceAndWaitForInitialization} from "./common/aws/ec2.js";
import {ec2Client, jobInfoByType, pemFilePath} from "./common/aws/const.js";

// Promisify exec to use with async/await
const execPromise = util.promisify(exec);

// Set up the EC2 client


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
        docker pull 015584085679.dkr.ecr.us-east-2.amazonaws.com/${imageName}:latest
        docker run -d --restart on-failure --name ${imageName} --env-file ~/.env 015584085679.dkr.ecr.us-east-2.amazonaws.com/${imageName}:latest
        
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

    // TODO - promise.all this for faster deploy
    const environmentSetupPromises = [];
    for (const { publicIpAddress } of instances) {
        environmentSetupPromises.push(copyEnvFileAndDeployDocker(type, publicIpAddress))
    }
    await Promise.all(environmentSetupPromises);
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
