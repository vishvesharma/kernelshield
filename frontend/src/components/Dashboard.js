import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Database, ShieldOff, Layers, Bot, CheckCircle, AlertTriangle } from 'lucide-react';

import Navbar       from './Navbar';
import Sidebar      from './Sidebar';
import SystemHealth from './SystemHealth';
import ThreatChart  from './ThreatChart';
import EventFeed    from './EventFeed';
import ControlPanel from './ControlPanel';

import AlertsView      from './views/AlertsView';
import MetricsView     from './views/MetricsView';
import SimulationsView from './views/SimulationsView';
import PoliciesView    from './views/PoliciesView';
import SettingsView    from './views/SettingsView';

import { useDemoMode } from '../hooks/useDemoMode';

const REFRESH_MS   = 6000;
const AUTO_SIM_IDS = ['buffer', 'trapdoor', 'cache'];

/* ─── Helpers ─── */
const fmtType = t => ({ buffer_overflow:'Buffer Overflow', trapdoor:'Trapdoor', cache_poisoning:'Cache Poisoning' }[t] || '—');

/* ─── Skeleton ─── */
const SkeletonStat = () => (
  <div className="stat-card" style={{ cursor:'default' }}>
    <div className="skeleton skeleton-text" style={{ width:80, marginBottom:12 }} />
    <div className="skeleton skeleton-value" style={{ width:60 }} />
  </div>
);

/* ─── Context hint ─── */
const ContextHint = ({ label, value }) => {
  if (label === 'Total Events')  return <span className="metric-context">All recorded kernel events</span>;
  if (label === 'High Risk')     return <span className="metric-context">{value===0?<span className="metric-trend down">✓ Clear</span>:<span className="metric-trend up">⚠ Action needed</span>}</span>;
  if (label === 'Moderate Risk') return <span className="metric-context">{value===0?<span className="metric-trend down">Within normal range</span>:<span className="metric-trend up">{value} issue{value!==1?'s':''} – review recommended</span>}</span>;
  return null;
};

const StatCard = ({ label, value, colorClass, icon:Icon, index }) => (
  <motion.div
    className={`stat-card ${colorClass} ${colorClass==='amber'&&value>0?'pulse-amber':''}`}
    style={{ cursor:'default' }}
    initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
    transition={{ duration:0.4, delay:index*0.08 }}
  >
    <div className="flex items-center justify-between">
      <span className="stat-label">{label}</span>
      <div className={`stat-icon ${colorClass}`}><Icon size={16} /></div>
    </div>
    <div className={`stat-value ${colorClass}`}>{value}</div>
    <ContextHint label={label} value={value} />
  </motion.div>
);

/* ─── Hero Banner ─── */
const HeroBanner = ({ riskLevel, lastScan, score }) => {
  const isHigh = riskLevel === 'High';
  const isMod  = riskLevel === 'Moderate';
  const cls    = isHigh ? 'critical' : isMod ? 'elevated' : 'secure';
  const Icon   = isHigh || isMod ? AlertTriangle : CheckCircle;
  const title  = isHigh ? 'Threat Detected' : isMod ? 'Elevated Risk Level' : 'System Secure';
  const sub    = isHigh ? 'Critical anomalies require immediate investigation.'
               : isMod  ? 'Moderate-risk events detected — review recommended.'
               :           'No critical threats detected. All subsystems nominal.';
  return (
    <motion.div
      className={`hero-banner ${cls}`}
      initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.4 }} style={{ cursor:'default' }}
    >
      <div className="flex items-center gap-4">
        <Icon size={28} strokeWidth={2} />
        <div>
          <div className="hero-title">{title}</div>
          <div className="hero-sub">{sub}</div>
          <div className="hero-meta">
            <span>Health score: {score}</span><span>·</span>
            <span>Last scan: {lastScan}</span><span>·</span>
            <span>Protected by KernelShield AI Engine v1.0</span>
          </div>
        </div>
      </div>
      <div style={{ fontSize:'2.5rem', fontWeight:800, fontFamily:'var(--font-heading)', opacity:0.12, userSelect:'none' }}>{score}</div>
    </motion.div>
  );
};

