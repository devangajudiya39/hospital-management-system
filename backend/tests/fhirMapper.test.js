const assert = require("assert");
const fhirMapper = require("../services/fhir/fhirMapper");
const mongoose = require("mongoose");

function runTests() {
  console.log("Running FHIR Mapper Tests...\n");
  let passed = 0;
  let failed = 0;

  function runTest(name, testFn) {
    try {
      testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ ${name} Failed`);
      console.error(e);
      failed++;
    }
  }

  // Common IDs for testing ObjectId conversion
  const patientId = new mongoose.Types.ObjectId();
  const doctorId = new mongoose.Types.ObjectId();
  const appointmentId = new mongoose.Types.ObjectId();
  const consultationId = new mongoose.Types.ObjectId();
  const prescriptionId = new mongoose.Types.ObjectId();
  const labReportId = new mongoose.Types.ObjectId();

  // 1. Patient mapping & 2. Patient date formatting & 17. MongoDB ObjectId conversion
  runTest("Test 1 & 2 & 17: Patient mapping, date formatting, and ObjectId conversion", () => {
    const patientDoc = {
      _id: patientId,
      gender: "male",
      dateOfBirth: new Date("1990-05-15T00:00:00Z"),
      phoneNumber: "1234567890",
      userId: {
        name: "John Doe",
        email: "john@example.com"
      }
    };
    const fhirPatient = fhirMapper.mapPatient(patientDoc);
    assert.strictEqual(fhirPatient.resourceType, "Patient");
    assert.strictEqual(fhirPatient.id, patientId.toString());
    assert.strictEqual(fhirPatient.gender, "male");
    assert.strictEqual(fhirPatient.birthDate, "1990-05-15");
    assert.strictEqual(fhirPatient.name[0].text, "John Doe");
    assert.strictEqual(fhirPatient.telecom.length, 2);
    assert.strictEqual(fhirPatient.telecom[0].value, "1234567890");
    assert.strictEqual(fhirPatient.telecom[1].value, "john@example.com");
  });

  // 3. Patient missing User
  runTest("Test 3: Patient missing populated User", () => {
    const patientDoc = {
      _id: patientId,
      gender: "female"
    };
    const fhirPatient = fhirMapper.mapPatient(patientDoc);
    assert.strictEqual(fhirPatient.gender, "female");
    assert.strictEqual(fhirPatient.name, undefined); // Should not crash
  });

  // 4. Encounter mapping & 5. Encounter status mapping & 15. Correct Patient references
  runTest("Test 4 & 5 & 15: Encounter mapping, status, and patient reference", () => {
    const consultationDoc = {
      _id: consultationId,
      patientId: patientId, // as ObjectId directly
      doctorId: doctorId,
      status: "pending",
      appointmentId: {
        date: new Date("2026-10-01T10:00:00Z")
      }
    };
    const fhirEncounter = fhirMapper.mapEncounter(consultationDoc);
    assert.strictEqual(fhirEncounter.resourceType, "Encounter");
    assert.strictEqual(fhirEncounter.id, consultationId.toString());
    assert.strictEqual(fhirEncounter.status, "planned");
    assert.strictEqual(fhirEncounter.subject.reference, `Patient/${patientId.toString()}`);
    assert.strictEqual(fhirEncounter.participant[0].individual.reference, `Practitioner/${doctorId.toString()}`);
    assert.strictEqual(fhirEncounter.period.start, new Date("2026-10-01T10:00:00Z").toISOString());
  });

  // 6. Encounter missing Appointment
  runTest("Test 6: Encounter missing Appointment", () => {
    const consultationDoc = {
      _id: consultationId,
      status: "completed"
    };
    const fhirEncounter = fhirMapper.mapEncounter(consultationDoc);
    assert.strictEqual(fhirEncounter.status, "finished");
    assert.strictEqual(fhirEncounter.period, undefined); // Handled safely
  });

  // 7. Condition mapping & 16. Correct Encounter references & 18. No invented terminology codes
  runTest("Test 7 & 16 & 18: Condition mapping, encounter ref, no invented codes", () => {
    const consultationDoc = {
      _id: consultationId,
      patientId: patientId,
      diagnosis: "Viral Fever"
    };
    const condition = fhirMapper.mapCondition(consultationDoc);
    assert.strictEqual(condition.resourceType, "Condition");
    assert.strictEqual(condition.id, `cond-${consultationId.toString()}`);
    assert.strictEqual(condition.code.text, "Viral Fever");
    assert.strictEqual(condition.code.coding, undefined); // No invented SNOMED/ICD codes
    assert.strictEqual(condition.subject.reference, `Patient/${patientId.toString()}`);
    assert.strictEqual(condition.encounter.reference, `Encounter/${consultationId.toString()}`);
  });

  // 8. Empty diagnosis returns null
  runTest("Test 8: Empty diagnosis returns null", () => {
    const emptyDoc = { _id: consultationId, diagnosis: "   " };
    assert.strictEqual(fhirMapper.mapCondition(emptyDoc), null);
    assert.strictEqual(fhirMapper.mapCondition({}), null);
  });

  // 9. MedicationStatement with one medicine & 10. MedicationStatement with multiple medicines
  runTest("Test 9 & 10: MedicationStatement multiple medicines", () => {
    const prescriptionDoc = {
      _id: prescriptionId,
      patientId: patientId,
      medicines: [
        { medicineId: { name: "Paracetamol" }, dosage: "500mg BD", duration: "5 days" },
        { medicineId: { name: "Amoxicillin" }, dosage: "250mg TDS" } // no duration
      ]
    };
    const stmts = fhirMapper.mapMedicationStatements(prescriptionDoc);
    assert.strictEqual(stmts.length, 2);
    assert.strictEqual(stmts[0].id, `medstmt-${prescriptionId.toString()}-0`);
    assert.strictEqual(stmts[0].medicationCodeableConcept.text, "Paracetamol");
    assert.strictEqual(stmts[0].dosage[0].text, "500mg BD for 5 days");
    assert.strictEqual(stmts[1].id, `medstmt-${prescriptionId.toString()}-1`);
    assert.strictEqual(stmts[1].medicationCodeableConcept.text, "Amoxicillin");
    assert.strictEqual(stmts[1].dosage[0].text, "250mg TDS");
  });

  // 11. Missing populated Medicine
  runTest("Test 11: Missing populated Medicine in Prescription", () => {
    const prescriptionDoc = {
      _id: prescriptionId,
      patientId: patientId,
      medicines: [
        { medicineId: "unpopulated-id", dosage: "500mg" },
        { dosage: "test" } // missing medicineId
      ]
    };
    const stmts = fhirMapper.mapMedicationStatements(prescriptionDoc);
    assert.strictEqual(stmts.length, 0); // Safely skipped
  });

  // 12. Observation mapping & 14. Missing resultDetails
  runTest("Test 12 & 14: Observation mapping, safe missing result details", () => {
    const labReportDoc = {
      _id: labReportId,
      patientId: patientId,
      status: "completed",
      requestId: { testType: "CBC" },
      resultDetails: "" // missing result
    };
    const obs = fhirMapper.mapObservation(labReportDoc);
    assert.strictEqual(obs.resourceType, "Observation");
    assert.strictEqual(obs.id, `obs-${labReportId.toString()}`);
    assert.strictEqual(obs.status, "final");
    assert.strictEqual(obs.code.text, "CBC");
    assert.strictEqual(obs.valueString, undefined); // safely omitted
  });

  // 13. Missing LabRequest
  runTest("Test 13: Missing LabRequest populated data", () => {
    const labReportDoc = {
      _id: labReportId,
      patientId: patientId,
      requestId: "unpopulated-id"
    };
    const obs = fhirMapper.mapObservation(labReportDoc);
    assert.strictEqual(obs, null); // Cannot create observation without testType
  });

  console.log(`\nFHIR Mapper Test Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
