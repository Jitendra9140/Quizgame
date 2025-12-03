import React, { useState } from "react";
import { signup } from "../api";
import { Link } from "react-router-dom";

export default function Signup({ onAuth }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    try {
      const data = await signup({ name, username, password });
      onAuth?.(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-200 via-white to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl shadow-2xl rounded-3xl p-8 border border-white/40">
        {/* Title */}
        <h1 className="text-3xl font-extrabold text-center text-slate-800">
          Create Your Account 🎉
        </h1>
        <p className="text-center text-slate-500 mb-6">
          Join the quiz battle and show your skills!
        </p>

        {/* Form */}
        <form onSubmit={submit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-slate-700">
              Full Name
            </label>
            <input
              type="text"
              className="mt-2 w-full border border-slate-300 bg-white/70 backdrop-blur p-3 rounded-xl shadow-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-300 outline-none transition"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Username */}
          <div>
            <label className="text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              type="text"
              className="mt-2 w-full border border-slate-300 bg-white/70 backdrop-blur p-3 rounded-xl shadow-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-300 outline-none transition"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              className="mt-2 w-full border border-slate-300 bg-white/70 backdrop-blur p-3 rounded-xl shadow-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-300 outline-none transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-sm font-medium text-slate-700">
              Confirm Password
            </label>
            <input
              type="password"
              className="mt-2 w-full border border-slate-300 bg-white/70 backdrop-blur p-3 rounded-xl shadow-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-300 outline-none transition"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {/* Error */}
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-purple-600 text-white py-3 rounded-xl text-lg font-semibold shadow-md hover:bg-purple-700 hover:shadow-lg active:scale-95 transition-transform"
          >
            Sign Up
          </button>
        </form>

        {/* Login link */}
        <p className="mt-6 text-center text-slate-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-purple-700 font-semibold hover:underline hover:text-purple-900 transition"
          >
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
