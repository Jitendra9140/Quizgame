// Express server initialization with Socket.IO (to be used in later steps)
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const authRoutes = require("./routes/auth");
const matchRoutes = require("./routes/match");
const gameRoutes = require("./routes/game");
const { Player, Question, Session } = require("./db");

const app = express();

// Allow list for CORS. Render will set FRONTEND_URL to your deployed frontend URL.
// Support a comma-separated list in FRONTEND_URL for multiple origins.
const rawFrontends =
  process.env.FRONTEND_URL || process.env.VITE_API_BASE_URL || "";
const allowedOrigins = rawFrontends
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Always allow localhost during development
allowedOrigins.push(
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5000"
);

console.log("CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin like mobile apps or curl
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy: Origin not allowed"));
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// REST endpoints
app.use("/api/auth", authRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/game", gameRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      // socket clients may not send origin; allow when absent for now
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
      return callback(new Error("Socket CORS: Origin not allowed"));
    },
    credentials: true,
  },
});

// Socket auth: expect token in socket.handshake.auth.token or query.token
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error("Missing auth token"));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.user = payload; // { id, username, name, level }
    return next();
  } catch (err) {
    return next(new Error("Invalid or expired token"));
  }
});

// In-memory queues keyed by level: [{ playerId, socketId }]
const levelQueues = new Map();

io.on("connection", (socket) => {
  const user = socket.data.user;
  console.log("Socket connected:", socket.id, "user:", user?.username);

  // Helper to remove a player from queues
  function removeFromQueues(playerId) {
    for (const [lvl, arr] of levelQueues.entries()) {
      const idx = arr.findIndex((e) => e.playerId === String(playerId));
      if (idx !== -1) {
        arr.splice(idx, 1);
        levelQueues.set(lvl, arr);
      }
    }
  }

  socket.on("matchmaking:join", async () => {
    try {
      const player = await Player.findById(user.id);
      if (!player)
        return socket.emit("matchmaking:error", { error: "Player not found" });

      // Update level from XP
      const computedLevel = player.computeLevel();
      if (computedLevel !== player.level) {
        player.level = computedLevel;
        await player.save();
      }
      const level = player.level;

      if (!levelQueues.has(level)) levelQueues.set(level, []);
      const queue = levelQueues.get(level);

      // If someone waiting, pair them
      if (queue.length > 0) {
        const other = queue.shift();
        levelQueues.set(level, queue);

        // Create session with 10 random questions of the level
        const sampled = await Question.aggregate([
          { $match: { level } },
          { $sample: { size: 10 } },
        ]);
        if (sampled.length < 10) {
          socket.emit("matchmaking:error", {
            error: "Not enough questions for this level",
          });
          return;
        }

        const session = await Session.create({
          level,
          status: "active",
          players: [other.playerId, player._id],
          questions: sampled.map((q) => q._id),
          startedAt: new Date(),
        });

        // Build question objects matching frontend expectations
        const questions = sampled.map((r, idx) => ({
          id: r._id,
          question: r.question || r.text,
          options: r.options || r.choices,
          correctAnswer: r.correctAnswer,
          correctIndex: Array.isArray(r.options)
            ? r.options.findIndex((o) => o === r.correctAnswer)
            : Array.isArray(r.choices)
            ? r.choices.findIndex((o) => o === r.correctAnswer)
            : -1,
          order: idx,
        }));

        // Fetch other player's public info
        const otherPlayer = await Player.findById(other.playerId).lean();

        // Join both sockets to session room
        socket.join(`session:${session._id}`);
        io.sockets.sockets.get(other.socketId)?.join(`session:${session._id}`);

        // Notify both players with players payload (you/opponent)
        const youPayload = {
          id: player._id,
          username: player.username,
          name: player.name,
          level: player.level,
        };
        const oppPayload = {
          id: otherPlayer?._id,
          username: otherPlayer?.username,
          name: otherPlayer?.name,
          level: otherPlayer?.level,
        };

        socket.emit("matchmaking:found", {
          session: {
            id: session._id,
            level: session.level,
            status: session.status,
          },
          questions,
          players: { you: youPayload, opponent: oppPayload },
        });
        io.to(other.socketId).emit("matchmaking:found", {
          session: {
            id: session._id,
            level: session.level,
            status: session.status,
          },
          questions,
          players: { you: oppPayload, opponent: youPayload },
        });
      } else {
        // Queue player and notify position
        queue.push({ playerId: String(player._id), socketId: socket.id });
        levelQueues.set(level, queue);
        socket.emit("matchmaking:queued", {
          level,
          position: queue.length - 1,
        });
      }
    } catch (err) {
      console.error("Socket matchmaking error:", err);
      socket.emit("matchmaking:error", { error: "Internal server error" });
    }
  });

  socket.on("matchmaking:cancel", () => {
    removeFromQueues(user.id);
    socket.emit("matchmaking:cancelled");
  });

  socket.on("disconnect", () => {
    removeFromQueues(user.id);
    console.log("Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
