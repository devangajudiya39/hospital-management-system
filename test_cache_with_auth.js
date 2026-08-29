const http = require('http');

const makeRequest = (path, method = 'GET', body = null, token = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function runTests() {
    try {
        console.log("=== Registering and Logging in Patient ===");
        const email = `patient${Date.now()}@test.com`;
        await makeRequest('/api/auth/register', 'POST', {
            name: 'Test Patient',
            email,
            password: 'password123',
            role: 'patient'
        });

        const loginRes = await makeRequest('/api/auth/login', 'POST', {
            email,
            password: 'password123'
        });
        
        const patientToken = loginRes.data.token;
        if (!patientToken) throw new Error("Failed to get patient token");

        console.log("\n=== Testing DOCTORS endpoint ===");
        console.log("Request 1 (Should be MISS):");
        const docRes1 = await makeRequest('/api/patient/doctors', 'GET', null, patientToken);
        await delay(500);
        console.log("Request 2 (Should be HIT):");
        await makeRequest('/api/patient/doctors', 'GET', null, patientToken);

        console.log("\n=== Registering and Logging in Doctor ===");
        const docEmail = `doctor${Date.now()}@test.com`;
        await makeRequest('/api/auth/register', 'POST', {
            name: 'Test Doctor',
            email: docEmail,
            password: 'password123',
            role: 'doctor'
        });

        const docLoginRes = await makeRequest('/api/auth/login', 'POST', {
            email: docEmail,
            password: 'password123'
        });

        const docToken = docLoginRes.data.token;
        if (!docToken) throw new Error("Failed to get doctor token");

        console.log("\n=== Testing MEDICINES endpoint ===");
        console.log("Request 1 (Should be MISS):");
        await makeRequest('/api/doctor/medicines', 'GET', null, docToken);
        await delay(500);
        console.log("Request 2 (Should be HIT):");
        await makeRequest('/api/doctor/medicines', 'GET', null, docToken);

        console.log("\n=== Testing AVAILABILITY endpoint ===");
        const today = new Date().toISOString().split('T')[0];
        
        let doctorId = "invalid_id";
        if (docRes1.data && docRes1.data.length > 0) {
            doctorId = docRes1.data[0]._id;
        } else {
            console.log("No doctors found in db, creating one using mongoose directly is hard here, so we will skip hitting 200 or assume one exists.");
        }
        
        console.log("Request 1 (Should be MISS):");
        const r1 = await makeRequest(`/api/patient/availability?doctorId=${doctorId}&date=${today}T10:00:00.000Z`, 'GET', null, patientToken);
        console.log(r1.status);
        await delay(500);
        console.log("Request 2 (Should be HIT - using same raw date string):");
        const r2 = await makeRequest(`/api/patient/availability?doctorId=${doctorId}&date=${today}T10:00:00.000Z`, 'GET', null, patientToken);
        console.log(r2.status);
        await delay(500);
        console.log("Request 3 (Should be HIT - using YYYY-MM-DD):");
        const r3 = await makeRequest(`/api/patient/availability?doctorId=${doctorId}&date=${today}`, 'GET', null, patientToken);
        console.log(r3.status);

    } catch (e) {
        console.error("Test failed", e);
    }
}

runTests();
