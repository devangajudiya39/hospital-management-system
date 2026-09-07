const { publishAlertToRedis } = require('../alertModule/alertRedisBridge');

const startAlertWorker = async (channel) => {
    const queue = 'alert-events';

    // Ensure channel prefetch is 1 so worker processes one by one
    channel.prefetch(1);

    try {
        await channel.consume(queue, async (msg) => {
            if (msg !== null) {
                let payload;
                const jobId = msg.properties.messageId || 'unknown-job';

                try {
                    payload = JSON.parse(msg.content.toString());
                } catch (parseError) {
                    console.error(`[AlertWorker] Failed to parse message body on ${queue}. Rejecting to DLQ.`);
                    channel.nack(msg, false, false);
                    return;
                }

                console.log(`[AlertWorker] Received alert job ${jobId}`);

                try {
                    // Publish to Redis for cross-container IPC
                    // The backend process subscribes to this channel and forwards to SSE clients
                    console.log(`[AlertWorker] Publishing alert ${payload.id} to Redis`);
                    const published = await publishAlertToRedis(payload);

                    if (published) {
                        // Acknowledge the message since Redis publish was successful
                        channel.ack(msg);
                        console.log(`[AlertWorker] Alert job completed ${jobId}`);
                    } else {
                        throw new Error('Redis publish failed');
                    }
                } catch (error) {
                    console.error(`[AlertWorker] Alert job failed ${jobId}:`, error.message);

                    // Check retry count
                    let retryCount = 0;
                    if (msg.properties.headers && msg.properties.headers['x-retry-count']) {
                        retryCount = msg.properties.headers['x-retry-count'];
                    }

                    if (retryCount < 3) {
                        console.log(`[AlertWorker] Retrying ${jobId} (Attempt ${retryCount + 1} failed)`);
                        
                        // Republish with incremented retry count
                        channel.sendToQueue(queue, msg.content, {
                            ...msg.properties,
                            headers: {
                                ...msg.properties.headers,
                                'x-retry-count': retryCount + 1
                            }
                        });
                        
                        // Ack the original failed message since we republished it
                        channel.ack(msg);
                    } else {
                        // Max retries reached, let it go to DLQ
                        console.log(`[AlertWorker] Dead-lettered ${jobId}`);
                        channel.nack(msg, false, false);
                    }
                }
            }
        });

        console.log(`[AlertWorker] Started listening on ${queue}`);
    } catch (error) {
        console.error(`[AlertWorker] Error setting up consumer for ${queue}:`, error);
    }
};

module.exports = startAlertWorker;
