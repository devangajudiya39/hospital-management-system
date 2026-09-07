const { connectRabbitMQ, getChannel } = require("../rabbitmqClient");
const startEmailWorker = require("./emailWorker");
const startSimulatedWorker = require("./simulatedWorkers");
const startAlertWorker = require("./alertWorker");
const { initAlertPublisher } = require("../alertModule/alertRedisBridge");

const bootWorkers = async () => {
    try {
        console.log("[WORKER] Booting background workers...");
        
        // Wait for RabbitMQ to connect
        await connectRabbitMQ();
        
        // Let connection settle and channel to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        const channel = getChannel();
        
        if (!channel) {
            console.error("[WORKER] Failed to get RabbitMQ channel. Retrying in 5 seconds...");
            return setTimeout(bootWorkers, 5000);
        }

        // Start Email Worker
        await startEmailWorker(channel);

        // Start Simulated Workers
        await startSimulatedWorker(channel, 'ocr.queue', 'OCR Worker');
        await startSimulatedWorker(channel, 'asr.queue', 'ASR Worker');
        await startSimulatedWorker(channel, 'summary.queue', 'SUMMARY Worker');
        
        // Initialize Redis publisher for alert IPC bridge
        await initAlertPublisher();

        // Start Alert Worker
        await startAlertWorker(channel);
        
        console.log("[WORKER] All workers successfully booted.");
    } catch (error) {
        console.error("[WORKER] Boot failure:", error);
        setTimeout(bootWorkers, 5000);
    }
};

bootWorkers();
