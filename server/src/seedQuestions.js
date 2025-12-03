require("dotenv").config();
const mongoose = require("mongoose");
const questionsData = require("./Question.json");
const { Question } = require("./db");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/quizgame";

async function seedQuestions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");

    // Clear existing questions
    const deleteResult = await Question.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing questions`);

    // Prepare bulk data from Question.json
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

    // Insert all questions
    if (bulk.length > 0) {
      const result = await Question.insertMany(bulk);
      console.log(
        `✅ Successfully seeded ${result.length} questions into MongoDB`
      );

      // Log summary
      for (const levelData of questionsData.levels) {
        const count = await Question.countDocuments({ level: levelData.level });
        console.log(`   Level ${levelData.level}: ${count} questions`);
      }
    }

    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seedQuestions();
