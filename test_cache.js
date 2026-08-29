const http = require('http');

const makeRequest = (path, method = 'GET', body = null) => {
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

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function runTests() {
    try {
        console.log("=== Testing DOCTORS endpoint ===");
        console.log("Request 1 (Should be MISS):");
        await makeRequest('/api/patient/doctors');
        await delay(500);
        console.log("Request 2 (Should be HIT):");
        await makeRequest('/api/patient/doctors');

        console.log("\n=== Testing MEDICINES endpoint ===");
        console.log("Request 1 (Should be MISS):");
        await makeRequest('/api/doctor/medicines');
        await delay(500);
        console.log("Request 2 (Should be HIT):");
        await makeRequest('/api/doctor/medicines');

    } catch (e) {
        console.error("Test failed", e);
    }
}

runTests();
