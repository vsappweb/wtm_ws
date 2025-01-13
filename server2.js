const dotenv = require("dotenv");
const ws = require("ws");
const ws_port = process.env.WS_PORT || 8900;
const cors_env = process.env.REACT_APP_ORIGIN;

dotenv.config();

const wss = new ws.Server(
  {
    port: ws_port,
    cors: { origin: cors_env },
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

  ws.on("message", (data) => {
    let obj;
    try {
      obj = JSON.parse(data);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return;
    }

    const type = obj?.type;
    const params = obj?.params;

    if (typeof type !== "string") {
      console.warn("Type is not a string:", type);
      return;
    }

    switch (type) {
      case "create":
        create(params);
        break;
      case "join":
        join(params);
        break;
      case "leave":
        leave(params);
        break;
      default:
        console.warn(`Type: ${type} unknown`);
        break;
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error occurred:", error);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

const maxClients = 10;
const rooms = {};

function generalInformation(ws) {
  let obj;
  if (ws["room"] === undefined)
    obj = {
      "type": "info",
      "params": {
        "room": ws["room"],
        "no-clients": rooms[ws["room"]].length,
      }
    }
  else
    obj = {
      "type": "info",
      "params": {
        "room": "no room",
      }
    }
  
  ws.send(JSON.stringify(obj));
}

function create(params) {
  const room = genKey(5);
  rooms[room] = [ws];
  ws["room"] = room;

  generalInformation(ws);
}

function genKey(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(
      Math.floor(Math.random() * characters.length));
  }
  return result;
}

function join(params) {
  const room = params?.code;
  if (!Object.keys(rooms).includes(room)) {
    console.warn(`Room ${room} does not exist!`);
    return;
  }

  if (rooms[room].length >= maxClients) {
    console.warn(`Room ${room} is full!`);
    return;
  }

  rooms[room].push(ws);
  ws["room"] = room;

  generalInformation(ws);
}

function leave(params) {
  const room = ws?.room;
  rooms[room] = rooms[room]?.filter((so) => so !== ws);
  ws["room"] = undefined;

  if (rooms[room]?.length == 0) close(room);
}

function close(room) {
  rooms = Object.keys(rooms)
    .filter((key) => key !== room)
    .reduce((obj, key) => {
      obj[key] = rooms[key];
      return obj;
    }, {});
}

