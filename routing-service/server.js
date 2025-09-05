const express = require('express');
const redis = require('redis');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const client = redis.createClient({ url: process.env.REDIS_URL });
client.connect();

const servers = ['server1', 'server2'];
let currentServerIndex = 0;

// Get available chat server for new client
app.post('/assign-server', async (req, res) => {
  const { clientId } = req.body;
  const serverId = servers[currentServerIndex];
  currentServerIndex = (currentServerIndex + 1) % servers.length;
  
  await client.set(`client:${clientId}`, serverId);
  res.json({ serverId, port: serverId === 'server1' ? 3001 : 3002 });
});

// Route message to specific client
app.post('/route-message', async (req, res) => {
  const { targetClientId, message, fromClientId } = req.body;
  const serverId = await client.get(`client:${targetClientId}`);
  
  if (serverId) {
    await client.lPush(`queue:${serverId}`, JSON.stringify({
      targetClientId,
      message,
      fromClientId
    }));
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Client not found' });
  }
});

// Get online clients with server info
app.get('/online-clients', async (req, res) => {
  const keys = await client.keys('client:*');
  const pipeline = client.multi();
  keys.forEach(key => pipeline.get(key));
  const serverIds = await pipeline.exec();
  
  const clientsWithServers = keys.map((key, index) => ({
    clientId: key.replace('client:', ''),
    serverId: serverIds[index]
  }));
  
  res.json({ clients: clientsWithServers });
});

app.listen(3000, () => console.log('Routing service running on port 3000'));