const dotenv = require("dotenv");
const WebSocket = require('ws');

// Визначте порт для WebSocket сервера
const port = process.env.WS_PORT || 8900;

// Створіть сервер WebSocket
const wss = new WebSocket.Server({ port: port }, () => {
  console.log(`WebSocket server is running on port ${port}`);
});

// Обробник підключень
wss.on('connection', (ws) => {
  // Переміщаємо до кімнати
  ws.room = [];
  console.log('Client connected');
  
  // Обробник повідомлень від клієнта
  ws.on('message', (message) => {
    console.log('Received message:', JSON.parse(message));
    message = JSON.parse(message);

    // Якщо повідомлення містить команду "join", додаємо користувача до кімнати
    if (message.join) {
      ws.room.push(message.join);
    }
    
    // Якщо в повідомленні є "room", транслюємо його всім підключеним клієнтам
    if (message.room) {
      broadcastMessage(JSON.stringify(message));
    }

    // Якщо є повідомлення (msg), просто виводимо його
    if (message.msg) {
      console.log('message: ', message.msg);
    }

    // Якщо користувач підключається (event === "connection"), надсилаємо підтвердження
    if (message.event === 'connection') {
      ws.send(JSON.stringify({ msg: message }));
    }
  });

  // Обробник помилок
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Обробник закриття з'єднання
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Функція для трансляції повідомлень усім клієнтам
function broadcastMessage(message) {
  wss.clients.forEach((client) => {
    if (client.room.includes(JSON.parse(message).room)) {
      client.send(message);
    }
  });
}

