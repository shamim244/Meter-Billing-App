'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ProjectHeader from '@/components/ProjectHeader';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

export default function CAManagerPage() {
  const [content, setContent] = useState('');
  const [total, setTotal] = useState(0);
  const [unique, setUnique] = useState(0);
  const [duplicate, setDuplicate] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCAData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ca');
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data.success) {
        setContent(data.content);
        setTotal(data.totalEntries);
        setUnique(data.uniqueEntries);
        setDuplicate(data.duplicateEntries);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load CA numbers.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCAData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/ca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', content }),
      });
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchCAData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error saving file.' });
    }
  };

  const handleRemoveDuplicates = async () => {
    if (!confirm('Remove duplicate entries?')) return;
    try {
      const res = await fetch('/api/ca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_duplicates' }),
      });
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchCAData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to remove duplicates.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error removing duplicates.' });
    }
  };

  return (
    <div className="space-y-6">
      <ProjectHeader onProjectChange={fetchCAData} />

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl font-extrabold text-white shadow-lg shadow-blue-500/20">
            📋
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              CA Number Manager
            </h1>
            <p className="text-sm text-slate-400">View and update consumer account numbers (ca.txt)</p>
          </div>
        </div>

        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </header>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            className="w-full h-[500px] p-4 bg-slate-900/80 border border-white/10 rounded-xl font-mono text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition resize-y"
            placeholder="Enter CA numbers (one per line)..."
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save File
          </button>

          <button
            type="button"
            onClick={handleRemoveDuplicates}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition shadow-lg shadow-rose-500/20 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Remove Duplicates
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900/60 border border-blue-500/20 rounded-xl text-center backdrop-blur-xl">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Total Entries
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono">{total}</div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-emerald-500/20 rounded-xl text-center backdrop-blur-xl">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Unique Entries
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{unique}</div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-rose-500/20 rounded-xl text-center backdrop-blur-xl">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Duplicates
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{duplicate}</div>
        </div>
      </div>
    </div>
  );
}
