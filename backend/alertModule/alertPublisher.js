const crypto = require('crypto');
const { publishJob } = require('../rabbitmqClient');

/**
 * Publishes a red-flag alert event to the RabbitMQ alert-events queue.
 * This is the integration point for Module A (Conversational Interview).
 * 
 * @param {Object} alertData - The raw alert data from the medical module.
 * @returns {Promise<boolean>} - True if published successfully, false otherwise.
 */
const publishAlertEvent = async (alertData) => {
    if (!alertData) {
        console.error('[AlertPublisher] Missing alertData payload');
        return false;
    }

    const {
        sessionId,
        patientId,
        severity,
        red_flag_detected,
        alert_triggered,
        reasons,
        chiefComplaint,
        timestamp
    } = alertData;

    // Strict validation
    if (!severity || !['critical', 'high', 'moderate'].includes(severity)) {
        console.error(`[AlertPublisher] Invalid or missing severity: ${severity}`);
        return false;
    }

    if (red_flag_detected === undefined || alert_triggered === undefined) {
        console.error('[AlertPublisher] Missing required boolean flags (red_flag_detected, alert_triggered)');
        return false;
    }

    // Construct normalized payload
    const normalizedAlert = {
        id: alertData.id || crypto.randomUUID(),
        session_id: sessionId || 'unknown-session',
        patient_id: patientId || null,
        severity: severity,
        red_flag_detected: Boolean(red_flag_detected),
        alert_triggered: Boolean(alert_triggered),
        reasons: Array.isArray(reasons) ? reasons : [],
        chief_complaint: chiefComplaint || '',
        timestamp: timestamp || new Date().toISOString()
    };

    console.log(`[AlertPublisher] Publishing alert ${normalizedAlert.id} with severity: ${normalizedAlert.severity}`);
    
    // Publish to RabbitMQ
    const success = await publishJob('alert-events', normalizedAlert);
    
    if (success) {
        console.log(`[AlertPublisher] Successfully queued alert ${normalizedAlert.id}`);
    } else {
        console.error(`[AlertPublisher] Failed to queue alert ${normalizedAlert.id}`);
    }

    return success;
};

module.exports = {
    publishAlertEvent
};
