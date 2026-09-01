const assert = require("assert");
const consentService = require("../services/consent/consentService");
const auditService = require("../services/audit/auditService");
const Consent = require("../models/Consent");
const AuditLog = require("../models/AuditLog");

// Mock Mongoose Document
class MockDocument {
  constructor(data) {
    Object.assign(this, data);
    this._id = "mock-id-123";
  }
  async save() {
    return this;
  }
}

async function runMockTests() {
  console.log("Running Consent Framework Mock Tests...\n");
  let passed = 0;
  let failed = 0;
  let auditLogs = [];

  // Mock Dependencies
  auditService.log = async (logData) => {
    auditLogs.push(logData);
  };

  Consent.prototype.save = async function() {
    this._id = "mock-consent-123";
    return this;
  };

  let mockDbConsents = [];

  Consent.findById = async (id) => {
    return mockDbConsents.find(c => c._id === id) || null;
  };

  Consent.findOne = async (query) => {
    return mockDbConsents.find(c => {
      let match = true;
      if (query.patientId && c.patientId.toString() !== query.patientId.toString()) match = false;
      if (query.purpose && c.purpose !== query.purpose) match = false;
      if (query.status && c.status !== query.status) match = false;
      if (query.expiresAt && query.expiresAt.$gt) {
        if (new Date(c.expiresAt) <= new Date()) match = false;
      }
      return match;
    }) || null;
  };

  const mockPatientId = "609b1f3c9d3f1a0015f12345";
  const mockUserId = "609b1f3c9d3f1a0015f12346";
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);

  // Test 1: Create GRANTED consent
  try {
    auditLogs = [];
    const consent = await consentService.createConsent({
      patientId: mockPatientId,
      purpose: "Care provisioning",
      requestedDataTypes: ["Observation"],
      expiresAt: futureDate,
      audioConsentProvided: true,
      createdBy: mockUserId,
      ipAddress: "127.0.0.1"
    });
    assert.strictEqual(consent.status, "GRANTED");
    assert.strictEqual(consent.audioConsentProvided, true);
    assert.strictEqual(auditLogs.length, 1);
    assert.strictEqual(auditLogs[0].action, "CONSENT_GRANTED");
    mockDbConsents.push(consent);
    console.log("✅ Test 1: GRANTED consent works & audioConsentProvided handled");
    passed++;
  } catch (e) {
    console.error("❌ Test 1 Failed", e);
    failed++;
  }

  // Test 2: purpose and dataTypes checked
  try {
    const hasConsent = await consentService.checkConsent({
      patientId: mockPatientId,
      purpose: "Care provisioning",
      dataTypes: ["Observation"]
    });
    console.log("hasConsent:", hasConsent, mockDbConsents);
    assert.strictEqual(hasConsent, true);

    const hasConsentBadType = await consentService.checkConsent({
      patientId: mockPatientId,
      purpose: "Care provisioning",
      dataTypes: ["MedicationStatement"]
    });
    assert.strictEqual(hasConsentBadType, false);
    
    console.log("✅ Test 2: purpose and requested dataTypes are checked");
    passed++;
  } catch (e) {
    console.error("❌ Test 2 Failed", e);
    failed++;
  }

  // Test 3: patient ownership checked
  try {
    const hasConsentOtherPatient = await consentService.checkConsent({
      patientId: "patient-2",
      purpose: "Care provisioning",
      dataTypes: ["Observation"]
    });
    assert.strictEqual(hasConsentOtherPatient, false);
    console.log("✅ Test 3: patient ownership/authorization is checked");
    passed++;
  } catch (e) {
    console.error("❌ Test 3 Failed", e);
    failed++;
  }

  // Test 4: REVOKED consent cannot authorize access
  try {
    auditLogs = [];
    const revokedConsent = await consentService.revokeConsent({
      consentId: mockDbConsents[0]._id,
      revokedBy: mockUserId,
      ipAddress: "127.0.0.1"
    });
    assert.strictEqual(revokedConsent.status, "REVOKED");
    assert.strictEqual(auditLogs.length, 1);
    assert.strictEqual(auditLogs[0].action, "CONSENT_REVOKED");
    
    const hasConsentRevoked = await consentService.checkConsent({
      patientId: mockPatientId,
      purpose: "Care provisioning",
      dataTypes: ["Observation"]
    });
    assert.strictEqual(hasConsentRevoked, false);
    console.log("✅ Test 4: REVOKED consent cannot authorize access");
    passed++;
  } catch (e) {
    console.error("❌ Test 4 Failed", e);
    failed++;
  }

  // Test 5: EXPIRED consent cannot authorize access
  try {
    const expiredConsent = new Consent({
      patientId: mockPatientId,
      purpose: "Research",
      requestedDataTypes: ["All"],
      status: "GRANTED",
      expiresAt: pastDate
    });
    expiredConsent._id = "mock-expired-123";
    mockDbConsents.push(expiredConsent);

    const hasConsentExpired = await consentService.checkConsent({
      patientId: mockPatientId,
      purpose: "Research",
      dataTypes: ["Observation"]
    });
    assert.strictEqual(hasConsentExpired, false);
    console.log("✅ Test 5: EXPIRED consent cannot authorize access");
    passed++;
  } catch (e) {
    console.error("❌ Test 5 Failed", e);
    failed++;
  }

  // Test 6: DENIED consent works
  try {
    const deniedConsent = new Consent({
      patientId: mockPatientId,
      purpose: "Marketing",
      requestedDataTypes: ["All"],
      status: "DENIED",
      expiresAt: futureDate
    });
    mockDbConsents.push(deniedConsent);

    const hasConsentDenied = await consentService.checkConsent({
      patientId: mockPatientId,
      purpose: "Marketing",
      dataTypes: ["Patient"]
    });
    assert.strictEqual(hasConsentDenied, false); // findOne looks for 'GRANTED'
    console.log("✅ Test 6: DENIED consent works");
    passed++;
  } catch (e) {
    console.error("❌ Test 6 Failed", e);
    failed++;
  }

  // Test 7: invalid input returns appropriate errors
  try {
    await consentService.revokeConsent({ consentId: "non-existent", revokedBy: "user" });
    console.error("❌ Test 7 Failed: Should have thrown");
    failed++;
  } catch (e) {
    assert.strictEqual(e.message, "Consent not found");
    console.log("✅ Test 7: invalid input returns appropriate errors");
    passed++;
  }

  console.log(`\nMock Test Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runMockTests();
