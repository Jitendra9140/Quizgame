const express = require("express");
const auth = require("../middleware/auth");
const { Player, Question, Session, Answer } = require("../db");

const router = express.Router();

function awardXp(player, outcome) {
  let base = 0;
  if (outcome === "win") base = 40;
  else if (outcome === "draw") base = 20;
  else base = 10; // loss
  let bonus = 0;
  if (outcome === "win" && (player.winStreak || 0) >= 3) {
    bonus = 10;
  }
  const total = base + bonus;
  player.xp = (player.xp || 0) + total;
  if (outcome === "win") player.winStreak = (player.winStreak || 0) + 1;
  else if (outcome === "loss") player.winStreak = 0;
  player.level = player.computeLevel();
  return total;
}

// POST /api/game/submit
router.post("/submit", auth, async (req, res) => {
  try {
    const { sessionId, answers } = req.body || {};

    if (!sessionId || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        error: "sessionId & answers array are required",
      });
    }

    // Load session
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (session.status !== "active") {
      return res.status(400).json({ error: "Session is not active" });
    }

    // Load player
    const player = await Player.findById(req.user.id);
    if (!player) return res.status(404).json({ error: "Player not found" });

    // Check session membership
    const isParticipant = session.players
      .map(String)
      .includes(String(player._id));

    if (!isParticipant) {
      return res
        .status(403)
        .json({ error: "You are not part of this session" });
    }

    // Create question map for fast lookup
    const questionMap = new Map();
    const sessionQuestions = await Question.find({
      _id: { $in: session.questions },
    });

    sessionQuestions.forEach((q) => {
      questionMap.set(String(q._id), q);
    });

    // Count how many answers correct
    let correctCount = 0;

    for (const ans of answers) {
      if (!ans || !ans.questionId) continue;

      const q = questionMap.get(String(ans.questionId));
      if (!q) continue;

      const selected = ans.selectedAnswer || "";
      const isCorrect = q.correctAnswer === selected;

      if (isCorrect) correctCount++;

      await Answer.updateOne(
        {
          session: session._id,
          player: player._id,
          question: q._id,
        },
        {
          $set: {
            selectedAnswer: selected,
            selectedIndex: ans.selectedIndex || 0,
            correct: isCorrect,
            responseMs: ans.responseMs || 0,
            answeredAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    // Count answers per player
    const counts = await Answer.aggregate([
      { $match: { session: session._id } },
      {
        $group: {
          _id: "$player",
          total: { $sum: 1 },
          correct: { $sum: { $cond: ["$correct", 1, 0] } },
        },
      },
    ]);

    const perPlayer = new Map(counts.map((c) => [String(c._id), c]));

    const totalNeeded = session.questions.length;
    const p1Id = String(session.players[0]);
    const p2Id = String(session.players[1]);

    const p1 = perPlayer.get(p1Id) || { total: 0 };
    const p2 = perPlayer.get(p2Id) || { total: 0 };

    const p1Done = (p1.total || 0) >= totalNeeded;
    const p2Done = (p2.total || 0) >= totalNeeded;

    // If both players finished, mark session completed
    if (p1Done && p2Done) {
      session.status = "completed";
      session.finishedAt = new Date();
      await session.save();

      return res.json({
        completed: true,
        correctAnswers: correctCount,
        sessionId: session._id,
      });
    }

    return res.json({
      completed: false,
      yourAnswered: perPlayer.get(String(player._id))?.total || answers.length,
      totalQuestions: totalNeeded,
    });
  } catch (err) {
    console.error("Submit results error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/game/result/:sessionId
router.get("/result/:sessionId", auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const counts = await Answer.aggregate([
      { $match: { session: session._id } },
      {
        $group: {
          _id: "$player",
          total: { $sum: 1 },
          correct: { $sum: { $cond: ["$correct", 1, 0] } },
          avgResponseMs: { $avg: "$responseMs" },
        },
      },
    ]);
    const perPlayer = new Map(counts.map((c) => [String(c._id), c]));

    const p1Id = String(session.players[0]);
    const p2Id = String(session.players[1]);
    const p1 = perPlayer.get(p1Id) || {
      total: 0,
      correct: 0,
      avgResponseMs: 0,
    };
    const p2 = perPlayer.get(p2Id) || {
      total: 0,
      correct: 0,
      avgResponseMs: 0,
    };

    let p1Outcome = "draw";
    let p2Outcome = "draw";
    if ((p1.correct || 0) > (p2.correct || 0)) {
      p1Outcome = "win";
      p2Outcome = "loss";
    } else if ((p1.correct || 0) < (p2.correct || 0)) {
      p1Outcome = "loss";
      p2Outcome = "win";
    }

    // Build result payload first to return quickly
    const yourId = String(req.user.id);
    const youOutcome = yourId === p1Id ? p1Outcome : p2Outcome;

    // Fetch player names for result display
    const p1PlayerData = await Player.findById(p1Id).lean();
    const p2PlayerData = await Player.findById(p2Id).lean();

    const payload = {
      sessionId: session._id,
      status: session.status,
      totalQuestions: session.questions ? session.questions.length : 0,
      statsFinalized: !!session.statsFinalized,
      p1: {
        id: p1Id,
        name: p1PlayerData?.name || p1PlayerData?.username || "Player 1",
        level: p1PlayerData?.level || 1,
        xp: p1PlayerData?.xp || 0,
        correct: p1.correct || 0,
        total: p1.total || 0,
        avgResponseMs: Math.round(p1.avgResponseMs || 0),
        outcome: p1Outcome,
      },
      p2: {
        id: p2Id,
        name: p2PlayerData?.name || p2PlayerData?.username || "Player 2",
        level: p2PlayerData?.level || 1,
        xp: p2PlayerData?.xp || 0,
        correct: p2.correct || 0,
        total: p2.total || 0,
        avgResponseMs: Math.round(p2.avgResponseMs || 0),
        outcome: p2Outcome,
      },
      outcome: youOutcome,
    };

    // Defer XP/gamesPlayed awarding to after sending response for faster result
    if (
      session.status === "completed" &&
      !session.statsFinalized &&
      (!session.statsUpdated || session.statsUpdated.length === 0)
    ) {
      setImmediate(async () => {
        try {
          // Re-check session state to avoid race with client-side updates
          const freshSession = await Session.findById(sessionId).lean();
          if (
            !freshSession ||
            freshSession.statsFinalized ||
            (freshSession.statsUpdated && freshSession.statsUpdated.length > 0)
          ) {
            return;
          }
      
          const p1Player = await Player.findById(p1Id);
          const p2Player = await Player.findById(p2Id);
      
          const p1Xp = awardXp(p1Player, p1Outcome);
          p1Player.stats = p1Player.stats || {};
          p1Player.stats.gamesPlayed = (p1Player.stats.gamesPlayed || 0) + 1;
          p1Player.stats.avgResponseMs = p1.avgResponseMs || 0;
          if (p1Outcome === "win") {
            p1Player.stats.wins = (p1Player.stats.wins || 0) + 1;
          }
          await p1Player.save();
      
          const p2Xp = awardXp(p2Player, p2Outcome);
          p2Player.stats = p2Player.stats || {};
          p2Player.stats.gamesPlayed = (p2Player.stats.gamesPlayed || 0) + 1;
          p2Player.stats.avgResponseMs = p2.avgResponseMs || 0;
          if (p2Outcome === "win") {
            p2Player.stats.wins = (p2Player.stats.wins || 0) + 1;
          }
          await p2Player.save();
      
          await Session.updateOne(
            { _id: sessionId },
            { $set: { statsFinalized: true } }
          );
        } catch (bgErr) {
          console.error("[GAME RESULT] Background awarding failed:", bgErr);
        }
      });
    }

    return res.json(payload);
  } catch (err) {
    console.error("Get result error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/game/update-player-stats
router.post("/update-player-stats", auth, async (req, res) => {
  try {
    const { playerId, sessionId, outcome } = req.body;
    if (!playerId || !sessionId || !outcome) {
      return res
        .status(400)
        .json({ error: "playerId, sessionId and outcome required" });
    }

    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ error: "Player not found" });

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Ensure player is part of the session
    const isParticipant = session.players
      .map(String)
      .includes(String(playerId));
    if (!isParticipant)
      return res
        .status(403)
        .json({ error: "Player is not part of this session" });

    // If session already finalized, skip
    if (session.statsFinalized) {
      return res.json({ success: true, alreadyFinalized: true });
    }

    // If this player was already updated, skip
    const alreadyUpdated = (session.statsUpdated || [])
      .map(String)
      .includes(String(playerId));
    if (alreadyUpdated) {
      return res.json({ success: true, alreadyUpdated: true });
    }

    // award xp and update win/gamesPlayed for this player
    const xpAwarded = awardXp(player, outcome);
    player.stats = player.stats || {};
    player.stats.gamesPlayed = (player.stats.gamesPlayed || 0) + 1;
    if (outcome === "win") {
      player.stats.wins = (player.stats.wins || 0) + 1;
    }
    await player.save();

    // mark this player as updated on the session
    session.statsUpdated = session.statsUpdated || [];
    session.statsUpdated = session.statsUpdated.map(String);
    session.statsUpdated.push(String(playerId));

    // If all session players updated, finalize
    const unique = Array.from(new Set(session.statsUpdated.map(String)));
    session.statsUpdated = unique;
    if (session.players && unique.length >= session.players.length) {
      session.statsFinalized = true;
      session.finishedAt = session.finishedAt || new Date();
    }
    await session.save();

    return res.json({
      success: true,
      player: player.toObject(),
      xpAwarded,
      statsFinalized: !!session.statsFinalized,
    });
  } catch (err) {
    console.error("update-player-stats error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;