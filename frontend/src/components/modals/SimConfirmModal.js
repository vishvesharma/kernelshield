import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Zap } from 'lucide-react';

const DETAILS = {
  buffer:  {
    title:   'Buffer Overflow Attack',
    desc:    'Injects a payload larger than the allocated buffer, corrupting adjacent kernel memory. Used to test stack protection mechanisms.',
    outcome: 'Generates a High or Moderate severity event depending on overflow ratio.',
    color:   'var(--amber)',
  },
  trapdoor: {
    title:   'Trapdoor Access Attempt',
    desc:    'Simulates a hidden entry-point activation with elevated privilege escalation. Tests authentication bypass detection.',
    outcome: 'Generates a High severity event if unauthorized admin access is detected.',
    color:   'var(--red)',
  },
  cache:   {
    title:   'Cache Poisoning Injection',
    desc:    'Injects a malicious record into the DNS/memory cache layer to corrupt downstream lookups. Tests cache integrity checks.',
    outcome: 'Generates a Moderate severity event if a corrupted entry is detected.',
    color:   'var(--cyan)',
  },
};

const SimConfirmModal = ({ simId, onConfirm, onClose }) => {
  if (!simId) return null;
  const d = DETAILS[simId] || {};

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-box"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
        >
          <button className="modal-close" onClick={onClose}><X size={14} /></button>

          {/* Warning icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--r-md)',
              background: 'rgba(245,158,11,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={20} color="var(--amber)" />
            </div>
            <div>
              <div className="modal-title">{d.title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Controlled environment simulation</div>
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: '0.87rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 'var(--sp-5)' }}>
            {d.desc}
          </p>

          {/* Expected outcome */}
          <div style={{
            background: 'rgba(0,229,255,0.04)',
            border: '1px solid rgba(0,229,255,0.12)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--sp-4)',
            marginBottom: 'var(--sp-6)',
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Expected Outcome
            </div>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {d.outcome}
            </p>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button className="btn btn-amber" style={{ borderColor: 'transparent', background: 'rgba(245,158,11,0.12)' }} onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-cyan" onClick={() => { onConfirm(); onClose(); }}>
              <Zap size={14} /> Launch Simulation
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SimConfirmModal;
