import {
    SQSClient,
    SendMessageBatchCommand,
    ReceiveMessageCommand,
    DeleteMessageCommand,
    SendMessageCommand
} from "@aws-sdk/client-sqs";
import logger from "./logger.js";
import dotenv from "dotenv";

dotenv.config();
const sqsClient = new SQSClient({ region: process.env.REGION });

export async function sendAllToCompanyQueue(urls) {
    await batchSendMessagesToSQS(urls, process.env.COMPANY_PROCESSING_QUEUE);
}

export async function getFailureEvents() {
    const params = {
        QueueUrl: process.env.FAILURE_EVENT_QUEUE,
        MaxNumberOfMessages: 2,
        VisibilityTimeout: 10,
        WaitTimeSeconds: 20,
    }
    return getMessagesFromQueue(params);
}

export async function getMessagesFromJobQueue() {
    const params = {
        QueueUrl: process.env.JOB_PROCESSING_QUEUE,
        MaxNumberOfMessages: 10,  // Maximum number of messages (10 is the limit for a single receive request)
        VisibilityTimeout: 180,    // Time to process the message before it becomes visible again
        WaitTimeSeconds: 2      // Enable long polling for up to 10 seconds
    };
    return getMessagesFromQueue(params);
}
export async function getMessagesFromCompanyQueue() {
    const params = {
        QueueUrl: process.env.COMPANY_PROCESSING_QUEUE,
        MaxNumberOfMessages: 10,
        VisibilityTimeout: 180,
        WaitTimeSeconds: 2
    }
    return getMessagesFromQueue(params);
}

async function getMessagesFromQueue(params) {
    try {
        // Receive multiple messages from the queue
        const data = await sqsClient.send(new ReceiveMessageCommand(params));

        if (data.Messages && data.Messages.length > 0) {
            return data.Messages;
        } else {
            return [];
        }
    } catch (err) {
        logger.error("Error receiving messages:", err);
        return [];
    }
}


export async function sendAllToJobQueue(urls) {
    await batchSendMessagesToSQS(urls, process.env.JOB_PROCESSING_QUEUE);
}

export async function sendFailureEvent(instanceId, instanceType, eventType) {
    const queueUrl = process.env.FAILURE_EVENT_QUEUE;

    const messageBody = JSON.stringify({
        instanceId,
        eventType,
        instanceType,
        timestamp: new Date().toISOString()
    });

    // Set up parameters for the SQS message
    const params = {
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        MessageAttributes: {
            "InstanceId": {
                DataType: "String",
                StringValue: instanceId
            },
            "EventType": {
                DataType: "String",
                StringValue: eventType
            },
            "InstanceType": {
                DataType: "String",
                StringValue: instanceType
            }
        }
    };

    try {
        const data = await sqsClient.send(new SendMessageCommand(params));
        console.log("Failure event sent successfully:", data.MessageId);
    } catch (error) {
        console.error("Error sending failure event:", error);
    }
}

async function deleteMessageFromQueue(deleteParams) {
    try {
        await sqsClient.send(new DeleteMessageCommand(deleteParams));
        logger.log("Message deleted successfully.");
    } catch (err) {
        logger.warn("Error deleting message:", err);
    }
}

export default async function  deleteFailureEvent(receiptHandle) {
    const deleteParams = {
        QueueUrl: process.env.FAILURE_EVENT_QUEUE,
        ReceiptHandle: receiptHandle
    };
    await deleteMessageFromQueue(deleteParams);
}

export async function deleteMessageFromCompanyQueue(receiptHandle) {
    const deleteParams = {
        QueueUrl: process.env.COMPANY_PROCESSING_QUEUE,
        ReceiptHandle: receiptHandle
    };
    await deleteMessageFromQueue(deleteParams);
}

export async function deleteMessageFromJobQueue(receiptHandle) {
    const deleteParams = {
        QueueUrl: process.env.JOB_PROCESSING_QUEUE,
        ReceiptHandle: receiptHandle
    };
    await deleteMessageFromQueue(deleteParams);
}



async function batchSendMessagesToSQS(urls, queueUrl) {
    const BATCH_SIZE = 10;

    // Break messages into chunks of 10
    const batches = [];
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
        batches.push(urls.slice(i, i + BATCH_SIZE));
    }
    // Process each batch and send them to SQS
    for (const batch of batches) {
        const timestamp = new Date().toISOString();
        const entries = batch.map((url, index) => ({
            Id: index.toString(), // Unique ID within the batch
            MessageBody: JSON.stringify({
                ...url,
                timestamp
            })
        }));

        const params = {
            QueueUrl: queueUrl,
            Entries: entries
        };

        try {
            // Use SendMessageBatchCommand to send the batch
            const command = new SendMessageBatchCommand(params);
            const result = await sqsClient.send(command);
            logger.verbose('Successfully sent batch:', result);
        } catch (error) {
            logger.warn('Error sending batch:', error);
        }
    }
}