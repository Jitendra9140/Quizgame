import React from 'react';

export default function QuestionCard({ question, index, selected, onSelect }) {
  if (!question) return null;
  const { text, choices } = question;
  return (
    <div className="bg-white rounded-xl shadow p-6 border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-800">Q{index + 1}. {text}</h2>
      <div className="mt-4 grid gap-3">
        {choices.map((c, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`text-left rounded-lg border p-3 transition ${selected === i ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-indigo-50 border-slate-300'}`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}