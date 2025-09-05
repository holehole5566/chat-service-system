# Chat Service

A distributed chat service with multiple chat servers, routing service, and session storage.

## Architecture

- **Routing Service**: Routes clients to chat servers and handles message routing
- **Chat Servers**: Handle WebSocket connections and message delivery
- **Session Storage**: Redis stores client-server mappings
- **Message Queues**: Redis queues for inter-server message routing

## Usage

1. Start all services:
```bash
docker-compose up --build
```

2. Open web client at http://localhost:8080

3. Open multiple browser tabs to simulate different users

## Services

- Web Client: http://localhost:8080
- Routing Service: http://localhost:3000
- Chat Server 1: http://localhost:3001
- Chat Server 2: http://localhost:3002
- Redis: localhost:6379