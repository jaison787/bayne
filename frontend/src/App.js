import React, { useState, useEffect, useMemo } from "react";
import "@/App.css";
import {
  Shield, User, LogOut, BarChart3, Users, Package, CalendarDays, Search,
  Clock, AlertTriangle, CheckCircle2, Download, Upload, Edit3, X, Save,
  ArrowRight, Lock, Plus, ChevronRight, FileDown, Scissors, Sparkles,
  Tag, Layers, Wrench, Trash2,
} from "lucide-react";

/* ============================================================================
   1. DATA LAYERS & MASTER REGISTRY PRE-SEEDS
============================================================================ */

const ADMIN_ACCOUNTS = [
  { adminId: "admin1", password: "password123", name: "Owner Admin" },
  { adminId: "admin2", password: "supervisordash", name: "Manager Admin" },
];

const ROSTER = [
  ["Arbaz", 550], ["Arshad", 900], ["Bikash", 500], ["Birshapati", 750],
  ["Dhonanjoy", 500], ["Dileep", 800], ["Ekalak", 950], ["Irfan", 750],
  ["Irshad", 950], ["Jagat", 600], ["Jamal", 950], ["Jamshad", 700],
  ["Jasim", 500], ["Jessy", 480], ["Kamal", 1100], ["Karim", 850],
  ["Lal Badsha", 750], ["Lallu", 385], ["Majhar", 800], ["Masud", 800],
  ["Mukesh", 700], ["Muslim", 850], ["Paresh", 650], ["Pradeep", 500],
  ["Rahin", 750], ["Rajendar", 750], ["Rakesh", 500], ["Rasendra", 750],
  ["Ravi", 500], ["Roshan", 850], ["Sahid", 700], ["Sakir", 1350],
  ["Shahid Babu", 800], ["Shohaib", 850], ["Sonu", 500], ["Sunil", 500],
  ["Suresh", 500], ["Upendar", 500], ["Veer Singh", 850], ["Vineetha", 480],
  ["Waris", 850], ["Yudhishti", 550], ["Mary Teena", 400], ["Rubeena", 400],
  ["Raseena", 400], ["Kurshid", 800], ["Sumith", 500], ["Ramesh", 500],
  ["Rema", 400], ["Salauddin", 850], ["Nasarul", 750], ["Gulam", 850],
  ["Istiqah", 500], ["Sanaul", 850], ["Jilani", 800], ["Sahid Ansari", 500],
  ["Jalal", 700], ["Mufijuddin", 850], ["Muslim Ansari", 850], ["Maniruddin", 700],
];

const INITIAL_EMPLOYEES = ROSTER.map(([name, dailyWage]) => ({
  id: "emp_" + name.toLowerCase().replace(/\s+/g, "_"),
  name, dailyWage, role: "Worker", allowMultiJob: false, pin: "1111", active: true,
}));

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const INITIAL_ITEMS = [
  "All items", "Black Ladies bag", "Black Rain Cover", "Blackduffel",
  "Blackgymbag", "Brown ladies bag", "Brown Duffle", "China brown pocket",
  "China metal zib", "China sidegymbag", "CLB-2025", "Core lunch office tote",
  "Cream black pocket", "Cream Ladies bag", "DogBag Green", "DogBag Green (L)",
  "Ease Office Tote", "Fallaka bag", "Fanny Pack", "Field tote bag",
  "FileBag (L)", "Flower bag", "Fukka bag", "Gallonbottle",
  "Grey DogBag", "Grey DogBag (L)", "GreyDuffle", "Messenger bag",
  "Metal Zib compartment", "Mini Gym Black", "Mokka bag", "Pinkgymbag",
  "Sample", "Shifting", "Sidegymbag colour", "Weekender bag",
  "White Rain Cover", "Women travel bag",
].map(name => ({ id: "item_" + slug(name), name }));

const INITIAL_BATCHES = []; // no open running batches at present — admin creates as needed

const INITIAL_WORKTYPES = [
  "Checking", "Cleaning", "Counting", "Leave", "Loading", "Marking",
  "Office work", "Packing", "Sample", "Shifting", "Unloading", "Printing",
  "Supervising", "Cutting", "Cutting & helping", "Helping", "Stitching", "cutting & stiching",
].map(name => ({ id: "wt_" + slug(name), name }));

const INITIAL_HOLIDAYS = [{ id: "hol_1", date: "2026-08-15", label: "Independence Day" }];

const TODAY = new Date().toISOString().split("T")[0];

/* ============================================================================
   2. MATHEMATICAL CALCULATION ENGINE
============================================================================ */

