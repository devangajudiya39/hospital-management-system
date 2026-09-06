const { mapPatient } = require("./patientMapper");
const { mapEncounter } = require("./encounterMapper");
const { mapCondition } = require("./conditionMapper");
const { mapMedicationStatements } = require("./medicationMapper");
const { mapObservation } = require("./observationMapper");

const fhirMapper = {
  mapPatient,
  mapEncounter,
  mapCondition,
  mapMedicationStatements,
  mapObservation
};

module.exports = fhirMapper;
