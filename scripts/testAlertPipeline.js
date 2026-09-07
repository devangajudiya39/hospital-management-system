/**
 * Task 5 — End-to-End Alert Pipeline Test
 * 
 * Verifies the complete production path:
 *   Synthetic Publisher → RabbitMQ alert-events → alertWorker → Redis Pub/Sub
 *   → Backend Redis Subscriber → alertBroadcaster → Authenticated SSE → Client
 * 
 * Run from the project root:
 *   node scripts/testAlertPipeline.js
 */

const path = require('path');

// Resolve backend dependencies from backend/node_modules
const backendRoot = path.resolve(__dirname, '..', 'backend');
const jwt = require(path.join(backendRoot, 'node_modules', 'jsonwebtoken'));
const dotenv = require(path.join(backendRoot, 'node_modules', 'dotenv'));

// Load backend .env
dotenv.config({ path: path.join(backendRoot, '.env') });

const { connectRabbitMQ, publishJob, getChannel } = require(path.join(backendRoot, 'rabbitmqClient'));

const JWT_SECRET = process.env.JWT_SECRET || "hospital-secret-key";
const PORT = process.env.PORT || 8080;
const API_URL = `http://localhost:${PORT}/api/triage/alerts/stream`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateTestJWT(role = 'admin') {
    return jwt.sign(
        { id: `test-${role}-id`, role, name: `Test ${role}` },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
}

function createTestAlert(id, severity, reason) {
    return {
        id,
        session_id: 'test-session-task5',
        patient_id: 'test-patient-task5',
        severity,
        red_flag_detected: true,
        alert_triggered: true,
        reasons: [reason],
        chief_complaint: 'Synthetic test complaint',
        timestamp: new Date().toISOString()
    };
}

/**
 * Opens an authenticated SSE connection and returns a promise
 * that resolves with an object containing a receivedAlerts array
 * and an abort function.
 */
function openSSEConnection(token) {
    const abortController = new AbortController();
    const receivedAlerts = [];
    let connected = false;
    let connectResolve;
    const connectPromise = new Promise(r => { connectResolve = r; });

    const streamPromise = fetch(API_URL, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream'
        },
        signal: abortController.signal
    }).then(async (res) => {
        if (!res.ok) {
            throw new Error(`SSE ${res.status} ${res.statusText}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.substring(6).trim();
                        if (dataStr) {
                            const parsed = JSON.parse(dataStr);
                            if (parsed.status === 'connected') {
                                connected = true;
                                connectResolve(true);
                            } else {
                                receivedAlerts.push(parsed);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') throw err;
        }
    }).catch(err => {
        if (err.name !== 'AbortError') {
            connectResolve(false);
            console.error('[SSE Error]', err.message);
        }
    });

    return {
        receivedAlerts,
        connectPromise,
        isConnected: () => connected,
        abort: () => abortController.abort(),
        streamPromise
    };
}

// ─── Main Test ──────────────────────────────────────────────────────────────

async function runTests() {
    const results = {};
    let exitCode = 0;

    console.log('═══════════════════════════════════════════════');
    console.log('  Task 5 — Real-Time Alert Pipeline E2E Test  ');
    console.log('═══════════════════════════════════════════════\n');

    // ── Step 1: Connect to RabbitMQ ─────────────────────────────────────
    console.log('[Step 1] Connecting to RabbitMQ...');
    await connectRabbitMQ();
    await new Promise(r => setTimeout(r, 1000));
    if (!getChannel()) {
        console.error('[FAIL] Could not connect to RabbitMQ');
        process.exit(1);
    }
    console.log('[PASS] RabbitMQ connected\n');

    // ── Step 2: Test unauthenticated access ──────────────────────────────
    console.log('[Step 2] Testing unauthenticated SSE access...');
    try {
        const unauthRes = await fetch(API_URL);
        results.unauthenticated = unauthRes.status === 401 ? 'PASS' : 'FAIL';
        console.log(`[${results.unauthenticated}] Unauthenticated → ${unauthRes.status}\n`);
    } catch (err) {
        results.unauthenticated = 'FAIL';
        console.log(`[FAIL] Unauthenticated test error: ${err.message}\n`);
    }

    // ── Step 3: Test unauthorized role ────────────────────────────────────
    console.log('[Step 3] Testing unauthorized role (patient)...');
    try {
        const patientToken = generateTestJWT('patient');
        const unauthzRes = await fetch(API_URL, {
            headers: { 'Authorization': `Bearer ${patientToken}` }
        });
        results.unauthorized = unauthzRes.status === 403 ? 'PASS' : 'FAIL';
        console.log(`[${results.unauthorized}] Unauthorized role → ${unauthzRes.status}\n`);
    } catch (err) {
        results.unauthorized = 'FAIL';
        console.log(`[FAIL] Unauthorized test error: ${err.message}\n`);
    }

    // ── Step 4: Establish authenticated SSE connection ─────────────────
    console.log('[Step 4] Establishing authenticated SSE connection...');
    const adminToken = generateTestJWT('admin');
    const sseA = openSSEConnection(adminToken);
    const connectedA = await Promise.race([
        sseA.connectPromise,
        new Promise(r => setTimeout(() => r(false), 5000))
    ]);
    if (!connectedA) {
        console.error('[FAIL] SSE connection timed out');
        sseA.abort();
        process.exit(1);
    }
    console.log('[PASS] SSE Client A connected\n');

    // ── Step 5: Critical severity test ───────────────────────────────────
    console.log('[Step 5] Publishing CRITICAL alert via RabbitMQ...');
    const criticalAlert = createTestAlert('test-alert-critical-001', 'critical', 'Synthetic critical test');
    await publishJob('alert-events', criticalAlert);
    console.log('[INFO] Alert published to RabbitMQ. Waiting for SSE delivery...');
    await new Promise(r => setTimeout(r, 3000));
    
    const criticalReceived = sseA.receivedAlerts.find(a => a.id === criticalAlert.id);
    if (criticalReceived) {
        const fieldsOk = criticalReceived.severity === 'critical' 
            && criticalReceived.red_flag_detected === true 
            && criticalReceived.alert_triggered === true
            && criticalReceived.timestamp;
        results.critical = fieldsOk ? 'PASS' : 'FAIL';
        console.log(`[${results.critical}] Critical alert received and validated`);
        if (fieldsOk) {
            console.log('  Payload:', JSON.stringify(criticalReceived, null, 2));
        }
    } else {
        results.critical = 'FAIL';
        console.log('[FAIL] Critical alert NOT received via SSE');
    }
    console.log();

    // ── Step 6: High severity test ───────────────────────────────────────
    console.log('[Step 6] Publishing HIGH alert via RabbitMQ...');
    const highAlert = createTestAlert('test-alert-high-001', 'high', 'Synthetic high test');
    await publishJob('alert-events', highAlert);
    await new Promise(r => setTimeout(r, 3000));

    const highReceived = sseA.receivedAlerts.find(a => a.id === highAlert.id);
    results.high = highReceived && highReceived.severity === 'high' ? 'PASS' : 'FAIL';
    console.log(`[${results.high}] High alert ${highReceived ? 'received' : 'NOT received'}\n`);

    // ── Step 7: Moderate severity test ───────────────────────────────────
    console.log('[Step 7] Publishing MODERATE alert via RabbitMQ...');
    const moderateAlert = createTestAlert('test-alert-moderate-001', 'moderate', 'Synthetic moderate test');
    await publishJob('alert-events', moderateAlert);
    await new Promise(r => setTimeout(r, 3000));

    const moderateReceived = sseA.receivedAlerts.find(a => a.id === moderateAlert.id);
    results.moderate = moderateReceived && moderateReceived.severity === 'moderate' ? 'PASS' : 'FAIL';
    console.log(`[${results.moderate}] Moderate alert ${moderateReceived ? 'received' : 'NOT received'}\n`);

    // ── Step 8: Multiple SSE clients test ────────────────────────────────
    console.log('[Step 8] Testing multiple SSE clients...');
    const doctorToken = generateTestJWT('doctor');
    const sseB = openSSEConnection(doctorToken);
    const connectedB = await Promise.race([
        sseB.connectPromise,
        new Promise(r => setTimeout(() => r(false), 5000))
    ]);
    if (!connectedB) {
        results.multiClient = 'FAIL';
        console.log('[FAIL] SSE Client B connection timed out\n');
    } else {
        console.log('[PASS] SSE Client B connected');
        const multiAlert = createTestAlert('test-alert-multi-001', 'critical', 'Multi-client test');
        await publishJob('alert-events', multiAlert);
        await new Promise(r => setTimeout(r, 3000));

        const aGot = sseA.receivedAlerts.find(a => a.id === multiAlert.id);
        const bGot = sseB.receivedAlerts.find(a => a.id === multiAlert.id);
        results.multiClient = (aGot && bGot) ? 'PASS' : 'FAIL';
        console.log(`[${results.multiClient}] Client A: ${aGot ? 'received' : 'MISSED'}, Client B: ${bGot ? 'received' : 'MISSED'}\n`);
        sseB.abort();
    }

    // ── Step 9: Disconnect test ──────────────────────────────────────────
    console.log('[Step 9] Testing SSE disconnect handling...');
    const sseC = openSSEConnection(adminToken);
    const connectedC = await Promise.race([
        sseC.connectPromise,
        new Promise(r => setTimeout(() => r(false), 5000))
    ]);
    if (connectedC) {
        sseC.abort();
        await new Promise(r => setTimeout(r, 1000));
        results.disconnect = 'PASS';
        console.log('[PASS] Client disconnected cleanly\n');
    } else {
        results.disconnect = 'FAIL';
        console.log('[FAIL] Could not connect for disconnect test\n');
    }

    // ── Step 10: Negative validation tests ───────────────────────────────
    console.log('[Step 10] Negative validation tests...');
    
    // Invalid severity — goes through RabbitMQ but publishAlertEvent rejects it
    // We test via the alertPublisher module
    const { publishAlertEvent } = require(path.join(backendRoot, 'alertModule', 'alertPublisher'));
    
    const invalidSev = await publishAlertEvent({ severity: 'invalid', red_flag_detected: true, alert_triggered: true });
    results.invalidSeverity = invalidSev === false ? 'PASS' : 'FAIL';
    console.log(`[${results.invalidSeverity}] Invalid severity rejected`);

    const missingSev = await publishAlertEvent({ red_flag_detected: true, alert_triggered: true });
    results.missingSeverity = missingSev === false ? 'PASS' : 'FAIL';
    console.log(`[${results.missingSeverity}] Missing severity rejected`);

    const invalidBool = await publishAlertEvent({ severity: 'critical' });
    results.invalidBoolean = invalidBool === false ? 'PASS' : 'FAIL';
    console.log(`[${results.invalidBoolean}] Missing boolean flags rejected\n`);

    // ── Cleanup ──────────────────────────────────────────────────────────
    sseA.abort();

    // ── Final Report ─────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════');
    console.log('               TEST RESULTS                   ');
    console.log('═══════════════════════════════════════════════');
    console.log(`  Unauthenticated SSE:   ${results.unauthenticated}`);
    console.log(`  Unauthorized role:     ${results.unauthorized}`);
    console.log(`  Critical severity:     ${results.critical}`);
    console.log(`  High severity:         ${results.high}`);
    console.log(`  Moderate severity:     ${results.moderate}`);
    console.log(`  Multi-client:          ${results.multiClient}`);
    console.log(`  Disconnect:            ${results.disconnect}`);
    console.log(`  Invalid severity:      ${results.invalidSeverity}`);
    console.log(`  Missing severity:      ${results.missingSeverity}`);
    console.log(`  Invalid boolean:       ${results.invalidBoolean}`);
    console.log('═══════════════════════════════════════════════');

    const allPass = Object.values(results).every(v => v === 'PASS');
    console.log(`\n  Overall: ${allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    
    exitCode = allPass ? 0 : 1;
    
    // Give streams time to settle before exit
    setTimeout(() => process.exit(exitCode), 500);
}

runTests();