/* ─── AI Recommendations (correct logic) ─── */
const Recommendations = ({ riskLevel, events }) => {
  const crit   = events.filter(e => e.threat_tier === 'Critical Breach').length;
  const expl   = events.filter(e => e.threat_tier === 'Exploit Attempt').length;
  const recs   = [];
  const priRgb = { CRITICAL:'244,63,94', HIGH:'245,158,11', INFO:'0,229,255', OK:'34,211,165' };

  if (crit > 0)  recs.push({ color:'var(--red)',   text:`${crit} critical breach event${crit>1?'s':''} detected — investigate immediately.`, pri:'CRITICAL' });
  if (expl > 0)  recs.push({ color:'var(--amber)', text:`${expl} exploit attempt${expl>1?'s':''} logged — review buffer and cache configs.`,  pri:'HIGH' });
  if (riskLevel==='Low' && crit===0 && expl===0 && events.length>0)
    recs.push({ color:'var(--green)', text:'System stable. Continue routine simulations to maintain detection baseline.', pri:'OK' });
  if (events.length===0)
    recs.push({ color:'var(--cyan)',  text:'No events recorded. Run attack simulations to validate your detection pipeline.', pri:'INFO' });

  return (
    <motion.div className="rec-panel" initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}>
      <div className="rec-header"><Bot size={14} /> AI Recommendations</div>
      {recs.map((r, i) => (
        <div key={i} className="rec-item" style={{ cursor:'default' }}>
          <div className="rec-dot" style={{ background:r.color }} />
          <span className="rec-text">{r.text}</span>
          <span style={{ fontSize:'0.65rem', fontWeight:700, color:r.color, background:`rgba(${priRgb[r.pri]},0.1)`, padding:'2px 8px', borderRadius:'var(--r-full)', border:`1px solid ${r.color}33`, whiteSpace:'nowrap' }}>
            {r.pri}
          </span>
        </div>
      ))}
    </motion.div>
  );
};

/* ─── Main Dashboard page ─── */
const DashboardPage = ({ summary, history, events, health, loading, riskLevel, lastScan }) => {
  const stats = summary ? [
    { label:'Total Events',  value:summary.total_events,         colorClass:'cyan',  icon:Database  },
    { label:'High Risk',     value:summary.high_risk_events,     colorClass:'red',   icon:ShieldOff },
    { label:'Moderate Risk', value:summary.moderate_risk_events, colorClass:'amber', icon:Activity  },
    { label:'Last Vector',   value:fmtType(summary.last_attack_type), colorClass:'cyan', icon:Layers },
  ] : null;

  return (
    <div className="view-page">
      <HeroBanner riskLevel={riskLevel} lastScan={lastScan} score={health?.security_score??100} />
      <div className="stat-grid">
        {loading||!stats ? [0,1,2,3].map(i=><SkeletonStat key={i}/>) : stats.map((s,i)=><StatCard key={s.label} {...s} index={i}/>)}
      </div>
      <Recommendations riskLevel={riskLevel} events={events} />
      <div className="main-grid">
        <SystemHealth score={health?.security_score??100} riskLevel={riskLevel} eventsTracked={health?.events_tracked} />
        <div className="col-2"><ThreatChart history={history} riskLevel={riskLevel} /></div>
      </div>
      <div className="main-grid">
        <EventFeed events={events} />
        <div className="col-2"><ControlPanel /></div>
      </div>
    </div>
  );
};

