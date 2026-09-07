/**
 * Alert Redis Bridge
 * 
 * Bridges the worker container and backend container using Redis Pub/Sub.
 * 
 * Worker process:  alertWorker → publishAlertToRedis() → Redis PUBLISH
 * Backend process: Redis SUBSCRIBE → broadcastAlert() → SSE clients
 */

const { createClient } = require('redis');
const { broadcastAlert } = require('./alertBroadcaster');

const TRIAGE_ALERT_CHANNEL = 'triage-alerts';

let publisherClient = null;
let subscriberClient = null;

/**
 * Publishes a validated alert to the Redis triage-alerts channel.
 * Called by alertWorker in the worker container.
 * 
 * @param {Object} alertData - The validated alert payload.
 * @returns {Promise<boolean>} - True if published successfully.
 */
const publishAlertToRedis = async (alertData) => {
    if (!publisherClient) {
        console.error('[AlertRedisBridge] Redis publisher not initialized');
        return false;
    }

    try {
        const payload = JSON.stringify(alertData);
        await publisherClient.publish(TRIAGE_ALERT_CHANNEL, payload);
        console.log(`[AlertRedisBridge] Published alert ${alertData.id} to Redis channel '${TRIAGE_ALERT_CHANNEL}'`);
        return true;
    } catch (err) {
        console.error('[AlertRedisBridge] Failed to publish alert to Redis:', err.message);
        return false;
    }
};

/**
 * Initializes the Redis publisher connection.
 * Called by the worker process during startup.
 */
const initAlertPublisher = async () => {
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
        publisherClient = createClient({ url: redisUrl });

        publisherClient.on('error', (err) => {
            console.error('[AlertRedisBridge] Redis publisher error:', err.message);
        });

        publisherClient.on('connect', () => {
            console.log('[AlertRedisBridge] Redis publisher connected');
        });

        publisherClient.on('reconnecting', () => {
            console.log('[AlertRedisBridge] Redis publisher reconnecting...');
        });

        await publisherClient.connect();
    } catch (err) {
        console.error('[AlertRedisBridge] Failed to initialize Redis publisher:', err.message);
    }
};

/**
 * Starts the Redis subscriber and forwards received alerts to the SSE broadcaster.
 * Called by the backend process during startup.
 */
const startAlertSubscription = async () => {
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
        subscriberClient = createClient({ url: redisUrl });

        subscriberClient.on('error', (err) => {
            console.error('[AlertRedisBridge] Redis subscriber error:', err.message);
        });

        subscriberClient.on('connect', () => {
            console.log('[AlertRedisBridge] Redis subscriber connected');
        });

        subscriberClient.on('reconnecting', () => {
            console.log('[AlertRedisBridge] Redis subscriber reconnecting...');
        });

        await subscriberClient.connect();

        // Subscribe to the triage-alerts channel
        await subscriberClient.subscribe(TRIAGE_ALERT_CHANNEL, (message) => {
            try {
                const alertData = JSON.parse(message);
                console.log(`[AlertRedisBridge] Received alert ${alertData.id} from Redis channel '${TRIAGE_ALERT_CHANNEL}'`);
                broadcastAlert(alertData);
            } catch (err) {
                console.error('[AlertRedisBridge] Failed to parse Redis alert message:', err.message);
            }
        });

        console.log(`[AlertRedisBridge] Subscribed to Redis channel '${TRIAGE_ALERT_CHANNEL}'`);
    } catch (err) {
        console.error('[AlertRedisBridge] Failed to start Redis alert subscription:', err.message);
    }
};

module.exports = {
    TRIAGE_ALERT_CHANNEL,
    publishAlertToRedis,
    initAlertPublisher,
    startAlertSubscription
};
