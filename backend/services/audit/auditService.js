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
    category = "SYSTEM",
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
      // Retention calculation
      let retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS, 10);
      if (isNaN(retentionDays) || retentionDays <= 0) {
        retentionDays = 90; // Development default
      }
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + retentionDays);

      // Sanitization to prevent logging objects/stack traces
      const sanitizeString = (val) => {
        if (!val) return val;
        if (typeof val === "object") {
          return "Sanitized Object Data";
        }
        const str = String(val);
        // Extremely simple stack trace heuristic to avoid logging them
        if (str.includes("    at ") || str.includes("node_modules")) {
          return "Sanitized Stack Trace";
        }
        return str.substring(0, 500); // limit length
      };

      const logEntry = new AuditLog({
        userId,
        patientId,
        action,
        category,
        details: sanitizeString(details),
        resourceType,
        resourceId,
        purpose: sanitizeString(purpose),
        consentId,
        success,
        reason: sanitizeString(reason),
        ipAddress,
        expiresAt
      });
      await logEntry.save();
    } catch (error) {
      // We don't throw here to prevent audit failures from aborting the primary medical transaction
      console.error("Audit Logging Failed:", error.message);
    }
  }
};

module.exports = auditService;
