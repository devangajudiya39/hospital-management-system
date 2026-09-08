/**
 * Alert Trigger API Service
 * 
 * Handles the kiosk → HMS backend alert trigger flow:
 *  1. Obtains a short-lived kiosk session token from the backend
 *  2. Sends red-flag alert data to the trigger endpoint
 *  3. Maps Module A response fields to canonical alert payload
 * 
 * No permanent secrets are stored in this file or any VITE_* variable.
 * The kiosk token is backend-issued, scoped, and short-lived.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

/** Maps Module A severity values to canonical pipeline values */
const SEVERITY_MAP = {
    'critical': 'critical',
    'high': 'high',
    'medium': 'moderate',
    'moderate': 'moderate',
    'low': 'moderate'
};

/** Module-level kiosk token — automatically refreshed when expired */
let kioskToken = null;

/**
 * Obtains a scoped kiosk session token from the HMS backend.
 * The token is short-lived (30 min) and only permits alert triggering.
 * 
 * @returns {Promise<string>} JWT token
 */
export async function getKioskSessionToken() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/kiosk/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Kiosk session request failed: ${response.status}`);
        }

        const data = await response.json();
        kioskToken = data.token;
        console.log('[ALERT] Kiosk session token obtained');
        return data.token;
    } catch (err) {
        console.error('[ALERT] Failed to obtain kiosk session token:', err.message);
        throw err;
    }
}

/**
 * Sends a validated alert payload to the HMS backend trigger endpoint.
 * Automatically acquires and refreshes the kiosk token as needed.
 * 
 * @param {Object} alertPayload - Canonical alert payload
 * @returns {Promise<Object>} Backend response { accepted, duplicate, message }
 */
export async function triggerStaffAlert(alertPayload) {
    // Ensure we have a kiosk token
    if (!kioskToken) {
        await getKioskSessionToken();
    }

    const doRequest = async (token) => {
        return fetch(`${BACKEND_URL}/api/triage/alerts/trigger`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(alertPayload)
        });
    };

    try {
        let response = await doRequest(kioskToken);

        // If 401, token may have expired — refresh and retry once
        if (response.status === 401 || response.status === 400) {
            console.warn('[ALERT] Kiosk token may have expired, refreshing...');
            kioskToken = null;
            await getKioskSessionToken();
            response = await doRequest(kioskToken);
        }

        const data = await response.json();

        if (data.accepted) {
            console.log('[ALERT] Staff alert accepted');
        } else if (data.duplicate) {
            console.log('[ALERT] Duplicate alert (already processed)');
        } else {
            console.warn('[ALERT] Alert trigger response:', data.message);
        }

        return data;
    } catch (err) {
        console.error('[ALERT] Staff alert trigger failed:', err.message);
        throw err;
    }
}

/**
 * Builds a canonical alert payload from Module A API response data.
 * Validates severity mapping and extracts relevant clinical context.
 * 
 * @param {Object} data - Raw API response from Nisarg's interview endpoint
 * @returns {Object|null} Canonical alert payload, or null if severity is unmappable
 */
export function buildAlertPayload(data) {
    const rawSeverity = (data.red_flag_severity || '').toLowerCase();
    const severity = SEVERITY_MAP[rawSeverity];

    if (!severity) {
        console.warn('[ALERT] Cannot map Module A severity to canonical value:', data.red_flag_severity);
        return null;
    }

    // Extract red-flag reasons from clinical summary (untrusted — backend re-validates)
    const reasons = [];
    if (
        data.clinical_summary?.red_flags?.details &&
        Array.isArray(data.clinical_summary.red_flags.details)
    ) {
        reasons.push(...data.clinical_summary.red_flags.details);
    }
    if (reasons.length === 0) {
        reasons.push('Potential emergency symptom detected during intake');
    }

    // Attempt to read patient ID from local storage (may be null)
    let patientId = null;
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        patientId = localStorage.getItem('hmsPatientId') || user.patientId || null;
    } catch {
        // ignore parse errors
    }

    return {
        sessionId: data.session_id || 'unknown-session',
        patientId,
        severity,
        red_flag_detected: true,
        alert_triggered: true,
        reasons,
        chiefComplaint: data.clinical_summary?.chief_complaint || ''
    };
}
