/**
 * SSE Alert Broadcaster
 * Manages connected SSE clients and broadcasts parsed alerts.
 */

const connectedClients = new Set();

/**
 * Registers a new SSE client connection.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const addClient = (req, res) => {
    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Add to connected clients registry
    connectedClients.add(res);

    console.log(`[AlertSSE] Client connected. Total clients: ${connectedClients.size}`);

    // Send an initial ping to establish connection immediately
    res.write(`event: connection\ndata: ${JSON.stringify({ status: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
        connectedClients.delete(res);
        console.log(`[AlertSSE] Client disconnected. Total clients: ${connectedClients.size}`);
    });
};

/**
 * Broadcasts an alert to all connected SSE clients.
 * @param {Object} alertData - The validated and parsed alert payload.
 */
const broadcastAlert = (alertData) => {
    if (connectedClients.size === 0) {
        console.log(`[AlertSSE] No clients connected to broadcast alert ${alertData.id}`);
        return;
    }

    const payload = JSON.stringify(alertData);
    
    connectedClients.forEach(client => {
        try {
            // Write to the stream in SSE format
            client.write(`event: triage-alert\ndata: ${payload}\n\n`);
        } catch (err) {
            console.error('[AlertSSE] Error writing to a client stream', err);
            connectedClients.delete(client);
        }
    });

    console.log(`[AlertSSE] Broadcasted alert ${alertData.id} to ${connectedClients.size} clients`);
};

module.exports = {
    addClient,
    broadcastAlert
};
