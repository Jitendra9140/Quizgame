import React, { useEffect, useState } from "react";
import {
  Users,
  Trophy,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Target,
  TrendingUp,
} from "lucide-react";
import { getGameResult, getCurrentUser, updatePlayerStats } from "../api";

export default function Result() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [statsUpdated, setStatsUpdated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchResult() {
      try {
        console.log("[RESULT] 🎯 Fetching result...");
        // Fetch current player info
        const me = await getCurrentUser();
        if (!cancelled) {
          console.log("[RESULT] ✅ Current player:", me);
          setCurrentPlayer(me?.player || me);
        }

        const storedSession = JSON.parse(
          sessionStorage.getItem("currentSession") || "null"
        );
        const lastSessionId = sessionStorage.getItem("lastSessionId");
        const sessionId =
          lastSessionId || storedSession?.id || storedSession?._id || null;
        if (!sessionId) {
          throw new Error("Missing sessionId. Please play a game first.");
        }
        console.log("[RESULT] 📌 Session ID:", sessionId);
        const data = await getGameResult(sessionId);
        if (!cancelled) {
          console.log("[RESULT] 📊 Result data:", data);
          setResult(data);

          // Refresh current player info so dashboard shows updated XP/stats
          try {
            const refreshed = await getCurrentUser();
            if (!cancelled) setCurrentPlayer(refreshed?.player || refreshed);
          } catch (e) {
            console.warn("[RESULT] Failed to refresh current user:", e);
          }

          // If the session is completed but stats are not finalized on server,
          // call the update-player-stats endpoint once for the current player.
          try {
            if (
              data?.status === "completed" &&
              !data?.statsFinalized &&
              !statsUpdated
            ) {
              const yourOutcome = data?.outcome;
              const sessionId = data?.sessionId;
              const playerId =
                (currentPlayer && (currentPlayer.id || currentPlayer._id)) ||
                null;
              if (playerId && sessionId && yourOutcome) {
                console.log(
                  `[RESULT] 🔁 Calling update-player-stats for ${playerId} outcome=${yourOutcome}`
                );
                await updatePlayerStats({
                  playerId,
                  sessionId,
                  outcome: yourOutcome,
                });
                setStatsUpdated(true);

                // Refresh current user and result after updating stats
                try {
                  const refreshed2 = await getCurrentUser();
                  if (!cancelled)
                    setCurrentPlayer(refreshed2?.player || refreshed2);
                } catch (e) {
                  console.warn(
                    "[RESULT] Failed to refresh current user after update:",
                    e
                  );
                }
                try {
                  const newResult = await getGameResult(sessionId);
                  if (!cancelled) setResult(newResult);
                } catch (e) {
                  console.warn(
                    "[RESULT] Failed to refetch result after update:",
                    e
                  );
                }
              }
            }
          } catch (e) {
            console.warn("[RESULT] update-player-stats failed:", e);
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error("[RESULT] ❌ Error:", e);
          setError(e.message || "Failed to fetch result");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchResult();
    return () => {
      cancelled = true;
    };
  }, []);

  const goToDashboard = () => {
    window.location.href = "/dashboard";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 w-full max-w-xl shadow-2xl text-center">
          <div className="flex justify-center mb-6">
            <Clock className="w-12 h-12 text-white animate-pulse" />
          </div>
          <p className="text-white/80">Loading result...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 w-full max-w-xl shadow-2xl text-center">
          <div className="flex justify-center mb-6">
            <AlertCircle className="w-12 h-12 text-red-300" />
          </div>
          <p className="text-white">{error}</p>
          <button
            onClick={goToDashboard}
            className="mt-6 bg-white/10 border border-white/20 text-white px-4 py-2 rounded-xl hover:bg-white/20"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const youOutcome = result?.outcome;
  const p1 = result?.p1 || {
    correct: 0,
    total: 0,
    outcome: "draw",
    name: "Player 1",
    xp: 0,
    level: 1,
  };
  const p2 = result?.p2 || {
    correct: 0,
    total: 0,
    outcome: "draw",
    name: "Player 2",
    xp: 0,
    level: 1,
  };
  const yourId = currentPlayer?.id || currentPlayer?._id;
  const isP1You = yourId === p1.id;
  const youPlayer = isP1You ? p1 : p2;
  const opponentPlayer = isP1You ? p2 : p1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 relative overflow-hidden p-6">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black text-white mb-4">Match Result</h1>
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 bg-white/10">
            {youOutcome === "win" ? (
              <>
                <Trophy className="w-6 h-6 text-yellow-400" />
                <span className="text-white font-bold text-xl">
                  🎉 You Won!
                </span>
              </>
            ) : youOutcome === "loss" ? (
              <>
                <XCircle className="w-6 h-6 text-red-400" />
                <span className="text-white font-bold text-xl">You Lost</span>
              </>
            ) : (
              <>
                <Users className="w-6 h-6 text-blue-400" />
                <span className="text-white font-bold text-xl">
                  It's a Draw
                </span>
              </>
            )}
          </div>
        </div>

        {/* Player Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Player 1 Card */}
          <div
            className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 transition-all ${
              isP1You ? "ring-2 ring-yellow-400" : ""
            }`}
          >
            <div className="text-center mb-6">
              <h3 className="text-white font-bold text-xl mb-2">{p1.name}</h3>
              <div className="inline-flex gap-2 items-center mb-3">
                <div className="bg-yellow-500/80 px-3 py-1 rounded-full text-white font-bold text-sm">
                  Level {p1.level}
                </div>
                <div className="bg-white/5 px-3 py-1 rounded-full text-white text-sm">
                  XP: {p1.xp}
                </div>
              </div>
              {isP1You && (
                <span className="text-yellow-300 text-xs font-semibold">
                  YOU
                </span>
              )}
            </div>

            {/* Score */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white text-4xl font-black">
                  {p1.correct}/{result?.totalQuestions || p1.total || 0}
                </span>
              </div>
              <p
                className={`text-sm font-semibold ${
                  p1.outcome === "win"
                    ? "text-yellow-300"
                    : p1.outcome === "loss"
                    ? "text-red-300"
                    : "text-blue-300"
                }`}
              >
                {p1.outcome === "win"
                  ? "🏆 WIN"
                  : p1.outcome === "loss"
                  ? "❌ LOSS"
                  : "🤝 DRAW"}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span className="text-white/60 text-xs">Avg Response</span>
                </div>
                <p className="text-white font-bold text-sm">
                  {p1.avgResponseMs}ms
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-white/60 text-xs">Accuracy</span>
                </div>
                <p className="text-white font-bold text-sm">
                  {result?.totalQuestions > 0
                    ? Math.round((p1.correct / result.totalQuestions) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>

          {/* Player 2 Card */}
          <div
            className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 transition-all ${
              !isP1You ? "ring-2 ring-yellow-400" : ""
            }`}
          >
            <div className="text-center mb-6">
              <h3 className="text-white font-bold text-xl mb-2">{p2.name}</h3>
              <div className="inline-flex gap-2 items-center mb-3">
                <div className="bg-yellow-500/80 px-3 py-1 rounded-full text-white font-bold text-sm">
                  Level {p2.level}
                </div>
                <div className="bg-white/5 px-3 py-1 rounded-full text-white text-sm">
                  XP: {p2.xp}
                </div>
              </div>
              {!isP1You && (
                <span className="text-yellow-300 text-xs font-semibold">
                  YOU
                </span>
              )}
            </div>

            {/* Score */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white text-4xl font-black">
                  {p2.correct}/{result?.totalQuestions || p2.total || 0}
                </span>
              </div>
              <p
                className={`text-sm font-semibold ${
                  p2.outcome === "win"
                    ? "text-yellow-300"
                    : p2.outcome === "loss"
                    ? "text-red-300"
                    : "text-blue-300"
                }`}
              >
                {p2.outcome === "win"
                  ? "🏆 WIN"
                  : p2.outcome === "loss"
                  ? "❌ LOSS"
                  : "🤝 DRAW"}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span className="text-white/60 text-xs">Avg Response</span>
                </div>
                <p className="text-white font-bold text-sm">
                  {p2.avgResponseMs}ms
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-white/60 text-xs">Accuracy</span>
                </div>
                <p className="text-white font-bold text-sm">
                  {result?.totalQuestions > 0
                    ? Math.round((p2.correct / result.totalQuestions) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={goToDashboard}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white py-4 px-8 rounded-xl font-bold text-lg transition-all shadow-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-bounce { animation: bounce 1s infinite; }
        .delay-1000 { animation-delay: 1s; }
      `}</style>
    </div>
  );
}
