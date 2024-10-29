import deleteFailureEvent, {getFailureEvents} from "../common/queue.js";
import logger from "../common/logger.js";
import {createInstanceAndWaitForInitialization, terminateInstance} from "../common/aws/ec2.js";


export default async function monitorNodes() {
    while (1) {
        // read from queue
        // parse information from queue
        // terminate the node
        // if needed start the new one
        const events = await getFailureEvents();
        logger.info('got', events.length, 'events - processing');

        for (let i = 0; i < events.length; i++ ) {
            const event = events[i];
            const {Body, ReceiptHandle, MessageId} = event;
            const {instanceId, instanceType, eventType} = JSON.parse(Body);
            console.log({
                instanceId,
                instanceType,
                eventType,
            })
            console.log({instanceId, eventType, instanceType});

            await Promise.all([
                createInstanceAndWaitForInitialization(instanceType),
                terminateInstance(instanceId),
            ])
            await deleteFailureEvent(ReceiptHandle);

        }
    }
}

await monitorNodes();