const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const redis = require('redis');
const axios = require('axios');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const client = redis.createClient({ url: process.env.REDIS_URL });
client.connect();

const serverId = process.env.SERVER_ID;
const clients = new Map();

// Subscribe to message queue
async function subscribeToQueue() {
  while (true) {
    try {
      const message = await client.brPop(`queue:${serverId}`, 0);
      if (message) {
        const data = JSON.parse(message.element);
        const socket = clients.get(data.targetClientId);
        if (socket) {
          socket.emit('message', {
            from: data.fromClientId,
            message: data.message
          });
        }
      }
    } catch (error) {
      console.error('Queue error:', error);
    }
  }
}

io.on('connection', (socket) => {
  socket.on('register', (clientId) => {
    clients.set(clientId, socket);
    console.log(`Client ${clientId} connected to ${serverId}`);
  });

  socket.on('send-message', async (data) => {
    try {
      await axios.post(`${process.env.ROUTING_SERVICE_URL}/route-message`, {
        targetClientId: data.to,
        message: data.message,
        fromClientId: data.from
      });
    } catch (error) {
      console.error('Routing error:', error);
    }
  });

  socket.on('disconnect', (reason) => {
    for (const [clientId, clientSocket] of clients.entries()) {
      if (clientSocket === socket) {
        clients.delete(clientId);
        // Remove from session storage (non-blocking)
        client.del(`client:${clientId}`).catch(console.error);
        console.log(`Client ${clientId} disconnected and removed from storage`);
        break;
      }
    }
  });
});

subscribeToQueue();
server.listen(process.env.PORT, () => {
  console.log(`Chat server ${serverId} running on port ${process.env.PORT}`);
});