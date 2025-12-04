# Frontend (Client) — Application Flow and Logic

## Tech Stack
- React + Vite
- Axios for REST API calls
- Socket.IO client for realtime matchmaking
- Tailwind-like utility classes for styling (see index.css)

## Environment Variables
- VITE_API_BASE_URL: Base URL for REST API (default http://localhost:5000)
- VITE_SOCKET_URL: Socket.IO server URL (default http://localhost:5000)

## High-Level User Flow
1. Authentication
   - The user signs up or logs in via REST endpoints.
   - A JWT token is stored in localStorage and attached to all API calls.

2. Matchmaking (pages/Matchmaking.jsx)
   - Creates a Socket.IO connection using the JWT token (Authorization: Bearer <token>).
   - Emits `matchmaking:join` with desired level.
   - Listens for:
     - `matchmaking:queued` → user is placed in the queue.
     - `matchmaking:found` → paired with an opponent and a session is created.
   - On `matchmaking:found`, session data and questions are persisted in sessionStorage:
     - `currentSession` → the server-created session object (id/_id, players, status, etc.)
     - `currentQuestions` → array of questions for the game
     - `currentPlayers` → basic info of both players
   - Redirects to the Game route (`/game`).

3. Playing the Game (pages/Game.jsx)
   - Loads questions from `sessionStorage.currentQuestions`.
   - Tracks per-question timer, selected answers, correctness, streak, and scoring.
   - Correct option detection uses either `correctIndex` or matches `correctAnswer` to option text.
   - After the last question, submits all answers to the backend via `POST /api/game/submit`.
   - If both players have already finished, immediately redirects to `/result`.
   - If the opponent is still playing, shows a waiting modal and polls the result endpoint for up to ~10 seconds, checking `data.status === "completed"` to redirect as soon as the session is completed.

4. Result Screen (pages/Result.jsx)
   - Reads `currentSession` or `lastSessionId` from sessionStorage to get the session id.
   - Calls `GET /api/game/result/:sessionId` to fetch match outcome and player stats snapshot.
   - Refreshes the current user via `GET /api/auth/me` so dashboard XP/stats update.
   - If the session is completed but server stats are not yet finalized, performs a one-time per-player stats update using `POST /api/game/update-player-stats`.
   - The server may also finalize stats in a background task started after sending the result response; so results appear fast, and XP/games played update shortly afterward.

## Client-Side APIs (src/api.js)
- `signup`, `login`, `getCurrentUser`
- `joinMatchmaking`, `getQueueStatus`
- `submitGameAnswers(sessionId, answers)`
- `getGameResult(sessionId)`
- `updatePlayerStats({ playerId, sessionId, outcome })`
- Axios request interceptor attaches JWT token from localStorage to Authorization header.

## SessionStorage Keys
- `currentSession`: server-created session (contains id/_id, players, etc.)
- `currentQuestions`: array of questions used by Game page
- `currentPlayers`: information about you and opponent for Game header
- `lastSessionId`: remembered after submit to ensure Result can resolve session id

## Development & Running Locally
- Start client: `npm install` then `npm run dev`
- Default dev server runs on port 5173 (or next available if occupied).
- Ensure server is running and CORS/socket origins allow your client origin.

## Error Handling & Edge Cases
- If no questions are in sessionStorage, Game redirects to `/match` with a safeguard UI message.
- If token expires (401), the client clears auth and redirects to `/login`.
- Result page tolerates partial data and refreshes after per-player update or server finalization.

## Deployment Notes
- Configure `VITE_API_BASE_URL` and `VITE_SOCKET_URL` to point at your deployed backend.
- Confirm backend CORS/socket allowlist includes your frontend origin to avoid handshake failures.