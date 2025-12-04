# Backend (Server) — Architecture, Process Flow, and Logic

## Tech Stack
- Node.js + Express
- Mongoose + MongoDB
- Socket.IO (server) for realtime matchmaking
- JWT for auth
- CORS for cross-origin access

## Environment Variables
- `PORT`: HTTP server port (default 5000)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for signing/verifying JWT
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS and Socket.IO

## Core Data Models (src/db.js)
- Player
  - `username`, `name`, `passwordHash`
  - `xp`, `level` (computed via `computeLevel()`), `winStreak`
  - `stats`: `{ gamesPlayed, wins, avgResponseMs }`
- Question
  - `text`/`question`, `options`, `correctAnswer` and optional `correctIndex`
  - `category`, `level`
- Session
  - `players` [playerId1, playerId2]
  - `questions` [questionIds]
  - `status`: `active | completed`
  - `finishedAt`, `statsFinalized`, `statsUpdated` (per player)
- Answer
  - `session`, `player`, `question`
  - `selectedAnswer`, `selectedIndex`, `correct`, `responseMs`, `answeredAt`

## Authentication Flow (src/routes/auth.js)
- `POST /api/auth/signup` → create player and issue JWT.
- `POST /api/auth/login` → verify credentials and issue JWT.
- `GET /api/auth/me` → return current player from token.
- JWT middleware (`src/middleware/auth.js`) attaches `req.user` after verifying token.

## Matchmaking Flow (src/index.js, src/routes/match.js, Socket.IO)
- Client connects to Socket.IO with `Authorization: Bearer <token>`.
- Client emits `matchmaking:join` with desired level.
- Server authenticates the socket, places the player in a queue keyed by level.
- When two compatible players are present:
  - Create a Session document with both players.
  - Select a set of questions (by level/category) and assign to the session.
  - Emit `matchmaking:found` to both clients, including session and questions.
- REST endpoints also exist for queue monitoring if needed.

## Game Submission Flow (src/routes/game.js)
- `POST /api/game/submit`
  - Validates `sessionId` and answers.
  - Ensures the caller is a participant of the session.
  - Upserts Answer records per question with correctness and timing.
  - Aggregates per-player totals; if both players reached all questions, marks the session `completed` and responds with `{ completed: true }`.
  - Otherwise responds with `{ completed: false }` so client can wait/poll.

## Game Result Flow (src/routes/game.js)
- `GET /api/game/result/:sessionId`
  - Aggregates player stats from Answer collection.
  - Determines outcomes (win/loss/draw) by comparing correct counts.
  - Builds and returns the result payload immediately.
  - Defers awarding XP, wins, gamesPlayed (and finalizing the session) to a background task using `setImmediate` for faster client response.
  - Background task re-checks `statsFinalized` and `statsUpdated` to avoid duplicate awarding if the client already updated per-player stats.

- `POST /api/game/update-player-stats`
  - Allows each client to update their own stats once for the session (awards XP, increments games played, wins if applicable).
  - Marks the player as updated in `session.statsUpdated` and finalizes `statsFinalized` when all participants have updated.

## Awarding XP and Level Logic
- `awardXp(player, outcome)`
  - Base XP: win=40, draw=20, loss=10; bonus +10 for win streak >= 3.
  - Updates `xp`, `winStreak`, and recalculates `level` via `computeLevel()` on the Player model.

## CORS and Socket.IO Configuration (src/index.js)
- Unified allowlist for REST CORS and Socket.IO origins.
- Ensure frontend origins (e.g., `http://localhost:5173`, deployed URLs) are present in `ALLOWED_ORIGINS`.

## Seeding Questions (src/seedQuestions.js)
- Utility script to insert sample questions into MongoDB.
- Run manually during setup; ensure `MONGO_URI` is configured.

## Deployment Notes
- Ensure `MONGO_URI` and `JWT_SECRET` are set.
- Set `ALLOWED_ORIGINS` to include your deployed frontend URLs.
- Use `npm start` for production (Node) and `npm run dev` (nodemon) during development.

## Troubleshooting
- Result slow to load: the server returns payload quickly and awards stats in background; confirm client redirects promptly after submission and polls for `status === completed`.
- Handshake/CORS errors: verify frontend origin is in `ALLOWED_ORIGINS` and client sends `Authorization` header.
- Duplicate XP updates: check that `statsFinalized` or `statsUpdated` prevents re-awarding.