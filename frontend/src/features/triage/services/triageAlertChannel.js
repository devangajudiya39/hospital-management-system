/**
 * Triage Alert Real-Time Channel Service
 * 
 * Consumes real-time alert events from Person 1's alert channel.
 * Supports:
 * - Server-Sent Events (SSE) via EventSource (if stream URL provided)
 * - WebSocket (if ws:// or wss:// URL provided)
 * - Cross-window/tab BroadcastChannel ('hms_triage_alerts') & storage events
 *   (enables instant desktop reception of alerts emitted during live kiosk intake)
 */

export const ALERT_STREAM_URL = 
  import.meta.env.VITE_ALERT_STREAM_URL || 
  import.meta.env.VITE_ALERT_WS_URL || 
  '';

/**
 * Normalizes an incoming payload from Person 1's API into a standardized alert object.
 *
 * Person 1 Schema:
 * {
 *   session_id: string,
 *   next_question: object | null,
 *   interview_complete: boolean,
 *   red_flag_detected: boolean,
 *   red_flag_severity: "critical" | "high" | "medium" | "low" | null,
 *   alert_triggered: boolean,
 *   clinical_summary?: {
 *     chief_complaint: string,
 *     red_flags?: { detected: boolean, severity: string, details: string[] },
 *     hpi?: any[]
 *   }
 * }
 */
export function normalizeAlert(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const sessionId = raw.session_id || raw.sessionId || raw.patient_id || 'UNKNOWN-SESSION';
  const alertId = raw.id || raw.alert_id || `alert-${sessionId}`;

  const redFlagDetected = Boolean(
    raw.red_flag_detected ||
    raw.alert_triggered ||
    raw.clinical_summary?.red_flags?.detected
  );

  const rawSeverity = (
    raw.red_flag_severity ||
    raw.clinical_summary?.red_flags?.severity ||
    raw.severity ||
    (raw.alert_triggered ? 'critical' : redFlagDetected ? 'high' : 'low')
  );

  const severity = typeof rawSeverity === 'string' ? rawSeverity.toLowerCase() : 'low';

  const reasons = [];
  if (raw.clinical_summary?.red_flags?.details && Array.isArray(raw.clinical_summary.red_flags.details)) {
    reasons.push(...raw.clinical_summary.red_flags.details);
  }
  if (Array.isArray(raw.details)) {
    reasons.push(...raw.details);
  }
  if (raw.red_flag_reason) {
    reasons.push(raw.red_flag_reason);
  }
  if (raw.reason) {
    reasons.push(raw.reason);
  }
  if (reasons.length === 0 && raw.clinical_summary?.chief_complaint) {
    reasons.push(`Chief Complaint: ${raw.clinical_summary.chief_complaint}`);
  }

  const chiefComplaint = raw.clinical_summary?.chief_complaint || raw.chiefComplaint || raw.chief_complaint || '';

  const timestamp = raw.timestamp ? new Date(raw.timestamp).toISOString() : new Date().toISOString();

  let status = 'Active Alert';
  if (raw.status) {
    status = raw.status;
  } else if (raw.interview_complete) {
    status = 'Intake Completed';
  } else if (raw.alert_triggered) {
    status = 'Critical Red Flag';
  } else if (redFlagDetected) {
    status = 'Under Triage';
  }

  return {
    id: alertId,
    sessionId,
    patientId: raw.patient_id || raw.patientId || null,
    severity,
    redFlagDetected,
    alertTriggered: Boolean(raw.alert_triggered),
    reasons,
    chiefComplaint,
    timestamp,
    status,
    raw
  };
}

/**
 * Subscribes to the live triage alert channel.
 * 
 * @param {Object} callbacks
 * @param {Function} callbacks.onAlert - Called when an alert is received
 * @param {Function} callbacks.onStatusChange - Called when connection status changes ('connecting', 'connected', 'disconnected', 'error')
 * @returns {Function} unsubscribe - Cleans up all connections and listeners
 */
