import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, ShieldOff, Cpu, Zap, Info } from 'lucide-react';
import axios from 'axios';
import SimConfirmModal from './modals/SimConfirmModal';

const SIMULATIONS = [
  {
    id:    'buffer',
    label: 'Buffer Overflow',
    desc:  'Tests resilience against oversized payload injection that corrupts kernel stack memory.',
    icon:  Terminal,
    color: 'var(--amber)',
    colorRgb: '245,158,11',
    tag:   'Most Common',
    btnClass: 'btn-amber',
  },
  {
    id:    'trapdoor',
    label: 'Trapdoor Access',
    desc:  'Simulates hidden entry-point activation with unauthorized admin privilege escalation.',
    icon:  ShieldOff,
    color: 'var(--red)',
    colorRgb: '244,63,94',
    tag:   'High Risk',
    btnClass: 'btn-red',
  },
  {
    id:    'cache',
    label: 'Cache Poisoning',
    desc:  'Injects a malicious record into the DNS/cache layer to corrupt downstream lookups.',
    icon:  Cpu,
    color: 'var(--cyan)',
    colorRgb: '0,229,255',
    tag:   'Recommended',
    btnClass: 'btn-cyan',
  },
];

const SimCard = ({ sim, onLaunch }) => {
  const Icon = sim.icon;
  return (
    <motion.div
      className="card flex-col"
      style={{ gap: 'var(--sp-4)', cursor: 'default' }}
      whileHover={{ borderColor: `rgba(${sim.colorRgb},0.35)`, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--r-sm)',
          background: `rgba(${sim.colorRgb},0.12)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={sim.color} strokeWidth={2} />
        </div>
        <span style={{
          fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.07em',
          padding: '3px 8px', borderRadius: 'var(--r-full)',
          background: `rgba(${sim.colorRgb},0.1)`,
          color: sim.color, border: `1px solid rgba(${sim.colorRgb},0.25)`,
        }}>
          {sim.tag}
        </span>
      </div>

      {/* Label + desc */}
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 6 }}>
          {sim.label}
        </div>
        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{sim.desc}</p>
      </div>

      {/* Launch */}
      <motion.button
        className={`btn ${sim.btnClass}`}
        style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onLaunch(sim.id)}
      >
        <Zap size={14} /> Launch Test
      </motion.button>
    </motion.div>
  );
};

const ControlPanel = () => {
  const [pendingId, setPendingId]  = useState(null);
  const [lastFired, setLastFired]  = useState(null);

  const handleConfirm = async () => {
    if (!pendingId) return;
    try {
      await axios.get(`/api/v1/simulate/${pendingId}`);
      setLastFired(pendingId);
      setTimeout(() => setLastFired(null), 4000);
    } catch (e) { console.error(e); }
  };

  return (
    <>
      <motion.div className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="card-header">
          <span className="card-label flex items-center gap-2">
            <Zap size={13} color="var(--amber)" />
            Attack Simulations
          </span>
          <span className="flex items-center gap-1" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <Info size={12} /> Controlled environment only
          </span>
        </div>

        {lastFired && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'rgba(34,211,165,0.06)',
              border: '1px solid rgba(34,211,165,0.2)',
              borderRadius: 'var(--r-md)',
              padding: 'var(--sp-3) var(--sp-4)',
              marginBottom: 'var(--sp-4)',
              fontSize: '0.8rem', color: 'var(--green)',
            }}
          >
            ✓ Simulation launched — check the event feed for results.
          </motion.div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--sp-4)' }}>
          {SIMULATIONS.map(sim => (
            <SimCard key={sim.id} sim={sim} onLaunch={setPendingId} />
          ))}
        </div>
      </motion.div>

      <SimConfirmModal
        simId={pendingId}
        onConfirm={handleConfirm}
        onClose={() => setPendingId(null)}
      />
    </>
  );
};

export default ControlPanel;
