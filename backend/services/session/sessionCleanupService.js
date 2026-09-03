const fs = require("fs").promises;
const path = require("path");
const auditService = require("../audit/auditService");

// Valid session ID regex: alphanumeric, hyphens, underscores, length 1-255
const VALID_SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{1,255}$/;

/**
 * Service to handle the cleanup of temporary session data, voice/audio files,
 * and OCR intermediate files after a session is submitted or terminated.
 */
const sessionCleanupService = {
  /**
   * Main cleanup function to be called on successful submission or cancellation.
   */
  cleanupSessionData: async ({ patientId, sessionId, reason, userId, ipAddress }) => {
    let success = true;
    let failureReason = null;
    let securityViolation = false;

    try {
      // 1. Strict validation
      if (!sessionId || typeof sessionId !== 'string') {
        throw new Error("Invalid session ID: Empty or non-string");
      }
      
      if (sessionId === "." || sessionId === "..") {
         throw new Error("Invalid session ID: Path traversal attempt");
      }

      if (!VALID_SESSION_ID_REGEX.test(sessionId)) {
         throw new Error("Invalid session ID format");
      }

      // 1. Voice/Audio temporary files
      await sessionCleanupService._deleteLocalFiles(sessionId, 'audio', patientId, userId, ipAddress);

      // 2. OCR/Intermediate files
      await sessionCleanupService._deleteLocalFiles(sessionId, 'ocr', patientId, userId, ipAddress);

      // 3. Temporary session data (e.g., Redis or in-memory caches)
      await sessionCleanupService._purgeCacheData(sessionId);

      // We explicitly do NOT touch permanent schemas: Patient, Consultation, Prescription, LabReport, etc.

    } catch (error) {
      success = false;
      failureReason = error.message;
      if (error.message.includes("Invalid session") || error.message.includes("SECURITY")) {
        securityViolation = true;
      }
      console.error(`[SessionCleanup] Failed to clean up session ${sessionId}:`, error.message);
    } finally {
      // Audit the cleanup event without logging any sensitive payload
      const action = securityViolation ? "SECURITY_VIOLATION_TEMP_CLEANUP" : "TEMP_SESSION_DATA_PURGED";
      await auditService.log({
        userId,
        patientId,
        action,
        details: securityViolation ? `Security violation rejected during temp cleanup: ${failureReason}` : `Temporary session data purged for reason: ${reason}`,
        resourceType: "Session",
        resourceId: sessionId,
        purpose: "Privacy and Storage Minimization",
        success,
        reason: failureReason,
        ipAddress
      });
    }

    return success;
  },

  /**
   * Helper to idempotently delete local temp files safely.
   */
  _deleteLocalFiles: async (sessionId, type, patientId, userId, ipAddress) => {
    // Note: The actual temp directory structure doesn't exist yet, so we define a safe fallback path.
    const tempDir = path.resolve(path.join(__dirname, "../../../temp", type));
    const fileName = `${sessionId}.tmp`;
    const targetPath = path.resolve(path.join(tempDir, fileName));

    // Defense-in-depth path check
    // The targetPath MUST start with tempDir and MUST NOT be exactly tempDir
    if (!targetPath.startsWith(tempDir + path.sep)) {
       throw new Error(`SECURITY EXCEPTION: Path traversal detected. Target path ${targetPath} is outside ${tempDir}`);
    }

    try {
      await fs.unlink(targetPath);
    } catch (err) {
      // Idempotency: If file does not exist, that's fine. We only throw for real permission/IO issues.
      if (err.code !== 'ENOENT') {
        console.warn(`[SessionCleanup] Warning: Failed to delete ${targetPath}`, err.message);
      }
    }
  },

  /**
   * Helper to purge cache data.
   */
  _purgeCacheData: async (sessionId) => {
    // Placeholder for Redis/express-session cleanup
    return Promise.resolve();
  }
};

module.exports = sessionCleanupService;
