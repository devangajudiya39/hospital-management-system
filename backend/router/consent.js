const express = require("express");
const consentRouter = express.Router();
const consentService = require("../services/consent/consentService");
const { authenticate } = require("../middleware/authMiddleware");

// POST /api/consent
consentRouter.post("/", authenticate, async (req, res) => {
  try {
    const { patientId, purpose, requestedDataTypes, expiresAt, audioConsentProvided } = req.body;
    
    if (!patientId || !purpose || !expiresAt) {
      return res.status(400).json({ message: "patientId, purpose, and expiresAt are required" });
    }

    const consent = await consentService.createConsent({
      patientId,
      purpose,
      requestedDataTypes: requestedDataTypes || ["All"],
      expiresAt,
      audioConsentProvided,
      createdBy: req.user.id,
      ipAddress: req.ip
    });

    res.status(201).json({ message: "Consent granted successfully", consent });
  } catch (error) {
    console.error("Create Consent Error:", error);
    res.status(500).json({ message: "Failed to create consent" });
  }
});

// GET /api/consent/:patientId
consentRouter.get("/:patientId", authenticate, async (req, res) => {
  try {
    const Consent = require("../models/Consent");
    const consents = await Consent.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
    res.json(consents);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch consents" });
  }
});

// PUT /api/consent/:id/revoke
consentRouter.put("/:id/revoke", authenticate, async (req, res) => {
  try {
    const consent = await consentService.revokeConsent({
      consentId: req.params.id,
      revokedBy: req.user.id,
      ipAddress: req.ip
    });
    res.json({ message: "Consent revoked successfully", consent });
  } catch (error) {
    if (error.message === "Consent not found" || error.message === "Consent is already revoked") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Revoke Consent Error:", error);
    res.status(500).json({ message: "Failed to revoke consent" });
  }
});

module.exports = consentRouter;
