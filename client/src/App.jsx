import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { getCurrentUser } from "./api";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Lazy import new pages
import Dashboard from "./pages/Dashboard";
import Matchmaking from "./pages/Matchmaking";
import Game from "./pages/Game";
import Result from "./pages/Result";

export default function App() {
  const [session, setSession] = useState(null); // { token, player }
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  function onAuth(data) {
    setSession(data);
    setIsAuthenticated(true);
    localStorage.setItem("token", data.token);
    navigate("/dashboard");
  }

  useEffect(() => {
    // Check if token exists on mount and fetch user data
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const data = await getCurrentUser();
          setSession(data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        // Token might be invalid, clear it
        localStorage.removeItem("token");
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <p>Loading...</p>
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login onAuth={onAuth} />} />
          <Route path="/signup" element={<Signup onAuth={onAuth} />} />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <Dashboard session={session} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/match"
            element={
              isAuthenticated ? (
                <Matchmaking />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/game"
            element={
              isAuthenticated ? <Game /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/result"
            element={
              isAuthenticated ? <Result /> : <Navigate to="/login" replace />
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </div>
  );
}
