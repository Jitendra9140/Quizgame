const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Player } = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

function signToken(player) {
  const payload = {
    id: player._id,
    username: player.username,
    name: player.name,
    level: player.level,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, username, password } = req.body || {};
    if (!name || !username || !password) {
      return res
        .status(400)
        .json({ error: "name, username and password are required" });
    }

    const existing = await Player.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: "username already exists" });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const player = await Player.create({ name, username, passwordHash });
    // compute initial level from XP (defaults to 1)
    player.level = player.computeLevel();
    await player.save();

    const token = signToken(player);
    return res.status(201).json({
      token,
      player: {
        id: player._id,
        username: player.username,
        name: player.name,
        level: player.level,
        xp: player.xp || 0,
        stats: {
          gamesPlayed: player.stats?.gamesPlayed || 0,
          wins: player.stats?.wins || 0,
        },
      },
    });
  } catch (err) {
    console.error("Signup error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "username and password are required" });
    }

    const player = await Player.findOne({ username });
    if (!player) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const ok = bcrypt.compareSync(password, player.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    // Update computed level from XP before issuing token
    const newLevel = player.computeLevel();
    if (newLevel !== player.level) {
      player.level = newLevel;
      await player.save();
    }

    const token = signToken(player);
    return res.status(200).json({
      token,
      player: {
        id: player._id,
        username: player.username,
        name: player.name,
        level: player.level,
        xp: player.xp || 0,
        stats: {
          gamesPlayed: player.stats?.gamesPlayed || 0,
          wins: player.stats?.wins || 0,
        },
      },
    });
  } catch (err) {
    console.error("Login error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/me - Get current user info (requires valid token)
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const player = await Player.findById(req.user.id);
    if (!player) {
      return res.status(404).json({ error: "Player not found" });
    }
    return res.status(200).json({
      player: {
        id: player._id,
        username: player.username,
        name: player.name,
        level: player.level,
        xp: player.xp || 0,
        stats: {
          gamesPlayed: player.stats?.gamesPlayed || 0,
          wins: player.stats?.wins || 0,
        },
      },
    });
  } catch (err) {
    console.error("Get me error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
