/**
 * Master Clinical Reference Dictionary & LOINC Mapping
 * Contains standard biological intervals and official LOINC codes.
 */
export const CLINICAL_REFERENCE_DATABASE = {
  HAEMOGLOBIN: {
    loincCode: "718-7",
    displayName: "Hemoglobin",
    min: 12.0,
    max: 15.0,
    unit: "g/dL",
    category: "Hematology",
  },
  RBC_COUNT: {
    loincCode: "26453-1",
    displayName: "RBC Count",
    min: 3.8,
    max: 4.8,
    unit: "million/uL",
    category: "Hematology",
  },
  HEMATOCRIT: {
    loincCode: "4544-3",
    displayName: "Hematocrit (HCT)",
    min: 36.0,
    max: 46.0,
    unit: "%",
    category: "Hematology",
  },
  MCV: {
    loincCode: "30428-7",
    displayName: "MCV",
    min: 83.0,
    max: 101.0,
    unit: "fL",
    category: "Hematology",
  },
  WBC_COUNT: {
    loincCode: "6690-2",
    displayName: "WBC Count",
    min: 4000,
    max: 10000,
    unit: "/uL",
    category: "Hematology",
  },
  PLATELETS: {
    loincCode: "777-3",
    displayName: "Platelet Count",
    min: 150000,
    max: 410000,
    unit: "/uL",
    category: "Hematology",
  },
  TSH: {
    loincCode: "11580-8",
    displayName: "Thyroid Stimulating Hormone (TSH)",
    min: 0.51,
    max: 4.3,
    unit: "uIU/ml",
    category: "Endocrine",
  },
  CREATININE: {
    loincCode: "2160-0",
    displayName: "Creatinine",
    min: 0.6,
    max: 1.1,
    unit: "mg/dL",
    category: "Renal",
  },
  FASTING_GLUCOSE: {
    loincCode: "1558-6",
    displayName: "Fasting Glucose",
    min: 70,
    max: 99,
    unit: "mg/dL",
    category: "Metabolic",
  },
  CHOLESTEROL: {
    loincCode: "2093-3",
    displayName: "Total Cholesterol",
    min: 0,
    max: 200,
    unit: "mg/dL",
    category: "Lipid",
  },
};

/**
 * Maps raw OCR strings to standardized internal keys
 * @param {string} rawText
 * @returns {string|null} Key in CLINICAL_REFERENCE_DATABASE
 */
export const normalizeTestKey = (rawText) => {
  if (!rawText) return null;
  const clean = rawText.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (clean.includes("HAEMOGLOBIN") || clean.includes("HEMOGLOBIN") || clean.includes("HGB")) return "HAEMOGLOBIN";
  if (clean.includes("RBC") && !clean.includes("WBC")) return "RBC_COUNT";
  if (clean.includes("HEMATOCRIT") || clean.includes("HCT")) return "HEMATOCRIT";
  if (clean.includes("MCV")) return "MCV";
  if (clean.includes("WBC") || clean.includes("LEUKOCYTE")) return "WBC_COUNT";
  if (clean.includes("PLATELET") || clean.includes("PLT")) return "PLATELETS";
  if (clean.includes("TSH") || clean.includes("THYROID")) return "TSH";
  if (clean.includes("CREATININE")) return "CREATININE";
  if (clean.includes("GLUCOSE") || clean.includes("FASTING")) return "FASTING_GLUCOSE";
  if (clean.includes("CHOLESTEROL")) return "CHOLESTEROL";

  return null;
};

/**
 * Evaluates extracted values against standard biological ranges
 * @param {string} rawTestName 
 * @param {number} numericValue 
 * @param {Object} [printedRange] - Optional { min, max } directly extracted from document OCR
 */
export const evaluateLabResult = (rawTestName, numericValue, printedRange = null) => {
  const key = normalizeTestKey(rawTestName);
  const matchedData = key ? CLINICAL_REFERENCE_DATABASE[key] : null;

  // Prefer printed reference interval from document if available; fallback to master reference database
  const activeRange = printedRange || (matchedData ? { min: matchedData.min, max: matchedData.max } : null);

  if (!activeRange || numericValue === null || isNaN(numericValue)) {
    return {
      status: "UNCHECKED",
      isAbnormal: false,
      loincCode: matchedData?.loincCode || "N/A",
      displayName: matchedData?.displayName || rawTestName,
      range: activeRange,
    };
  }

  if (numericValue < activeRange.min) {
    return {
      status: "LOW",
      isAbnormal: true,
      loincCode: matchedData?.loincCode || "N/A",
      displayName: matchedData?.displayName || rawTestName,
      range: activeRange,
    };
  }

  if (numericValue > activeRange.max) {
    return {
      status: "HIGH",
      isAbnormal: true,
      loincCode: matchedData?.loincCode || "N/A",
      displayName: matchedData?.displayName || rawTestName,
      range: activeRange,
    };
  }

  return {
    status: "NORMAL",
    isAbnormal: false,
    loincCode: matchedData?.loincCode || "N/A",
    displayName: matchedData?.displayName || rawTestName,
    range: activeRange,
  };
};