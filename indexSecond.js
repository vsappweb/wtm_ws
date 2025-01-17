const WebSocket = require("ws");
const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");
const Group = require("./models/Group");

const app = express();
const PORT = process.env.PORT || 5000;

// Створюємо WebSocket сервер
const wss = new WebSocket.Server({ noServer: true });

// Обробка WebSocket підключень
wss.on("connection", (ws, req) => {
  console.log("New WebSocket connection established");

  // Відправка даних клієнту
  ws.on("message", async (message) => {
    try {
      const { groupId } = JSON.parse(message);

      if (!groupId) {
        ws.send(JSON.stringify({ error: "Group ID is required" }));
        return;
      }

      // Знаходимо групу
      const group = await Group.findById(groupId);
      if (!group) {
        ws.send(JSON.stringify({ error: "Group not found" }));
        return;
      }

      // Отримуємо учасників групи
      const users = await User.find({ _id: { $in: group.membersOfGroup } }).select(
        "_id username profilePicture role latitude longitude"
      );

      // Відправляємо початкові дані
      ws.send(JSON.stringify({ type: "initialData", users }));

      // Підписуємо клієнта на оновлення
      ws.groupId = groupId;
    } catch (err) {
      console.error("Error handling WebSocket message:", err);
      ws.send(JSON.stringify({ error: "Internal Server Error" }));
    }
  });

  // Закриття WebSocket з'єднання
  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
});

// Викидаємо події для оновлення координат
const updateCoordinates = async (userId, latitude, longitude) => {
  const updatedUser = { _id: userId, latitude, longitude };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "update", user: updatedUser }));
    }
  });
};

// Маршрут для оновлення координат користувача
app.patch("/latlong/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    // Оновлюємо координати користувача
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { latitude, longitude } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Надсилаємо оновлення через WebSocket
    await updateCoordinates(user._id, latitude, longitude);

    res.status(200).json({ message: "Coordinates updated", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Інтегруємо WebSocket із сервером
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
