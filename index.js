import http from "http";
import { WebSocketServer } from "ws";
import { saveLog } from "./services/logger.js";

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/json",
  });

  res.end(
    JSON.stringify({
      status: "Chat server running",
    })
  );
});

const wss = new WebSocketServer({ server });

/**
 * users Map:
 * userId -> {
 *   ws,
 *   userId,
 *   partnerId,
 *   pendingMatchId,
 *   matchAccepted,
 *   messageTimestamps
 * }
 */

const users = new Map();

const waitingQueue = [];

let counter = 0;

function uid() {
  return `u${++counter}_${Date.now()}`;
}

function push(ws, payload) {
  if (ws?.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

/* ───────────────────────────────────────────── */

function proposeMatch(idA, idB) {
  const a = users.get(idA);
  const b = users.get(idB);

  if (!a || a.ws.readyState !== 1) {
    requeueIfAlive(idB);
    return;
  }

  if (!b || b.ws.readyState !== 1) {
    requeueIfAlive(idA);
    return;
  }

  a.pendingMatchId = idB;
  a.matchAccepted = false;

  b.pendingMatchId = idA;
  b.matchAccepted = false;

  push(a.ws, {
    type: "match_request",
    message:
      "Someone is available! Want to chat?",
  });

  push(b.ws, {
    type: "match_request",
    message:
      "Someone is available! Want to chat?",
  });

  console.log(`Match proposed: ${idA} <-> ${idB}`);

  saveLog({
    event_type: "MATCH_PROPOSED",
    user_id: idA,
    partner_id: idB,
    message: "Match proposed",
  });
}

function requeueIfAlive(id) {
  const u = users.get(id);

  if (
    u &&
    u.ws.readyState === 1 &&
    !waitingQueue.includes(id)
  ) {
    u.pendingMatchId = null;
    u.matchAccepted = false;

    waitingQueue.push(id);

    drainQueue();
  }
}

function drainQueue() {
  while (waitingQueue.length >= 2) {
    const idA = waitingQueue.shift();
    const idB = waitingQueue.shift();

    proposeMatch(idA, idB);
  }
}

function finaliseMatch(idA, idB) {
  const a = users.get(idA);
  const b = users.get(idB);

  if (
    !a ||
    !b ||
    a.ws.readyState !== 1 ||
    b.ws.readyState !== 1
  ) {
    if (a && a.ws.readyState === 1) {
      requeueIfAlive(idA);
    }

    if (b && b.ws.readyState === 1) {
      requeueIfAlive(idB);
    }

    return;
  }

  a.partnerId = idB;
  a.pendingMatchId = null;

  b.partnerId = idA;
  b.pendingMatchId = null;

  push(a.ws, {
    type: "paired",
    message: "You're connected — say hi!",
  });

  push(b.ws, {
    type: "paired",
    message: "You're connected — say hi!",
  });

  console.log(`Chat started: ${idA} <-> ${idB}`);

  saveLog({
    event_type: "CHAT_STARTED",
    user_id: idA,
    partner_id: idB,
    message: "Chat session started",
  });
}

/* ───────────────────────────────────────────── */

wss.on("connection", (ws) => {
  const userId = uid();

  users.set(userId, {
    ws,
    userId,

    partnerId: null,
    pendingMatchId: null,
    matchAccepted: false,

    // RATE LIMITING
    messageTimestamps: [],
  });

  console.log(
  `+ ${userId} | online: ${users.size}`
);

  saveLog({
    event_type: "USER_CONNECTED",
    user_id: userId,
    message: `User connected`,
  });

  push(ws, {
    type: "connected",
    userId,
    message:
      "Connected — looking for someone to chat with...",
  });

  waitingQueue.push(userId);

  drainQueue();

  ws.on("message", (raw) => {
    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    const user = users.get(userId);

    if (!user) return;

    /* ── CHAT MESSAGE ───────────────────── */
    if (data.type === "message") {
      if (!user.partnerId) return;

      const now = Date.now();

      // Keep only timestamps from last 1 sec
      user.messageTimestamps =
        user.messageTimestamps.filter(
          (timestamp) => now - timestamp < 1000
        );

      // Max 3 messages/sec
      if (
        user.messageTimestamps.length >= 3
      ) {
        saveLog({
          event_type: "RATE_LIMIT",
          user_id: userId,
          message: "User exceeded rate limit",
        });
        push(ws, {
          type: "rate_limit",
          message:
            "⚠️ Slow down! Maximum 3 messages per second.",
        });

        return;
      }

      // Store timestamp
      user.messageTimestamps.push(now);

      const partner = users.get(
        user.partnerId
      );

      if (partner?.ws.readyState === 1) {
        push(partner.ws, {
          type: "message",
          text: data.text,
          from: "stranger",
          timestamp: Date.now(),
        });
      } else {
        push(ws, {
          type: "system",
          message:
            "Your partner seems to have left.",
        });
      }

      return;
    }

    /* ── ACCEPT MATCH ───────────────────── */
    if (data.type === "accept_chat") {
      if (!user.pendingMatchId) return;

      user.matchAccepted = true;

      const other = users.get(
        user.pendingMatchId
      );

      if (!other) {
        requeueIfAlive(userId);
        return;
      }

      if (other.matchAccepted) {
        finaliseMatch(
          userId,
          user.pendingMatchId
        );
      } else {
        push(ws, {
          type: "system",
          message:
            "Waiting for the other person to respond...",
        });
      }

      return;
    }

    /* ── SKIP MATCH ───────────────────── */
    if (data.type === "skip_chat") {
      const otherId = user.pendingMatchId;
      saveLog({
        event_type: "MATCH_SKIPPED",
        user_id: userId,
        partner_id: otherId,
        message: "User skipped match",
      });
      user.pendingMatchId = null;
      user.matchAccepted = false;

      const other = users.get(otherId);

      if (other) {
        other.pendingMatchId = null;
        other.matchAccepted = false;

        push(other.ws, {
          type: "skipped",
          message:
            "The other person passed — searching again...",
        });

        if (
          !waitingQueue.includes(otherId)
        ) {
          waitingQueue.push(otherId);
        }
      }

      push(ws, {
        type: "skipped",
        message:
          "Skipped — looking for someone else...",
      });

      if (
        !waitingQueue.includes(userId)
      ) {
        waitingQueue.push(userId);
      }

      drainQueue();

      return;
    }
  });

  /* ───────────────────────────────────── */

  ws.on("close", () => {
    const user = users.get(userId);
    saveLog({
      event_type: "USER_DISCONNECTED",
      user_id: userId,
      message: "User disconnected",
    });
    // Active partner
    if (user?.partnerId) {
      const partner = users.get(
        user.partnerId
      );

      if (partner) {
        push(partner.ws, {
          type: "partner_left",
          message:
            "Stranger disconnected.",
        });

        partner.partnerId = null;

        requeueIfAlive(user.partnerId);
      }
    }

    // Pending match partner
    if (user?.pendingMatchId) {
      const other = users.get(
        user.pendingMatchId
      );

      if (other) {
        other.pendingMatchId = null;
        other.matchAccepted = false;

        push(other.ws, {
          type: "skipped",
          message:
            "Match cancelled — searching again...",
        });

        requeueIfAlive(
          user.pendingMatchId
        );
      }
    }

    // Remove from queue
    const qi = waitingQueue.indexOf(
      userId
    );

    if (qi !== -1) {
      waitingQueue.splice(qi, 1);
    }

    users.delete(userId);

    console.log(
      `- ${userId} | online: ${users.size}`
    );
  });

  ws.on("error", (err) => {
    console.error(
      `[${userId}] error:`,
      err.message
    );
  });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(
    `Server → ws://localhost:${PORT}`
  );
});