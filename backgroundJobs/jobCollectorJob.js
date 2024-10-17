import {deleteMessageFromCompanyQueue, getMessagesFromCompanyQueue} from "../common/queue.js";
import jobCrawler from "../jobCollector/jobCrawler.js";
import getBrowser from "../common/getBrowser.js";
import logger from "../common/logger.js";
import Timer from "../common/timer.js";

async function jobCollector() {
    const browser = await getBrowser();
    const page = await browser.newPage();
    const timer = new Timer();
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
            }
            logger.debug(`Average processing time so far: ${timer.getAverageTime()}`);
        }
    }
}
await jobCollector()
