import React, { useState, useEffect } from "react";
import { User, Zap, Crown, LogOut } from "lucide-react";
import { getCurrentUser } from "../api";

export default function Dashboard({ session, onLogout }) {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayerData() {
      try {
        const me = await getCurrentUser();
        const playerData = me?.player || me;

        setPlayer({
          name: playerData?.name || playerData?.username || "Player",
          username: playerData?.username || "player",
          level: playerData?.level ?? 1,
          xp: playerData?.xp ?? 0,
        });
      } catch (err) {
        console.error("Failed to fetch player data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayerData();
  }, []);

  function logout() {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  }

  function startMatchmaking() {
    window.location.href = "/match";
  }

  if (loading || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 w-full bg-white/10 backdrop-blur-xl border-b border-white/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              QuizMaster
            </h1>
          </div>

          {/* Profile Dropdown */}
          <div className="relative group cursor-pointer">
            <div className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-full px-4 py-2 border border-white/20 transition-all">
              <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold hidden sm:block">
                {player.username}
              </span>
              <div className="flex items-center gap-1 bg-yellow-500/90 px-2 py-0.5 rounded-full">
                <Crown className="w-3 h-3 text-yellow-900" />
                <span className="text-xs font-bold text-yellow-900">
                  {player.level}
                </span>
              </div>
            </div>

            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-3 hidden group-hover:block bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-4 w-48 border border-white/10 z-50">
              <button
                onClick={logout}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Player Section */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl mb-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">{player.name}</h2>
              <p className="text-white/70 text-lg">@{player.username}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 bg-yellow-500/30 px-3 py-1 rounded-full">
                  <Crown className="w-4 h-4 text-yellow-300" />
                  <span className="text-white font-bold">
                    Level {player.level}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-blue-500/30 px-3 py-1 rounded-full">
                  <Zap className="w-4 h-4 text-blue-300" />
                  <span className="text-white font-bold">{player.xp} XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* XP Progress */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <p className="text-white/80 text-sm mb-3">
              Progress to next level (200 XP per level)
            </p>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden shadow-inner border border-white/20">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-full"
                style={{
                  width: `${Math.min(100, (player.xp % 200) / 2)}%`,
                }}
              ></div>
            </div>
            <p className="text-white/60 text-xs mt-2">
              {player.xp % 200} / 200 XP to next level
            </p>
          </div>
        </div>

        {/* Start Game Section */}
        <div className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 backdrop-blur-xl border-2 border-cyan-400/50 rounded-3xl p-10 shadow-2xl text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Ready to Play?</h3>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Find an opponent at your level and compete in a thrilling
            10-question quiz match!
          </p>
          <button
            onClick={startMatchmaking}
            className="bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white font-black text-lg py-5 px-12 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            🎮 START GAME
          </button>
        </div>
      </div>
    </div>
  );
}
