const dotenv = require("dotenv");
const ws = require("ws");
const ws_port = process.env.WS_PORT || 8900;
const cors_env = process.env.REACT_APP_ORIGIN;

dotenv.config();

const wss = new ws.Server(
  {
    port: ws_port,
    cors: { origin: "*" },
  },
  () => {
    if (wss) {
      console.log(`WebSocket Server is running  on port ${ws_port}`);
    } else {
      console.error("Error creating WebSocket Server");
    }
  }
);

wss.on("connection", (ws) => {
  console.log("Client connected");
  ws.on("message", (message) => {
    console.log("Received message:", message);
    message = JSON.parse(message);
    switch (message.event) {
      case "message":
        broadcastMessage(message);
        break;
      case "connection":
        broadcastMessage(message);
        break;
      case "disconnect":
        broadcastMessage(message);
        break;
      default:
        console.log("Invalid event type:", message.event);
        break;
    }
  });
  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

function broadcastMessage(message) {
  wss.clients.forEach((client) => {
    // if (client.readyState === wss.OPEN) {
      client.send(JSON.stringify(message));
    // }
  });
}