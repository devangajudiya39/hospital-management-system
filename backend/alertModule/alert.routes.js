const express = require('express');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');
const { addClient } = require('./alertBroadcaster');
const { publishAlertEvent } = require('./alertPublisher');
const { setCacheNX } = require('../redisClient');

const router = express.Router();

// ─── Constants ──────────────────────────────────────────────────────────────

/** Maps Module A severity values to canonical pipeline values */
const SEVERITY_MAP = {
    'critical': 'critical',
    'high': 'high',
    'medium': 'moderate',
    'moderate': 'moderate',
    'low': 'moderate'
};

const MAX_SESSION_ID_LENGTH = 256;
const MAX_PATIENT_ID_LENGTH = 256;
const MAX_REASONS_COUNT = 10;
const MAX_REASON_LENGTH = 500;
const MAX_COMPLAINT_LENGTH = 1000;
const DEDUPE_TTL_SECONDS = 1800; // 30 minutes — covers an interview session

// ─── Middleware ──────────────────────────────────────────────────────────────

/**
 * Authorization middleware for the alert trigger endpoint.
 * Allows:
 *  - Kiosk tokens with scope 'alert-trigger'
 *  - Staff roles (doctor, admin, nurse, receptionist)
 * Denies:
 *  - Patient role
 *  - Any other role without alert-trigger scope
 */
const authorizeAlertTrigger = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    // Kiosk token with explicit alert-trigger scope
    if (req.user.role === 'kiosk' && req.user.scope === 'alert-trigger') {
        return next();
    }

    // Staff roles that can also trigger alerts (e.g., manual triage)
    const staffRoles = ['doctor', 'admin', 'nurse', 'receptionist'];
    if (staffRoles.includes(req.user.role)) {
        return next();
    }

    return res.status(403).json({ message: 'Insufficient authorization for alert triggering' });
};

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/triage/alerts/stream
 * @desc    Establish an SSE connection to receive live triage alerts
 * @access  Private (Staff only)
 */
// We use the existing authenticate middleware, which expects 'Authorization: Bearer <token>'
// And we authorize specific roles capable of viewing triage alerts.
router.get(
    '/stream',
    authenticate,
    authorizeRole('doctor', 'receptionist', 'admin', 'nurse'), // using nurse just in case, but rely on existing
    (req, res) => {
        // Delegate connection handling to the broadcaster
        addClient(req, res);
    }
);

/**
 * @route   POST /api/triage/alerts/trigger
 * @desc    Receive a red-flag alert from Module A kiosk interview and publish
 *          through the canonical RabbitMQ → Worker → Redis → SSE pipeline.
 * @access  Kiosk (scoped token) or Staff
 */
router.post(
    '/trigger',
    authenticate,
    authorizeAlertTrigger,
    async (req, res) => {
        try {
            const {
                sessionId,
                patientId,
                severity,
                red_flag_detected,
                alert_triggered,
                reasons,
                chiefComplaint
            } = req.body;

            // ── Validate sessionId ──────────────────────────────────────
            if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
                return res.status(400).json({ message: 'Missing or invalid sessionId' });
            }
            if (sessionId.length > MAX_SESSION_ID_LENGTH) {
                return res.status(400).json({ message: 'sessionId exceeds maximum length' });
            }

            // ── Validate red-flag condition ─────────────────────────────
            if (red_flag_detected !== true || alert_triggered !== true) {
                return res.status(400).json({
                    message: 'Alert requires both red_flag_detected and alert_triggered to be true'
                });
            }

            // ── Validate and map severity ───────────────────────────────
            if (!severity || typeof severity !== 'string') {
                return res.status(400).json({ message: 'Missing or invalid severity' });
            }
            const canonicalSeverity = SEVERITY_MAP[severity.toLowerCase()];
            if (!canonicalSeverity) {
                return res.status(400).json({
                    message: `Invalid severity: '${severity}'. Valid values: critical, high, medium, moderate, low`
                });
            }

            // ── Validate optional patientId ─────────────────────────────
            let validatedPatientId = null;
            if (patientId !== undefined && patientId !== null) {
                if (typeof patientId !== 'string') {
                    return res.status(400).json({ message: 'Invalid patientId format' });
                }
                validatedPatientId = patientId.trim().substring(0, MAX_PATIENT_ID_LENGTH) || null;
            }

            // ── Validate and sanitize reasons ───────────────────────────
            let sanitizedReasons = [];
            if (reasons !== undefined) {
                if (!Array.isArray(reasons)) {
                    return res.status(400).json({ message: 'reasons must be an array of strings' });
                }
                sanitizedReasons = reasons
                    .slice(0, MAX_REASONS_COUNT)
                    .filter(r => typeof r === 'string' && r.trim().length > 0)
                    .map(r => r.trim().substring(0, MAX_REASON_LENGTH));
            }

            // ── Validate chiefComplaint ──────────────────────────────────
            let sanitizedComplaint = '';
            if (chiefComplaint !== undefined && chiefComplaint !== null) {
                if (typeof chiefComplaint !== 'string') {
                    return res.status(400).json({ message: 'chiefComplaint must be a string' });
                }
                sanitizedComplaint = chiefComplaint.trim().substring(0, MAX_COMPLAINT_LENGTH);
            }

            // ── Redis atomic deduplication (SET NX EX) ──────────────────
            const trimmedSession = sessionId.trim();
            const dedupeKey = `triage-alert-dedupe:${trimmedSession}:${canonicalSeverity}`;
            const dedupeResult = await setCacheNX(
                dedupeKey,
                { triggeredAt: Date.now() },
                DEDUPE_TTL_SECONDS
            );

            if (dedupeResult === false) {
                // Key already existed — duplicate alert
                console.log(`[AlertTrigger] Duplicate alert ignored: ${dedupeKey}`);
                return res.status(200).json({
                    accepted: false,
                    duplicate: true,
                    message: 'Alert already processed for this session and severity'
                });
            }

            if (dedupeResult === null) {
                // Redis unavailable — fail safe rather than flood pipeline
                console.error('[AlertTrigger] Redis deduplication unavailable');
                return res.status(503).json({
                    message: 'Deduplication service temporarily unavailable'
                });
            }

            // ── Build canonical alert payload ───────────────────────────
            const alertData = {
                sessionId: trimmedSession,
                patientId: validatedPatientId,
                severity: canonicalSeverity,
                red_flag_detected: true,
                alert_triggered: true,
                reasons: sanitizedReasons,
                chiefComplaint: sanitizedComplaint,
                timestamp: new Date().toISOString()
            };

            // ── Publish through existing canonical pipeline ─────────────
            const published = await publishAlertEvent(alertData);

            if (!published) {
                console.error(`[AlertTrigger] publishAlertEvent failed for session: ${trimmedSession}`);
                return res.status(503).json({
                    message: 'Alert publishing temporarily unavailable'
                });
            }

            console.log(`[AlertTrigger] Alert accepted: session=${trimmedSession}, severity=${canonicalSeverity}`);
            return res.status(201).json({
                accepted: true,
                duplicate: false,
                message: 'Alert accepted and queued for staff delivery'
            });

        } catch (err) {
            console.error('[AlertTrigger] Unexpected error:', err.message);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
);

module.exports = router;

