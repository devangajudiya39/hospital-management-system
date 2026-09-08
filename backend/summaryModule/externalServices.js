async function callInterviewAPI(payload) {
  const response = await fetch(process.env.NISARG_INTERVIEW_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    console.error('Full error response:', JSON.stringify(data, null, 2));
    throw new Error('Interview API call failed');
  }
  return data;
}

module.exports = { callInterviewAPI };