/* ─── Root ─── */
const Dashboard = () => {
  const [activeView,     setActiveView]     = useState('dashboard');
  const [summary,        setSummary]        = useState(null);
  const [history,        setHistory]        = useState([]);
  const [events,         setEvents]         = useState([]);
  const [health,         setHealth]         = useState({ security_score:100, risk_level:'Low', events_tracked:0 });
  const [loading,        setLoading]        = useState(true);
  const [wsLive,         setWsLive]         = useState(false);
  const [lastScan,       setLastScan]       = useState('—');
  const [autoSim,        setAutoSim]        = useState(false);
  const [demoMode,       setDemoMode]       = useState(false);
  const [darkMode,       setDarkMode]       = useState(() => localStorage.getItem('ks-theme') !== 'light');
  const [demoLabel,      setDemoLabel]      = useState('');
  const [notifications,  setNotifications]  = useState([]);

  const socketRef  = useRef(null);
  const autoSimRef = useRef(null);

  /* ─── Theme persistence ─── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('ks-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  /* ─── Demo mode ─── */
  useDemoMode(demoMode, setActiveView, setDemoLabel);

  /* Stop demo on any manual click */
  useEffect(() => {
    if (!demoMode) return;
    const stop = () => setDemoMode(false);
    window.addEventListener('mousedown', stop, { capture: false });
    return () => window.removeEventListener('mousedown', stop, { capture: false });
  }, [demoMode]);

  /* ─── Notification push ─── */
  const pushNotif = (ev) => {
    if (!ev?.threat_tier) return;
    const color = ev.threat_tier==='Critical Breach'?'red':ev.threat_tier==='Exploit Attempt'?'amber':'cyan';
    setNotifications(prev => [{
      id:Date.now(), read:false, color,
      message:`${ev.threat_tier}: ${({ buffer_overflow:'Buffer Overflow', trapdoor:'Trapdoor Access', cache_poisoning:'Cache Poisoning' }[ev.type]||ev.type)} detected`,
      ts:Date.now(),
    }, ...prev].slice(0,20));
  };

  /* ─── Data fetch ─── */
  const fetchAll = useCallback(() => {
    Promise.all([
      axios.get('/api/v1/system/summary').then(r=>setSummary(r.data)).catch(()=>{}),
      axios.get('/api/v1/system/health/history').then(r=>setHistory(r.data)).catch(()=>{}),
      axios.get('/api/v1/events/recent').then(r=>setEvents(r.data)).catch(()=>{}),
      axios.get('/api/v1/system/health').then(r=>setHealth(r.data.analysis)).catch(()=>{}),
    ]).finally(()=>{
      setLoading(false);
      setLastScan(new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));
    });
  }, []);

  /* ─── WebSocket ─── */
  const connectWs = useCallback(() => {
    const ws = new WebSocket(`ws://${window.location.hostname}:8000/ws/updates`);
    socketRef.current = ws;
    ws.onopen  = () => setWsLive(true);
    ws.onclose = () => { setWsLive(false); setTimeout(connectWs, 3000); };
    ws.onerror = () => ws.close();
    ws.onmessage = (evt) => {
      try {
        const d = JSON.parse(evt.data);
        if (d.event)         { setEvents(p=>[d.event,...p].slice(0,50)); pushNotif(d.event); }
        if (d.history_point) setHistory(p=>[...p,d.history_point].slice(-120));
        if (d.health)        setHealth(d.health);
        axios.get('/api/v1/system/summary').then(r=>setSummary(r.data)).catch(()=>{});
        setLastScan(new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));
      } catch(_){}
    };
  }, []);

  /* ─── Auto-sim engine ─── */
  useEffect(()=>{
    if (autoSim){
      autoSimRef.current = setInterval(async()=>{
        const id = AUTO_SIM_IDS[Math.floor(Math.random()*AUTO_SIM_IDS.length)];
        try{ await axios.get(`/api/v1/simulate/${id}`); }catch(_){}
      }, 30000);
    } else { clearInterval(autoSimRef.current); }
    return ()=>clearInterval(autoSimRef.current);
  },[autoSim]);

  useEffect(()=>{
    fetchAll();
    const iv = setInterval(fetchAll, REFRESH_MS);
    connectWs();
    return ()=>{ clearInterval(iv); socketRef.current?.close(); };
  },[fetchAll, connectWs]);

  const riskLevel    = health?.risk_level ?? 'Low';
  const criticalEvts = events.filter(e=>e.threat_tier==='Critical Breach').length;

  /* ─── View router ─── */
  const renderView = () => {
    switch (activeView){
      case 'alerts':      return <AlertsView      events={events} />;
      case 'metrics':     return <MetricsView     history={history} summary={summary} events={events} />;
      case 'simulations': return <SimulationsView autoSim={autoSim} onAutoSimChange={setAutoSim} />;
      case 'policies':    return <PoliciesView />;
      case 'settings':    return <SettingsView    autoSim={autoSim} onAutoSimChange={setAutoSim} darkMode={darkMode} onDarkModeChange={setDarkMode} demoMode={demoMode} onDemoModeChange={setDemoMode} />;
      default:            return <DashboardPage   summary={summary} history={history} events={events} health={health} loading={loading} riskLevel={riskLevel} lastScan={lastScan} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar active={activeView} onNavigate={setActiveView} alertCount={criticalEvts} />

      <div className="main-content">
        <Navbar
          healthStatus={riskLevel}
          connected={wsLive}
          lastScan={lastScan}
          notifications={notifications}
          onMarkAllRead={()=>setNotifications(p=>p.map(n=>({...n,read:true})))}
          autoSim={autoSim}
          onAutoSimChange={setAutoSim}
          demoMode={demoMode}
          onDemoModeChange={setDemoMode}
          darkMode={darkMode}
          onDarkModeChange={setDarkMode}
          onNavigate={setActiveView}
        />

        <div className="page-body">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}
              transition={{ duration:0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Demo mode banner */}
      {demoMode && (
        <div className="demo-banner" onClick={()=>setDemoMode(false)}>
          <div className="dot dot-cyan" style={{ animation:'pulse 1.5s ease-in-out infinite' }} />
          AUTO DEMO · {demoLabel || 'Initializing…'}
          <span style={{ opacity:0.6, fontSize:'0.7rem' }}>(click anywhere to stop)</span>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
