const express = require('express');
const abdmRouter = express.Router();
const abhaService = require('../services/abdm/abhaAssociationService');
const Consultation = require('../models/Consultation');
const auditService = require('../services/audit/auditService');

// Middleware to restrict access to ABDM callbacks
const abdmCallbackAuth = (req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress;
    const allowedIpsStr = process.env.ABDM_CALLBACK_ALLOWED_IPS;
    
    if (allowedIpsStr) {
        const allowedIps = allowedIpsStr.split(',').map(ip => ip.trim());
        const isAllowed = allowedIps.some(allowed => {
            if (allowed === "*") return true; // Explicitly allowed all (NOT recommended for prod)
            // Allow basic wildcard subnets, e.g. "172.18.*"
            if (allowed.endsWith(".*")) {
                const prefix = allowed.slice(0, -2);
                return clientIp.startsWith(prefix) || clientIp.startsWith(`::ffff:${prefix}`);
            }
            return clientIp === allowed || clientIp === `::ffff:${allowed}`;
        });

        if (!isAllowed) {
            console.error(`[ABDM Security] Rejected untrusted callback from IP: ${clientIp}`);
            return res.status(403).json({ error: "Forbidden: Untrusted callback source" });
        }
    } else {
        // Default safe behavior: allow loopback only
        if (clientIp !== "127.0.0.1" && clientIp !== "::1" && clientIp !== "::ffff:127.0.0.1") {
            console.error(`[ABDM Security] Rejected untrusted callback from IP: ${clientIp}. Configure ABDM_CALLBACK_ALLOWED_IPS.`);
            return res.status(403).json({ error: "Forbidden: Untrusted callback source. Configure ABDM_CALLBACK_ALLOWED_IPS." });
        }
    }
    
    next();
};

abdmRouter.use(abdmCallbackAuth);

// POST /v1/patient-discover
abdmRouter.post('/patient-discover', async (req, res) => {
    try {
        const { hipId, patient } = req.body;
        const abhaAddress = patient?.id;

        if (!abhaAddress) {
            return res.status(400).json({ error: "Missing patient ID" });
        }

        const foundPatient = await abhaService.findPatientByAbhaAddress(abhaAddress);

        if (!foundPatient) {
            // Documented Wrapper behavior: 404 for patient not found.
            return res.status(404).json({ error: "Patient not found" });
        }

        // Gather care contexts from Consultations
        const consultations = await Consultation.find({ patientId: foundPatient._id }).populate('doctorId');
        const careContexts = consultations.map(c => ({
            referenceNumber: c._id.toString(),
            display: `Consultation on ${c.createdAt?.toISOString().split('T')[0] || 'Unknown Date'}`
        }));

        await auditService.log({
            userId: null,
            patientId: foundPatient._id,
            action: "ABDM_DISCOVERY_REQUEST",
            category: "ABDM",
            details: "Patient discovery executed",
            resourceType: "Patient",
            resourceId: foundPatient._id.toString(),
            success: true,
            ipAddress: req.ip || req.socket.remoteAddress
        });

        res.json({
            abhaAddress: abhaAddress,
            name: "MediKiosk Patient", // Future: retrieve from User model if populated
            gender: foundPatient.gender === 'male' ? 'M' : (foundPatient.gender === 'female' ? 'F' : 'U'),
            dateOfBirth: foundPatient.dateOfBirth ? foundPatient.dateOfBirth.toISOString().split('T')[0] : "1900-01-01",
            patientReference: foundPatient._id.toString(),
            careContexts
        });
    } catch (err) {
        console.error("ABDM Discovery Error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /v1/patient-care-contexts
abdmRouter.post('/patient-care-contexts', async (req, res) => {
    try {
        const { abhaAddress, hipId } = req.body;

        if (!abhaAddress) {
            return res.status(400).json({ error: "Missing abhaAddress" });
        }

        const foundPatient = await abhaService.findPatientByAbhaAddress(abhaAddress);

        if (!foundPatient) {
            return res.status(404).json({ error: "Patient not found" });
        }

        const consultations = await Consultation.find({ patientId: foundPatient._id }).populate('doctorId');
        const careContexts = consultations.map(c => ({
            referenceNumber: c._id.toString(),
            display: `Consultation on ${c.createdAt?.toISOString().split('T')[0] || 'Unknown Date'}`
        }));

        await auditService.log({
            userId: null,
            patientId: foundPatient._id,
            action: "ABDM_CARE_CONTEXT_FETCH",
            category: "ABDM",
            details: "Care contexts fetched",
            resourceType: "Patient",
            resourceId: foundPatient._id.toString(),
            success: true,
            ipAddress: req.ip || req.socket.remoteAddress
        });

        res.json({
            abhaAddress: abhaAddress,
            patientReference: foundPatient._id.toString(),
            patientDisplay: "MediKiosk Patient",
            careContexts
        });

    } catch (err) {
        console.error("ABDM Care Contexts Error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = abdmRouter;
