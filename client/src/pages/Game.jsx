import React, { useState, useEffect } from "react";
import {
  Clock,
  Target,
  CheckCircle,
  XCircle,
  Brain,
  Flame,
  Shield,
  Star,
} from "lucide-react";
import { submitGameAnswers, getCurrentUser, getGameResult } from "../api";

export default function QuizGame() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [showResult, setShowResult] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [pollingActive, setPollingActive] = useState(false);

  // Retrieve sessionId from sessionStorage
  const sessionObj = JSON.parse(
    sessionStorage.getItem("currentSession") || "null"
  );
  const sessionId = sessionObj?.id || sessionObj?._id || null;

  // Get questions from sessionStorage
  const backendQuestions = JSON.parse(
    sessionStorage.getItem("currentQuestions") || "[]"
  );

  const quizData = backendQuestions;

  // If no questions loaded from backend, redirect to matchmaking
  useEffect(() => {
    if (!Array.isArray(quizData) || quizData.length === 0) {
      window.location.href = "/match";
    }
  }, []);

  const [player, setPlayer] = useState({ name: "You", avatar: "🎮", level: 7 });
  const [opponent, setOpponent] = useState({
    name: "Opponent",
    avatar: "🎯",
    level: 7,
  });

  useEffect(() => {
    try {
      const players = JSON.parse(
        sessionStorage.getItem("currentPlayers") || "null"
      );
      console.log("[Game] Loaded players from session:", players);
      const init = async () => {
        let me = null;
        try {
          const meResp = await getCurrentUser();
          me = meResp?.player || meResp;
        } catch (e) {
          console.warn("[Game] Failed to fetch current user:", e?.message || e);
        }
        if (players && typeof players === "object" && !Array.isArray(players)) {
          const self = players.you;
          const opp = players.opponent;
          setPlayer((prev) => ({
            ...prev,
            name: self?.username || self?.name || prev.name,
            level: self?.level ?? prev.level,
          }));
          setOpponent((prev) => ({
            ...prev,
            name: opp?.username || opp?.name || prev.name,
            level: opp?.level ?? prev.level,
          }));
        } else if (Array.isArray(players) && players.length >= 2) {
          const byId = me?.id || me?._id;
          const byUsername = me?.username;
          const self =
            players.find((p) => (p?.id || p?._id) === byId) ||
            players.find((p) => p?.username === byUsername) ||
            players[0];
          const opp = players.find((p) => p !== self) || players[1];
          setPlayer((prev) => ({
            ...prev,
            name: self?.username || self?.name || prev.name,
            level: self?.level ?? prev.level,
          }));
          setOpponent((prev) => ({
            ...prev,
            name: opp?.username || opp?.name || prev.name,
            level: opp?.level ?? prev.level,
          }));
        } else if (me) {
          setPlayer((prev) => ({
            ...prev,
            name: me?.username || me?.name || prev.name,
            level: me?.level ?? prev.level,
          }));
        }
      };
      init();
    } catch {}
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !showResult && !answered) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !answered) {
      handleTimeout();
    }
  }, [timeLeft, showResult, answered]);

  // Simulate opponent answering
  useEffect(() => {
    if (!answered && !opponentAnswered) {
      const opponentTime = setTimeout(() => {
        setOpponentAnswered(true);
        const opponentCorrect = Math.random() > 0.3;
        if (opponentCorrect) {
          setOpponentScore((prev) => prev + 10);
        }
      }, Math.random() * 8000 + 2000);
      return () => clearTimeout(opponentTime);
    }
  }, [currentQuestion, answered, opponentAnswered]);

  // 🔥 NEW POLLING MECHANISM
  useEffect(() => {
    if (!pollingActive || !sessionId) return;

    let isCancelled = false;
    let pollCount = 0;
    const MAX_POLLS = 20; // Poll for up to 10 seconds (20 * 500ms)

    const pollForResults = async () => {
      if (isCancelled || pollCount >= MAX_POLLS) {
        if (pollCount >= MAX_POLLS) {
          console.log(
            "[Game] Max polling attempts reached, redirecting to results"
          );
          window.location.href = "/result";
        }
        return;
      }

      try {
        console.log(`[Game] Polling attempt ${pollCount + 1}/${MAX_POLLS}`);
        const data = await getGameResult(sessionId);

        // Check if session is completed
        if (data?.status === "completed") {
          console.log("[Game] Session completed! Redirecting to results");
          setPollingActive(false);
          window.location.href = "/result";
          return;
        }

        // Continue polling
        pollCount++;
        setTimeout(pollForResults, 500); // Poll every 500ms
      } catch (error) {
        console.error("[Game] Polling error:", error);
        pollCount++;
        setTimeout(pollForResults, 1000); // Slower retry on error
      }
    };

    pollForResults();

    return () => {
      isCancelled = true;
    };
  }, [pollingActive, sessionId]);

  const handleTimeout = () => {
    setAnswered(true);
    setShowResult(true);
    setIsCorrect(false);
    try {
      const current = quizData[currentQuestion];
      const qId = current?.id || current?._id || null;
      setAnswers((prev) => [
        ...prev,
        {
          questionId: qId,
          selectedAnswer: null,
          selectedIndex: -1,
          responseMs: 15000,
        },
      ]);
    } catch (e) {
      // ignore
    }
    setTimeout(() => {
      nextQuestion();
    }, 2000);
  };

  const handleAnswerClick = (index) => {
    if (answered || showResult) return;

    const current = quizData[currentQuestion];
    const selectedText = current.options ? current.options[index] : null;

    const correctIdx =
      typeof current.correctIndex === "number"
        ? current.correctIndex
        : typeof current.correctAnswer === "number"
        ? current.correctAnswer
        : Array.isArray(current.options)
        ? current.options.findIndex((opt) => opt === current.correctAnswer)
        : -1;

    setAnswered(true);
    setSelectedAnswer(index);
    const correct = index === correctIdx;
    setIsCorrect(correct);
    setShowResult(true);

    const qId = current.id || current._id || null;
    setAnswers((prev) => [
      ...prev,
      {
        questionId: qId,
        selectedAnswer: selectedText,
        selectedIndex: index,
        responseMs: (15 - timeLeft) * 1000,
      },
    ]);

    if (correct) {
      const basePoints = 10;
      const speedBonus = timeLeft > 10 ? 5 : 0;
      setScore((prev) => prev + basePoints + speedBonus);
      setStreak((prev) => prev + 1);
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      nextQuestion();
    }, 2000);
  };

  const nextQuestion = async () => {
    if (currentQuestion < quizData.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setTimeLeft(15);
      setOpponentAnswered(false);
      setAnswered(false);
    } else {
      // 🎮 GAME ENDED - SUBMIT ANSWERS AND HANDLE POLLING
      try {
        if (sessionId && answers.length > 0) {
          console.log("[Game] Submitting answers...", answers.length);
          const resp = await submitGameAnswers(sessionId, answers);
          sessionStorage.setItem("lastSessionId", sessionId);

          // Check if both players finished immediately
          if (resp.bothPlayersFinished || resp.completed) {
            console.log(
              "[Game] Both players finished, redirecting immediately"
            );
            window.location.href = "/result";
            return;
          }

          // 🔄 Show waiting state and start polling
          console.log("[Game] Waiting for opponent, starting polling...");
          setWaitingForOpponent(true);
          setPollingActive(true);
        } else {
          console.warn("[Game] No session/answers to submit");
          window.location.href = "/dashboard";
        }
      } catch (e) {
        console.error("[Game] Submit error:", e);
        window.location.href = "/result";
      }
    }
  };

  if (!Array.isArray(quizData) || quizData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 w-full max-w-xl shadow-2xl text-center">
          <p className="text-white/80">
            No questions loaded. Redirecting to matchmaking...
          </p>
        </div>
      </div>
    );
  }

  const currentQuiz = quizData[currentQuestion];
  const progress = ((currentQuestion + 1) / quizData.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-4 md:p-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* 🔄 WAITING FOR OPPONENT MODAL */}
        {waitingForOpponent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl text-center w-96 animate-fade-in">
              <div className="w-20 h-20 mx-auto mb-6 border-4 border-t-purple-500 border-r-pink-500 border-b-blue-500 border-l-cyan-500 rounded-full animate-spin" />
              <h3 className="text-white text-2xl font-bold mb-3">
                Waiting for Opponent
              </h3>
              <p className="text-white/80 text-sm mb-4">
                Your opponent is still finishing their game. Hang tight!
              </p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        {/* Rest of your existing UI code... */}
        {/* (Keep all existing header, question card, and stats sections) */}

        {/* Header - Player vs Opponent */}
        <div className="mb-6">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-2xl shadow-lg">
                  {player.avatar}
                </div>
                <div>
                  <p className="text-white font-bold text-lg">{player.name}</p>
                  <div className="flex items-center gap-2">
                    <div className="bg-green-500/90 px-2 py-0.5 rounded text-xs font-bold text-white flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {score}
                    </div>
                    {streak > 0 && (
                      <div className="bg-orange-500/90 px-2 py-0.5 rounded text-xs font-bold text-white flex items-center gap-1">
                        <Flame className="w-3 h-3" />x{streak}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6">
                <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-full px-4 py-2 shadow-lg">
                  <span className="text-white font-black text-sm">VS</span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-1 justify-end">
                <div className="text-right">
                  <p className="text-white font-bold text-lg">
                    {opponent.name}
                  </p>
                  <div className="flex items-center gap-2 justify-end">
                    <div className="bg-red-500/90 px-2 py-0.5 rounded text-xs font-bold text-white flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {opponentScore}
                    </div>
                    {opponentAnswered && (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-2xl shadow-lg">
                  {opponent.avatar}
                </div>
              </div>
            </div>

            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-center text-white/70 text-xs mt-2">
              Question {currentQuestion + 1} of {quizData.length}
            </p>
          </div>
        </div>

        {/* Main Question Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="bg-purple-500/80 backdrop-blur px-4 py-2 rounded-full border border-purple-300/30">
              <span className="text-white font-semibold text-sm flex items-center gap-2">
                <Brain className="w-4 h-4" />
                {currentQuiz.category ||
                  (currentQuiz.level ? `Level ${currentQuiz.level}` : "Trivia")}
              </span>
            </div>

            <div
              className={`flex items-center gap-3 px-5 py-3 rounded-full shadow-lg ${
                timeLeft <= 5
                  ? "bg-red-500/90 animate-pulse"
                  : "bg-white/20 backdrop-blur"
              }`}
            >
              <Clock
                className={`w-6 h-6 ${
                  timeLeft <= 5 ? "text-white" : "text-cyan-400"
                }`}
              />
              <span
                className={`text-2xl font-black ${
                  timeLeft <= 5 ? "text-white" : "text-white"
                }`}
              >
                {timeLeft}s
              </span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur rounded-2xl p-6 mb-8 border border-white/10">
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-relaxed text-center">
              {currentQuiz.question || currentQuiz.text}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuiz.options?.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const correctIdx =
                typeof currentQuiz.correctIndex === "number"
                  ? currentQuiz.correctIndex
                  : Array.isArray(currentQuiz.options)
                  ? currentQuiz.options.findIndex(
                      (opt) => opt === currentQuiz.correctAnswer
                    )
                  : -1;
              const isCorrectAnswer = index === correctIdx;
              const shouldShowCorrect = showResult && isCorrectAnswer;
              const shouldShowWrong =
                showResult && isSelected && !isCorrectAnswer;

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerClick(index)}
                  disabled={answered || showResult}
                  className={`group relative p-6 rounded-2xl font-semibold text-lg transition-all duration-300 border-2 ${
                    shouldShowCorrect
                      ? "bg-green-500/90 border-green-400 scale-105 shadow-2xl"
                      : shouldShowWrong
                      ? "bg-red-500/90 border-red-400 scale-95"
                      : answered
                      ? "bg-white/5 border-white/10 cursor-not-allowed"
                      : "bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40 hover:scale-105 cursor-pointer"
                  } backdrop-blur-xl shadow-lg`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex items-center gap-3 ${
                        shouldShowCorrect || shouldShowWrong
                          ? "text-white"
                          : "text-white/90"
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          shouldShowCorrect
                            ? "bg-green-600"
                            : shouldShowWrong
                            ? "bg-red-600"
                            : "bg-white/20"
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                    </span>

                    {shouldShowCorrect && (
                      <CheckCircle className="w-6 h-6 text-white" />
                    )}
                    {shouldShowWrong && (
                      <XCircle className="w-6 h-6 text-white" />
                    )}
                  </div>

                  {!answered && !showResult && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/0 via-blue-400/0 to-purple-400/0 group-hover:from-cyan-400/20 group-hover:via-blue-400/20 group-hover:to-purple-400/20 transition-all duration-300"></div>
                  )}
                </button>
              );
            })}
          </div>

          {showResult && (
            <div
              className={`mt-6 p-4 rounded-xl backdrop-blur-xl border-2 ${
                isCorrect
                  ? "bg-green-500/20 border-green-400"
                  : "bg-red-500/20 border-red-400"
              }`}
            >
              <p
                className={`text-center font-bold text-lg ${
                  isCorrect ? "text-green-100" : "text-red-100"
                }`}
              >
                {isCorrect
                  ? `🎉 Correct! +${10 + (timeLeft > 10 ? 5 : 0)} points ${
                      timeLeft > 10 ? "(Speed Bonus!)" : ""
                    }`
                  : "❌ Wrong answer! Better luck next time."}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-bold text-lg">{score}</span>
            </div>
            <p className="text-white/70 text-xs">Your Score</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-white font-bold text-lg">{streak}</span>
            </div>
            <p className="text-white/70 text-xs">Streak</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="text-white font-bold text-lg">
                {Math.floor((score / ((currentQuestion + 1) * 10)) * 100)}%
              </span>
            </div>
            <p className="text-white/70 text-xs">Accuracy</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .delay-100 {
          animation-delay: 0.1s;
        }
        .delay-200 {
          animation-delay: 0.2s;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}
