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
    let consecutiveErrors = 0;
    const maxFailures = Number(process.env.MAX_CONSECUTIVE_FAILURES);
    const backoffSeconds = Number(process.env.FAILURE_WAIT_TIME_SECONDS);
    const backoffMilliseconds = backoffSeconds * 1000;
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
            } else {
                console.log({consecutiveErrors, maxFailures});
                consecutiveErrors++;
                if (consecutiveErrors >= maxFailures) {
                    console.log(`Too many failures in a row, waiting ${backoffSeconds} seconds`)
                    await new Promise(resolve => setTimeout(resolve, backoffMilliseconds));
                    console.info('Starting back up');
                    consecutiveErrors = 0;
                }
            }
            logger.debug(`Average processing time so far: ${timer.getAverageTime()} over ${timer.processCount} jobs`);
        }
    }
}
await profileUploaderJob();
