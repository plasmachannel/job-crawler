import jobProfileUploader from "./jobProfileUploader/jobProfileUploader.js";
import getBrowser from "./common/getBrowser.js";

export const handler = async (event) => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        // Loop through each SQS message in the event

        for (const record of event.Records) {
            // Each record represents one message in the queue
            const messageBody = record.body;

            console.log('Received message:', messageBody);
            const data = JSON.parse(messageBody);

            const {url, timestamp} = data;

            await jobProfileUploader(page, url);
        }


        // Return success after processing
        return {
            statusCode: 200,
            body: JSON.stringify('Messages processed successfully!'),
        };
    } catch (error) {
        console.error('Error processing messages:', error);
        throw new Error('Error processing SQS messages.');
    }
    finally {
        await browser.close();
    }
};
