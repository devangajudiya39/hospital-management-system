const auditService = require("../../audit/auditService");

const { writePatient } = require("./patientWriteback");
const { writeEncounter } = require("./encounterWriteback");
const { writeCondition } = require("./conditionWriteback");
const { writeMedicationStatement } = require("./medicationWriteback");
const { writeObservation } = require("./observationWriteback");

async function writeResource(fhirResource, userId = null, patientId = null) {
  if (!fhirResource || !fhirResource.resourceType) {
    return { success: false, error: "Missing resourceType" };
  }

  let result;
  switch (fhirResource.resourceType) {
    case "Patient":
      result = await writePatient(fhirResource);
      break;
    case "Encounter":
      result = await writeEncounter(fhirResource);
      break;
    case "Condition":
      result = await writeCondition(fhirResource);
      break;
    case "MedicationStatement":
      result = await writeMedicationStatement(fhirResource);
      break;
    case "Observation":
      result = await writeObservation(fhirResource);
      break;
    default:
      result = { success: false, error: "Unsupported resourceType" };
  }

  // Generate audit log (minimal details, no payload)
  const auditAction = result.success ? "FHIR_WRITEBACK_SUCCESS" : "FHIR_WRITEBACK_FAILED";
  const auditDetails = result.success
    ? `Successfully updated ${fhirResource.resourceType} (ID: ${fhirResource.id})`
    : `Failed to update ${fhirResource.resourceType} (ID: ${fhirResource.id}): ${result.error}`;

  // Log audit async so we don't block
  auditService.log({
    userId: userId,
    patientId: patientId,
    action: auditAction,
    category: "SYSTEM",
    details: { message: auditDetails },
    req: null // Can be wired up later if called from a route
  }).catch(() => {});

  return result;
}

module.exports = { writeResource };
