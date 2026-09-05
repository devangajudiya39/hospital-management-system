const Consent = require("../../models/Consent");
const auditService = require("../audit/auditService");

const consentService = {
  createConsent: async ({ patientId, purpose, requestedDataTypes, expiresAt, audioConsentProvided, createdBy, ipAddress }) => {
    try {
      const consent = new Consent({
        patientId,
        purpose,
        requestedDataTypes,
        expiresAt,
        status: "GRANTED",
        grantedAt: new Date(),
        audioConsentProvided,
        createdBy
      });
      await consent.save();
      
      await auditService.log({
        userId: createdBy,
        patientId,
        action: "CONSENT_GRANTED",
        category: "CONSENT",
        details: `Consent granted for purpose: ${purpose}`,
        resourceType: "Consent",
        resourceId: consent._id,
        purpose,
        consentId: consent._id,
        success: true,
        ipAddress
      });

      return consent;
    } catch (error) {
      throw error;
    }
  },

  revokeConsent: async ({ consentId, revokedBy, ipAddress }) => {
    try {
      const consent = await Consent.findById(consentId);
      if (!consent) throw new Error("Consent not found");
      
      if (consent.status === "REVOKED") {
        throw new Error("Consent is already revoked");
      }

      consent.status = "REVOKED";
      consent.revokedAt = new Date();
      consent.updatedBy = revokedBy;
      await consent.save();

      await auditService.log({
        userId: revokedBy,
        patientId: consent.patientId,
        action: "CONSENT_REVOKED",
        category: "CONSENT",
        details: `Consent revoked manually`,
        resourceType: "Consent",
        resourceId: consent._id,
        purpose: consent.purpose,
        consentId: consent._id,
        success: true,
        ipAddress
      });

      return consent;
    } catch (error) {
      throw error;
    }
  },

  checkConsent: async ({ patientId, purpose, dataTypes }) => {
    // Find active, unexpired consent
    const consent = await Consent.findOne({
      patientId,
      purpose,
      status: "GRANTED",
      expiresAt: { $gt: new Date() }
    });

    if (!consent) {
      return false;
    }

    // Check if the requested dataTypes are included in the consent
    if (consent.requestedDataTypes.includes("All")) {
      return true;
    }

    const hasAllDataTypes = dataTypes.every(dt => consent.requestedDataTypes.includes(dt));
    return hasAllDataTypes;
  }
};

module.exports = consentService;
