
module.exports = {
  chief_complaint: 'fever',
  chief_complaint_display_name: 'Fever',
  chief_complaint_confidence: 0.99,
  hpi: [
    { id: 'duration', question: 'How many days have you had the fever?', answer: 'lt_3_days' },
    { id: 'pattern', question: 'Is the fever continuous, or does it come and go with chills?', answer: 'continuous' },
    { id: 'peak_temp', question: 'How high has the fever gone, if measured?', answer: '100_102' },
    { id: 'associated_symptoms', question: 'Any other symptoms — rash, joint pain, cough, loose motions, burning urine, headache?', answer: ['joint_pain'] }
  ],
  additional_history: [],
  extended_history: {
    past_medical_history: [
      { id: 'pmh_chronic_conditions', question: 'Do you have any long-term medical conditions?', answer: ['tuberculosis'] },
      { id: 'pmh_past_surgeries', question: 'Have you had any surgeries in the past?', answer: 'yes' },
      { id: 'pmh_hospitalizations', question: 'Have you been hospitalized for any reason in the past?', answer: 'no' }
    ],
    drug_history: [
      { id: 'dh_current_medications', question: 'Are you currently taking any medications regularly?', answer: 'no medications' },
      { id: 'dh_drug_allergies', question: 'Do you have any known allergies to medications?', answer: ['sulfa_drugs'] },
      { id: 'dh_recent_new_medication', question: 'Have you started any new medication in the last month?', answer: 'yes' }
    ],
    family_history: [
      { id: 'fh_family_conditions', question: 'Does anyone in your immediate family have any of these conditions?', answer: ['hypertension'] },
      { id: 'fh_early_cardiac_death', question: 'Has any close family member died suddenly or young from a heart problem?', answer: 'yes' }
    ],
    personal_history: [
      { id: 'ph_smoking_status', question: 'Do you currently smoke, or have you smoked in the past?', answer: 'ex_smoker' },
      { id: 'ph_alcohol_use', question: 'Do you drink alcohol?', answer: 'occasionally' },
      { id: 'ph_occupation', question: 'What is your occupation?', answer: '50000 per month' },
      { id: 'ph_physical_activity', question: 'How would you describe your usual level of physical activity?', answer: 'sedentary' }
    ]
  },
  review_of_systems: {
    general: [
      { id: 'ros_fatigue', question: 'Have you been feeling unusually tired lately?', answer: 'yes' },
      { id: 'ros_sleep', question: 'Any recent change in your sleep?', answer: 'no sleeping regular' },
      { id: 'ros_appetite_general', question: 'Any change in appetite or energy levels?', answer: 'no' }
    ],
    respiratory: [
      { id: 'ros_wheeze', question: 'Do you ever hear a whistling sound when you breathe?', answer: 'no' },
      { id: 'ros_night_cough', question: 'Does a cough wake you at night?', answer: 'no' },
      { id: 'ros_smoking', question: 'Do you currently smoke, or have you smoked in the past?', answer: 'no' }
    ],
    gi: [
      { id: 'ros_appetite', question: 'Has your appetite changed recently?', answer: 'no' },
      { id: 'ros_weight_change', question: 'Any unintentional weight loss or gain recently?', answer: 'no' },
      { id: 'ros_bowel_habit', question: 'Any recent change in your usual bowel habit?', answer: 'no' }
    ],
    genitourinary: [
      { id: 'ros_urinary_frequency', question: 'Any change in how often you urinate?', answer: 'once in a day' },
      { id: 'ros_urinary_burning', question: 'Any burning or pain while urinating?', answer: 'no' }
    ]
  },
  ayush: {},
  red_flags: { detected: false, severity: null, details: [] }
};