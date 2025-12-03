import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api";

export default function Login({ onAuth }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await login({ username, password });
      if (data && data.token) {
        localStorage.setItem("token", data.token);
        onAuth?.(data);
        navigate("/dashboard");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("[LOGIN] Error:", err);
      setError(err.message || "Login failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-cyan-100">
      <form
        onSubmit={submit}
        className="bg-white/90 backdrop-blur shadow-xl rounded-2xl p-8 w-full max-w-md border border-slate-200"
      >
        <h1 className="text-2xl font-bold mb-6 text-slate-800">Welcome back</h1>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-slate-600">Username</span>
            <input
              className="mt-2 w-full border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none rounded-lg p-3 transition disabled:opacity-50"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600">Password</span>
            <input
              className="mt-2 w-full border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none rounded-lg p-3 transition disabled:opacity-50"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </label>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full bg-indigo-600 text-white rounded-lg p-3 font-medium hover:bg-indigo-700 active:bg-indigo-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span> Logging in...
            </>
          ) : (
            "Login"
          )}
        </button>
        <p className="mt-4 text-center text-slate-600">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-indigo-600 font-semibold hover:underline"
          >
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
