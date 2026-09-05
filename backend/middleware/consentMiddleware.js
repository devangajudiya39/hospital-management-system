const consentService = require("../services/consent/consentService");
const auditService = require("../services/audit/auditService");

const requireConsent = (purpose, dataTypes) => {
  return async (req, res, next) => {
    try {
      const patientId = req.params.patientId || req.body.patientId || req.query.patientId;
      
      if (!patientId) {
        return res.status(400).json({ message: "patientId is required for consent check" });
      }

      const hasConsent = await consentService.checkConsent({
        patientId,
        purpose,
        dataTypes
      });

      if (!hasConsent) {
        await auditService.log({
          userId: req.user ? req.user.id : null,
          patientId,
          action: "CONSENT_DENIED",
          category: "CONSENT",
          details: `Access denied due to missing or expired consent for purpose: ${purpose}`,
          resourceType: "DataAccess",
          purpose,
          success: false,
          reason: "Consent missing, revoked, or expired",
          ipAddress: req.ip
        });
        return res.status(403).json({ message: "Access Denied: Valid consent not found or expired for this operation." });
      }

      next();
    } catch (error) {
      console.error("Consent Middleware Error:", error);
      res.status(500).json({ message: "Internal server error during consent validation" });
    }
  };
};

module.exports = { requireConsent };
