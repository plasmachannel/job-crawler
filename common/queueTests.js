// Import the SQS client and required commands from the AWS SDK v3
import {DeleteMessageCommand, ReceiveMessageCommand, SQSClient} from "@aws-sdk/client-sqs";
import {getMessagesFromCompanyQueue} from "./queue.js";


const REGION = "us-east-2"; // Update to your region

const sqsClient = new SQSClient({ region: REGION });

// URL of the SQS queue
const queueUrl = "https://sqs.us-east-2.amazonaws.com/015584085679/company-processing-queue";

// Function to pull and process a message
async function pullAndProcessMessage() {
    const params = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,        // Pull only one message at a time
        VisibilityTimeout: 30,         // Time to process the message before it becomes visible again
        WaitTimeSeconds: 10            // Long polling: wait for up to 10 seconds for a message
    };

    try {
        // Receive a message from SQS
        const data = await sqsClient.send(new ReceiveMessageCommand(params));

        if (data.Messages && data.Messages.length > 0) {
            const message = data.Messages[0];
            const messageBody = message.Body;
            const receiptHandle = message.ReceiptHandle;

            console.log("Received message:", messageBody);

            // Process the message (example: log the message body)
            await processJob(messageBody);

            // Delete the message after successful processing
            await deleteMessage(receiptHandle);
        } else {
            console.log("No messages to process.");
        }
    } catch (err) {
        console.error("Error receiving or processing message:", err);
    }
}

// Function to simulate job processing
async function processJob(messageBody) {
    console.log(`Processing job: ${messageBody}`);
    // Simulate some job (e.g., data processing, API request, etc.)
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate a 2-second job
    console.log(`Job processed.`);
}

// Function to delete a processed message from the SQS queue
async function deleteMessage(receiptHandle) {
    const deleteParams = {
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
    };

    try {
        await sqsClient.send(new DeleteMessageCommand(deleteParams));
        console.log("Message deleted successfully.");
    } catch (err) {
        console.error("Error deleting message:", err);
    }
}


process.env.COMPANY_PROCESSING_QUEUE = 'https://sqs.us-east-2.amazonaws.com/015584085679/company-processing-queue';
// Call the function to pull and process a message
const x = await getMessagesFromCompanyQueue();
console.log(x);
