/**
 * Kiosk Session Authentication
 * 
 * Issues short-lived, scoped JWT tokens for kiosk devices.
 * The token grants ONLY alert-trigger capability — it cannot
 * access staff APIs, SSE streams, or any other protected resource.
 * 
 * This avoids exposing any permanent secret in the browser bundle.
 * The kiosk physically resides in the hospital, so issuing a
 * time-limited session token without prior credentials is acceptable.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'hospital-secret-key';
const KIOSK_TOKEN_EXPIRY = '30m'; // Covers a full interview session

const router = express.Router();

/**
 * @route   POST /api/kiosk/session
 * @desc    Issue a scoped kiosk session token for alert triggering
 * @access  Public (kiosk is a trusted hospital device)
 */
router.post('/session', (req, res) => {
    try {
        const sessionRef = crypto.randomUUID();

        const token = jwt.sign(
            {
                id: `kiosk-${sessionRef}`,
                role: 'kiosk',
                scope: 'alert-trigger',
                name: 'Kiosk Terminal'
            },
            JWT_SECRET,
            { expiresIn: KIOSK_TOKEN_EXPIRY }
        );

        console.log(`[KioskAuth] Issued session token: kiosk-${sessionRef.slice(0, 8)}...`);

        res.status(200).json({
            token,
            expiresIn: KIOSK_TOKEN_EXPIRY,
            scope: 'alert-trigger'
        });
    } catch (err) {
        console.error('[KioskAuth] Failed to issue kiosk token:', err.message);
        res.status(500).json({ message: 'Failed to create kiosk session' });
    }
});

module.exports = router;
