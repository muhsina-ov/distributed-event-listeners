// server.js
const WebSocket = require("ws");

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

console.log(` WebSocket server running at ws://localhost:${PORT}`);

wss.on("connection", (ws) => {
  console.log(" New listener connected");

  ws.on("close", () => {
    console.log(" Listener disconnected");
  });
});

// --- Broadcast random events every 2 seconds ---
let counter = 0;
setInterval(() => {
  const event = {
    eventId: counter % 1000, // simulate repeated event IDs
    data: `Event-${counter}`,
  };
  const payload = JSON.stringify(event);

  // broadcast to all connected listeners
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });

  console.log(" Sent event:", payload);
  counter++;
}, 2000);
