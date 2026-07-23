'use client';

import React, { useState, useEffect } from 'react';
import {
  Folder,
  Plus,
  Trash2,
  AlertTriangle,
  FolderOpen,
  X,
  Check,
  ChevronDown,
  CalendarDays,
} from 'lucide-react';

export interface MruMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingCycleMeta {
  id: string;
  mruId: string;
  billingMonth: string;
  billingYear: string;
  createdAt: string;
  updatedAt: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface ProjectHeaderProps {
  onProjectChange?: () => void;
}

export default function ProjectHeader({ onProjectChange }: ProjectHeaderProps) {
  const [mrus, setMrus] = useState<MruMeta[]>([]);
  const [activeMruId, setActiveMruId] = useState<string>('');
  const [billingCycles, setBillingCycles] = useState<BillingCycleMeta[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string>('');
  
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateMru, setShowCreateMru] = useState(false);
  const [showCreateCycle, setShowCreateCycle] = useState(false);
  
  // Dropdowns
  const [showMruDropdown, setShowMruDropdown] = useState(false);
  const [showCycleDropdown, setShowCycleDropdown] = useState(false);

  // Forms
  const [mruCode, setMruCode] = useState('');
  const [mruName, setMruName] = useState('');
  const [billingMonth, setBillingMonth] = useState('July');
  const [billingYear, setBillingYear] = useState('2026');
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects');
      const text = await res.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data.success) {
        setMrus(data.mrus || []);
        setActiveMruId(data.activeMruId || '');
        setBillingCycles(data.billingCycles || []);
        setActiveCycleId(data.activeCycleId || '');
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSwitchMru = async (id: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch_mru', mruId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setShowMruDropdown(false);
        triggerToast('MRU switched successfully');
        if (onProjectChange) onProjectChange();
        window.location.reload();
      }
    } catch {
      triggerToast('Error switching MRU');
    }
  };

  const handleSwitchCycle = async (id: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch_cycle', cycleId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCycleDropdown(false);
        triggerToast('Billing Cycle switched successfully');
        if (onProjectChange) onProjectChange();
        window.location.reload();
      }
    } catch {
      triggerToast('Error switching Billing Cycle');
    }
  };

  const handleCreateMru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mruCode.trim() || !mruName.trim()) {
      setFormError('Please enter MRU Code and MRU Name');
      return;
    }

    try {
      setFormError('');
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_mru', mruCode, mruName }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateMru(false);
        setMruCode('');
        setMruName('');
        triggerToast(`Created MRU ${data.mru.name}`);
        await fetchProjects();
        if (onProjectChange) onProjectChange();
        window.location.reload();
      } else {
        setFormError(data.error || 'Failed to create MRU');
      }
    } catch {
      setFormError('Network error creating MRU');
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMruId || !billingMonth || !billingYear) {
      setFormError('Please select MRU, Month, and Year');
      return;
    }

    try {
      setFormError('');
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_cycle',
          mruId: activeMruId,
          billingMonth,
          billingYear,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateCycle(false);
        triggerToast(`Created billing cycle`);
        await fetchProjects();
        if (onProjectChange) onProjectChange();
        window.location.reload();
      } else {
        setFormError(data.error || 'Failed to create cycle');
      }
    } catch {
      setFormError('Network error creating cycle');
    }
  };

  const handleDeleteMru = async () => {
    if (mrus.length <= 1) {
      alert('Cannot delete the only MRU in system.');
      return;
    }
    if (!confirm('Are you sure you want to delete this MRU and ALL its billing cycles?')) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_mru', mruId: activeMruId }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('MRU deleted');
        if (onProjectChange) onProjectChange();
        window.location.reload();
      }
    } catch {
      triggerToast('Error deleting MRU');
    }
  };

  const handleDeleteCycle = async () => {
    if (!confirm('Are you sure you want to delete this billing cycle?')) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_cycle', cycleId: activeCycleId }),
      });
      const data = await res.json();
      if (data.success) {
        triggerToast('Cycle deleted');
        if (onProjectChange) onProjectChange();
        window.location.reload();
      }
    } catch {
      triggerToast('Error deleting cycle');
    }
  };

  const activeMru = mrus.find((m) => m.id === activeMruId);
  const activeCycle = billingCycles.find((c) => c.id === activeCycleId);

  return (
    <>
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-800 border border-white/10 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold text-slate-100 animate-bounce flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Header Container */}
      <div className="bg-slate-900/80 border border-blue-500/20 rounded-2xl p-4 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 mb-6 shadow-xl">
        
        {/* MRU Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-lg font-bold">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active MRU
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-base font-extrabold text-white">
                  {activeMru ? `${activeMru.name} (${activeMru.id})` : 'Loading...'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="relative border-l border-white/10 pl-4">
            <button
              onClick={() => { setShowMruDropdown(!showMruDropdown); setShowCycleDropdown(false); }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-slate-200 transition"
            >
              Change MRU <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showMruDropdown && (
              <div className="absolute left-4 mt-2 w-64 bg-slate-950 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                <div className="max-h-60 overflow-y-auto divide-y divide-white/5">
                  {mrus.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSwitchMru(m.id)}
                      className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-blue-500/10 transition ${
                        m.id === activeMruId ? 'bg-blue-500/15 text-blue-400 font-bold' : 'text-slate-300'
                      }`}
                    >
                      <span>{m.name} ({m.id})</span>
                      {m.id === activeMruId && <Check className="w-4 h-4 text-blue-400" />}
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-white/10">
                  <button
                    onClick={() => { setShowMruDropdown(false); setShowCreateMru(true); }}
                    className="w-full py-1.5 text-xs text-center text-blue-400 hover:bg-white/5 rounded transition font-semibold"
                  >
                    + Create New MRU
                  </button>
                  {mrus.length > 1 && (
                     <button
                     onClick={handleDeleteMru}
                     className="w-full mt-1 py-1.5 text-xs text-center text-rose-400 hover:bg-white/5 rounded transition font-semibold"
                   >
                     - Delete Active MRU
                   </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Billing Cycle Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-lg font-bold">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Billing Cycle
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-base font-extrabold text-white">
                  {activeCycle ? `${activeCycle.billingMonth} ${activeCycle.billingYear}` : 'None'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="relative border-l border-white/10 pl-4">
            <button
              onClick={() => { setShowCycleDropdown(!showCycleDropdown); setShowMruDropdown(false); }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-slate-200 transition"
            >
              Change Cycle <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showCycleDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-950 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                <div className="max-h-60 overflow-y-auto divide-y divide-white/5">
                  {billingCycles.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSwitchCycle(c.id)}
                      className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-cyan-500/10 transition ${
                        c.id === activeCycleId ? 'bg-cyan-500/15 text-cyan-400 font-bold' : 'text-slate-300'
                      }`}
                    >
                      <span>{c.billingMonth} {c.billingYear}</span>
                      {c.id === activeCycleId && <Check className="w-4 h-4 text-cyan-400" />}
                    </button>
                  ))}
                  {billingCycles.length === 0 && (
                    <div className="px-3.5 py-2.5 text-xs text-slate-500 text-center">No cycles found</div>
                  )}
                </div>
                <div className="p-2 border-t border-white/10">
                  <button
                    onClick={() => { setShowCycleDropdown(false); setShowCreateCycle(true); }}
                    className="w-full py-1.5 text-xs text-center text-cyan-400 hover:bg-white/5 rounded transition font-semibold"
                  >
                    + New Cycle
                  </button>
                  {billingCycles.length > 0 && (
                     <button
                     onClick={handleDeleteCycle}
                     className="w-full mt-1 py-1.5 text-xs text-center text-rose-400 hover:bg-white/5 rounded transition font-semibold"
                   >
                     - Delete Active Cycle
                   </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE MRU MODAL */}
      {showCreateMru && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-2xl relative">
            <button onClick={() => setShowCreateMru(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-100">Create New MRU</h3>
            {formError && <div className="p-2 bg-rose-500/10 text-rose-400 text-xs rounded">{formError}</div>}
            <form onSubmit={handleCreateMru} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">MRU Code</label>
                <input type="text" required value={mruCode} onChange={(e) => setMruCode(e.target.value)} placeholder="e.g. 0477" className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">MRU Name</label>
                <input type="text" required value={mruName} onChange={(e) => setMruName(e.target.value)} placeholder="e.g. Gerua" className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateMru(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold">Create MRU</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CYCLE MODAL */}
      {showCreateCycle && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-2xl relative">
            <button onClick={() => setShowCreateCycle(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-100">New Billing Cycle</h3>
            <p className="text-xs text-slate-400">For MRU: {activeMru?.name}</p>
            {formError && <div className="p-2 bg-rose-500/10 text-rose-400 text-xs rounded">{formError}</div>}
            <form onSubmit={handleCreateCycle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Billing Month</label>
                <select value={billingMonth} onChange={(e) => setBillingMonth(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none">
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Billing Year</label>
                <input type="text" required value={billingYear} onChange={(e) => setBillingYear(e.target.value)} placeholder="2026" className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateCycle(false)} className="px-4 py-2 text-xs text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold">Create Cycle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
