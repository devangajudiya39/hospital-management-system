const assert = require("assert");
const mongoose = require("mongoose");
const { writeResource } = require("../services/fhir/writeback/fhirWriteback");

// Monkey-patch Mongoose models for testing
const Patient = require("../models/Patient");
const User = require("../models/user");
const Consultation = require("../models/Consultation");
const Doctor = require("../models/doctor");
const Prescription = require("../models/Prescription");
const Medicine = require("../models/Medicine");
const LabReport = require("../models/LabReport");
const LabRequest = require("../models/LabRequest");
const auditService = require("../services/audit/auditService");

async function runTests() {
  console.log("Running FHIR Writeback Tests...\n");
  let passed = 0;
  let failed = 0;

  function mockModel(Model, mockData) {
    Model.findById = (id) => {
      const query = {
        populate: function() { return this; },
        then: function(resolve) {
          const doc = mockData[id.toString()];
          if (doc) {
            doc.save = async () => {};
            resolve(doc);
          } else {
            resolve(null);
          }
        }
      };
      return query;
    };
    Model.find = async (query) => {
      if (query.name) {
        return Object.values(mockData).filter(m => m.name === query.name);
      }
      return [];
    };
  }

  // Common IDs
  const patientId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId().toString();
  const consultationId = new mongoose.Types.ObjectId().toString();
  const doctorId = new mongoose.Types.ObjectId().toString();
  const prescriptionId = new mongoose.Types.ObjectId().toString();
  const medicineId = new mongoose.Types.ObjectId().toString();
  const labReportId = new mongoose.Types.ObjectId().toString();
  
  // Setup mock data
  const mockPatients = {
    [patientId]: { _id: patientId, userId: userId, gender: "male" }
  };
  const mockUsers = {
    [userId]: { _id: userId, name: "Old Name", email: "old@example.com" }
  };
  const mockConsultations = {
    [consultationId]: { _id: consultationId, patientId: patientId, status: "pending", diagnosis: "" }
  };
  const mockDoctors = {
    [doctorId]: { _id: doctorId, name: "Dr. Smith" }
  };
  const mockPrescriptions = {
    [prescriptionId]: { _id: prescriptionId, patientId: patientId, medicines: [ { dosage: "old dosage" } ] }
  };
  const mockMedicines = {
    [medicineId]: { _id: medicineId, name: "Paracetamol" }
  };
  const mockLabReports = {
    [labReportId]: { _id: labReportId, patientId: patientId, requestId: { testType: "CBC" }, resultDetails: "", status: "pending" }
  };

  mockModel(Patient, mockPatients);
  mockModel(User, mockUsers);
  mockModel(Consultation, mockConsultations);
  mockModel(Doctor, mockDoctors);
  mockModel(Prescription, mockPrescriptions);
  mockModel(Medicine, mockMedicines);
  mockModel(LabReport, mockLabReports);
  
  // Mock auditService
  auditService.log = async (args) => {
    // silently consume
  };

  async function runTest(name, testFn) {
    try {
      await testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ ${name} Failed`);
      console.error(e);
      failed++;
    }
  }

  // --- PATIENT TESTS ---
  await runTest("Test 1: Valid Patient update", async () => {
    const fhirPatient = {
      resourceType: "Patient",
      id: patientId,
      gender: "female",
      birthDate: "1990-01-01",
      name: [{ text: "New Name" }]
    };
    const res = await writeResource(fhirPatient);
    assert.strictEqual(res.success, true);
    assert.strictEqual(mockUsers[userId].name, "New Name");
    assert.strictEqual(mockPatients[patientId].gender, "female");
  });

  await runTest("Test 2: Patient not found & missing userId & User not found", async () => {
    const badPatient = { resourceType: "Patient", id: new mongoose.Types.ObjectId().toString() };
    const res = await writeResource(badPatient);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, "Patient not found");
  });

  await runTest("Test 3: Update only fields actually supplied", async () => {
    const fhirPatient = { resourceType: "Patient", id: patientId };
    mockUsers[userId].name = "Should Not Change";
    const res = await writeResource(fhirPatient);
    assert.strictEqual(res.success, true);
    assert.strictEqual(mockUsers[userId].name, "Should Not Change");
  });

  // --- ENCOUNTER TESTS ---
  await runTest("Test 4: Valid Encounter status update & references", async () => {
    const fhirEncounter = {
      resourceType: "Encounter",
      id: consultationId,
      status: "finished",
      subject: { reference: `Patient/${patientId}` }
    };
    const res = await writeResource(fhirEncounter);
    assert.strictEqual(res.success, true);
    assert.strictEqual(mockConsultations[consultationId].status, "completed");
  });

  await runTest("Test 5: Encounter invalid references rejected", async () => {
    const fhirEncounter = {
      resourceType: "Encounter",
      id: consultationId,
      subject: { reference: "Patient/12345" }
    };
    const res = await writeResource(fhirEncounter);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, "Invalid Patient ObjectId in reference");
  });

  // --- CONDITION TESTS ---
  await runTest("Test 6: Valid Condition diagnosis update", async () => {
    const fhirCondition = {
      resourceType: "Condition",
      id: `cond-${consultationId}`,
      code: { text: "Fever" },
      subject: { reference: `Patient/${patientId}` }
    };
    const res = await writeResource(fhirCondition);
    assert.strictEqual(res.success, true);
    assert.strictEqual(mockConsultations[consultationId].diagnosis, "Fever");
  });

  await runTest("Test 7: Empty diagnosis rejected & invalid ID", async () => {
    const badCond = { resourceType: "Condition", id: `cond-${consultationId}`, code: { text: "   " } };
    const res1 = await writeResource(badCond);
    assert.strictEqual(res1.success, false);
    assert.strictEqual(res1.error, "Empty diagnosis rejected");
  });

  // --- MEDICATION TESTS ---
  await runTest("Test 8: Valid MedicationStatement update", async () => {
    const fhirMed = {
      resourceType: "MedicationStatement",
      id: `medstmt-${prescriptionId}-0`,
      medicationCodeableConcept: { text: "Paracetamol" },
      dosage: [{ text: "500mg BD for 5 days" }]
    };
    const res = await writeResource(fhirMed);
    assert.strictEqual(res.success, true);
    assert.strictEqual(mockPrescriptions[prescriptionId].medicines[0].dosage, "500mg BD");
    assert.strictEqual(mockPrescriptions[prescriptionId].medicines[0].duration, "5 days");
  });

  await runTest("Test 9: Invalid Medicine & ambiguous dosage", async () => {
    const fhirMed = {
      resourceType: "MedicationStatement",
      id: `medstmt-${prescriptionId}-0`,
      medicationCodeableConcept: { text: "UnknownMed" },
      dosage: [{ text: "500mg BD" }]
    };
    const res = await writeResource(fhirMed);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, "Medicine not found");
  });

  // --- OBSERVATION TESTS ---
  await runTest("Test 10: Valid Observation result update", async () => {
    const fhirObs = {
      resourceType: "Observation",
      id: `obs-${labReportId}`,
      valueString: "Hb 12 g/dL",
      status: "final",
      code: { text: "CBC" },
      subject: { reference: `Patient/${patientId}` }
    };
    const res = await writeResource(fhirObs);
    assert.strictEqual(res.success, true);
    assert.strictEqual(mockLabReports[labReportId].resultDetails, "Hb 12 g/dL");
    assert.strictEqual(mockLabReports[labReportId].status, "completed");
  });

  await runTest("Test 11: Mismatched Observation testType rejected", async () => {
    const fhirObs = {
      resourceType: "Observation",
      id: `obs-${labReportId}`,
      code: { text: "X-Ray" }
    };
    const res = await writeResource(fhirObs);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, "Mismatched LabRequest testType");
  });

  // --- GENERAL ---
  await runTest("Test 12: Unsupported resourceType rejected", async () => {
    const res = await writeResource({ resourceType: "UnsupportedType", id: "123" });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, "Unsupported resourceType");
  });

  await runTest("Test 13: Malformed ObjectIds rejected", async () => {
    const res = await writeResource({ resourceType: "Encounter", id: "invalid-id" });
    assert.strictEqual(res.success, false);
  });

  console.log(`\nFHIR Writeback Test Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
