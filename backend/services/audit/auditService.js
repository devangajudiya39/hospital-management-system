const AuditLog = require("../../models/AuditLog");

/**
 * Reusable audit logging service
 * Ensures DPDP-aligned audit events without crashing primary transactions
 */
const auditService = {
  log: async ({
    userId,
    patientId,
    action,
    details,
    resourceType,
    resourceId,
    purpose,
    consentId,
    success = true,
    reason,
    ipAddress
  }) => {
    try {
      const logEntry = new AuditLog({
        userId,
        patientId,
        action,
        details,
        resourceType,
        resourceId,
        purpose,
        consentId,
        success,
        reason,
        ipAddress
      });
      await logEntry.save();
    } catch (error) {
      // We don't throw here to prevent audit failures from aborting the primary medical transaction
      console.error("Audit Logging Failed:", error.message);
    }
  }
};

module.exports = auditService;
