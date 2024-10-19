import {deleteMessageFromCompanyQueue, getMessagesFromCompanyQueue} from "../common/queue.js";
import jobCrawler from "../jobCollector/jobCrawler.js";
import getBrowser from "../common/getBrowser.js";
import logger from "../common/logger.js";
import Timer from "../common/timer.js";

async function jobCollector() {
    const browser = await getBrowser();
    const page = await browser.newPage();
    let consecutiveErrors = 0;
    const timer = new Timer();
    const maxFailures = Number(process.env.MAX_CONSECUTIVE_FAILURES);
    const backoffSeconds = Number(process.env.FAILURE_WAIT_TIME_SECONDS);
    const backoffMilliseconds = backoffSeconds * 1000;
    while (1) {
        logger.info('waiting for events');
        const events = await getMessagesFromCompanyQueue();
        logger.info('got', events.length, 'events - processing');
        for (let i = 0; i < events.length; i++ ) {
            const event = events[i];
            const {Body, ReceiptHandle, MessageId} = event;
            const {url} = JSON.parse(Body);

            timer.startTimer();
            const isSuccess = await jobCrawler(page, url, true);
            timer.stopTimer();
            if (isSuccess) {
                await deleteMessageFromCompanyQueue(ReceiptHandle);
                consecutiveErrors = 0;
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
            logger.debug(`Average processing time so far: ${timer.getAverageTime()}`);
        }
    }
}
await jobCollector()
