const { connectRabbitMQ, publishJob, getChannel } = require('../backend/rabbitmqClient');
const crypto = require('crypto');

const testJobs = async () => {
    try {
        console.log("Connecting to RabbitMQ...");
        await connectRabbitMQ();
        
        // Wait for connection to establish and queues to assert
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const channel = getChannel();
        if (!channel) {
            console.error("Failed to get RabbitMQ channel. Is RabbitMQ running?");
            process.exit(1);
        }

        console.log("Publishing test jobs...");

        // Synthetic OCR Job
        await publishJob('ocr.queue', {
            type: "OCR",
            payload: { fileId: "doc-1234", pages: 5 },
            simulateFailure: false
        });

        // Synthetic ASR Job
        await publishJob('asr.queue', {
            type: "ASR",
            payload: { audioId: "audio-5678", durationSeconds: 120 },
            simulateFailure: false
        });

        // Synthetic SUMMARY Job
        await publishJob('summary.queue', {
            type: "SUMMARY",
            payload: { consultationId: "cons-9012" },
            simulateFailure: false
        });

        // Simulating a job that will fail 100% of the time (to test retry/DLQ)
        await publishJob('summary.queue', {
            type: "SUMMARY_FAIL_TEST",
            payload: { consultationId: "cons-fail" },
            forceFail: true
        });

        console.log("Test jobs published successfully.");
        
        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error("Error running test jobs:", error);
        process.exit(1);
    }
};

testJobs();