function getMinutesFromStr(t) { if (!t || !t.includes(":")) return 0; const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function getStringFromMins(n) { const h = Math.floor(n / 60); const m = n % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }
function calculateNetMinutes(s, e) {
  if (!s || !e) return 0;
  const sm = getMinutesFromStr(s), em = getMinutesFromStr(e);
  if (em <= sm) return 0;
  const lS = 13 * 60, lE = 14 * 60;
  const oS = Math.max(sm, lS), oE = Math.min(em, lE);
  let net = em - sm;
  if (oS < oE) net -= (oE - oS);
  return Math.max(0, net);
}
function calculateJobCost(dailyWage, durationMinutes) {
  const r = dailyWage / 11 / 60;
  return Math.round(durationMinutes * r * 100) / 100;
}
function classifyLeaveType(n) {
  if (n >= 600) return "Full Day Leave";
  if (n >= 180 && n <= 420) return "Half Day Leave";
  return "Hourly Leave";
}
function detectUnloggedTimeGaps(dateStr, jobs, lvs) {
  const dJobs = jobs.filter(j => j.date === dateStr && j.endTime);
  const dLvs = lvs.filter(l => l.date === dateStr && l.endTime);
  const sS = 9 * 60, sE = 21 * 60;
  const tl = new Array(sE - sS).fill(false);
  const block = (s, e) => { for (let m = s; m < e; m++) if (m >= sS && m < sE) tl[m - sS] = true; };
  dJobs.forEach(j => block(getMinutesFromStr(j.startTime), getMinutesFromStr(j.endTime)));
  dLvs.forEach(l => block(getMinutesFromStr(l.startTime), getMinutesFromStr(l.endTime)));
  block(13 * 60, 14 * 60);
  const gaps = []; let inGap = false, gS = 0;
  for (let i = 0; i < tl.length; i++) {
    const cur = sS + i;
    if (!tl[i] && !inGap) { inGap = true; gS = cur; }
    else if (tl[i] && inGap) { inGap = false; gaps.push(`${getStringFromMins(gS)} - ${getStringFromMins(cur)}`); }
  }
  if (inGap) gaps.push(`${getStringFromMins(gS)} - ${getStringFromMins(sE)}`);
  return gaps;
}

/* ============================================================================
   3. SHARED ATOMS
============================================================================ */

function TimePicker({ value, onChange, dark = false, testid = "time-picker" }) {
  const [hh, mm] = value ? value.split(":") : ["09", "00"];
  const base = dark ? "bg-black border-white/10 text-white" : "bg-white border-[#E0DDD5] text-[#0d0d0d]";
  return (
    <div className={`inline-flex items-stretch border ${base}`} data-testid={testid}>
      <select value={hh} onChange={e => onChange(`${e.target.value}:${mm}`)}
        className={`bg-transparent font-mono text-sm font-bold px-2 py-1.5 focus:outline-none cursor-pointer ${dark ? "text-white" : "text-[#0d0d0d]"}`}
        data-testid={`${testid}-hour`}>
        {Array.from({ length: 24 }).map((_, i) => { const f = String(i).padStart(2, "0"); return <option key={i} value={f} className={dark ? "bg-black" : "bg-white"}>{f}</option>; })}
      </select>
      <span className={`flex items-center font-mono font-bold ${dark ? "text-white/40" : "text-[#8A877E]"}`}>:</span>
      <select value={mm} onChange={e => onChange(`${hh}:${e.target.value}`)}
        className={`bg-transparent font-mono text-sm font-bold px-2 py-1.5 focus:outline-none cursor-pointer ${dark ? "text-white" : "text-[#0d0d0d]"}`}
        data-testid={`${testid}-min`}>
        {Array.from({ length: 60 }).map((_, i) => { const f = String(i).padStart(2, "0"); return <option key={i} value={f} className={dark ? "bg-black" : "bg-white"}>{f}</option>; })}
      </select>
    </div>
  );
}

function Pill({ children, tone = "default", className = "" }) {
  const tones = {
    default: "bg-[#F4F3EF] text-[#0d0d0d] border-[#E0DDD5]",
    success: "bg-[#2E8540] text-white border-transparent",
    warn:    "bg-[#E8A317] text-[#0d0d0d] border-transparent",
    error:   "bg-[#D93025] text-white border-transparent",
    primary: "bg-[#0028A8] text-white border-transparent",
    blaze:   "bg-[#E84824] text-white border-transparent",
    ink:     "bg-[#0d0d0d] text-[#F4F3EF] border-transparent",
  };
  return <span className={`inline-flex items-center gap-1 border px-2 py-[3px] text-[10px] font-mono font-bold uppercase tracking-[0.18em] ${tones[tone] || tones.default} ${className}`}>{children}</span>;
}

function Label({ children, dark = false, className = "" }) {
  return <label className={`block text-[10px] font-mono uppercase tracking-[0.2em] mb-1.5 ${dark ? "text-white/50" : "text-[#8A877E]"} ${className}`}>{children}</label>;
}

function FieldInput({ dark = false, className = "", ...props }) {
  const base = dark
    ? "bg-black border-white/15 text-white placeholder:text-white/30 focus:border-[#E84824]"
    : "bg-white border-[#E0DDD5] text-[#0d0d0d] placeholder:text-[#8A877E]/70 focus:border-[#0028A8]";
  return <input {...props} className={`w-full border px-3 py-2 text-sm focus:outline-none transition-colors ${base} ${className}`} />;
}

function FieldSelect({ dark = false, className = "", children, ...props }) {
  const base = dark
    ? "bg-black border-white/15 text-white focus:border-[#E84824]"
    : "bg-white border-[#E0DDD5] text-[#0d0d0d] focus:border-[#0028A8]";
  return <select {...props} className={`w-full border px-3 py-2 text-sm focus:outline-none transition-colors ${base} ${className}`}>{children}</select>;
}

function Btn({ children, onClick, type = "button", tone = "ink", className = "", testid, disabled = false }) {
  const tones = {
    ink:     "bg-[#0d0d0d] text-[#F4F3EF] hover:bg-[#E84824]",
    blaze:   "bg-[#E84824] text-white hover:bg-[#d63d1c]",
    primary: "bg-[#0028A8] text-white hover:bg-[#001f80]",
    paper:   "bg-[#F4F3EF] text-[#0d0d0d] border border-[#E0DDD5] hover:bg-white hover:border-[#0d0d0d]",
    danger:  "bg-[#D93025] text-white hover:bg-[#b62519]",
    ghost:   "bg-transparent text-current hover:bg-black/5",
    ghostDark:"bg-transparent text-white hover:bg-white/10",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} data-testid={testid}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.15em] transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]} ${className}`}>
      {children}
    </button>
  );
}

/* ============================================================================
   4. SCREENS — LANDING + LOGINS
============================================================================ */

function LandingScreen({ setView }) {
  return (
    <div className="min-h-screen bg-paper text-[#0d0d0d] flex flex-col" data-testid="landing-screen">
      <div className="border-b border-[#E0DDD5] px-6 md:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0d0d0d] text-[#E84824] flex items-center justify-center"><Scissors size={18} /></div>
          <div>
            <p className="font-display font-black text-base leading-none tracking-tight">STITCHLOG</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A877E] mt-1">Bayne Edition · v5</p>
          </div>
        </div>
        <p className="hidden md:block font-mono text-[10px] uppercase tracking-[0.25em] text-[#8A877E]">Production Floor Suite</p>
      </div>
      <div className="flex-1 grid md:grid-cols-2">
        <button onClick={() => setView("worker_login")} data-testid="enter-worker-terminal"
          className="group relative bg-ink text-[#F4F3EF] text-left p-10 md:p-16 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#E0DDD5] hover:bg-[#E84824] transition-colors duration-300 min-h-[55vh]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60 group-hover:text-white/80">01 — Floor Operator</p>
            <h1 className="font-display font-black text-5xl md:text-7xl tracking-tighter mt-6 leading-[0.9]">Worker<br/>Terminal.</h1>
            <p className="font-mono text-sm mt-6 max-w-md text-white/70 group-hover:text-white/90">Log production runs, back-fill gaps, file bounded leaves. PIN-secured kiosk entry.</p>
          </div>
          <div className="flex items-center gap-3 mt-12"><span className="font-mono text-xs uppercase tracking-[0.25em]">Enter terminal</span><ArrowRight size={18} className="transition-transform group-hover:translate-x-2" /></div>
        </button>
        <button onClick={() => setView("admin_login")} data-testid="enter-admin-vault"
          className="group relative bg-paper text-[#0d0d0d] text-left p-10 md:p-16 flex flex-col justify-between hover:bg-[#0028A8] hover:text-white transition-colors duration-300 min-h-[55vh]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#8A877E] group-hover:text-white/70">02 — Administrative</p>
            <h1 className="font-display font-black text-5xl md:text-7xl tracking-tighter mt-6 leading-[0.9]">Admin<br/>Vault.</h1>
            <p className="font-mono text-sm mt-6 max-w-md text-[#8A877E] group-hover:text-white/80">Audit master metrics, manage items, batches & payroll. Override corrections and export ledger CSVs.</p>
          </div>
          <div className="flex items-center gap-3 mt-12"><span className="font-mono text-xs uppercase tracking-[0.25em]">Unlock vault</span><Shield size={18} /></div>
        </button>
      </div>
      <div className="border-t border-[#E0DDD5] px-6 md:px-10 py-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-[#8A877E]">
        <span>Shift Window · 09:00 → 21:00</span>
        <span>Lunch Auto-Excluded · 13:00 → 14:00</span>
      </div>
    </div>
  );
}

function AdminLoginScreen({ setView, onLogin }) {
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const a = ADMIN_ACCOUNTS.find(x => x.adminId.toLowerCase() === adminId.trim().toLowerCase() && x.password === password);
    if (a) onLogin(a.name); else setError("Invalid identification parameters.");
  };

  return (
    <div className="min-h-screen bg-paper grid md:grid-cols-5" data-testid="admin-login-screen">
      <div className="md:col-span-3 hidden md:block relative overflow-hidden border-r border-[#E0DDD5]">
        <img alt="" src="https://images.unsplash.com/photo-1741176505800-caaa3a52631a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHxnYXJtZW50JTIwdGV4dGlsZSUyMGZhY3RvcnklMjB3b3JrZXJ8ZW58MHx8fHwxNzgyNDkwNTM4fDA&ixlib=rb-4.1.0&q=85" className="absolute inset-0 w-full h-full object-cover grayscale" />
        <div className="absolute inset-0 bg-[#0028A8]/30 mix-blend-multiply" />
        <div className="absolute bottom-0 left-0 right-0 p-10 text-white">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-80">Bayne Edition</p>
          <h2 className="font-display font-black text-5xl tracking-tighter mt-3">Admin Vault.</h2>
          <p className="font-mono text-xs mt-3 opacity-80">Audit · Override · Export · Reconcile.</p>
        </div>
      </div>
      <form onSubmit={submit} className="md:col-span-2 flex flex-col justify-center p-8 md:p-12 max-w-xl" data-testid="admin-login-form">
        <button type="button" onClick={() => setView("landing")} className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8A877E] hover:text-[#0d0d0d] flex items-center gap-1.5 mb-10" data-testid="admin-back-btn">← Back to terminal split</button>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#0028A8]">Vault Access · 02</p>
        <h2 className="font-display font-black text-4xl tracking-tighter mt-2">Identify yourself.</h2>
        <p className="font-mono text-xs text-[#8A877E] mt-2">Try <span className="text-[#0d0d0d] font-bold">admin1 / password123</span></p>
        {error && <div className="mt-6 border border-[#D93025] bg-[#D93025]/5 text-[#D93025] text-xs font-mono px-3 py-2.5 flex items-center gap-2" data-testid="admin-login-error"><AlertTriangle size={14} />{error}</div>}
        <div className="mt-8 space-y-5">
          <div><Label>User Identifier</Label><FieldInput value={adminId} onChange={e => setAdminId(e.target.value)} placeholder="admin1" required data-testid="admin-id-input" /></div>
          <div><Label>Passphrase</Label><FieldInput type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required data-testid="admin-password-input" /></div>
          <Btn type="submit" tone="primary" className="w-full" testid="admin-login-submit"><Lock size={14} /> Unlock vault</Btn>
        </div>
      </form>
    </div>
  );
}

function WorkerKioskScreen({ employees, setView, onLogin }) {
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const w = employees.find(x => x.id === selectedEmpId);
    if (!w) return setError("Select valid profile.");
    if (w.pin === pin) onLogin(w); else setError("Security handshake failure.");
  };

  return (
    <div className="kiosk min-h-screen bg-ink text-[#F4F3EF] grid md:grid-cols-5" data-testid="worker-login-screen">
      <div className="md:col-span-3 hidden md:block relative overflow-hidden border-r border-white/10">
        <img alt="" src="https://images.pexels.com/photos/31047167/pexels-photo-31047167.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0d0d0d] via-transparent to-[#E84824]/20" />
        <div className="absolute bottom-0 left-0 right-0 p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#E84824]">Floor terminal</p>
          <h2 className="font-display font-black text-5xl tracking-tighter mt-3">Daily work done.</h2>
        </div>
      </div>
      <form onSubmit={submit} className="md:col-span-2 flex flex-col justify-center p-8 md:p-12" data-testid="worker-login-form">
        <button type="button" onClick={() => setView("landing")} className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50 hover:text-white flex items-center gap-1.5 mb-10" data-testid="worker-back-btn">← Back</button>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#E84824]">Operator login · 01</p>
        <h2 className="font-display font-black text-4xl tracking-tighter mt-2">Punch in.</h2>
        {error && <div className="mt-6 border border-[#E84824] bg-[#E84824]/10 text-[#E84824] text-xs font-mono px-3 py-2.5 flex items-center gap-2" data-testid="worker-login-error"><AlertTriangle size={14} />{error}</div>}
        <div className="mt-8 space-y-5">
          <div><Label dark>Select identity</Label>
            <FieldSelect dark value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)} required data-testid="worker-identity-select">
              <option value="" className="bg-black">— Choose name —</option>
              {employees.filter(e => e.active).map(e => <option key={e.id} value={e.id} className="bg-black">{e.name} ({e.role})</option>)}
            </FieldSelect>
          </div>
          <div><Label dark>Secure PIN</Label>
            <FieldInput dark type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" required className="text-center font-mono text-2xl tracking-[0.5em]" data-testid="worker-pin-input" />
            <p className="font-mono text-[10px] text-white/40 mt-2 uppercase tracking-[0.2em]">All operator PINs: 1111</p>
          </div>
          <Btn type="submit" tone="blaze" className="w-full" testid="worker-login-submit"><User size={14} /> Enter terminal</Btn>
        </div>
      </form>
    </div>
  );
}

/* ============================================================================
   5. ADMIN — DASHBOARD
============================================================================ */

function AdminDashboardView({ jobCards, employees, batches, leaves }) {
  const open = jobCards.filter(j => !j.endTime);
  const closed = jobCards.filter(j => j.endTime);
  const totalCost = closed.reduce((s, c) => s + (c.calculatedCost || 0), 0);
  const todayCost = closed.filter(j => j.date === TODAY).reduce((s, c) => s + (c.calculatedCost || 0), 0);
  const todayMin = closed.filter(j => j.date === TODAY).reduce((s, c) => s + (c.durationMinutes || 0), 0);

  const kpis = [
    { label: "Open Cards", value: open.length, accent: "#E8A317", testid: "kpi-open-cards" },
    { label: "Active Force", value: employees.filter(e => e.active).length, accent: "#0028A8", testid: "kpi-active-force" },
    { label: "Active Batches", value: batches.filter(b => b.status === "Active").length, accent: "#E84824", testid: "kpi-active-lots" },
    { label: "Gross Outlay", value: `₹${totalCost.toFixed(2)}`, accent: "#2E8540", testid: "kpi-gross-outlay" },
  ];

  return (
    <div className="space-y-10" data-testid="admin-dashboard-view">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#8A877E]">Control desk · live</p>
        <h2 className="font-display font-black text-4xl tracking-tighter mt-2">Workshop overview.</h2>
      </header>
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#E0DDD5] divide-x divide-[#E0DDD5]">
        {kpis.map(k => (
          <div key={k.label} className="p-6 bg-white" data-testid={k.testid}>
            <div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8A877E]">{k.label}</span><span className="block w-2 h-2" style={{ background: k.accent }} /></div>
            <p className="font-display font-black text-4xl tracking-tighter mt-4">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="border border-[#E0DDD5] bg-white p-6 md:col-span-2" data-testid="today-snapshot">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#8A877E]">Today · {TODAY}</p>
          <div className="grid grid-cols-3 gap-6 mt-4">
            <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A877E]">Outlay today</p><p className="font-display font-black text-3xl tracking-tighter mt-1 text-[#0028A8]">₹{todayCost.toFixed(2)}</p></div>
            <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A877E]">Net minutes</p><p className="font-display font-black text-3xl tracking-tighter mt-1">{todayMin}</p></div>
            <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A877E]">Leaves today</p><p className="font-display font-black text-3xl tracking-tighter mt-1 text-[#E84824]">{leaves.filter(l => l.date === TODAY).length}</p></div>
          </div>
        </div>
        <div className="border border-[#E0DDD5] bg-[#0d0d0d] text-[#F4F3EF] p-6 flex flex-col justify-between" data-testid="open-cards-panel">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">Currently open</p>
            <p className="font-display font-black text-5xl tracking-tighter mt-3">{open.length}</p>
          </div>
          <div className="space-y-1 mt-4 max-h-32 overflow-y-auto">
            {open.length === 0 && <p className="font-mono text-[11px] text-white/40 uppercase tracking-[0.2em]">No unfinished tracks.</p>}
            {open.map(o => (
              <div key={o.id} className="font-mono text-[11px] text-white/80 flex items-center justify-between border-t border-white/10 pt-1">
                <span>{o.employeeName}</span><span className="text-[#E84824]">{o.startTime}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   6. ADMIN — EMPLOYEES
============================================================================ */

function EmployeesManagementView({ employees, setEmployees }) {
  const [name, setName] = useState("");
  const [dailyWage, setDailyWage] = useState(600);
  const [role, setRole] = useState("Worker");
  const [allowMultiJob, setAllowMultiJob] = useState(false);
  const [pin, setPin] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});

  const addEmp = (e) => {
    e.preventDefault();
    if (pin.length !== 4) return alert("PIN must be exactly 4 digits.");
    setEmployees([...employees, { id: "emp_" + Date.now(), name, dailyWage, role, allowMultiJob: role === "Supervisor" ? true : allowMultiJob, pin, active: true }]);
    setName(""); setPin(""); setAllowMultiJob(false);
  };
  const beginEdit = (e) => { setEditingId(e.id); setDraft({ ...e }); };
  const saveEdit = () => {
    if (draft.pin.length !== 4) return alert("PIN must be 4 digits.");
    setEmployees(employees.map(e => e.id === editingId ? { ...e, ...draft, dailyWage: Number(draft.dailyWage), allowMultiJob: draft.role === "Supervisor" ? true : !!draft.allowMultiJob } : e));
    setEditingId(null);
  };
  const toggleActive = (id) => setEmployees(employees.map(e => e.id === id ? { ...e, active: !e.active } : e));
  const remove = (id) => { if (window.confirm("Remove this employee permanently?")) setEmployees(employees.filter(e => e.id !== id)); };

  return (
    <div className="space-y-8" data-testid="employees-view">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#8A877E]">Master data · staff</p>
        <h2 className="font-display font-black text-4xl tracking-tighter mt-2">Personnel matrix.</h2>
      </header>
      <div className="grid xl:grid-cols-3 gap-6 items-start">
        <form onSubmit={addEmp} className="border border-[#E0DDD5] bg-white p-6 space-y-4" data-testid="employee-form">
          <h3 className="font-display font-bold text-lg tracking-tight border-b border-[#E0DDD5] pb-3">Register profile</h3>
          <div><Label>Full name</Label><FieldInput value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Ananya R" data-testid="emp-name-input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Daily wage (₹)</Label><FieldInput type="number" value={dailyWage} onChange={e => setDailyWage(Number(e.target.value))} required className="font-mono no-spin" data-testid="emp-wage-input" /></div>
            <div><Label>Kiosk PIN</Label><FieldInput maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} required placeholder="0000" className="text-center font-mono tracking-[0.4em]" data-testid="emp-pin-input" /></div>
          </div>
          <div><Label>Designation</Label>
            <FieldSelect value={role} onChange={e => setRole(e.target.value)} data-testid="emp-role-select">
              <option value="Worker">Worker</option><option value="Supervisor">Supervisor (Dual Open)</option>
            </FieldSelect>
          </div>
          {role !== "Supervisor" && (
            <label className="flex items-center gap-2.5 text-xs font-mono uppercase tracking-[0.15em] text-[#0d0d0d] cursor-pointer p-3 border border-[#E0DDD5] bg-[#F4F3EF]">
              <input type="checkbox" checked={allowMultiJob} onChange={e => setAllowMultiJob(e.target.checked)} data-testid="emp-multijob-check" /> Grant dual-track capability
            </label>
          )}
          <Btn type="submit" tone="primary" className="w-full" testid="emp-submit"><Plus size={14} /> Register profile</Btn>
        </form>
        <div className="border border-[#E0DDD5] bg-white xl:col-span-2 overflow-x-auto" data-testid="employees-table">
          <table className="w-full text-left">
            <thead className="bg-[#F4F3EF] border-b border-[#E0DDD5]">
              <tr className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A877E]">
                <th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3 text-right">Wage</th><th className="p-3">PIN</th><th className="p-3">State</th><th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0DDD5]">
              {employees.map(e => editingId === e.id ? (
                <tr key={e.id} className="bg-[#0028A8]/5">
                  <td className="p-3"><FieldInput value={draft.name} onChange={ev => setDraft({ ...draft, name: ev.target.value })} /></td>
                  <td className="p-3"><FieldSelect value={draft.role} onChange={ev => setDraft({ ...draft, role: ev.target.value })}><option value="Worker">Worker</option><option value="Supervisor">Supervisor</option></FieldSelect></td>
                  <td className="p-3"><FieldInput type="number" className="font-mono text-right no-spin" value={draft.dailyWage} onChange={ev => setDraft({ ...draft, dailyWage: ev.target.value })} /></td>
                  <td className="p-3"><FieldInput maxLength={4} value={draft.pin} onChange={ev => setDraft({ ...draft, pin: ev.target.value.replace(/\D/g, "") })} className="font-mono text-center" /></td>
                  <td className="p-3 font-mono text-xs">{e.active ? "Active" : "Inactive"}</td>
                  <td className="p-3"><div className="flex gap-1.5"><Btn tone="primary" onClick={saveEdit} className="!px-2.5 !py-1.5"><Save size={12} /></Btn><Btn tone="paper" onClick={() => setEditingId(null)} className="!px-2.5 !py-1.5"><X size={12} /></Btn></div></td>
                </tr>
              ) : (
                <tr key={e.id} className={`hover:bg-[#F4F3EF] transition-colors ${!e.active ? "opacity-50" : ""}`} data-testid={`emp-row-${e.id}`}>
                  <td className="p-3 font-display font-bold">{e.name}</td>
                  <td className="p-3"><Pill tone={e.role === "Supervisor" ? "primary" : "default"}>{e.role}</Pill></td>
                  <td className="p-3 font-mono text-right font-bold">₹{e.dailyWage}</td>
                  <td className="p-3 font-mono text-xs text-[#8A877E]">🔑 {e.pin}</td>
                  <td className="p-3"><button onClick={() => toggleActive(e.id)} className="font-mono text-[10px] uppercase tracking-[0.2em] hover:text-[#E84824]" data-testid={`emp-toggle-${e.id}`}>{e.active ? "● Active" : "○ Inactive"}</button></td>
                  <td className="p-3"><div className="flex gap-1.5">
                    <Btn tone="paper" onClick={() => beginEdit(e)} className="!px-2.5 !py-1.5" testid={`emp-edit-${e.id}`}><Edit3 size={12} /></Btn>
                    <Btn tone="danger" onClick={() => remove(e.id)} className="!px-2.5 !py-1.5" testid={`emp-delete-${e.id}`}><Trash2 size={12} /></Btn>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   7. ADMIN — ITEMS (product master)
============================================================================ */

function ItemsManagementView({ items, setItems, batches }) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");

  const add = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (items.some(i => i.name.toLowerCase() === trimmed.toLowerCase())) return alert("Item already exists.");
    setItems([...items, { id: "item_" + slug(trimmed) + "_" + Date.now(), name: trimmed }]);
    setName("");
  };
  const save = (id) => {
    const t = draftName.trim(); if (!t) return;
    setItems(items.map(i => i.id === id ? { ...i, name: t } : i));
    setEditingId(null);
  };
  const remove = (id) => {
    const linked = batches.filter(b => b.itemId === id).length;
    const msg = linked > 0
      ? `${linked} batch(es) reference this item. Remove anyway? Linked batches will be orphaned.`
      : "Remove this item?";
    if (window.confirm(msg)) setItems(items.filter(i => i.id !== id));
  };
  const batchCountFor = (id) => batches.filter(b => b.itemId === id).length;

  return (
    <div className="space-y-8" data-testid="items-view">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#8A877E]">Master data · items</p>
        <h2 className="font-display font-black text-4xl tracking-tighter mt-2">Product items.</h2>
      </header>
      <div className="grid xl:grid-cols-3 gap-6 items-start">
        <form onSubmit={add} className="border border-[#E0DDD5] bg-white p-6 space-y-4" data-testid="item-form">
          <h3 className="font-display font-bold text-lg tracking-tight border-b border-[#E0DDD5] pb-3">Add item</h3>
          <div><Label>Item name</Label><FieldInput value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Brown Duffle" data-testid="item-name-input" /></div>
          <Btn type="submit" tone="ink" className="w-full" testid="item-submit"><Plus size={14} /> Add to catalog</Btn>
          <p className="font-mono text-[10px] text-[#8A877E] mt-2">Current items: <span className="font-bold text-[#0d0d0d]">{items.length}</span></p>
        </form>
        <div className="border border-[#E0DDD5] bg-white xl:col-span-2 overflow-x-auto" data-testid="items-table">
          <table className="w-full text-left">
            <thead className="bg-[#F4F3EF] border-b border-[#E0DDD5]">
              <tr className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A877E]">
                <th className="p-3">Item name</th><th className="p-3">Open batches</th><th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0DDD5]">
              {items.map(it => editingId === it.id ? (
                <tr key={it.id} className="bg-[#0028A8]/5">
                  <td className="p-3"><FieldInput value={draftName} onChange={ev => setDraftName(ev.target.value)} /></td>
                  <td className="p-3 font-mono text-xs">{batchCountFor(it.id)}</td>
                  <td className="p-3"><div className="flex gap-1.5"><Btn tone="primary" onClick={() => save(it.id)} className="!px-2.5 !py-1.5"><Save size={12} /></Btn><Btn tone="paper" onClick={() => setEditingId(null)} className="!px-2.5 !py-1.5"><X size={12} /></Btn></div></td>
                </tr>
              ) : (
                <tr key={it.id} className="hover:bg-[#F4F3EF] transition-colors" data-testid={`item-row-${it.id}`}>
                  <td className="p-3 font-display font-bold">{it.name}</td>
                  <td className="p-3 font-mono text-xs text-[#8A877E]">{batchCountFor(it.id)}</td>
                  <td className="p-3"><div className="flex gap-1.5">
                    <Btn tone="paper" onClick={() => { setEditingId(it.id); setDraftName(it.name); }} className="!px-2.5 !py-1.5" testid={`item-edit-${it.id}`}><Edit3 size={12} /></Btn>
                    <Btn tone="danger" onClick={() => remove(it.id)} className="!px-2.5 !py-1.5" testid={`item-delete-${it.id}`}><Trash2 size={12} /></Btn>
                  </div></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={3} className="p-6 text-center font-mono text-xs italic text-[#8A877E]">No items yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   8. ADMIN — BATCHES
============================================================================ */

function BatchesManagementView({ items, batches, setBatches }) {
  const [itemId, setItemId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [yieldCount, setYieldCount] = useState(100);
  const [startDate, setStartDate] = useState(TODAY);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});

  const itemName = (id) => items.find(i => i.id === id)?.name || "—";

  const create = (e) => {
    e.preventDefault();
    if (!itemId) return alert("Select an item.");
    const bn = batchNumber.toUpperCase().trim();
    if (!bn) return;
    setBatches([{ id: "batch_" + Date.now(), itemId, batchNumber: bn, yieldCount: Number(yieldCount), status: "Active", startDate, endDate: "" }, ...batches]);
    setBatchNumber("");
  };
  const cycle = (b) => {
    const next = b.status === "Active" ? "Only Packing Pending" : b.status === "Only Packing Pending" ? "Completed" : "Active";
    setBatches(batches.map(x => x.id === b.id ? { ...x, status: next, endDate: next === "Completed" ? TODAY : x.endDate } : x));
  };
  const beginEdit = (b) => { setEditingId(b.id); setDraft({ ...b }); };
  const save = () => { setBatches(batches.map(b => b.id === editingId ? { ...b, ...draft, yieldCount: Number(draft.yieldCount), batchNumber: (draft.batchNumber || "").toUpperCase().trim() } : b)); setEditingId(null); };
  const remove = (id) => { if (window.confirm("Remove this batch?")) setBatches(batches.filter(b => b.id !== id)); };

  return (
    <div className="space-y-8" data-testid="batches-view">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#8A877E]">Master data · batches</p>
        <h2 className="font-display font-black text-4xl tracking-tighter mt-2">Open running batches.</h2>
      </header>
      <div className="grid xl:grid-cols-3 gap-6 items-start">
        <form onSubmit={create} className="border border-[#E0DDD5] bg-white p-6 space-y-4" data-testid="batch-form">
          <h3 className="font-display font-bold text-lg tracking-tight border-b border-[#E0DDD5] pb-3">Open batch</h3>
          <div><Label>Item</Label>
            <FieldSelect value={itemId} onChange={e => setItemId(e.target.value)} required data-testid="batch-item-select">
              <option value="">— Choose item —</option>
              {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
            </FieldSelect>
          </div>
          <div><Label>Batch serial</Label><FieldInput value={batchNumber} onChange={e => setBatchNumber(e.target.value)} required placeholder="BATCH-2026-NNN" className="font-mono uppercase" data-testid="batch-serial-input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Target yield</Label><FieldInput type="number" value={yieldCount} onChange={e => setYieldCount(Number(e.target.value))} required className="font-mono no-spin" data-testid="batch-yield-input" /></div>
            <div><Label>Start date</Label><FieldInput type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required data-testid="batch-start-input" /></div>
          </div>
          <Btn type="submit" tone="ink" className="w-full" testid="batch-submit"><Plus size={14} /> Deploy batch</Btn>
        </form>
        <div className="border border-[#E0DDD5] bg-white xl:col-span-2 overflow-x-auto" data-testid="batches-table">
          <table className="w-full text-left">
            <thead className="bg-[#F4F3EF] border-b border-[#E0DDD5]">
              <tr className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A877E]">
                <th className="p-3">Batch</th><th className="p-3">Item</th><th className="p-3 text-right">Yield</th><th className="p-3">Bounds</th><th className="p-3">State</th><th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0DDD5]">
              {batches.map(b => editingId === b.id ? (
                <tr key={b.id} className="bg-[#0028A8]/5">
                  <td className="p-3"><FieldInput value={draft.batchNumber} onChange={e => setDraft({ ...draft, batchNumber: e.target.value })} className="font-mono uppercase" /></td>
                  <td className="p-3"><FieldSelect value={draft.itemId} onChange={e => setDraft({ ...draft, itemId: e.target.value })}>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</FieldSelect></td>
                  <td className="p-3"><FieldInput type="number" value={draft.yieldCount} onChange={e => setDraft({ ...draft, yieldCount: e.target.value })} className="font-mono text-right no-spin" /></td>
                  <td className="p-3 space-y-1"><FieldInput type="date" value={draft.startDate} onChange={e => setDraft({ ...draft, startDate: e.target.value })} /><FieldInput type="date" value={draft.endDate} onChange={e => setDraft({ ...draft, endDate: e.target.value })} /></td>
                  <td className="p-3 font-mono text-xs">{draft.status}</td>
                  <td className="p-3"><div className="flex gap-1.5"><Btn tone="primary" onClick={save} className="!px-2.5 !py-1.5"><Save size={12} /></Btn><Btn tone="paper" onClick={() => setEditingId(null)} className="!px-2.5 !py-1.5"><X size={12} /></Btn></div></td>
                </tr>
              ) : (
                <tr key={b.id} className="hover:bg-[#F4F3EF] transition-colors" data-testid={`batch-row-${b.id}`}>
                  <td className="p-3 font-mono font-bold text-[#0028A8]">{b.batchNumber}</td>
                  <td className="p-3 font-display font-bold">{itemName(b.itemId)}</td>
                  <td className="p-3 font-mono text-right">{b.yieldCount} pcs</td>
                  <td className="p-3 font-mono text-[11px] text-[#8A877E]">{b.startDate} → {b.endDate || "running"}</td>
                  <td className="p-3"><button onClick={() => cycle(b)} data-testid={`batch-cycle-${b.id}`}><Pill tone={b.status === "Active" ? "success" : b.status === "Only Packing Pending" ? "warn" : "default"}>{b.status}</Pill></button></td>
                  <td className="p-3"><div className="flex gap-1.5">
                    <Btn tone="paper" onClick={() => beginEdit(b)} className="!px-2.5 !py-1.5" testid={`batch-edit-${b.id}`}><Edit3 size={12} /></Btn>
                    <Btn tone="danger" onClick={() => remove(b.id)} className="!px-2.5 !py-1.5" testid={`batch-delete-${b.id}`}><Trash2 size={12} /></Btn>
                  </div></td>
                </tr>
              ))}
              {batches.length === 0 && <tr><td colSpan={6} className="p-6 text-center font-mono text-xs italic text-[#8A877E]">No open batches. Use the form to deploy one.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   9. ADMIN — WORK TYPES
============================================================================ */

function WorkTypesManagementView({ workTypes, setWorkTypes }) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");

  const add = (e) => {
    e.preventDefault();
    const t = name.trim(); if (!t) return;
    if (workTypes.some(w => w.name.toLowerCase() === t.toLowerCase())) return alert("Work type already exists.");
    setWorkTypes([...workTypes, { id: "wt_" + slug(t) + "_" + Date.now(), name: t }]);
    setName("");
  };
  const save = (id) => { const t = draftName.trim(); if (!t) return; setWorkTypes(workTypes.map(w => w.id === id ? { ...w, name: t } : w)); setEditingId(null); };
  const remove = (id) => { if (window.confirm("Remove this work type?")) setWorkTypes(workTypes.filter(w => w.id !== id)); };

  return (
    <div className="space-y-8" data-testid="worktypes-view">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#8A877E]">Master data · work types</p>
        <h2 className="font-display font-black text-4xl tracking-tighter mt-2">Type of work catalog.</h2>
      </header>
      <div className="grid xl:grid-cols-3 gap-6 items-start">
        <form onSubmit={add} className="border border-[#E0DDD5] bg-white p-6 space-y-4" data-testid="wt-form">
          <h3 className="font-display font-bold text-lg tracking-tight border-b border-[#E0DDD5] pb-3">Add work type</h3>
          <div><Label>Work type label</Label><FieldInput value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Stitching" data-testid="wt-name-input" /></div>
          <Btn type="submit" tone="ink" className="w-full" testid="wt-submit"><Plus size={14} /> Add type</Btn>
          <p className="font-mono text-[10px] text-[#8A877E]">Total: <span className="font-bold text-[#0d0d0d]">{workTypes.length}</span></p>
        </form>
        <div className="border border-[#E0DDD5] bg-white xl:col-span-2 overflow-x-auto" data-testid="worktypes-table">
          <table className="w-full text-left">
            <thead className="bg-[#F4F3EF] border-b border-[#E0DDD5]">
              <tr className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A877E]">
                <th className="p-3">Work type</th><th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0DDD5]">
              {workTypes.map(w => editingId === w.id ? (
                <tr key={w.id} className="bg-[#0028A8]/5">
                  <td className="p-3"><FieldInput value={draftName} onChange={ev => setDraftName(ev.target.value)} /></td>
                  <td className="p-3"><div className="flex gap-1.5"><Btn tone="primary" onClick={() => save(w.id)} className="!px-2.5 !py-1.5"><Save size={12} /></Btn><Btn tone="paper" onClick={() => setEditingId(null)} className="!px-2.5 !py-1.5"><X size={12} /></Btn></div></td>
                </tr>
              ) : (
                <tr key={w.id} className="hover:bg-[#F4F3EF] transition-colors" data-testid={`wt-row-${w.id}`}>
                  <td className="p-3 font-display font-bold">{w.name}</td>
                  <td className="p-3"><div className="flex gap-1.5">
                    <Btn tone="paper" onClick={() => { setEditingId(w.id); setDraftName(w.name); }} className="!px-2.5 !py-1.5" testid={`wt-edit-${w.id}`}><Edit3 size={12} /></Btn>
                    <Btn tone="danger" onClick={() => remove(w.id)} className="!px-2.5 !py-1.5" testid={`wt-delete-${w.id}`}><Trash2 size={12} /></Btn>
                  </div></td>
                </tr>
              ))}
              {workTypes.length === 0 && <tr><td colSpan={2} className="p-6 text-center font-mono text-xs italic text-[#8A877E]">No work types defined.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   10. ADMIN — CALENDAR / HOLIDAYS
============================================================================ */

function CalendarControlsView({ holidays, setHolidays }) {
  const [date, setDate] = useState(TODAY);
  const [label, setLabel] = useState("");
  return (
    <div className="space-y-8" data-testid="calendar-view">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#8A877E]">Workshop calendar</p>
        <h2 className="font-display font-black text-4xl tracking-tighter mt-2">Closures & holidays.</h2>
      </header>
      <div className="grid md:grid-cols-3 gap-6 items-start">
        <form onSubmit={(e) => { e.preventDefault(); setHolidays([...holidays, { id: "hol_" + Date.now(), date, label }]); setLabel(""); }} className="border border-[#E0DDD5] bg-white p-6 space-y-4" data-testid="holiday-form">
          <h3 className="font-display font-bold text-lg tracking-tight border-b border-[#E0DDD5] pb-3">Declare closure</h3>
          <div><Label>Target date</Label><FieldInput type="date" value={date} onChange={e => setDate(e.target.value)} required data-testid="hol-date-input" /></div>
          <div><Label>Label</Label><FieldInput value={label} onChange={e => setLabel(e.target.value)} required placeholder="e.g. Festival closure" data-testid="hol-label-input" /></div>
          <Btn type="submit" tone="ink" className="w-full" testid="hol-submit"><CalendarDays size={14} /> Commit closure</Btn>
        </form>
        <div className="md:col-span-2 border border-[#E0DDD5] bg-white p-6" data-testid="holidays-list">
          <h3 className="font-display font-bold text-lg tracking-tight border-b border-[#E0DDD5] pb-3 mb-4">Active non-working register</h3>
          <div className="border-l-2 border-[#E8A317] bg-[#E8A317]/10 px-4 py-3 mb-4 text-xs font-mono text-[#0d0d0d]">📢 Sundays auto-filter as weekly off across the system.</div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {holidays.map(h => (
              <div key={h.id} className="flex items-center justify-between border border-[#E0DDD5] px-3 py-2.5" data-testid={`hol-row-${h.id}`}>
                <span className="font-mono text-xs font-bold">🗓️ {h.date}</span>
                <span className="font-mono text-xs text-[#8A877E]">{h.label}</span>
                <button onClick={() => setHolidays(holidays.filter(x => x.id !== h.id))} className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#D93025] hover:underline" data-testid={`hol-delete-${h.id}`}>Delete</button>
              </div>
            ))}
            {holidays.length === 0 && <p className="font-mono text-xs text-[#8A877E] italic">No declared closures yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   11. JOB CARDS WORKSPACE — DAILY WORK DONE
============================================================================ */

function JobCardsWorkspaceView({ currentWorker, currentAdmin, employees, items, batches, workTypes, jobCards, setJobCards, leaves, setLeaves, holidays }) {
  const [selectedKioskUser, setSelectedKioskUser] = useState(currentWorker?.id || "");
  useEffect(() => { if (currentWorker?.id) setSelectedKioskUser(currentWorker.id); }, [currentWorker]);

  const targetOperative = currentAdmin ? employees.find(e => e.id === selectedKioskUser) : currentWorker;
  const dark = !currentAdmin;

  const [activeDate, setActiveDate] = useState(TODAY);
  const [category, setCategory] = useState("Production");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [workTypeId, setWorkTypeId] = useState("");
  const [generalSubtype, setGeneralSubtype] = useState("Bulk packing (Amazon FBA)");
  const [rdDescription, setRdDescription] = useState("");
  const [manualStartTime, setManualStartTime] = useState("09:00");
  const [manualEndTime, setManualEndTime] = useState("18:00");

  useEffect(() => { setBatchId(""); }, [selectedItemId]);

  const openCardsGlobal = jobCards.filter(j => !j.endTime);
  const dayJobsAll = targetOperative ? jobCards.filter(j => j.employeeId === targetOperative.id && j.date === activeDate) : [];
  const activeOpenCards = dayJobsAll.filter(j => !j.endTime);
  const dayLeavesAll = targetOperative ? leaves.filter(l => l.employeeId === targetOperative.id && l.date === activeDate) : [];

  const missingGaps = targetOperative
    ? detectUnloggedTimeGaps(activeDate, jobCards.filter(j => j.employeeId === targetOperative.id), leaves.filter(l => l.employeeId === targetOperative.id))
    : [];

  const calendarClosureAlert = useMemo(() => {
    const d = new Date(activeDate);
    if (d.getDay() === 0) return "Weekly Off (Sunday)";
    const h = holidays.find(x => x.date === activeDate);
    return h ? `Public Holiday: ${h.label}` : null;
  }, [activeDate, holidays]);

  // Only items that have at least one non-completed batch
  const itemsWithOpenBatches = useMemo(() => {
    const openItemIds = new Set(batches.filter(b => b.status !== "Completed").map(b => b.itemId));
    return items.filter(i => openItemIds.has(i.id));
  }, [items, batches]);

  const batchesForSelectedItem = batches.filter(b => b.itemId === selectedItemId && b.status !== "Completed");

  const totalDayMin = dayJobsAll.filter(j => j.endTime).reduce((s, c) => s + (c.durationMinutes || 0), 0);
  const totalDayCost = dayJobsAll.filter(j => j.endTime).reduce((s, c) => s + (c.calculatedCost || 0), 0);

  const handleOpenJob = () => {
    if (!targetOperative) return alert("Select target profile.");
    const reqStart = getMinutesFromStr(manualStartTime);
    if (reqStart < 9 * 60 || reqStart > 21 * 60) return alert("Shift window: 09:00 – 21:00 only.");
    if (category === "Leave") return alert("Use the leave matrix below to file a leave.");

    const overlapLeave = dayLeavesAll.some(lv => {
      const s = getMinutesFromStr(lv.startTime); const e = getMinutesFromStr(lv.endTime || "21:00");
      return reqStart >= s && reqStart < e;
    });
    if (overlapLeave) return alert("Collision: A leave window already covers this clock.");

    const myOpen = openCardsGlobal.filter(j => j.employeeId === targetOperative.id);
    const cap = (targetOperative.role === "Supervisor" || targetOperative.allowMultiJob) ? 2 : 1;
    if (myOpen.length >= cap) return alert(`Cap reached: ${cap} concurrent open card(s).`);

    const collisions = dayJobsAll.filter(job => {
      if (!job.endTime) return true;
      const s = getMinutesFromStr(job.startTime); const e = getMinutesFromStr(job.endTime);
      return reqStart >= s && reqStart < e;
    });
    if (collisions.length >= cap) return alert("Timeline collision: this slot is full for your tier.");

    const card = { id: "job_" + Date.now(), employeeId: targetOperative.id, employeeName: targetOperative.name, date: activeDate, category, startTime: manualStartTime, endTime: undefined };

    if (category === "Production") {
      const item = items.find(i => i.id === selectedItemId);
      const batch = batches.find(b => b.id === batchId);
      const wt = workTypes.find(w => w.id === workTypeId);
      if (!item) return alert("Select an item.");
      if (!batch) return alert("Select a batch.");
      if (!wt) return alert("Select the type of work.");
      card.itemId = item.id; card.productName = item.name;
      card.batchId = batch.id; card.batchNumber = batch.batchNumber;
      card.workTypeId = wt.id; card.workType = wt.name;
    } else if (category === "General") {
      card.generalSubtype = generalSubtype;
    } else if (category === "R&D") {
      if (!rdDescription.trim()) return alert("Input sample descriptor.");
      card.rdDescription = rdDescription;
    }
    setJobCards([card, ...jobCards]);
    setRdDescription("");
  };

  const handleManualCloseJob = (id, closeTimeVal) => {
    const target = jobCards.find(j => j.id === id);
    const s = getMinutesFromStr(target.startTime); const e = getMinutesFromStr(closeTimeVal);
    if (e <= s) return alert("Out-clock must follow in-clock.");
    if (e > 21 * 60) return alert("Out-clock cannot exceed 21:00.");

    const cap = (targetOperative.role === "Supervisor" || targetOperative.allowMultiJob) ? 2 : 1;
    const overlap = dayJobsAll.filter(j => {
      if (j.id === id || !j.endTime) return false;
      return s < getMinutesFromStr(j.endTime) && e > getMinutesFromStr(j.startTime);
    }).length;
    if (overlap >= cap) return alert("Timeline collision on close.");

    setJobCards(prev => prev.map(j => {
      if (j.id !== id) return j;
      const emp = employees.find(x => x.id === j.employeeId);
      const mins = calculateNetMinutes(j.startTime, closeTimeVal);
      return { ...j, endTime: closeTimeVal, durationMinutes: mins, calculatedCost: calculateJobCost(emp ? emp.dailyWage : 600, mins), isCorrected: false };
    }));
  };

  const handleLogLeaveRow = () => {
    if (!targetOperative) return alert("Select profile.");
    const s = getMinutesFromStr(manualStartTime); const e = getMinutesFromStr(manualEndTime);
    if (e <= s) return alert("Leave end must follow start.");
    const net = calculateNetMinutes(manualStartTime, manualEndTime);
    const type = classifyLeaveType(net);
    const collision = dayJobsAll.some(j => {
      const ws = getMinutesFromStr(j.startTime); const we = getMinutesFromStr(j.endTime || "21:00");
      return s < we && e > ws;
    });
    if (collision) return alert("Work logs detected in this leave span.");
    setLeaves([{ id: "lv_" + Date.now(), employeeId: targetOperative.id, employeeName: targetOperative.name, date: activeDate, startTime: manualStartTime, endTime: manualEndTime, durationMinutes: net, leaveType: type }, ...leaves]);
  };

  const cls = dark ? "kiosk bg-ink text-[#F4F3EF]" : "bg-paper text-[#0d0d0d]";
  const border = dark ? "border-white/10" : "border-[#E0DDD5]";
  const surface = dark ? "bg-[#1a1a1a]" : "bg-white";

  return (
    <div className={`${cls} min-h-full -m-6 lg:-m-10 p-6 lg:p-10`} data-testid="jobcards-view">
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border ${border} ${surface} p-5`}>
        <div className="flex items-end gap-5 flex-wrap">
          <div><Label dark={dark}>Active log date</Label><FieldInput dark={dark} type="date" value={activeDate} onChange={e => setActiveDate(e.target.value)} className="font-mono font-bold" data-testid="active-date-input" /></div>
          {targetOperative && (
            <div className="flex items-end gap-3">
              <div><p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${dark ? "text-white/40" : "text-[#8A877E]"}`}>Operator</p><p className="font-display font-black text-2xl tracking-tighter">{targetOperative.name}</p></div>
              <Pill tone={targetOperative.role === "Supervisor" ? "primary" : "ink"}>{targetOperative.role}</Pill>
            </div>
          )}
          {calendarClosureAlert && <Pill tone="warn"><AlertTriangle size={12} /> {calendarClosureAlert}</Pill>}
        </div>
        {currentAdmin && (
          <div><Label dark={dark}>Act as worker</Label>
            <FieldSelect dark={dark} value={selectedKioskUser} onChange={e => setSelectedKioskUser(e.target.value)} data-testid="actas-select">
              <option value="">— Choose —</option>
              {employees.filter(e => e.active).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </FieldSelect>
          </div>
        )}
      </div>

      {targetOperative ? (
        <div className="grid lg:grid-cols-3 gap-6 mt-6">
          <div className="space-y-6">
            <div className={`border ${border} ${surface} p-5 space-y-4`} data-testid="logger-panel">
              <h3 className="font-display font-bold text-lg tracking-tight border-b border-inherit pb-2.5">Log task / leave</h3>

              <div className="grid grid-cols-4 gap-1.5">
                {["Production", "General", "R&D", "Leave"].map(c => (
                  <button key={c} type="button" onClick={() => setCategory(c)}
                    data-testid={`category-${c.toLowerCase().replace("&", "")}`}
                    className={`py-2 text-[11px] font-mono uppercase tracking-[0.15em] font-bold transition-colors ${category === c ? (dark ? "bg-[#E84824] text-white" : "bg-[#0d0d0d] text-white") : (dark ? "bg-black/40 text-white/60 hover:bg-black/60" : "bg-[#F4F3EF] text-[#8A877E] hover:bg-[#E0DDD5]")}`}>{c}</button>
                ))}
              </div>

              {category === "Production" && (
                <div className="space-y-3">
                  <div><Label dark={dark}>1 · Product item</Label>
                    <FieldSelect dark={dark} value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} data-testid="product-select">
                      <option value="">— Choose item —</option>
                      {itemsWithOpenBatches.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </FieldSelect>
                    {itemsWithOpenBatches.length === 0 && <p className={`mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] ${dark ? "text-[#E8A317]" : "text-[#8A877E]"}`}>No items have open batches. Ask admin to deploy a batch.</p>}
                  </div>
                  <div><Label dark={dark}>2 · Active batch</Label>
                    <FieldSelect dark={dark} value={batchId} onChange={e => setBatchId(e.target.value)} disabled={!selectedItemId} data-testid="batch-select">
                      <option value="">— Choose batch —</option>
                      {batchesForSelectedItem.map(b => <option key={b.id} value={b.id}>{b.batchNumber} [{b.status}]</option>)}
                    </FieldSelect>
                  </div>
                  <div><Label dark={dark}>3 · Type of work</Label>
                    <FieldSelect dark={dark} value={workTypeId} onChange={e => setWorkTypeId(e.target.value)} disabled={!batchId} data-testid="worktype-select">
                      <option value="">— Choose work —</option>
                      {workTypes.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </FieldSelect>
                  </div>
                </div>
              )}

              {category === "General" && (
                <div><Label dark={dark}>Activity subtype</Label>
                  <FieldSelect dark={dark} value={generalSubtype} onChange={e => setGeneralSubtype(e.target.value)} data-testid="general-subtype-select">
                    {["Bulk packing (Amazon FBA)", "Daily Amazon / website order packing", "Repairing", "Checking return items", "Factory cleaning", "Stock counting", "Other general purposes"].map(o => <option key={o}>{o}</option>)}
                  </FieldSelect>
                </div>
              )}

              {category === "R&D" && (
                <div><Label dark={dark}>Prototype descriptor</Label>
                  <textarea rows={2} value={rdDescription} onChange={e => setRdDescription(e.target.value)} className={`w-full border px-3 py-2 text-sm focus:outline-none ${dark ? "bg-black border-white/15 text-white focus:border-[#E84824]" : "bg-white border-[#E0DDD5] text-[#0d0d0d] focus:border-[#0028A8]"}`} placeholder="Blueprint configuration…" data-testid="rd-desc-input" />
                </div>
              )}

              {category === "Leave" && (
                <div className={`border-l-2 border-[#E8A317] ${dark ? "bg-[#E8A317]/10" : "bg-[#E8A317]/15"} px-3 py-2.5 text-xs font-mono`}>
                  <p className="font-bold uppercase tracking-[0.15em] mb-0.5">Leave engine</p>
                  <p className={dark ? "text-white/70" : "text-[#8A877E]"}>≥600 min → Full Day · 180–420 → Half Day · &lt;180 → Hourly</p>
                </div>
              )}

              <div className={`flex items-center justify-between border ${border} ${dark ? "bg-black" : "bg-[#F4F3EF]"} px-3 py-2.5`}>
                <Label dark={dark} className="!mb-0">In-clock</Label>
                <TimePicker value={manualStartTime} onChange={setManualStartTime} dark={dark} testid="start-time" />
              </div>
              {category === "Leave" && (
                <div className={`flex items-center justify-between border ${border} ${dark ? "bg-black" : "bg-[#F4F3EF]"} px-3 py-2.5`}>
                  <Label dark={dark} className="!mb-0">Out-clock</Label>
                  <TimePicker value={manualEndTime} onChange={setManualEndTime} dark={dark} testid="end-time" />
                </div>
              )}

              {category === "Leave"
                ? <Btn tone="blaze" className="w-full" onClick={handleLogLeaveRow} testid="log-leave-btn"><Plus size={14} /> Commit leave row</Btn>
                : <Btn tone={dark ? "blaze" : "ink"} className="w-full" onClick={handleOpenJob} testid="open-card-btn"><Plus size={14} /> Write open card</Btn>
              }
            </div>

            <div className={`border ${border} ${surface} p-5`} data-testid="gaps-panel">
              <h4 className={`font-mono text-[10px] uppercase tracking-[0.25em] ${dark ? "text-white/50" : "text-[#8A877E]"} mb-3`}>Unlogged gap audit · 09:00 → 21:00</h4>
              {missingGaps.length === 0
                ? <p className="font-mono text-xs text-[#2E8540] font-bold flex items-center gap-1.5"><CheckCircle2 size={14} /> Shift fully allocated.</p>
                : <div className="flex flex-wrap gap-1.5">{missingGaps.map((g, i) => <Pill key={i} tone="error">{g}</Pill>)}</div>}
            </div>

            {currentAdmin && (
              <div className={`border ${border} ${surface} p-5`} data-testid="daily-summary-panel">
                <h4 className={`font-mono text-[10px] uppercase tracking-[0.25em] ${dark ? "text-white/50" : "text-[#8A877E]"} mb-3`}>Day summary · {targetOperative.name}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="font-mono text-[10px] uppercase text-[#8A877E]">Net minutes</p><p className="font-display font-black text-2xl tracking-tighter">{totalDayMin}</p></div>
                  <div><p className="font-mono text-[10px] uppercase text-[#8A877E]">Outlay</p><p className="font-display font-black text-2xl tracking-tighter text-[#2E8540]">₹{totalDayCost.toFixed(2)}</p></div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-5">
            <h3 className={`font-mono text-[11px] uppercase tracking-[0.3em] ${dark ? "text-white/60" : "text-[#8A877E]"}`}>Processed & pending sheets</h3>

            {activeOpenCards.map(oc => (
              <div key={oc.id} className={`border ${dark ? "border-[#E84824]" : "border-[#E8A317]"} ${surface} p-5 space-y-4`} data-testid={`open-card-${oc.id}`}>
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <Pill tone="warn"><Clock size={11} /> Unfinished track</Pill>
                    <h4 className="font-display font-bold text-lg tracking-tight mt-2">{oc.productName ? `${oc.productName}${oc.workType ? ` · ${oc.workType}` : ""}` : (oc.generalSubtype || oc.rdDescription)}</h4>
                    {oc.batchNumber && <p className={`font-mono text-xs mt-1 ${dark ? "text-[#E84824]" : "text-[#0028A8]"}`}>{oc.batchNumber}</p>}
                  </div>
                  <div className="text-right font-mono text-xs"><p className={dark ? "text-white/50" : "text-[#8A877E]"}>In-clock</p><p className="font-bold text-base">{oc.startTime}</p></div>
                </div>
                <div className={`flex items-center justify-between border ${border} ${dark ? "bg-black" : "bg-[#F4F3EF]"} px-3 py-2.5`}>
                  <Label dark={dark} className="!mb-0">Out-clock</Label>
                  <TimePicker value={manualEndTime} onChange={setManualEndTime} dark={dark} testid={`close-time-${oc.id}`} />
                </div>
                <Btn tone="danger" className="w-full" onClick={() => handleManualCloseJob(oc.id, manualEndTime)} testid={`close-card-${oc.id}`}><Lock size={14} /> Close card out</Btn>
              </div>
            ))}

            <div className={`border ${border} ${surface} p-5 overflow-x-auto`} data-testid="log-matrix">
              <h4 className={`font-mono text-[10px] uppercase tracking-[0.25em] ${dark ? "text-white/50" : "text-[#8A877E]"} mb-3 pb-2 border-b ${border}`}>Daily work done · {activeDate}</h4>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={`font-mono text-[10px] uppercase tracking-[0.2em] ${dark ? "text-white/40" : "text-[#8A877E]"} border-b ${border}`}>
                    <th className="py-2">Item / Task</th>
                    <th className="py-2">Batch</th>
                    <th className="py-2">Work type</th>
                    <th className="py-2">Timeline</th>
                    <th className="py-2 text-right">Duration</th>
                    {currentAdmin && <th className="py-2 text-right">Outlay</th>}
                  </tr>
                </thead>
                <tbody className={`divide-y ${dark ? "divide-white/5" : "divide-[#E0DDD5]"}`}>
                  {dayJobsAll.filter(j => j.endTime).map(j => (
                    <tr key={j.id} className={dark ? "hover:bg-white/5" : "hover:bg-[#F4F3EF]"} data-testid={`log-row-${j.id}`}>
                      <td className="py-3 font-display font-bold max-w-[200px] truncate">{j.productName || j.generalSubtype || j.rdDescription}</td>
                      <td className={`py-3 font-mono text-xs ${dark ? "text-white/60" : "text-[#8A877E]"}`}>{j.batchNumber || j.category}</td>
                      <td className={`py-3 font-mono text-xs ${dark ? "text-white/80" : "text-[#0d0d0d]"}`}>{j.workType || "—"}</td>
                      <td className={`py-3 font-mono text-xs ${dark ? "text-white/80" : "text-[#0d0d0d]"}`}>{j.startTime} → {j.endTime}</td>
                      <td className="py-3 font-mono text-right font-bold">{(j.durationMinutes / 60).toFixed(1)}h <span className={`block text-[10px] font-normal ${dark ? "text-white/40" : "text-[#8A877E]"}`}>({j.durationMinutes}m)</span></td>
                      {currentAdmin && <td className="py-3 font-mono text-right font-black text-[#2E8540]">₹{j.calculatedCost?.toFixed(2)}</td>}
                    </tr>
                  ))}
                  {dayLeavesAll.map(lv => (
                    <tr key={lv.id} className={`${dark ? "bg-[#E84824]/10" : "bg-[#D93025]/5"} text-[#D93025]`} data-testid={`leave-row-${lv.id}`}>
                      <td className="py-3 font-display font-bold italic">🛑 Operational leave</td>
                      <td className="py-3 font-mono text-xs font-bold">{lv.leaveType}</td>
                      <td className="py-3 font-mono text-xs">—</td>
                      <td className="py-3 font-mono text-xs">{lv.startTime} → {lv.endTime || "21:00"}</td>
                      <td className="py-3 font-mono text-right font-bold">{(lv.durationMinutes / 60).toFixed(1)}h <span className="block text-[10px] font-normal opacity-60">({lv.durationMinutes}m)</span></td>
                      {currentAdmin && <td className={`py-3 text-right font-mono text-xs ${dark ? "text-white/40" : "text-[#8A877E]"}`}>— masked —</td>}
                    </tr>
                  ))}
                  {dayJobsAll.filter(j => j.endTime).length === 0 && dayLeavesAll.length === 0 && (
                    <tr><td colSpan={currentAdmin ? 6 : 5} className={`py-8 text-center font-mono text-xs italic ${dark ? "text-white/40" : "text-[#8A877E]"}`}>No confirmed entries on this date.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : <p className={`mt-12 text-center font-mono text-xs italic ${dark ? "text-white/40" : "text-[#8A877E]"}`}>Select a worker to view their daily log.</p>}
    </div>
  );
}

/* ============================================================================
   12. ADMIN — REPORTS / AUDIT
============================================================================ */

function FinancialReportsView({ jobCards, setJobCards, items, batches, employees, leaves, holidays }) {
  const [activeDateFilter, setActiveDateFilter] = useState(TODAY);
  const [reportMode, setReportMode] = useState("costing");
  const [batchStateFilter, setBatchStateFilter] = useState("All");
  const [batchRangeStart, setBatchRangeStart] = useState("2026-06-01");
  const [batchRangeEnd, setBatchRangeEnd] = useState("2026-12-31");

  const [editingCardId, setEditingCardId] = useState(null);
  const [correctedStart, setCorrectedStart] = useState("09:00");
  const [correctedEnd, setCorrectedEnd] = useState("17:00");

  const closed = jobCards.filter(j => j.endTime);
  const itemName = (id) => items.find(i => i.id === id)?.name || "—";

  const exceptionReports = useMemo(() => {
    const d = new Date(activeDateFilter); const isSun = d.getDay() === 0;
    const hol = holidays.find(h => h.date === activeDateFilter);
    const label = isSun ? "Weekly Off (Sunday)" : hol ? `Public Holiday: ${hol.label}` : null;
    const lvList = leaves.filter(l => l.date === activeDateFilter);
    const unlogged = [];
    if (!label) {
      employees.filter(e => e.active).forEach(emp => {
        const hasFull = leaves.some(l => l.employeeId === emp.id && l.date === activeDateFilter && l.leaveType === "Full Day Leave");
        if (!hasFull) {
          const gaps = detectUnloggedTimeGaps(activeDateFilter, jobCards.filter(j => j.employeeId === emp.id), leaves.filter(l => l.employeeId === emp.id));
          if (gaps.length > 0) unlogged.push({ id: emp.id, name: emp.name, gaps });
        }
      });
    }
    return { label, unlogged, lvList };
  }, [activeDateFilter, jobCards, leaves, employees, holidays]);

  const filteredBatches = batches.filter(b => {
    const stOk = batchStateFilter === "All" || b.status === batchStateFilter;
    const d = new Date(b.startDate);
    const s = batchRangeStart ? d >= new Date(batchRangeStart) : true;
    const e = batchRangeEnd ? d <= new Date(batchRangeEnd) : true;
    return stOk && s && e;
  });

  const exportCSV = () => {
    const headers = ["Batch Number", "Item", "Yield Count", "Start Date", "End Date", "Status", "Gross Labor Cost (₹)", "Piece Cost (₹)"];
    const rows = [headers.join(",")];
    filteredBatches.forEach(b => {
      const total = closed.filter(j => j.batchId === b.id).reduce((s, c) => s + (c.calculatedCost || 0), 0);
      const piece = b.yieldCount > 0 ? (total / b.yieldCount).toFixed(2) : "0.00";
      rows.push([`"${b.batchNumber}"`, `"${itemName(b.itemId)}"`, b.yieldCount, b.startDate, `"${b.endDate || "Running"}"`, `"${b.status}"`, total.toFixed(2), piece].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `StitchLog_Batches_${batchStateFilter}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const applyCorrection = (id) => {
    setJobCards(prev => prev.map(j => {
      if (j.id !== id) return j;
      const emp = employees.find(e => e.id === j.employeeId);
      const mins = calculateNetMinutes(correctedStart, correctedEnd);
      return { ...j, startTime: correctedStart, endTime: correctedEnd, durationMinutes: mins, calculatedCost: calculateJobCost(emp ? emp.dailyWage : 600, mins), isCorrected: true };
    }));
    setEditingCardId(null);
  };

  const modes = [
    { id: "costing", label: "Cost ledger", icon: <BarChart3 size={14} /> },
    { id: "batches_dashboard", label: "Lots matrix", icon: <Package size={14} /> },
    { id: "exceptions", label: "Exceptions", icon: <AlertTriangle size={14} /> },
  ];

  return (
    <div className="space-y-8" data-testid="reports-view">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#8A877E]">System audit · ledger</p>
          <h2 className="font-display font-black text-4xl tracking-tighter mt-2">Reports & overrides.</h2>
        </div>
        <div className="flex border border-[#E0DDD5] bg-white">
          {modes.map(m => (
            <button key={m.id} onClick={() => setReportMode(m.id)} data-testid={`mode-${m.id}`}
              className={`px-4 py-2.5 text-[11px] font-mono uppercase tracking-[0.15em] font-bold flex items-center gap-2 transition-colors ${reportMode === m.id ? "bg-[#0d0d0d] text-white" : "text-[#0d0d0d] hover:bg-[#F4F3EF]"}`}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </header>

      {reportMode === "batches_dashboard" && (
        <div className="border border-[#E0DDD5] bg-white p-6 space-y-6 animate-fadeIn" data-testid="batches-panel">
          <div className="flex flex-wrap items-end gap-4 justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <div><Label>State</Label>
                <FieldSelect value={batchStateFilter} onChange={e => setBatchStateFilter(e.target.value)} data-testid="batch-state-filter">
                  <option>All</option><option>Active</option><option>Only Packing Pending</option><option>Completed</option>
                </FieldSelect>
              </div>
              <div><Label>From</Label><FieldInput type="date" value={batchRangeStart} onChange={e => setBatchRangeStart(e.target.value)} data-testid="batch-from" /></div>
              <div><Label>To</Label><FieldInput type="date" value={batchRangeEnd} onChange={e => setBatchRangeEnd(e.target.value)} data-testid="batch-to" /></div>
            </div>
            <Btn tone="ink" onClick={exportCSV} testid="export-csv-btn"><FileDown size={14} /> Export CSV</Btn>
          </div>
          <div className="border border-[#E0DDD5] overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F4F3EF] border-b border-[#E0DDD5]">
                <tr className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A877E]">
                  <th className="p-3">Batch</th><th className="p-3">Item</th><th className="p-3 text-right">Yield</th><th className="p-3">Start</th><th className="p-3">State</th><th className="p-3 text-right">Gross</th><th className="p-3 text-right">Per piece</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0DDD5]">
                {filteredBatches.map(b => {
                  const m = closed.filter(j => j.batchId === b.id);
                  const t = m.reduce((s, c) => s + (c.calculatedCost || 0), 0);
                  const u = b.yieldCount > 0 ? (t / b.yieldCount).toFixed(2) : "0.00";
                  return (
                    <tr key={b.id} className="hover:bg-[#F4F3EF]">
                      <td className="p-3 font-mono font-bold text-[#0028A8]">{b.batchNumber}</td>
                      <td className="p-3 font-display font-bold">{itemName(b.itemId)}</td>
                      <td className="p-3 font-mono text-right">{b.yieldCount}</td>
                      <td className="p-3 font-mono text-xs text-[#8A877E]">{b.startDate}</td>
                      <td className="p-3"><Pill tone={b.status === "Active" ? "success" : b.status === "Only Packing Pending" ? "warn" : "default"}>{b.status}</Pill></td>
                      <td className="p-3 font-mono text-right font-bold">₹{t.toFixed(2)}</td>
                      <td className="p-3 font-mono text-right font-black text-[#2E8540]">₹{u}</td>
                    </tr>
                  );
                })}
                {filteredBatches.length === 0 && <tr><td colSpan={7} className="p-6 text-center font-mono text-xs italic text-[#8A877E]">No batches match the query.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportMode === "exceptions" && (
        <div className="border border-[#E0DDD5] bg-white p-6 space-y-6 animate-fadeIn" data-testid="exceptions-panel">
          <div className="flex items-center justify-between border-b border-[#E0DDD5] pb-3 flex-wrap gap-2">
            <h3 className="font-display font-bold text-xl tracking-tight">Target date scan</h3>
            <FieldInput type="date" value={activeDateFilter} onChange={e => setActiveDateFilter(e.target.value)} className="max-w-xs font-mono" data-testid="exception-date" />
          </div>
          {exceptionReports.label && <div className="border-l-2 border-[#E8A317] bg-[#E8A317]/10 px-4 py-3 font-mono text-xs">📢 Establishment closure: {exceptionReports.label}</div>}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#D93025] mb-3">Unlogged personnel ({exceptionReports.unlogged.length})</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {exceptionReports.unlogged.map(item => (
                  <div key={item.id} className="border border-[#E0DDD5] p-3" data-testid={`exception-emp-${item.id}`}>
                    <p className="font-display font-bold">{item.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">{item.gaps.map((g, i) => <Pill key={i} tone="error">{g}</Pill>)}</div>
                  </div>
                ))}
                {exceptionReports.unlogged.length === 0 && !exceptionReports.label && <p className="font-mono text-xs italic text-[#8A877E]">No exceptions flagged.</p>}
              </div>
            </div>
            <div>
              <h4 className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8A877E] mb-3">Leaves register ({exceptionReports.lvList.length})</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {exceptionReports.lvList.map(item => (
                  <div key={item.id} className="border border-[#E0DDD5] p-3 flex justify-between items-center" data-testid={`exception-lv-${item.id}`}>
                    <span className="font-display font-bold">{item.employeeName}</span>
                    <Pill tone="warn">{item.leaveType} · {item.startTime}–{item.endTime}</Pill>
                  </div>
                ))}
                {exceptionReports.lvList.length === 0 && <p className="font-mono text-xs italic text-[#8A877E]">No leaves filed.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {reportMode === "costing" && (
        <div className="space-y-5 animate-fadeIn" data-testid="costing-panel">
          {batches.length === 0 && <div className="border border-[#E0DDD5] bg-white p-6 font-mono text-xs italic text-[#8A877E]">No batches deployed yet. Open batches from Admin → Batches to populate this ledger.</div>}
          {batches.map(b => {
            const m = closed.filter(j => j.batchId === b.id);
            const t = m.reduce((s, c) => s + (c.calculatedCost || 0), 0);
            const netH = m.reduce((s, c) => s + (c.durationMinutes || 0), 0) / 60;
            return (
              <div key={b.id} className="border border-[#E0DDD5] bg-white p-6 space-y-4" data-testid={`cost-card-${b.id}`}>
                <div className="flex flex-wrap justify-between items-start gap-4 border-b border-[#E0DDD5] pb-3">
                  <div>
                    <h4 className="font-display font-black text-2xl tracking-tighter">{itemName(b.itemId)}</h4>
                    <p className="font-mono text-xs text-[#8A877E] mt-1">{b.batchNumber} · {b.startDate} → {b.endDate || "Running"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8A877E]">Labor ledger</p>
                    <p className="font-display font-black text-3xl tracking-tighter text-[#2E8540]">₹{t.toFixed(2)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border border-[#E0DDD5] bg-[#F4F3EF] p-4">
                  <div><p className="font-mono text-[10px] uppercase text-[#8A877E]">Yield</p><p className="font-display font-bold text-lg">{b.yieldCount} pcs</p></div>
                  <div><p className="font-mono text-[10px] uppercase text-[#8A877E]">Per unit</p><p className="font-display font-bold text-lg text-[#0028A8]">₹{b.yieldCount > 0 ? (t / b.yieldCount).toFixed(2) : "0.00"}</p></div>
                  <div><p className="font-mono text-[10px] uppercase text-[#8A877E]">Net hours</p><p className="font-display font-bold text-lg">{netH.toFixed(1)} h</p></div>
                  <div><p className="font-mono text-[10px] uppercase text-[#8A877E]">Closed cards</p><p className="font-display font-bold text-lg">{m.length}</p></div>
                </div>
                {m.length > 0 && (
                  <div className="space-y-1.5">
                    {m.map(j => (
                      <div key={j.id} className="border border-[#E0DDD5] p-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3" data-testid={`cost-job-${j.id}`}>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap"><span className="font-display font-bold">{j.employeeName}</span><span className="font-mono text-xs text-[#8A877E]">({j.date})</span>{j.workType && <Pill tone="primary">{j.workType}</Pill>}{j.isCorrected && <Pill tone="error">⚠ Corrected</Pill>}</div>
                          <p className="font-mono text-xs text-[#8A877E] mt-0.5">{j.startTime} → {j.endTime} · {j.durationMinutes} net min</p>
                        </div>
                        {editingCardId === j.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <TimePicker value={correctedStart} onChange={setCorrectedStart} testid={`corr-start-${j.id}`} />
                            <span className="font-mono text-xs text-[#8A877E]">to</span>
                            <TimePicker value={correctedEnd} onChange={setCorrectedEnd} testid={`corr-end-${j.id}`} />
                            <Btn tone="primary" onClick={() => applyCorrection(j.id)} className="!px-3 !py-1.5" testid={`corr-commit-${j.id}`}><Save size={12} /></Btn>
                            <Btn tone="paper" onClick={() => setEditingCardId(null)} className="!px-3 !py-1.5"><X size={12} /></Btn>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <span className="font-display font-black text-lg text-[#2E8540]">₹{j.calculatedCost?.toFixed(2)}</span>
                            <Btn tone="paper" onClick={() => { setEditingCardId(j.id); setCorrectedStart(j.startTime); setCorrectedEnd(j.endTime); }} testid={`corr-edit-${j.id}`}><Edit3 size={12} /> Override</Btn>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   13. ADMIN — DATA VAULT
============================================================================ */

function DataVaultView({ employees, setEmployees, items, setItems, batches, setBatches, workTypes, setWorkTypes, jobCards, setJobCards, leaves, setLeaves, holidays, setHolidays }) {
  const [status, setStatus] = useState(null);

  const exportAll = () => {
    const payload = { version: "v7", exportedAt: new Date().toISOString(), employees, items, batches, workTypes, jobCards, leaves, holidays };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `stitchlog_backup_${TODAY}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setStatus({ tone: "success", msg: "Full backup exported." });
  };
  const importAll = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.employees) setEmployees(data.employees);
        if (data.items) setItems(data.items);
        if (data.batches) setBatches(data.batches);
        if (data.workTypes) setWorkTypes(data.workTypes);
        if (data.jobCards) setJobCards(data.jobCards);
        if (data.leaves) setLeaves(data.leaves);
        if (data.holidays) setHolidays(data.holidays);
        setStatus({ tone: "success", msg: "Restore complete. All registries replaced." });
      } catch {
        setStatus({ tone: "error", msg: "Invalid backup file." });
      }
    };
    reader.readAsText(file);
  };
  const wipe = () => {
    if (!window.confirm("Wipe all registries back to seed defaults? This cannot be undone.")) return;
    setEmployees(INITIAL_EMPLOYEES); setItems(INITIAL_ITEMS); setBatches(INITIAL_BATCHES);
    setWorkTypes(INITIAL_WORKTYPES); setJobCards([]); setLeaves([]); setHolidays(INITIAL_HOLIDAYS);
    setStatus({ tone: "success", msg: "Reset to factory seed complete." });
  };

  const counts = [
    { k: "Employees", v: employees.length },
    { k: "Items", v: items.length },
    { k: "Batches", v: batches.length },
    { k: "Work types", v: workTypes.length },
    { k: "Job cards", v: jobCards.length },
    { k: "Leaves", v: leaves.length },
    { k: "Holidays", v: holidays.length },
  ];

  return (
    <div className="space-y-8" data-testid="vault-view">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#8A877E]">Operations · data vault</p>
        <h2 className="font-display font-black text-4xl tracking-tighter mt-2">Backup & restore.</h2>
      </header>
      {status && <div className={`border px-4 py-3 font-mono text-xs ${status.tone === "success" ? "border-[#2E8540] bg-[#2E8540]/10 text-[#2E8540]" : "border-[#D93025] bg-[#D93025]/10 text-[#D93025]"}`} data-testid="vault-status">{status.msg}</div>}
      <div className="grid grid-cols-3 md:grid-cols-7 border border-[#E0DDD5] divide-x divide-[#E0DDD5] bg-white">
        {counts.map(c => (
          <div key={c.k} className="p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A877E]">{c.k}</p>
            <p className="font-display font-black text-3xl tracking-tighter mt-2">{c.v}</p>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="border border-[#E0DDD5] bg-white p-6">
          <h3 className="font-display font-bold text-lg tracking-tight">Export full backup</h3>
          <p className="font-mono text-xs text-[#8A877E] mt-1.5">Downloads a single JSON snapshot of all registries.</p>
          <Btn tone="ink" className="w-full mt-4" onClick={exportAll} testid="vault-export-btn"><Download size={14} /> Download JSON</Btn>
        </div>
        <div className="border border-[#E0DDD5] bg-white p-6">
          <h3 className="font-display font-bold text-lg tracking-tight">Restore from file</h3>
          <p className="font-mono text-xs text-[#8A877E] mt-1.5">Replaces all current registries with the contents of a backup file.</p>
          <label className="mt-4 block">
            <span className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.15em] bg-[#0028A8] text-white hover:bg-[#001f80] cursor-pointer w-full"><Upload size={14} /> Choose JSON file</span>
            <input type="file" accept=".json,application/json" onChange={importAll} className="hidden" data-testid="vault-import-input" />
          </label>
        </div>
        <div className="border border-[#D93025] bg-[#D93025]/5 p-6">
          <h3 className="font-display font-bold text-lg tracking-tight text-[#D93025]">Reset to seed</h3>
          <p className="font-mono text-xs text-[#D93025]/80 mt-1.5">Wipes all entries and reloads the demo dataset. Cannot be undone.</p>
          <Btn tone="danger" className="w-full mt-4" onClick={wipe} testid="vault-wipe-btn"><AlertTriangle size={14} /> Wipe & reseed</Btn>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   14. APP SHELL
============================================================================ */

export default function App() {
  const [employees, setEmployees] = useState(() => { const s = localStorage.getItem("sl_emp_v6"); return s ? JSON.parse(s) : INITIAL_EMPLOYEES; });
  const [items, setItems] = useState(() => { const s = localStorage.getItem("sl_items_v1"); return s ? JSON.parse(s) : INITIAL_ITEMS; });
  const [batches, setBatches] = useState(() => { const s = localStorage.getItem("sl_batches_v1"); return s ? JSON.parse(s) : INITIAL_BATCHES; });
  const [workTypes, setWorkTypes] = useState(() => { const s = localStorage.getItem("sl_wt_v1"); return s ? JSON.parse(s) : INITIAL_WORKTYPES; });
  const [jobCards, setJobCards] = useState(() => { const s = localStorage.getItem("sl_jobs_v8"); return s ? JSON.parse(s) : []; });
  const [leaves, setLeaves] = useState(() => { const s = localStorage.getItem("sl_lv_v8"); return s ? JSON.parse(s) : []; });
  const [holidays, setHolidays] = useState(() => { const s = localStorage.getItem("sl_hol_v6"); return s ? JSON.parse(s) : INITIAL_HOLIDAYS; });

  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [currentWorker, setCurrentWorker] = useState(null);
  const [currentView, setCurrentView] = useState("landing");

  // Migration: purge prior schema versions so the new items/batches/workTypes split takes over cleanly.
  useEffect(() => {
    [
      "sl_emp_v5", "sl_prod_v5", "sl_jobs_v5", "sl_lv_v5", "sl_hol_v5",
      "sl_prod_v6", "sl_jobs_v6", "sl_lv_v6",
      "sl_prod_v7", "sl_jobs_v7", "sl_lv_v7",
    ].forEach(k => { if (localStorage.getItem(k) !== null) localStorage.removeItem(k); });
  }, []);

  useEffect(() => { localStorage.setItem("sl_emp_v6", JSON.stringify(employees)); }, [employees]);
  useEffect(() => { localStorage.setItem("sl_items_v1", JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem("sl_batches_v1", JSON.stringify(batches)); }, [batches]);
  useEffect(() => { localStorage.setItem("sl_wt_v1", JSON.stringify(workTypes)); }, [workTypes]);
  useEffect(() => { localStorage.setItem("sl_jobs_v8", JSON.stringify(jobCards)); }, [jobCards]);
  useEffect(() => { localStorage.setItem("sl_lv_v8", JSON.stringify(leaves)); }, [leaves]);
  useEffect(() => { localStorage.setItem("sl_hol_v6", JSON.stringify(holidays)); }, [holidays]);

  const logout = () => { setCurrentAdmin(null); setCurrentWorker(null); setCurrentView("landing"); };

  if (currentView === "landing") return <LandingScreen setView={setCurrentView} />;
  if (currentView === "admin_login") return <AdminLoginScreen setView={setCurrentView} onLogin={(name) => { setCurrentAdmin(name); setCurrentView("dashboard"); }} />;
  if (currentView === "worker_login") return <WorkerKioskScreen employees={employees} setView={setCurrentView} onLogin={(w) => { setCurrentWorker(w); setCurrentView("jobcards"); }} />;

  const adminNav = [
    { id: "dashboard", label: "Overview", icon: <BarChart3 size={14} /> },
    { id: "employees", label: "Personnel", icon: <Users size={14} /> },
    { id: "items", label: "Items", icon: <Tag size={14} /> },
    { id: "batches", label: "Batches", icon: <Layers size={14} /> },
    { id: "worktypes", label: "Work types", icon: <Wrench size={14} /> },
    { id: "calendar_setup", label: "Calendar", icon: <CalendarDays size={14} /> },
    { id: "jobcards", label: "Daily work done", icon: <Clock size={14} /> },
    { id: "reports", label: "Audit & ledger", icon: <Search size={14} /> },
    { id: "vault", label: "Data vault", icon: <Sparkles size={14} /> },
  ];

  const dark = !currentAdmin && currentView === "jobcards";

  return (
    <div className={`min-h-screen ${dark ? "bg-ink text-[#F4F3EF]" : "bg-paper text-[#0d0d0d]"}`}>
      <div className="flex flex-col md:flex-row min-h-screen">
        <aside className={`w-full md:w-64 shrink-0 border-r ${dark ? "border-white/10 bg-[#0d0d0d]" : "border-[#E0DDD5] bg-white"} p-6 flex flex-col justify-between`} data-testid="sidebar">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className={`w-10 h-10 ${dark ? "bg-[#E84824] text-white" : "bg-[#0d0d0d] text-[#E84824]"} flex items-center justify-center`}><Scissors size={18} /></div>
              <div>
                <p className="font-display font-black text-sm tracking-tight uppercase">Stitchlog</p>
                <p className={`font-mono text-[9px] uppercase tracking-[0.3em] ${dark ? "text-[#E84824]" : "text-[#8A877E]"} mt-0.5`}>Bayne · v5</p>
              </div>
            </div>
            <nav className="space-y-1" data-testid="nav">
              {(currentAdmin ? adminNav : adminNav.filter(n => n.id === "jobcards")).map(n => (
                <button key={n.id} onClick={() => setCurrentView(n.id)} data-testid={`nav-${n.id}`}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 text-xs font-mono uppercase tracking-[0.15em] font-bold transition-colors ${currentView === n.id
                    ? (dark ? "bg-[#E84824] text-white" : "bg-[#0d0d0d] text-white")
                    : (dark ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-[#0d0d0d] hover:bg-[#F4F3EF]")}`}>
                  {n.icon}<span>{n.label}</span>
                  {currentView === n.id && <ChevronRight size={14} className="ml-auto" />}
                </button>
              ))}
            </nav>
          </div>
          <div className="space-y-3">
            <div className={`border ${dark ? "border-white/10" : "border-[#E0DDD5]"} p-3`}>
              <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${dark ? "text-white/40" : "text-[#8A877E]"}`}>Signed in as</p>
              <p className="font-display font-bold text-sm mt-1">{currentAdmin || currentWorker?.name}</p>
              {currentWorker && <Pill tone={currentWorker.role === "Supervisor" ? "primary" : "ink"} className="mt-2">{currentWorker.role}</Pill>}
            </div>
            <Btn tone={dark ? "ghostDark" : "ghost"} onClick={logout} className={`w-full ${dark ? "" : "border border-[#E0DDD5]"}`} testid="logout-btn"><LogOut size={14} /> Exit session</Btn>
          </div>
        </aside>

        <main className={`flex-1 p-6 lg:p-10 overflow-y-auto ${dark ? "" : "bg-paper"}`} data-testid="main">
          {currentView === "dashboard" && currentAdmin && <AdminDashboardView jobCards={jobCards} employees={employees} batches={batches} leaves={leaves} />}
          {currentView === "employees" && currentAdmin && <EmployeesManagementView employees={employees} setEmployees={setEmployees} />}
          {currentView === "items" && currentAdmin && <ItemsManagementView items={items} setItems={setItems} batches={batches} />}
          {currentView === "batches" && currentAdmin && <BatchesManagementView items={items} batches={batches} setBatches={setBatches} />}
          {currentView === "worktypes" && currentAdmin && <WorkTypesManagementView workTypes={workTypes} setWorkTypes={setWorkTypes} />}
          {currentView === "calendar_setup" && currentAdmin && <CalendarControlsView holidays={holidays} setHolidays={setHolidays} />}
          {currentView === "jobcards" && <JobCardsWorkspaceView currentWorker={currentWorker} currentAdmin={currentAdmin} employees={employees} items={items} batches={batches} workTypes={workTypes} jobCards={jobCards} setJobCards={setJobCards} leaves={leaves} setLeaves={setLeaves} holidays={holidays} />}
          {currentView === "reports" && currentAdmin && <FinancialReportsView jobCards={jobCards} setJobCards={setJobCards} items={items} batches={batches} employees={employees} leaves={leaves} holidays={holidays} />}
          {currentView === "vault" && currentAdmin && <DataVaultView employees={employees} setEmployees={setEmployees} items={items} setItems={setItems} batches={batches} setBatches={setBatches} workTypes={workTypes} setWorkTypes={setWorkTypes} jobCards={jobCards} setJobCards={setJobCards} leaves={leaves} setLeaves={setLeaves} holidays={holidays} setHolidays={setHolidays} />}
        </main>
      </div>
    </div>
  );
}
