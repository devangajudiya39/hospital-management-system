const amqp = require('amqplib');
const crypto = require('crypto');

let connection = null;
let channel = null;

const QUEUES = ['email.queue', 'ocr.queue', 'asr.queue', 'summary.queue', 'alert-events'];
const DLX = 'dead_letter_exchange';

const connectRabbitMQ = async () => {
    try {
        const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        connection = await amqp.connect(rabbitUrl);
        
        connection.on('error', (err) => {
            console.error('[RABBITMQ] Connection error', err);
        });
        
        connection.on('close', () => {
            console.error('[RABBITMQ] Connection closed. RabbitMQ is currently unavailable.');
            connection = null;
            channel = null;
        });

        channel = await connection.createChannel();
        console.log('[RABBITMQ] Connected');

        // Setup Dead Letter Exchange
        await channel.assertExchange(DLX, 'direct', { durable: true });

        for (const queue of QUEUES) {
            // Setup DLQ for each queue
            const dlqName = `${queue}.dlq`;
            await channel.assertQueue(dlqName, { durable: true });
            await channel.bindQueue(dlqName, DLX, queue);

            // Setup Main Queue with DLX configuration
            await channel.assertQueue(queue, {
                durable: true,
                deadLetterExchange: DLX,
                deadLetterRoutingKey: queue // Route to DLQ using the queue name as routing key
            });
        }

    } catch (error) {
        console.error('[RABBITMQ] Failed to connect', error);
        // Retry connection logic could go here, or let Docker restart the container
        setTimeout(connectRabbitMQ, 5000);
    }
};

const publishJob = async (queue, data) => {
    if (!channel) {
        console.warn(`[RABBITMQ] Channel not ready. Could not publish to ${queue}`);
        return false;
    }
    
    try {
        const jobId = crypto.randomUUID();
        const payload = JSON.stringify({ jobId, ...data });
        
        const success = channel.sendToQueue(queue, Buffer.from(payload), {
            persistent: true,
            messageId: jobId,
            headers: { 'x-retry-count': 0 }
        });
        
        if (success) {
            console.log(`[RABBITMQ] Published ${queue.split('.')[0]} job ${jobId}`);
        } else {
            console.warn(`[RABBITMQ] Failed to publish ${queue.split('.')[0]} job ${jobId} (Buffer full)`);
        }
        return success;
    } catch (error) {
        console.error(`[RABBITMQ] Exception while publishing to ${queue}`, error);
        return false;
    }
};

const getChannel = () => channel;

module.exports = {
    connectRabbitMQ,
    publishJob,
    getChannel
};
