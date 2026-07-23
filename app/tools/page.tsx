'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ProjectHeader from '@/components/ProjectHeader';
import { ArrowLeft, Play, RefreshCw, Terminal, Unlock, Trash2, Copy, FileText, Download } from 'lucide-react';

export default function ToolsPage() {
  const [stats, setStats] = useState({ ca_count: 0, pdf_count: 0, db_count: 0 });
  const [status, setStatus] = useState({ running: false, task: '', startTime: 0 });
  const [logs, setLogs] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/tools?action=get_stats');
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data && typeof data === 'object') {
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/tools?action=status');
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data && typeof data === 'object') {
        setStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/tools?action=logs');
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data) {
        setLogs(data.logs || '');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchStatus();
    fetchLogs();

    const interval = setInterval(() => {
      fetchStatus();
      fetchLogs();
      fetchStats();
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const runTask = async (task: 'main' | 'info') => {
    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', task }),
      });
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (!data.success) {
        alert(`Error: ${data.error}`);
      }
      fetchStatus();
      fetchLogs();
    } catch (e: any) {
      alert(`Network error: ${e.message}`);
    }
  };

  const handleUnlock = async () => {
    if (confirm('Force unlock system? Use this if a process got stuck.')) {
      await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock' }),
      });
      fetchStatus();
    }
  };

  const handleClearLogs = async () => {
    if (confirm('Clear logs from process.log?')) {
      await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_logs' }),
      });
      setLogs('');
    }
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(logs);
    alert('Logs copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <ProjectHeader
        onProjectChange={() => {
          fetchStats();
          fetchLogs();
          fetchStatus();
        }}
      />

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl font-extrabold text-white shadow-lg shadow-blue-500/20">
            ⚙️
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              System Tools
            </h1>
            <p className="text-sm text-slate-400">
              Manage background download tasks and PDF billing data parser
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>

          {status.running && (
            <button
              onClick={handleUnlock}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-sm font-semibold transition shadow-lg shadow-rose-500/20"
            >
              <Unlock className="w-4 h-4" /> Force Unlock
            </button>
          )}
        </div>
      </header>

      {/* Tools Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Parser */}
        <div className="p-6 bg-slate-900/70 border border-white/10 rounded-2xl backdrop-blur-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Bill Parser & Extractor
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Parses all downloaded PDF bills inside the bills folder. Extracts details like consumer
              name, month, amount, and meter readings to update the JSON database.
            </p>

            <div className="grid grid-cols-2 gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="text-center">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  PDF Bills
                </div>
                <div className="text-lg font-bold text-blue-400 font-mono">{stats.pdf_count}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Database Records
                </div>
                <div className="text-lg font-bold text-emerald-400 font-mono">{stats.db_count}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  status.running && status.task === 'parser'
                    ? 'bg-amber-400 animate-pulse shadow-lg shadow-amber-400/50'
                    : 'bg-slate-500'
                }`}
              />
              {status.running && status.task === 'parser' ? 'Parsing Bills...' : 'Idle'}
            </div>

            <button
              onClick={() => runTask('info')}
              disabled={status.running}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition shadow-lg shadow-emerald-500/20"
            >
              {status.running && status.task === 'parser' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run Parser
            </button>
          </div>
        </div>

        {/* Card 2: Downloader */}
        <div className="p-6 bg-slate-900/70 border border-white/10 rounded-2xl backdrop-blur-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-400" />
              Bill Downloader
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Loads all consumer account numbers listed in ca.txt, scans the bills directory, and
              downloads missing PDF bills from official BSPHCL API endpoints.
            </p>

            <div className="grid grid-cols-2 gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="text-center">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  CA Accounts
                </div>
                <div className="text-lg font-bold text-blue-400 font-mono">{stats.ca_count}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Downloaded
                </div>
                <div className="text-lg font-bold text-emerald-400 font-mono">{stats.pdf_count}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  status.running && status.task === 'downloader'
                    ? 'bg-amber-400 animate-pulse shadow-lg shadow-amber-400/50'
                    : 'bg-slate-500'
                }`}
              />
              {status.running && status.task === 'downloader' ? 'Downloading...' : 'Idle'}
            </div>

            <button
              onClick={() => runTask('main')}
              disabled={status.running}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition shadow-lg shadow-blue-500/20"
            >
              {status.running && status.task === 'downloader' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run Downloader
            </button>
          </div>
        </div>
      </div>

      {/* Terminal View */}
      <div className="bg-slate-950/90 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl flex flex-col">
        <div className="bg-slate-900/80 px-5 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span className="ml-2 font-mono text-xs text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> system-console: process.log
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyLogs}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-xs text-slate-300 transition flex items-center gap-1.5"
            >
              <Copy className="w-3 h-3" /> Copy Logs
            </button>
            <button
              onClick={() => setLogs('')}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-xs text-slate-300 transition"
            >
              Clear Screen
            </button>
            <button
              onClick={handleClearLogs}
              className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-md text-xs text-rose-400 transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" /> Clear File
            </button>
          </div>
        </div>

        <div className="h-[380px] p-5 overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap break-all space-y-1">
          {logs ? (
            logs.split('\n').map((line, idx) => (
              <div key={idx}>
                {line.includes('[OK]') ? (
                  <span className="text-emerald-400 font-semibold">{line}</span>
                ) : line.includes('[ERR]') || line.includes('ERROR') ? (
                  <span className="text-rose-400 font-semibold">{line}</span>
                ) : line.includes('[SKIP]') ? (
                  <span className="text-amber-400 font-semibold">{line}</span>
                ) : (
                  <span>{line}</span>
                )}
              </div>
            ))
          ) : (
            <div className="text-slate-500">Ready. Select a task above to execute...</div>
          )}
          <div ref={terminalEndRef} />
        </div>

        <div className="px-5 py-2.5 bg-slate-900/40 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0"
            />
            Auto-Scroll Console
          </label>
          <span>{logs.length} chars</span>
        </div>
      </div>
    </div>
  );
}
