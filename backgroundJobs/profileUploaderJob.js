import {
    deleteMessageFromJobQueue, getMessagesFromCompanyQueue,
    getMessagesFromJobQueue
} from "../common/queue.js";
import getBrowser from "../common/getBrowser.js";
import jobProfileUploader from "../jobProfileUploader/jobProfileUploader.js";
import logger from "../common/logger.js";
import Timer from "../common/timer.js";

 async function profileUploaderJob() {
    const browser = await getBrowser();
    const page = await browser.newPage();
    const timer = new Timer();
    while (1) {
        logger.info('waiting for events');
        const events = await getMessagesFromJobQueue();
        logger.info('got', events.length, 'events - processing');

        for (let i = 0; i < events.length; i++ ) {
            const event = events[i];
            const {Body, ReceiptHandle, MessageId} = event;
            const {url} = JSON.parse(Body);

            timer.startTimer();
            const isSuccess = await jobProfileUploader(page, url);
            timer.stopTimer();
            if (isSuccess) {
                await deleteMessageFromJobQueue(ReceiptHandle);
            }
            logger.debug(`Average processing time so far: ${timer.getAverageTime()}`);
        }
    }
}
await profileUploaderJob();
