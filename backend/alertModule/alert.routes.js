const express = require('express');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');
const { addClient } = require('./alertBroadcaster');

const router = express.Router();

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

module.exports = router;
