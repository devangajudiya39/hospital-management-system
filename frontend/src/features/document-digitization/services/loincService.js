const LOINC_FHIR_URL = "https://fhir.loinc.org/CodeSystem/$lookup";

/**
 * Fetch medical code metadata from LOINC FHIR Server
 * @param {string} loincCode - e.g. "718-7" for Hemoglobin
 */
export async function lookupLoincCode(loincCode) {
  const authToken = import.meta.env.VITE_LOINC_AUTH_TOKEN;

  if (!authToken) {
    console.warn("LOINC Auth token missing in .env");
    return null;
  }

  try {
    const response = await fetch(`${LOINC_FHIR_URL}?system=http://loinc.org&code=${loincCode}`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${authToken}`,
        "Accept": "application/fhir+json"
      }
    });

    if (!response.ok) {
      throw new Error(`LOINC API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("LOINC Lookup failed:", error);
    return null;
  }
}