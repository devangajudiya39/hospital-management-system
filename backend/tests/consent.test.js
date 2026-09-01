const assert = require("assert");
const mongoose = require("mongoose");
const Consent = require("../models/Consent");
const AuditLog = require("../models/AuditLog");
const consentService = require("../services/consent/consentService");

let mongoServer;

async function setup() {
  const { MongoMemoryServer } = require("mongodb-memory-server");
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

async function teardown() {
  await mongoose.disconnect();
  await mongoServer.stop();
}

async function runTests() {
  try {
    await setup();
    console.log("Starting Consent Framework Tests...");

    const mockPatientId = new mongoose.Types.ObjectId();
    const mockUserId = new mongoose.Types.ObjectId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

    // Test 1: Create Consent
    const consent = await consentService.createConsent({
      patientId: mockPatientId,
      purpose: "Care provisioning",
      requestedDataTypes: ["Patient", "Observation"],
      expiresAt,
      audioConsentProvided: true,
      createdBy: mockUserId,
      ipAddress: "127.0.0.1"
    });

    assert.ok(consent._id, "Consent should have an ID");
    assert.strictEqual(consent.status, "GRANTED", "Status should be GRANTED");
    assert.strictEqual(consent.audioConsentProvided, true, "Audio consent should be true");

    // Verify AuditLog for creation
    const logsAfterCreate = await AuditLog.find({ action: "CONSENT_GRANTED" });
    assert.strictEqual(logsAfterCreate.length, 1, "Should have 1 audit log for consent creation");
    assert.strictEqual(logsAfterCreate[0].purpose, "Care provisioning", "Audit log purpose should match");

    // Test 2: Check Consent (Valid)
    const hasConsent = await consentService.checkConsent({
      patientId: mockPatientId,
      purpose: "Care provisioning",
      dataTypes: ["Observation"]
    });
    assert.strictEqual(hasConsent, true, "Should return true for valid consent");

    // Test 3: Check Consent (Invalid data type)
    const hasConsentInvalidType = await consentService.checkConsent({
      patientId: mockPatientId,
      purpose: "Care provisioning",
      dataTypes: ["MedicationStatement"]
    });
    assert.strictEqual(hasConsentInvalidType, false, "Should return false for unrequested data type");

    // Test 4: Revoke Consent
    const revokedConsent = await consentService.revokeConsent({
      consentId: consent._id,
      revokedBy: mockUserId,
      ipAddress: "127.0.0.1"
    });
    assert.strictEqual(revokedConsent.status, "REVOKED", "Status should be REVOKED");

    // Verify AuditLog for revocation
    const logsAfterRevoke = await AuditLog.find({ action: "CONSENT_REVOKED" });
    assert.strictEqual(logsAfterRevoke.length, 1, "Should have 1 audit log for consent revocation");

    // Test 5: Check Consent (After Revocation)
    const hasConsentAfterRevoke = await consentService.checkConsent({
      patientId: mockPatientId,
      purpose: "Care provisioning",
      dataTypes: ["Observation"]
    });
    assert.strictEqual(hasConsentAfterRevoke, false, "Should return false for revoked consent");

    console.log("All Consent Framework Tests Passed Successfully! ✅");
  } catch (error) {
    console.error("Test Failed: ❌", error);
    process.exit(1);
  } finally {
    await teardown();
  }
}

// Check if we need to mock mongodb-memory-server if not installed
try {
  require.resolve("mongodb-memory-server");
  runTests();
} catch (e) {
  console.log("mongodb-memory-server is not installed. Skipping database integration tests.");
  console.log("To run tests properly: npm install --save-dev mongodb-memory-server");
}
