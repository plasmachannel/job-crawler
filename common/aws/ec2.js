import {
    CreateTagsCommand,
    DescribeInstancesCommand,
    RunInstancesCommand,
    TerminateInstancesCommand,
    waitUntilInstanceStatusOk
} from "@aws-sdk/client-ec2";
import {amiId, ec2Client, jobInfoByType, keyName, securityGroupId} from "./const.js";



export async function terminateInstance(instanceId) {
    const params = {
        InstanceIds: [instanceId]
    };

    try {
        const data = await ec2Client.send(new TerminateInstancesCommand(params));
        console.log(`Instance ${instanceId} termination initiated. Current state:`, data.TerminatingInstances[0].CurrentState.Name);
    } catch (error) {
        console.error("Error terminating instance:", error);
    }
}

export const createInstanceAndWaitForInitialization = async (type) => {
    const {iamProfileName, instancePrefix, imageName} = jobInfoByType[type];

    try {
        // Create instance using the AMI ID and Security Group ID
        const runInstancesCommand = new RunInstancesCommand({
            ImageId: amiId,
            InstanceType: 't2.micro',  // Adjust the instance type as needed
            KeyName: keyName,
            MinCount: 1,
            MaxCount: 1,
            SecurityGroupIds: [securityGroupId],  // Assign the security group
            IamInstanceProfile: {Name: iamProfileName},  // Attach the IAM role using the instance profile
        });

        const runResponse = await ec2Client.send(runInstancesCommand);
        const instanceId = runResponse.Instances[0].InstanceId;

        console.log(`Instance created with ID: ${instanceId}`);

        // Add a name tag to the instance using first 5 characters of the instance ID
        const instanceName = `${instancePrefix}-${instanceId.slice(3, 8)}`;
        const createTagsCommand = new CreateTagsCommand({
            Resources: [instanceId],
            Tags: [{Key: 'Name', Value: instanceName}],
        });
        await ec2Client.send(createTagsCommand);
        console.log(`Assigned name "${instanceName}" to instance ${instanceId}`);

        // Wait for instance status checks to pass (instance is fully initialized)
        await waitUntilInstanceStatusOk({client: ec2Client, maxWaitTime: 600}, {InstanceIds: [instanceId]});
        console.log("Instance has passed status checks and is fully initialized.");

        // Get the instance's public IP address
        const describeParams = {InstanceIds: [instanceId]};
        const describeCommand = new DescribeInstancesCommand(describeParams);
        const describeResponse = await ec2Client.send(describeCommand);
        const publicIpAddress = describeResponse.Reservations[0].Instances[0].PublicIpAddress;

        console.log(`Public IP address: ${publicIpAddress}`);

        // Return the instance ID and IP
        return {instanceId, publicIpAddress};

    } catch (error) {
        console.error("Error creating instance or retrieving IP:", error);
        throw error;
    }
};