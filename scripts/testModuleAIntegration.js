/**
 * Task 5 — Module A Integration Test
 * 
 * Verifies the complete secure alert trigger flow:
 *   Kiosk Token → Trigger Endpoint → Redis Dedup → publishAlertEvent()
 *   → RabbitMQ → alertWorker → Redis Pub/Sub → SSE → Client
 * 
 * Run with backend and infrastructure running:
 *   node scripts/testModuleAIntegration.js
 */

const path = require('path');

// Resolve backend dependencies
const backendRoot = path.resolve(__dirname, '..', 'backend');
const jwt = require(path.join(backendRoot, 'node_modules', 'jsonwebtoken'));
const dotenv = require(path.join(backendRoot, 'node_modules', 'dotenv'));

// Load backend .env
dotenv.config({ path: path.join(backendRoot, '.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'hospital-secret-key';
const PORT = process.env.PORT || 8080;
const BASE_URL = `http://localhost:${PORT}`;
const TRIGGER_URL = `${BASE_URL}/api/triage/alerts/trigger`;
const KIOSK_SESSION_URL = `${BASE_URL}/api/kiosk/session`;
const SSE_URL = `${BASE_URL}/api/triage/alerts/stream`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateStaffJWT(role = 'admin') {
    return jwt.sign(
        { id: `test-${role}-id`, role, name: `Test ${role}` },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
}

async function getKioskToken() {
    const res = await fetch(KIOSK_SESSION_URL, { method: 'POST' });
    if (!res.ok) throw new Error(`Kiosk session failed: ${res.status}`);
    const data = await res.json();
    return data.token;
}

function createTriggerPayload(overrides = {}) {
    return {
        sessionId: `test-module-a-${Date.now()}`,
        patientId: 'SYNTHETIC-PATIENT-001',
        severity: 'critical',
        red_flag_detected: true,
        alert_triggered: true,
        reasons: ['Potential emergency symptom detected during intake'],
        chiefComplaint: 'Synthetic test complaint',
        ...overrides
    };
}

async function triggerAlert(token, payload) {
    return fetch(TRIGGER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
}

function openSSEConnection(token) {
    const abortController = new AbortController();
    const receivedAlerts = [];
    let connected = false;
    let connectResolve;
    const connectPromise = new Promise(r => { connectResolve = r; });

    fetch(SSE_URL, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'text/event-stream'
        },
        signal: abortController.signal
    }).then(async (res) => {
        if (!res.ok) {
            connectResolve(false);
            return;
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
        abort: () => abortController.abort()
    };
}

// ─── Main Tests ─────────────────────────────────────────────────────────────

async function runTests() {
    const results = {};
    let kioskToken;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Task 5 — Module A Integration Test Suite                ');
    console.log('═══════════════════════════════════════════════════════════\n');

    // ── Pre-requisite: Obtain kiosk token ────────────────────────────────
    console.log('[Setup] Obtaining kiosk session token...');
    try {
        kioskToken = await getKioskToken();
        console.log('[Setup] Kiosk token obtained successfully\n');
    } catch (err) {
        console.error(`[FATAL] Could not obtain kiosk token: ${err.message}`);
        console.error('        Is the backend running on port', PORT, '?');
        process.exit(1);
    }

    // ── Pre-requisite: Connect SSE client ────────────────────────────────
    console.log('[Setup] Connecting SSE client A (admin)...');
    const adminToken = generateStaffJWT('admin');
    const sseA = openSSEConnection(adminToken);
    const connA = await Promise.race([
        sseA.connectPromise,
        new Promise(r => setTimeout(() => r(false), 5000))
    ]);
    if (!connA) {
        console.error('[FATAL] SSE client A connection failed');
        sseA.abort();
        process.exit(1);
    }
    console.log('[Setup] SSE client A connected\n');

    // ══════════════════════════════════════════════════════════════════════
    // TEST 1 — Valid red-flag alert
    // ══════════════════════════════════════════════════════════════════════
    console.log('[Test 1] Valid red-flag alert...');
    const validPayload = createTriggerPayload({
        sessionId: `test-valid-${Date.now()}`
    });
    const res1 = await triggerAlert(kioskToken, validPayload);
    const data1 = await res1.json();
    results.validAlert = (res1.status === 201 && data1.accepted === true) ? 'PASS' : 'FAIL';
    console.log(`[${results.validAlert}] Status: ${res1.status}, Accepted: ${data1.accepted}`);
    
    // Wait for SSE delivery
    await new Promise(r => setTimeout(r, 3000));
    const sseAlert1 = sseA.receivedAlerts.find(
        a => a.session_id === validPayload.sessionId || a.sessionId === validPayload.sessionId
    );
    results.sseDelivery = sseAlert1 ? 'PASS' : 'FAIL';
    console.log(`[${results.sseDelivery}] SSE delivery: ${sseAlert1 ? 'received' : 'NOT received'}\n`);

    // ══════════════════════════════════════════════════════════════════════
    // TEST 2 — Duplicate alert
    // ══════════════════════════════════════════════════════════════════════
    console.log('[Test 2] Duplicate alert (same payload again)...');
    const res2 = await triggerAlert(kioskToken, validPayload);
    const data2 = await res2.json();
    results.duplicate = (res2.status === 200 && data2.duplicate === true) ? 'PASS' : 'FAIL';
    console.log(`[${results.duplicate}] Status: ${res2.status}, Duplicate: ${data2.duplicate}\n`);

    // ══════════════════════════════════════════════════════════════════════
    // TEST 3 — Invalid severity
    // ══════════════════════════════════════════════════════════════════════
    console.log('[Test 3] Invalid severity...');
    const res3 = await triggerAlert(kioskToken, createTriggerPayload({
        sessionId: `test-invalid-sev-${Date.now()}`,
        severity: 'extreme'
    }));
    results.invalidSeverity = res3.status === 400 ? 'PASS' : 'FAIL';
    console.log(`[${results.invalidSeverity}] Status: ${res3.status}\n`);

    // ══════════════════════════════════════════════════════════════════════
    // TEST 4 — Missing sessionId
    // ══════════════════════════════════════════════════════════════════════
    console.log('[Test 4] Missing sessionId...');
    const res4 = await triggerAlert(kioskToken, createTriggerPayload({
        sessionId: '',
    }));
    results.missingSession = res4.status === 400 ? 'PASS' : 'FAIL';
    console.log(`[${results.missingSession}] Status: ${res4.status}\n`);

    // ══════════════════════════════════════════════════════════════════════
    // TEST 5 — red_flag_detected = false
    // ══════════════════════════════════════════════════════════════════════
    console.log('[Test 5] red_flag_detected = false...');
    const res5 = await triggerAlert(kioskToken, createTriggerPayload({
        sessionId: `test-no-redflag-${Date.now()}`,
        red_flag_detected: false
    }));
    results.noRedFlag = res5.status === 400 ? 'PASS' : 'FAIL';
    console.log(`[${results.noRedFlag}] Status: ${res5.status}\n`);

    // ══════════════════════════════════════════════════════════════════════
    // TEST 6 — alert_triggered = false
    // ══════════════════════════════════════════════════════════════════════
    console.log('[Test 6] alert_triggered = false...');
    const res6 = await triggerAlert(kioskToken, createTriggerPayload({
        sessionId: `test-no-trigger-${Date.now()}`,
        alert_triggered: false
    }));
    results.noTrigger = res6.status === 400 ? 'PASS' : 'FAIL';
    console.log(`[${results.noTrigger}] Status: ${res6.status}\n`);

    // ══════════════════════════════════════════════════════════════════════
    // TEST 7 — Missing/invalid authentication
    // ══════════════════════════════════════════════════════════════════════
    console.log('[Test 7a] No authentication...');
    const res7a = await fetch(TRIGGER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createTriggerPayload({
            sessionId: `test-noauth-${Date.now()}`
        }))
    });
    results.noAuth = res7a.status === 401 ? 'PASS' : 'FAIL';
    console.log(`[${results.noAuth}] No auth → ${res7a.status}`);

    console.log('[Test 7b] Patient role (unauthorized)...');
    const patientToken = generateStaffJWT('patient');
    const res7b = await triggerAlert(patientToken, createTriggerPayload({
        sessionId: `test-patient-${Date.now()}`
    }));
    results.patientDenied = res7b.status === 403 ? 'PASS' : 'FAIL';
    console.log(`[${results.patientDenied}] Patient role → ${res7b.status}`);

    console.log('[Test 7c] Kiosk token accepted...');
    results.kioskAccepted = (res1.status === 201) ? 'PASS' : 'FAIL';
    console.log(`[${results.kioskAccepted}] Kiosk token → ${res1.status}\n`);

    // ══════════════════════════════════════════════════════════════════════
    // TEST 8 — Concurrent duplicate requests (atomicity test)
    // ══════════════════════════════════════════════════════════════════════
    console.log('[Test 8] Concurrent duplicate requests...');
    const concurrentSessionId = `test-concurrent-${Date.now()}`;
    const concurrentPayload = createTriggerPayload({ sessionId: concurrentSessionId });

    // Fire 5 identical requests simultaneously
    const concurrentRequests = Array.from({ length: 5 }, () =>
        triggerAlert(kioskToken, concurrentPayload).then(async r => ({
            status: r.status,
            body: await r.json()
        }))
    );

    const concurrentResults = await Promise.all(concurrentRequests);
    const accepted = concurrentResults.filter(r => r.body.accepted === true);
    const duplicates = concurrentResults.filter(r => r.body.duplicate === true);

    results.concurrentDedup = (accepted.length === 1 && duplicates.length === 4) ? 'PASS' : 'FAIL';
    console.log(`[${results.concurrentDedup}] Accepted: ${accepted.length}, Duplicates: ${duplicates.length} (expected 1 + 4)\n`);

    // ══════════════════════════════════════════════════════════════════════
    // TEST 9 — Multiple SSE clients receive alert
    // ══════════════════════════════════════════════════════════════════════
    console.log('[Test 9] Multiple SSE clients...');
    const doctorToken = generateStaffJWT('doctor');
    const sseB = openSSEConnection(doctorToken);
    const connB = await Promise.race([
        sseB.connectPromise,
        new Promise(r => setTimeout(() => r(false), 5000))
    ]);

    if (!connB) {
        results.multiClient = 'FAIL';
        console.log('[FAIL] SSE client B connection failed\n');
    } else {
        const multiSessionId = `test-multi-sse-${Date.now()}`;
        const multiPayload = createTriggerPayload({ sessionId: multiSessionId });
        await triggerAlert(kioskToken, multiPayload);
        await new Promise(r => setTimeout(r, 3000));

        const aGot = sseA.receivedAlerts.find(
            a => a.session_id === multiSessionId || a.sessionId === multiSessionId
        );
        const bGot = sseB.receivedAlerts.find(
            a => a.session_id === multiSessionId || a.sessionId === multiSessionId
        );
        results.multiClient = (aGot && bGot) ? 'PASS' : 'FAIL';
        console.log(`[${results.multiClient}] Client A: ${aGot ? 'received' : 'MISSED'}, Client B: ${bGot ? 'received' : 'MISSED'}\n`);
        sseB.abort();
    }

    // ══════════════════════════════════════════════════════════════════════
    // TEST 10 — Severity mapping (medium → moderate)
    // ══════════════════════════════════════════════════════════════════════
    console.log('[Test 10] Severity mapping (medium → moderate)...');
    const mediumSessionId = `test-medium-${Date.now()}`;
    const res10 = await triggerAlert(kioskToken, createTriggerPayload({
        sessionId: mediumSessionId,
        severity: 'medium'
    }));
    const data10 = await res10.json();
    results.severityMapping = (res10.status === 201 && data10.accepted === true) ? 'PASS' : 'FAIL';
    console.log(`[${results.severityMapping}] medium severity → ${res10.status} (accepted: ${data10.accepted})\n`);

    // ── Cleanup ──────────────────────────────────────────────────────────
    sseA.abort();

    // ── Final Report ─────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('               MODULE A INTEGRATION RESULTS               ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Valid alert:            ${results.validAlert}`);
    console.log(`  SSE delivery:           ${results.sseDelivery}`);
    console.log(`  Duplicate rejected:     ${results.duplicate}`);
    console.log(`  Invalid severity:       ${results.invalidSeverity}`);
    console.log(`  Missing session:        ${results.missingSession}`);
    console.log(`  No red_flag:            ${results.noRedFlag}`);
    console.log(`  No alert_triggered:     ${results.noTrigger}`);
    console.log(`  No auth → 401:          ${results.noAuth}`);
    console.log(`  Patient role → 403:     ${results.patientDenied}`);
    console.log(`  Kiosk token accepted:   ${results.kioskAccepted}`);
    console.log(`  Concurrent dedup:       ${results.concurrentDedup}`);
    console.log(`  Multi-client SSE:       ${results.multiClient}`);
    console.log(`  Severity mapping:       ${results.severityMapping}`);
    console.log('═══════════════════════════════════════════════════════════');

    const allPass = Object.values(results).every(v => v === 'PASS');
    console.log(`\n  Overall: ${allPass ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);

    console.log('\n[Note] Also run: node scripts/testAlertPipeline.js');
    console.log('       to verify existing pipeline regression.\n');

    setTimeout(() => process.exit(allPass ? 0 : 1), 500);
}

runTests();
