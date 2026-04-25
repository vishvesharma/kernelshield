import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ShieldOff, Cpu, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import SimConfirmModal from '../modals/SimConfirmModal';

const SIMS = [
  { id:'buffer',   label:'Buffer Overflow',  icon:Terminal, color:'var(--amber)', rgb:'245,158,11', tag:'Most Common',  desc:'Tests stack boundary protection against oversized payload injection.' },
  { id:'trapdoor', label:'Trapdoor Access',  icon:ShieldOff,color:'var(--red)',   rgb:'244,63,94',  tag:'High Risk',    desc:'Simulates unauthorized admin session via hidden entry-point activation.' },
  { id:'cache',    label:'Cache Poisoning',  icon:Cpu,      color:'var(--cyan)',  rgb:'0,229,255',  tag:'Recommended',  desc:'Injects a malicious record into the DNS/memory cache layer.' },
];

const LOG_TEMPLATES = {
  buffer:   ['[INFO]  Initializing buffer overflow payload…', '[WARN]  Stack boundary exceeded by 0x2F4 bytes', '[ALERT] Memory corruption detected in kernel heap', '[INFO]  Detection pipeline triggered', '[OK]    Event logged to threat database'],
  trapdoor: ['[INFO]  Scanning for hidden entry-points…', '[WARN]  Unauthorized session attempt detected', '[ALERT] Privilege escalation blocked at ring-0', '[INFO]  Access denied — credentials invalid', '[OK]    Event logged to threat database'],
  cache:    ['[INFO]  Attempting DNS cache injection…', '[WARN]  Malformed record detected in cache write', '[ALERT] Integrity check failed — record rejected', '[INFO]  Cache flushed and restored', '[OK]    Event logged to threat database'],
};

const SimulationsView = ({ autoSim, onAutoSimChange }) => {
  const [pending,   setPending]   = useState(null);
  const [running,   setRunning]   = useState(null);
  const [logs,      setLogs]      = useState([]);
  const [history,   setHistory]   = useState([]);

  const fire = async (id) => {
    setRunning(id);
    setLogs([]);
    // Simulate log output line by line
    const lines = LOG_TEMPLATES[id] || [];
    for (let i = 0; i < lines.length; i++) {
      await new Promise(r => setTimeout(r, 350));
      setLogs(prev => [...prev, lines[i]]);
    }
    try {
      await axios.get(`/api/v1/simulate/${id}`);
      setHistory(prev => [{ id, ts: Date.now(), status:'success' }, ...prev].slice(0, 20));
    } catch {
      setHistory(prev => [{ id, ts: Date.now(), status:'error' }, ...prev].slice(0, 20));
      setLogs(prev => [...prev, '[ERR]   Backend unreachable — simulation may not have logged.']);
    }
    setRunning(null);
  };

  return (
    <div className="view-page">
      <div className="view-header">
        <div>
          <div className="view-title">Attack Simulations</div>
          <div className="view-subtitle">Controlled environment only — all events are logged</div>
        </div>
        {/* Auto-sim toggle */}
        <div className="flex items-center gap-3">
          <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>Auto-Simulation</span>
          <div
            className={`toggle-switch ${autoSim ? 'on' : ''}`}
            onClick={() => onAutoSimChange(!autoSim)}
            style={{ cursor:'pointer' }}
          >
            <div className="toggle-track"><div className="toggle-thumb" /></div>
            <span>{autoSim ? 'RUNNING PERIODICALLY' : 'MANUAL ONLY'}</span>
          </div>
        </div>
      </div>

      {/* Sim cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'var(--sp-4)' }}>
        {SIMS.map(sim => {
          const Icon = sim.icon;
          const isRunning = running === sim.id;
          return (
            <motion.div key={sim.id} className="card flex-col" style={{ gap:'var(--sp-4)' }}
              whileHover={{ borderColor:`rgba(${sim.rgb},0.35)`, y:-2 }}
            >
              <div className="flex items-center justify-between">
                <div style={{ width:38, height:38, borderRadius:'var(--r-sm)', background:`rgba(${sim.rgb},0.12)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={20} color={sim.color} />
                </div>
                <span style={{ fontSize:'0.65rem', fontWeight:700, padding:'3px 8px', borderRadius:'var(--r-full)', background:`rgba(${sim.rgb},0.1)`, color:sim.color, border:`1px solid rgba(${sim.rgb},0.25)` }}>
                  {sim.tag}
                </span>
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:'0.9rem', color:'var(--text-primary)', marginBottom:6 }}>{sim.label}</div>
                <p style={{ fontSize:'0.76rem', color:'var(--text-muted)', lineHeight:1.55 }}>{sim.desc}</p>
              </div>
              <motion.button
                className="btn btn-cyan" style={{ width:'100%', justifyContent:'center', marginTop:'auto' }}
                disabled={!!running}
                whileTap={{ scale: 0.97 }}
                onClick={() => setPending(sim.id)}
              >
                {isRunning ? <><div className="spinner" /> Running…</> : <><Zap size={14} /> Launch Test</>}
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Console output */}
      {logs.length > 0 && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
          <div className="card-label mb-2" style={{ marginBottom:8 }}>Simulation Output</div>
          <div className="sim-console">
            {logs.map((l, i) => (
              <div key={i} className={l.includes('[ERR]') ? 'log-err' : l.includes('[WARN]') || l.includes('[ALERT]') ? 'log-warn' : l.includes('[OK]') ? '' : 'log-info'}>
                {l}
              </div>
            ))}
            {running && <div className="log-info">▋</div>}
          </div>
        </motion.div>
      )}

      {/* Run history */}
      {history.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-label">Run History</span></div>
          {history.map((h, i) => {
            const sim = SIMS.find(s => s.id === h.id);
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'var(--sp-3)', padding:'var(--sp-3) 0', borderBottom: i<history.length-1?'1px solid var(--border-subtle)':'none' }}>
                {h.status==='success' ? <CheckCircle size={16} color="var(--green)" /> : <AlertTriangle size={16} color="var(--red)" />}
                <span style={{ fontSize:'0.83rem', color:'var(--text-secondary)' }}>{sim?.label}</span>
                <span style={{ marginLeft:'auto', fontSize:'0.7rem', color:'var(--text-muted)' }}>
                  {new Date(h.ts).toLocaleTimeString()}
                </span>
                <span style={{ fontSize:'0.7rem', color: h.status==='success'?'var(--green)':'var(--red)', fontWeight:600 }}>
                  {h.status==='success'?'Completed':'Failed'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <SimConfirmModal simId={pending} onConfirm={() => fire(pending)} onClose={() => setPending(null)} />
    </div>
  );
};

export default SimulationsView;
