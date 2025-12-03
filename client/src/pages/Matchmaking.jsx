import React, { useEffect, useState } from "react";
import { Users, Zap, Search, AlertCircle, Trophy } from "lucide-react";
import io from "socket.io-client";

export default function Matchmaking() {
  const [status, setStatus] = useState("Searching for opponent...");
  const [error, setError] = useState(null);
  const [matchProgress, setMatchProgress] = useState(0);
  const [queuePosition, setQueuePosition] = useState(null);
  const [level, setLevel] = useState(7);

  useEffect(() => {
    let cancelled = false;
    let progressInterval;
    let socket;
    let timeoutId;
  
    // Progress bar animation
    progressInterval = setInterval(() => {
      setMatchProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 5;
      });
    }, 300);
  
    async function startSocketMatchmaking() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("You must be logged in.");
          return;
        }
  
        console.log("[Matchmaking] User is trying to start game via sockets...");
  
        socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
          transports: ["websocket"],
          auth: { token },
        });
  
        socket.on("connect", () => {
          console.log("[Socket] connected", socket.id);
          socket.emit("matchmaking:join");
          setStatus("Finding opponent...");
        });
  
        socket.on("matchmaking:queued", ({ level: lvl, position }) => {
          console.log(`[Matchmaking] queued at level ${lvl}, position ${position}`);
          setLevel(lvl);
          setQueuePosition(typeof position === "number" ? position : null);
          setStatus(`Level ${lvl} • Position in queue: ${position}`);
        });
  
        socket.on("matchmaking:found", ({ session, questions, players }) => {
          console.log("[Matchmaking] Match found! session:", session);
          if (players) {
            sessionStorage.setItem("currentPlayers", JSON.stringify(players));
            if (Array.isArray(players)) {
              console.log(`[Matchmaking] Connected players: ${players.map(p => p?.username || p?.name).join(" vs ")}`);
            } else if (players?.you || players?.opponent) {
              console.log(`[Matchmaking] Connected players: ${(players?.you?.username || players?.you?.name)} vs ${(players?.opponent?.username || players?.opponent?.name)}`);
            }
          }
          clearTimeout(timeoutId);
          sessionStorage.setItem("currentSession", JSON.stringify(session));
          sessionStorage.setItem("currentQuestions", JSON.stringify(questions || []));
          setMatchProgress(100);
          setStatus("Match found! Starting game...");
          setTimeout(() => {
            window.location.href = "/game";
          }, 1000);
        });
  
        socket.on("matchmaking:error", ({ error: msg }) => {
          console.error("[Matchmaking] error:", msg);
          setError(msg || "Matchmaking error");
        });
  
        // 20s timeout: no user available
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            console.warn("[Matchmaking] No user available within 20s.");
            setStatus("No user available. Please try again later.");
            setError(null);
          }
        }, 20000);
  
        socket.on("disconnect", () => {
          console.log("[Socket] disconnected");
        });
      } catch (err) {
        setError(err.message || "Failed to connect sockets.");
      }
    }
  
    startSocketMatchmaking();
  
    return () => {
      cancelled = true;
      if (progressInterval) clearInterval(progressInterval);
      if (timeoutId) clearTimeout(timeoutId);
      try {
        socket?.emit("matchmaking:cancel");
        socket?.disconnect();
      } catch {}
    };
  }, [level]);

  const handleCancel = () => {
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 relative overflow-hidden flex items-center justify-center p-6">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Main Card */}
      <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 w-full max-w-2xl shadow-2xl">
        {!error ? (
          <>
            {/* Animated Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                {/* Pulsing Glow */}
                <div className="absolute inset-0 bg-cyan-400/30 rounded-full blur-3xl animate-pulse"></div>

                {/* Main Icon Container */}
                <div className="relative w-32 h-32 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                  <Users className="w-16 h-16 text-white" />
                </div>

                {/* Orbiting Dots */}
                <div className="absolute inset-0 animate-spin-slow">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-400 rounded-full shadow-lg"></div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-pink-400 rounded-full shadow-lg"></div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-green-400 rounded-full shadow-lg"></div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-purple-400 rounded-full shadow-lg"></div>
                </div>
              </div>
            </div>

            {/* Status Text */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-black text-white mb-3">
                Finding Opponent
              </h1>
              <p className="text-xl text-white/80 mb-2">{status}</p>

              {queuePosition !== null && queuePosition > 0 && (
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full border border-white/20 mt-3">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-white text-sm font-semibold">
                    Queue Position: #{queuePosition}
                  </span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden shadow-inner border border-white/20">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-full transition-all duration-500 shadow-lg relative overflow-hidden"
                  style={{ width: `${matchProgress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-3">
                <span className="text-white/70 text-sm">Searching...</span>
                <span className="text-white/70 text-sm font-semibold">
                  {Math.floor(matchProgress)}%
                </span>
              </div>
            </div>

            {/* Animated Loading Dots */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce shadow-lg"></div>
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce delay-100 shadow-lg"></div>
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce delay-200 shadow-lg"></div>
            </div>

            {/* Match Info Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 text-center">
                <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                <p className="text-white text-sm font-semibold">
                  Level {level}
                </p>
                <p className="text-white/60 text-xs mt-1">Your Level</p>
              </div>

              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 text-center">
                <Users className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-white text-sm font-semibold">1v1 Match</p>
                <p className="text-white/60 text-xs mt-1">Game Mode</p>
              </div>

              <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 text-center">
                <Search className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-white text-sm font-semibold">Active</p>
                <p className="text-white/60 text-xs mt-1">Search Status</p>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 mb-6">
              <p className="text-white/80 text-sm text-center">
                💡 <span className="font-semibold">Pro Tip:</span> Answer
                quickly to earn speed bonuses and climb the leaderboard!
              </p>
            </div>

            {/* Cancel Button */}
            <button
              onClick={handleCancel}
              className="w-full bg-red-500/80 hover:bg-red-500 backdrop-blur text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg border border-red-400/50"
            >
              Cancel Search
            </button>
          </>
        ) : (
          // Error State
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 backdrop-blur rounded-full mb-6 border-2 border-red-400">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>

            <h1 className="text-3xl font-black text-white mb-3">
              Connection Error
            </h1>
            <p className="text-lg text-white/80 mb-8">{error}</p>

            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg"
              >
                Try Again
              </button>

              <button
                onClick={handleCancel}
                className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur text-white py-4 rounded-xl font-bold text-lg transition-all border border-white/20"
              >
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-bounce {
          animation: bounce 1s infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        .delay-100 {
          animation-delay: 0.1s;
        }
        
        .delay-200 {
          animation-delay: 0.2s;
        }
        
        .delay-500 {
          animation-delay: 0.5s;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}