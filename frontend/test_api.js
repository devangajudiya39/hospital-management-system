const fetch = require('node-fetch');

(async () => {
  const payload = {
    input_mode: 'touch',
    language: 'en',
    assessment_type: 'modern',
    ayush_assessments: [],
    patient_id: null
  };
  
  try {
    const res = await fetch('https://vps-nisarg-10gb-bjyqw.aiccloud.online/interview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Response:', text);
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
