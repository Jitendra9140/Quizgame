// MongoDB (Mongoose) connection and models setup
require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/quizgame";

mongoose.set("strictQuery", true);
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Schemas
const playerSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  // Level is computed based on performance; store current computed level for matchmaking
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  winStreak: { type: Number, default: 0 },
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    totalAnswers: { type: Number, default: 0 },
    avgResponseMs: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
});

// Dynamic level computation helper: level = floor(xp/200) + 1
playerSchema.methods.computeLevel = function () {
  const xpTotal = this.xp || 0;
  return Math.floor(xpTotal / 200) + 1;
};
const questionSchema = new mongoose.Schema({
  level: { type: Number, required: true },
  id: { type: Number, required: true }, // Question ID within the level
  question: { type: String, required: true }, // The actual question text
  options: { type: [String], required: true }, // Array of 4 options
  correctAnswer: { type: String, required: true }, // Correct answer text
  createdAt: { type: Date, default: Date.now },
});

const sessionSchema = new mongoose.Schema({
  level: { type: Number, required: true },
  status: { type: String, enum: ["active", "completed"], default: "active" },
  statsFinalized: { type: Boolean, default: false },
  // track which players had their stats updated (to coordinate per-player finalization)
  statsUpdated: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
  createdAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
});

const answerSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
    required: true,
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Player",
    required: true,
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
    required: true,
  },
  selectedIndex: { type: Number, default: 0 },
  selectedAnswer: { type: String }, // The actual text of selected answer
  correct: { type: Boolean, required: true },
  answeredAt: { type: Date, default: Date.now },
  responseMs: { type: Number, default: 0 },
});

const Player = mongoose.model("Player", playerSchema);
const Question = mongoose.model("Question", questionSchema);
const Session = mongoose.model("Session", sessionSchema);
const Answer = mongoose.model("Answer", answerSchema);

// Seed questions from Question.json if none exist
(async () => {
  try {
    const count = await Question.countDocuments();
    if (count === 0) {
      const questionsData = require("./Question.json");
      const bulk = [];

      if (questionsData.levels && Array.isArray(questionsData.levels)) {
        for (const levelData of questionsData.levels) {
          const level = levelData.level;
          for (const q of levelData.questions) {
            bulk.push({
              level,
              id: q.id,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
            });
          }
        }
      }

      if (bulk.length > 0) {
        await Question.insertMany(bulk);
        console.log(
          `Seeded ${bulk.length} questions into MongoDB from Question.json`
        );
      }
    }
  } catch (err) {
    console.error("Question seeding error:", err);
  }
})();

module.exports = { mongoose, Player, Question, Session, Answer };
