import React from 'react'
import { useState } from 'react';
import { login } from '../api';

export default function Login({ onAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    try {
      const data = await login({ username, password });
      onAuth?.(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-cyan-100">
      <form onSubmit={submit} className="bg-white/90 backdrop-blur shadow-xl rounded-2xl p-8 w-full max-w-md border border-slate-200">
        <h1 className="text-2xl font-bold mb-6 text-slate-800">Welcome back</h1>
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-slate-600">Username</span>
            <input className="mt-2 w-full border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none rounded-lg p-3 transition" value={username} onChange={e=>setUsername(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600">Password</span>
            <input className="mt-2 w-full border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none rounded-lg p-3 transition" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </label>
        </div>
        {error && <p className="text-red-600 mt-3">{error}</p>}
        <button className="mt-6 w-full bg-indigo-600 text-white rounded-lg p-3 font-medium hover:bg-indigo-700 active:bg-indigo-800 transition">Login</button>
      </form>
    </div>
  );
}