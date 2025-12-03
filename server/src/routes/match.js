const express = require("express");
const auth = require("../middleware/auth");
const { Player, Question, Session } = require("../db");

const router = express.Router();

// In-memory matchmaking queues per computed level { [level]: [playerObjectIdStrings...] }
const queues = new Map();

// POST /api/match/join -> attempts to match player by computed level, creates session if matched
router.post("/join", auth, async (req, res) => {
  try {
    const player = await Player.findById(req.user.id);
    if (!player) return res.status(404).json({ error: "Player not found" });

    const computedLevel = player.computeLevel();
    if (player.level !== computedLevel) {
      player.level = computedLevel;
      await player.save();
    }

    const level = player.level;
    if (!queues.has(level)) queues.set(level, []);
    const q = queues.get(level);

    // If someone is waiting, pair them
    if (q.length > 0) {
      const otherId = q.shift();

      // Select 10 random questions for this level
      const sampled = await Question.aggregate([
        { $match: { level } },
        { $sample: { size: 10 } },
      ]);
      if (sampled.length < 10) {
        return res
          .status(500)
          .json({ error: "Not enough questions available for this level" });
      }

      const session = await Session.create({
        level,
        status: "active",
        players: [otherId, player._id],
        questions: sampled.map((q) => q._id),
        startedAt: new Date(),
      });

      // Build question objects matching frontend expectations
      const questions = sampled.map((q, idx) => ({
        id: q._id,
        question: q.question || q.text,
        options: q.options || q.choices,
        correctAnswer: q.correctAnswer,
        correctIndex: Array.isArray(q.options)
          ? q.options.findIndex((o) => o === q.correctAnswer)
          : Array.isArray(q.choices)
          ? q.choices.findIndex((o) => o === q.correctAnswer)
          : -1,
        order: idx,
      }));

      // include player info for frontend convenience
      const otherPlayer = await Player.findById(otherId).lean();
      const playersPayload = [
        {
          id: otherPlayer?._id,
          username: otherPlayer?.username,
          name: otherPlayer?.name,
          level: otherPlayer?.level,
        },
        {
          id: player._id,
          username: player.username,
          name: player.name,
          level: player.level,
        },
      ];

      return res.status(200).json({
        matched: true,
        session: {
          id: session._id,
          level: session.level,
          status: session.status,
          startedAt: session.startedAt,
        },
        questions,
        players: playersPayload,
      });
    }

    // Otherwise queue player and return waiting
    q.push(String(player._id));
    return res.status(200).json({ matched: false, queued: true, level });
  } catch (err) {
    console.error("Match join error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/match/queue-status -> check position in queue based on computed level
router.get("/queue-status", auth, async (req, res) => {
  try {
    const player = await Player.findById(req.user.id);
    if (!player) return res.status(404).json({ error: "Player not found" });

    const computedLevel = player.computeLevel();
    if (player.level !== computedLevel) {
      player.level = computedLevel;
      await player.save();
    }
    const level = player.level;

    const q = queues.get(level) || [];
    const pos = q.indexOf(String(player._id));
    return res.json({ level, position: pos, queued: pos !== -1 });
  } catch (err) {
    console.error("Queue status error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
