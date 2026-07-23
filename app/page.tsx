'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ProjectHeader from '@/components/ProjectHeader';
import {
  Table as TableIcon,
  LayoutGrid,
  Download,
  Settings,
  Search,
  Copy,
  Check,
  FileText,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';

interface ConsumerBill {
  file: string;
  consumer_name: string;
  consumer_no: string;
  bill_month: string;
  total_amount: string;
  meter_no: string;
  current_reading: string;
  previous_reading: string;
  units_consumed: string;
  status: 'pending' | 'submitted' | 'critical' | 'doubt';
}

const AVATAR_COLORS = [
  { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
  { bg: 'rgba(16,185,129,0.15)', text: '#10b981' },
  { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
  { bg: 'rgba(139,92,246,0.15)', text: '#8b5cf6' },
  { bg: 'rgba(244,63,94,0.15)', text: '#f43f5e' },
  { bg: 'rgba(6,182,212,0.15)', text: '#06b6d4' },
];

export default function DashboardPage() {
  const [bills, setBills] = useState<ConsumerBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'submitted' | 'critical' | 'doubt'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusSort, setStatusSort] = useState('normal');
  const [mainSort, setMainSort] = useState('ca-asc');
  const [cardIndex, setCardIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedCa, setCopiedCa] = useState<string | null>(null);

  const fetchBills = async () => {
    try {
      const res = await fetch('/api/bills');
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data.success) {
        setBills(data.bills);
      }
    } catch (err) {
      console.error('Failed to load bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleStatusUpdate = async (ca: string, newStatus: string) => {
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ca, status: newStatus }),
      });
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data.success) {
        setBills((prev) =>
          prev.map((b) => (b.consumer_no === ca ? { ...b, status: newStatus as any } : b))
        );
        showToast(`Status for ${ca} updated to ${newStatus}`);
      }
    } catch {
      showToast('Error updating status');
    }
  };

  const copyCA = (ca: string) => {
    navigator.clipboard.writeText(ca);
    setCopiedCa(ca);
    showToast(`Copied ${ca} to clipboard!`);
    setTimeout(() => setCopiedCa(null), 2000);
  };

  const exportCSV = () => {
    if (!filteredAndSortedBills.length) return;
    const headers = ['Consumer No', 'Consumer Name', 'Bill Month', 'Current Reading', 'Previous Reading', 'Units Consumed', 'Total Amount', 'Meter No', 'Status'];
    const rows = filteredAndSortedBills.map((b) => [
      b.consumer_no,
      `"${b.consumer_name}"`,
      b.bill_month,
      b.current_reading,
      b.previous_reading,
      b.units_consumed,
      b.total_amount,
      b.meter_no,
      b.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nbpdcl_bills_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Counts
  const counts = useMemo(() => {
    const res = { all: bills.length, pending: 0, submitted: 0, critical: 0, doubt: 0 };
    bills.forEach((b) => {
      if (b.status === 'submitted') res.submitted++;
      else if (b.status === 'critical') res.critical++;
      else if (b.status === 'doubt') res.doubt++;
      else res.pending++;
    });
    return res;
  }, [bills]);

  // Overall Stats
  const totalAmount = useMemo(() => bills.reduce((acc, b) => acc + (parseFloat(b.total_amount) || 0), 0), [bills]);
  const totalUnits = useMemo(() => bills.reduce((acc, b) => acc + (parseInt(b.units_consumed) || 0), 0), [bills]);

  // Filter and Sort Logic
  const filteredAndSortedBills = useMemo(() => {
    let result = bills.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.consumer_no.toLowerCase().includes(q) ||
          b.consumer_name.toLowerCase().includes(q) ||
          b.meter_no.toLowerCase().includes(q)
        );
      }
      return true;
    });

    // Apply Status Priority Sort if specified
    if (statusSort !== 'normal') {
      const priorityMap: Record<string, Record<string, number>> = {
        pdcs: { pending: 1, doubt: 2, critical: 3, submitted: 4 },
        dcps: { doubt: 1, critical: 2, pending: 3, submitted: 4 },
        cdps: { critical: 1, doubt: 2, pending: 3, submitted: 4 },
        spdc: { submitted: 1, pending: 2, doubt: 3, critical: 4 },
      };

      const order = priorityMap[statusSort];
      if (order) {
        result.sort((a, b) => (order[a.status] || 99) - (order[b.status] || 99));
      }
    }

    // Apply Main Sort
    result.sort((a, b) => {
      switch (mainSort) {
        case 'ca-asc': return a.consumer_no.localeCompare(b.consumer_no);
        case 'ca-desc': return b.consumer_no.localeCompare(a.consumer_no);
        case 'current-asc': return (parseFloat(a.current_reading) || 0) - (parseFloat(b.current_reading) || 0);
        case 'current-desc': return (parseFloat(b.current_reading) || 0) - (parseFloat(a.current_reading) || 0);
        case 'prev-asc': return (parseFloat(a.previous_reading) || 0) - (parseFloat(b.previous_reading) || 0);
        case 'prev-desc': return (parseFloat(b.previous_reading) || 0) - (parseFloat(a.previous_reading) || 0);
        case 'units-asc': return (parseInt(a.units_consumed) || 0) - (parseInt(b.units_consumed) || 0);
        case 'units-desc': return (parseInt(b.units_consumed) || 0) - (parseInt(a.units_consumed) || 0);
        case 'amt-asc': return (parseFloat(a.total_amount) || 0) - (parseFloat(b.total_amount) || 0);
        case 'amt-desc': return (parseFloat(b.total_amount) || 0) - (parseFloat(a.total_amount) || 0);
        case 'meter-asc': return a.meter_no.localeCompare(b.meter_no);
        case 'meter-desc': return b.meter_no.localeCompare(a.meter_no);
        case 'month-asc': return a.bill_month.localeCompare(b.bill_month);
        case 'month-desc': return b.bill_month.localeCompare(a.bill_month);
        default: return 0;
      }
    });

    return result;
  }, [bills, statusFilter, searchQuery, statusSort, mainSort]);

  // Card view bounds reset
  useEffect(() => {
    if (cardIndex >= filteredAndSortedBills.length) {
      setCardIndex(0);
    }
  }, [filteredAndSortedBills, cardIndex]);

  const currentCard = filteredAndSortedBills[cardIndex];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-800 border border-white/10 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-xl text-slate-100 text-sm font-medium animate-bounce">
          {toast}
        </div>
      )}

      {/* Project Selector & Multi-MRU Header */}
      <ProjectHeader onProjectChange={fetchBills} />

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-2xl font-extrabold text-white shadow-lg shadow-blue-500/20">
            ⚡
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              NBPDCL Bill Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Electricity billing analytics & management</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex bg-white/5 border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'table' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'card' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Cards
            </button>
          </div>

          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          <Link
            href="/ca"
            className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            <ClipboardList className="w-3.5 h-3.5" /> CA Manager
          </Link>

          <Link
            href="/tools"
            className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            <Settings className="w-3.5 h-3.5" /> Tools
          </Link>
        </div>
      </header>

      {/* Status Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'all', label: '📋 All', count: counts.all, color: 'hover:border-blue-500/30' },
            { id: 'pending', label: '⏳ Pending', count: counts.pending, color: 'hover:border-slate-500/30' },
            { id: 'submitted', label: '✅ Submitted', count: counts.submitted, color: 'hover:border-emerald-500/30' },
            { id: 'critical', label: '❌ Critical', count: counts.critical, color: 'hover:border-rose-500/30' },
            { id: 'doubt', label: '⚠️ Doubt', count: counts.doubt, color: 'hover:border-amber-500/30' },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
              statusFilter === f.id
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            {f.label}
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[11px] font-bold text-slate-200">
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="relative bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-700 absolute top-0 left-0 right-0" />
          <div className="text-xl mb-1">👥</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Consumers</div>
          <div className="text-xl font-bold text-blue-400 mt-1 font-mono">{counts.all}</div>
        </div>

        <div className="relative bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-700 absolute top-0 left-0 right-0" />
          <div className="text-xl mb-1">💰</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Billing</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">₹{Math.round(totalAmount).toLocaleString()}</div>
        </div>

        <div className="relative bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-700 absolute top-0 left-0 right-0" />
          <div className="text-xl mb-1">⚡</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Units</div>
          <div className="text-xl font-bold text-amber-400 mt-1 font-mono">{totalUnits.toLocaleString()} kWh</div>
        </div>

        <div className="relative bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-700 absolute top-0 left-0 right-0" />
          <div className="text-xl mb-1">✅</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Submitted</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">{counts.submitted}</div>
        </div>

        <div className="relative bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-rose-500 to-rose-700 absolute top-0 left-0 right-0" />
          <div className="text-xl mb-1">❌</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Critical</div>
          <div className="text-xl font-bold text-rose-400 mt-1 font-mono">{counts.critical}</div>
        </div>

        <div className="relative bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-700 absolute top-0 left-0 right-0" />
          <div className="text-xl mb-1">⚠️</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Doubt</div>
          <div className="text-xl font-bold text-amber-400 mt-1 font-mono">{counts.doubt}</div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search consumer, name, meter..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={statusSort}
            onChange={(e) => setStatusSort(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition cursor-pointer"
          >
            <option value="normal">Status: Normal (Default)</option>
            <option value="pdcs">Status Priority: P-D-C-S</option>
            <option value="dcps">Status Priority: D-C-P-S</option>
            <option value="cdps">Status Priority: C-D-P-S</option>
            <option value="spdc">Status Priority: S-P-D-C</option>
          </select>

          <select
            value={mainSort}
            onChange={(e) => setMainSort(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500 transition cursor-pointer"
          >
            <option value="ca-asc">Sort: Consumer No (A-Z)</option>
            <option value="ca-desc">Sort: Consumer No (Z-A)</option>
            <option value="current-asc">Sort: Current Reading (Low to High)</option>
            <option value="current-desc">Sort: Current Reading (High to Low)</option>
            <option value="prev-asc">Sort: Previous Reading (Low to High)</option>
            <option value="prev-desc">Sort: Previous Reading (High to Low)</option>
            <option value="units-asc">Sort: Units (Low to High)</option>
            <option value="units-desc">Sort: Units (High to Low)</option>
            <option value="amt-asc">Sort: Amount (Low to High)</option>
            <option value="amt-desc">Sort: Amount (High to Low)</option>
            <option value="meter-asc">Sort: Meter No (A-Z)</option>
            <option value="meter-desc">Sort: Meter No (Z-A)</option>
            <option value="month-asc">Sort: Bill Month (A-Z)</option>
            <option value="month-desc">Sort: Bill Month (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Main View */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading consumer bills...</div>
      ) : filteredAndSortedBills.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-white/10">
          <h3 className="text-base font-semibold text-slate-200 mb-1">No results found</h3>
          <p className="text-xs text-slate-500">Try adjusting your search query or status filter</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 uppercase tracking-wider text-[11px] font-semibold text-slate-400 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3.5">Consumer No</th>
                  <th className="px-4 py-3.5">Current</th>
                  <th className="px-4 py-3.5">Previous</th>
                  <th className="px-4 py-3.5">Units</th>
                  <th className="px-4 py-3.5">Amount</th>
                  <th className="px-4 py-3.5">Meter No</th>
                  <th className="px-4 py-3.5">Bill Month</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAndSortedBills.map((b, idx) => {
                  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  const units = parseInt(b.units_consumed) || 0;
                  const amt = parseFloat(b.total_amount) || 0;

                  return (
                    <tr
                      key={b.consumer_no}
                      className={`hover:bg-blue-500/5 transition ${
                        b.status === 'submitted'
                          ? 'bg-emerald-500/5'
                          : b.status === 'critical'
                          ? 'bg-rose-500/5'
                          : b.status === 'doubt'
                          ? 'bg-amber-500/5'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                            style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
                          >
                            {b.consumer_no.slice(-2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-100">
                              <span>{b.consumer_no}</span>
                              <button
                                onClick={() => copyCA(b.consumer_no)}
                                title="Copy CA"
                                className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition"
                              >
                                {copiedCa === b.consumer_no ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-400 max-w-[160px] truncate">
                              {b.consumer_name || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-blue-400 font-mono">
                        {b.current_reading || '—'}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-400">
                        {b.previous_reading || '—'}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                            units <= 30
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : units <= 50
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {b.units_consumed} kWh
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-bold font-mono">
                        <span
                          className={
                            amt <= 0
                              ? 'text-slate-500'
                              : amt <= 3000
                              ? 'text-emerald-400'
                              : amt <= 10000
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }
                        >
                          {amt !== 0 ? `₹${amt.toFixed(2)}` : 'N/A'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-400">{b.meter_no || '—'}</td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[11px] font-medium border border-cyan-500/20">
                          {b.bill_month}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStatusUpdate(b.consumer_no, 'submitted')}
                            title="Submitted"
                            className={`p-1.5 rounded-lg border text-xs transition ${
                              b.status === 'submitted'
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-emerald-500/10'
                            }`}
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(b.consumer_no, 'critical')}
                            title="Critical"
                            className={`p-1.5 rounded-lg border text-xs transition ${
                              b.status === 'critical'
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-rose-500/10'
                            }`}
                          >
                            ❌
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(b.consumer_no, 'doubt')}
                            title="Doubt"
                            className={`p-1.5 rounded-lg border text-xs transition ${
                              b.status === 'doubt'
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-amber-500/10'
                            }`}
                          >
                            ⚠️
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <a
                          href={`#`}
                          onClick={(e) => {
                            e.preventDefault();
                            showToast(`Opening bill PDF for ${b.consumer_no}`);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 rounded-md text-[11px] font-medium transition"
                        >
                          <FileText className="w-3 h-3" /> PDF
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3.5 bg-slate-950/60 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div>
              Showing <span className="text-white font-semibold">{filteredAndSortedBills.length}</span> of{' '}
              <span className="text-white font-semibold">{bills.length}</span>
            </div>
            <div>Last updated: {new Date().toLocaleString()}</div>
          </div>
        </div>
      ) : (
        /* Card / Slider View */
        <div className="space-y-6">
          {currentCard && (
            <div className="max-w-xl mx-auto bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
              <div
                className={`h-1.5 ${
                  currentCard.status === 'submitted'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : currentCard.status === 'critical'
                    ? 'bg-gradient-to-r from-rose-500 to-rose-400'
                    : currentCard.status === 'doubt'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                    : 'bg-gradient-to-r from-slate-500 to-slate-400'
                }`}
              />

              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center text-lg font-black">
                      {currentCard.consumer_no.slice(-2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-bold text-slate-100">
                          {currentCard.consumer_no}
                        </span>
                        <button
                          onClick={() => copyCA(currentCard.consumer_no)}
                          className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition"
                        >
                          {copiedCa === currentCard.consumer_no ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {currentCard.consumer_name || 'Consumer Account'}
                      </div>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg text-xs font-semibold">
                    {currentCard.bill_month}
                  </span>
                </div>

                <div className="text-center py-2">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Total Amount
                  </div>
                  <div className="text-4xl font-extrabold font-mono text-emerald-400">
                    {parseFloat(currentCard.total_amount) !== 0
                      ? `₹${parseFloat(currentCard.total_amount).toFixed(2)}`
                      : 'N/A'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-4 rounded-xl border border-white/5 text-center">
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Current Reading
                    </div>
                    <div className="text-base font-bold text-blue-400 font-mono">
                      {currentCard.current_reading || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Previous Reading
                    </div>
                    <div className="text-base font-bold text-slate-300 font-mono">
                      {currentCard.previous_reading || '—'}
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Units Consumed
                    </div>
                    <div className="text-base font-bold text-amber-400 font-mono">
                      {currentCard.units_consumed} kWh
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Meter No
                    </div>
                    <div className="text-base font-bold text-slate-300 font-mono">
                      {currentCard.meter_no || '—'}
                    </div>
                  </div>
                </div>

                {/* Card Status Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleStatusUpdate(currentCard.consumer_no, 'submitted')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      currentCard.status === 'submitted'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    ✅ Submitted
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(currentCard.consumer_no, 'critical')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      currentCard.status === 'critical'
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    ❌ Critical
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(currentCard.consumer_no, 'doubt')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      currentCard.status === 'doubt'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚠️ Doubt
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Slider Navigation */}
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCardIndex((prev) => Math.max(0, prev - 1))}
                disabled={cardIndex === 0}
                className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 flex items-center justify-center transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-sm font-bold text-slate-300 font-mono">
                Card <span className="text-blue-400">{cardIndex + 1}</span> of {filteredAndSortedBills.length}
              </span>

              <button
                onClick={() =>
                  setCardIndex((prev) => Math.min(filteredAndSortedBills.length - 1, prev + 1))
                }
                disabled={cardIndex >= filteredAndSortedBills.length - 1}
                className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 flex items-center justify-center transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
