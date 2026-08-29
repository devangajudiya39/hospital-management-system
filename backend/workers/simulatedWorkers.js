const SIMULATED_JOB_DELAY_MS = process.env.SIMULATED_JOB_DELAY_MS || 2000;

const startSimulatedWorker = async (channel, queue, workerName) => {
    await channel.prefetch(1);
    console.log(`[WORKER] ${workerName} started listening on ${queue}`);
    
    channel.consume(queue, async (msg) => {
        if (!msg) return;
        
        let content;
        try {
            content = JSON.parse(msg.content.toString());
        } catch (e) {
            console.error(`[WORKER] ${workerName} failed to parse message. Rejecting.`);
            return channel.reject(msg, false);
        }

        const jobId = content.jobId || 'unknown';
        console.log(`[WORKER] Processing ${queue.split('.')[0]} job ${jobId}`);

        try {
            // Simulate work
            await new Promise(resolve => setTimeout(resolve, SIMULATED_JOB_DELAY_MS));
            
            // Randomly simulate a failure 20% of the time for testing if requested
            if (content.forceFail || (content.simulateFailure && Math.random() < 0.2)) {
                throw new Error("Simulated intermittent failure");
            }

            console.log(`[WORKER] ${queue.split('.')[0]} job completed ${jobId}`);
            channel.ack(msg);
        } catch (error) {
            console.error(`[WORKER] ${queue.split('.')[0]} job failed ${jobId}:`, error.message);
            
            const retryCount = (msg.properties.headers && msg.properties.headers['x-retry-count']) 
                                ? msg.properties.headers['x-retry-count'] 
                                : 0;
            
            const MAX_RETRIES = 3;
            if (retryCount < MAX_RETRIES - 1) {
                console.log(`[WORKER] Retrying ${jobId} (Attempt ${retryCount + 1} failed)`);
                const newHeaders = { ...msg.properties.headers, 'x-retry-count': retryCount + 1 };
                
                channel.sendToQueue(queue, msg.content, {
                    persistent: true,
                    messageId: msg.properties.messageId,
                    headers: newHeaders
                });
                
                channel.ack(msg);
            } else {
                console.log(`[WORKER] Dead-lettered ${jobId}`);
                channel.reject(msg, false);
            }
        }
    });
};

module.exports = startSimulatedWorker;
