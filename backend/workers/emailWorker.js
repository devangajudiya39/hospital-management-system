const { sendEmail } = require("../emails_services/EmailServices");

const MAX_RETRIES = 3;

const startEmailWorker = async (channel) => {
    const queue = 'email.queue';
    
    // Ensure channel prefetch is 1 so worker processes one by one
    await channel.prefetch(1);
    
    console.log(`[WORKER] Started listening on ${queue}`);
    
    channel.consume(queue, async (msg) => {
        if (!msg) return;
        
        let content;
        try {
            content = JSON.parse(msg.content.toString());
        } catch (e) {
            console.error(`[WORKER] Failed to parse message body on ${queue}. Rejecting to DLQ.`);
            return channel.reject(msg, false);
        }

        const jobId = content.jobId || 'unknown';
        console.log(`[WORKER] Processing email job ${jobId}`);

        try {
            // Attempt to send email
            await sendEmail(content.to, content.subject, content.body);
            console.log(`[WORKER] Email job completed ${jobId}`);
            channel.ack(msg);
        } catch (error) {
            console.error(`[WORKER] Email job failed ${jobId}:`, error.message);
            
            // Handle retries
            const retryCount = (msg.properties.headers && msg.properties.headers['x-retry-count']) 
                                ? msg.properties.headers['x-retry-count'] 
                                : 0;
            
            if (retryCount < MAX_RETRIES - 1) {
                console.log(`[WORKER] Retrying ${jobId} (Attempt ${retryCount + 1} failed)`);
                const newHeaders = { ...msg.properties.headers, 'x-retry-count': retryCount + 1 };
                
                // Publish back to original queue directly
                channel.sendToQueue(queue, msg.content, {
                    persistent: true,
                    messageId: msg.properties.messageId,
                    headers: newHeaders
                });
                
                // ACK the original message since we explicitly re-queued it with incremented headers
                channel.ack(msg);
            } else {
                console.log(`[WORKER] Dead-lettered ${jobId}`);
                // Rejecting with false sends it to DLX (if queue is configured with deadLetterExchange)
                channel.reject(msg, false);
            }
        }
    });
};

module.exports = startEmailWorker;