export function subscribeToTriageAlerts({ onAlert, onStatusChange }) {
  let isSubscribed = true;
  let abortController = null;
  let wsSocket = null;
  let broadcastChannel = null;

  const updateStatus = (status, info = '') => {
    if (isSubscribed && typeof onStatusChange === 'function') {
      onStatusChange(status, info);
    }
  };

  const handleIncomingData = (data) => {
    if (!isSubscribed) return;
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const alert = normalizeAlert(parsed);
      if (alert && typeof onAlert === 'function') {
        onAlert(alert);
      }
    } catch (err) {
      console.error('[TRIAGE_ALERT] Error parsing incoming alert payload:', err);
    }
  };

  updateStatus('connecting', 'Connecting to real-time alert channel...');

  // 1. Setup Cross-window / Cross-tab BroadcastChannel for instantaneous browser alerts
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel('hms_triage_alerts');
      broadcastChannel.onmessage = (event) => {
        handleIncomingData(event.data);
      };
    }
  } catch (err) {
    console.warn('[TRIAGE_ALERT] BroadcastChannel unavailable:', err);
  }

  // 2. Storage event listener fallback for cross-tab notifications
  const handleStorageEvent = (e) => {
    if (e.key === 'hms_latest_triage_alert' && e.newValue) {
      try {
        handleIncomingData(JSON.parse(e.newValue));
      } catch {
        // ignore parse error
      }
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent);
  }

  // 3. Connect to backend stream if URL is provided
  if (ALERT_STREAM_URL) {
    const isWebSocket = ALERT_STREAM_URL.startsWith('ws://') || ALERT_STREAM_URL.startsWith('wss://');

    if (isWebSocket && typeof WebSocket !== 'undefined') {
      try {
        wsSocket = new WebSocket(ALERT_STREAM_URL);

        wsSocket.onopen = () => {
          updateStatus('connected', 'WebSocket live alert stream connected');
        };

        wsSocket.onmessage = (event) => {
          handleIncomingData(event.data);
        };

        wsSocket.onerror = (err) => {
          console.warn('[TRIAGE_ALERT] WebSocket stream error:', err);
          updateStatus('error', 'WebSocket stream connection error');
        };

        wsSocket.onclose = () => {
          updateStatus('disconnected', 'WebSocket stream closed');
        };
      } catch (wsErr) {
        console.warn('[TRIAGE_ALERT] Failed to initialize WebSocket:', wsErr);
        updateStatus('error', wsErr.message);
      }
    } else {
      // Use fetch() streaming for SSE to support Authorization headers
      try {
        const token = localStorage.getItem('token');
        abortController = new AbortController();

        fetch(ALERT_STREAM_URL, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Accept': 'text/event-stream'
          },
          signal: abortController.signal
        })
        .then(async (response) => {
          if (!response.ok) {
            updateStatus('error', `Stream failed: ${response.status} ${response.statusText}`);
            return;
          }

          updateStatus('connected', 'SSE live alert stream connected');
          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep the last partial line in the buffer

            for (let line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.substring(6).trim();
                if (dataStr) {
                  handleIncomingData(dataStr);
                }
              }
            }
          }
        })
        .catch((err) => {
          if (err.name === 'AbortError') {
            console.log('[TRIAGE_ALERT] Stream aborted');
          } else {
            console.warn('[TRIAGE_ALERT] SSE stream error:', err);
            updateStatus('error', 'Alert channel stream unreachable');
          }
        });
      } catch (sseErr) {
        console.warn('[TRIAGE_ALERT] Failed to initialize fetch SSE:', sseErr);
        updateStatus('error', sseErr.message);
      }
    }
  } else {
    // When no backend stream URL is configured in environment,
    // the channel is actively monitoring local live intake sessions via BroadcastChannel
    updateStatus('connected', 'Live triage channel active (monitoring live intake)');
  }

  // Cleanup function
  return function unsubscribe() {
    isSubscribed = false;

    if (broadcastChannel) {
      try {
        broadcastChannel.close();
      } catch {
        // ignore
      }
      broadcastChannel = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageEvent);
    }

    if (wsSocket) {
      try {
        wsSocket.close();
      } catch {
        // ignore
      }
      wsSocket = null;
    }

    if (abortController) {
      try {
        abortController.abort();
      } catch {
        // ignore
      }
      abortController = null;
    }

    updateStatus('disconnected', 'Alert channel disconnected');
  };
}
