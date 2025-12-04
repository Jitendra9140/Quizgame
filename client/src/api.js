import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to every request if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors (e.g., 401 unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear session
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export async function signup({ name, username, password }) {
  try {
    const response = await api.post("/api/auth/signup", {
      name,
      username,
      password,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Signup failed");
  }
}

export async function login({ username, password }) {
  try {
    const response = await api.post("/api/auth/login", { username, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Login failed");
  }
}

export async function getCurrentUser() {
  try {
    const response = await api.get("/api/auth/me");
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Failed to fetch user");
  }
}

export async function joinMatchmaking() {
  try {
    const response = await api.post("/api/match/join");
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Matchmaking failed");
  }
}

export async function getQueueStatus() {
  try {
    const response = await api.get("/api/match/queue-status");
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || "Failed to get queue status"
    );
  }
}

export async function submitGameAnswers(sessionId, answers) {
  try {
    const response = await api.post("/api/game/submit", { sessionId, answers });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Failed to submit answers");
  }
}

export async function getGameResult(sessionId) {
  try {
    const response = await api.get(`/api/game/result/${sessionId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || "Failed to get game result");
  }
}

export async function updatePlayerStats({ playerId, sessionId, outcome }) {
  try {
    const response = await api.post("/api/game/update-player-stats", {
      playerId,
      sessionId,
      outcome,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || "Failed to update player stats"
    );
  }
}