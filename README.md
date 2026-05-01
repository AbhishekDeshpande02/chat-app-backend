# 💬 Anonymous Real-Time Chat App

A real-time anonymous 1-on-1 chat platform where users are instantly matched with strangers. Built using React, Node.js, and WebSockets, with a confirmation-based matchmaking flow.

---

## 🚀 Features

- ⚡ Instant stranger matching
- 🔒 Fully anonymous chat
- 💬 Real-time messaging via WebSockets
- 🤝 Match confirmation (Accept / Skip)
- 🔄 Automatic re-queueing on disconnect
- 🟢 Live status indicators

---

## 📂 Project Structure

```bash
chat-app-server/
│
├── config/db.js  # To connect with the server          
├── services/logger.js          # Logging logic
├── package.json
├── index.js
└── README.md
```

---

## ⚙️ Installation

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/AbhishekDeshpande02/chat-app-backend.git
cd chat-app-server
```


### 2️⃣ Install Dependencies

#### Backend

```bash
cd server
npm install
```


## ▶️ Run the Application

### Start Backend

```bash
npm start
```


---


## 🤝 Matchmaking Flow

1. Connecting
2. Waiting for another user
3. Match Found ✅
4. Both users receive:
   - ✅ Accept Chat
   - ❌ Skip
5. If accepted ✅  → Chat starts 
6. If skipped ❌ → User re-enters queue automatically

---
## 💬 Real-Time Messaging

```text
User A → Server → User B
```

- No database storage
- Messages are ephemeral
- Low-latency relay using WebSockets

---

## 🔌 Disconnection Handling

| Scenario | Behavior |
|----------|-----------|
| User leaves during chat | Partner notified + re-queued |
| User leaves during match | Match cancelled |
| WebSocket error | User marked disconnected |

---

# 🛠️ Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | React (Hooks) |
| Backend | Node.js |
| Realtime | WebSockets (`ws`) |
| Deployment | Vercel (Frontend), Railway (Backend) |

---

# 🚀 Deployment

## ⚙️ Backend (Railway)

- Node.js WebSocket server
- Runs on dynamic ports

---

# 🔐 Important: Secure WebSockets

Since the frontend runs on HTTPS:

```text
❌ ws://  → Blocked (Mixed Content)
✅ wss:// → Required
```


# 📡 WebSocket Event Protocol

## Server → Client

```json
{ "type": "connected" }
{ "type": "match_request" }
{ "type": "paired" }
{ "type": "message", "text": "Hi" }
{ "type": "skipped" }
{ "type": "partner_left" }
```

---

# ⚠️ Known Limitations

## 🔴 Scalability

- Single-instance server
- No horizontal scaling
- Requires Redis/pub-sub for distributed scaling



## 🧠 In-Memory State

- Users stored in RAM
- Server restart = all sessions lost



## 💾 No Persistence

- No user identity
- Fully ephemeral system



## 🔄 No Reconnection Logic

- Users cannot resume sessions
- Reconnect = new anonymous identity



## 📊 Basic Matchmaking

- FIFO queue only
- No filters (interest, location, etc.)

---

# 📈 Future Improvements

- 🔁 Redis for distributed matchmaking
- 👤 User sessions & reconnection
- 🎯 Interest-based matching
- 🟡 Typing indicators & read receipts
- ⚖️ Load balancing with sticky sessions

## 👨‍💻 Author

Your Name  
GitHub: [@your-github](https://github.com/AbhishekDeshpande02)

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!
