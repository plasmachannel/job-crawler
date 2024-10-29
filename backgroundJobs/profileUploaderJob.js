import {
    deleteMessageFromJobQueue, getMessagesFromCompanyQueue,
    getMessagesFromJobQueue, sendFailureEvent
} from "../common/queue.js";
import getBrowser from "../common/getBrowser.js";
import jobProfileUploader from "../jobProfileUploader/jobProfileUploader.js";
import logger from "../common/logger.js";
import Timer from "../common/timer.js";
import dotenv from "dotenv";
import {baseUrl, getJobReqId} from "../common/urls.js";
import {getJobReqInfo} from "../common/s3.js";
import getInstanceId from "../common/getInstanceId.js";

dotenv.config();

 async function profileUploaderJob() {
    const browser = await getBrowser();
    const page = await browser.newPage();
    const timer = new Timer();
    let consecutiveErrors = 0;
    const maxFailures = Number(process.env.MAX_CONSECUTIVE_FAILURES);
    const backoffSeconds = Number(process.env.FAILURE_WAIT_TIME_SECONDS);
    const backoffMilliseconds = backoffSeconds * 1000;
    let failureEventSent = false;
    while (1) {
        logger.info('waiting for events');
        const events = await getMessagesFromJobQueue();
        logger.info('got', events.length, 'events - processing');

        for (let i = 0; i < events.length; i++ ) {
            const event = events[i];
            const {Body, ReceiptHandle, MessageId} = event;
            const {url, companyId} = JSON.parse(Body);


            const jobReqId = getJobReqId(companyId, url);
            const jobReqInfo = await getJobReqInfo(jobReqId);
            if (jobReqInfo) {
                logger.info(`${jobReqId} has already been seen`);
                await deleteMessageFromJobQueue(ReceiptHandle);
                continue;
            }

            timer.startTimer();
            const isSuccess = await jobProfileUploader(page, url, companyId);
            timer.stopTimer();
            if (isSuccess) {
                await deleteMessageFromJobQueue(ReceiptHandle);
            } else {
                logger.info({consecutiveErrors, maxFailures});
                consecutiveErrors++;
                if (consecutiveErrors >= maxFailures) {
                    const instanceId = await getInstanceId();
                    if (!instanceId || failureEventSent) {
                        logger.info(`Too many failures in a row, waiting ${backoffSeconds} seconds`)
                        await new Promise(resolve => setTimeout(resolve, backoffMilliseconds));
                        logger.info('Starting back up');
                        consecutiveErrors = 0;
                    } else {
                        await sendFailureEvent(instanceId, 'profile-uploader', 'RESTART');
                        failureEventSent = true;
                    }
                }
            }
            logger.debug(`Average processing time so far: ${timer.getAverageTime()} over ${timer.processCount} jobs`);
        }
    }
}
await profileUploaderJob();
