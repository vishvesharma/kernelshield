import React, { useState } from 'react';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const INITIAL_POLICIES = [
  { id:'canary',    name: 'Stack Canary Protection',           status:'enabled',  severity:'High',     desc:'Detects buffer overflows by placing canary values on the stack before return addresses.' },
  { id:'aslr',      name: 'Address Space Layout Randomization',status:'enabled',  severity:'High',     desc:'Randomizes memory address layout to prevent exploitation of memory vulnerabilities.' },
  { id:'dns',       name: 'DNS Cache Integrity Checks',        status:'enabled',  severity:'Moderate', desc:'Validates DNS cache entries against known-good signatures before serving responses.' },
  { id:'priv',      name: 'Privilege Escalation Monitor',      status:'enabled',  severity:'Critical', desc:'Monitors and blocks unauthorized attempts to gain elevated system privileges.' },
  { id:'modsign',   name: 'Kernel Module Signing',             status:'disabled', severity:'High',     desc:'Requires cryptographic signatures for all dynamically loaded kernel modules.' },
  { id:'syscall',   name: 'Syscall Audit Logging',             status:'enabled',  severity:'Moderate', desc:'Logs all system calls made by processes for forensic analysis and threat hunting.' },
  { id:'nx',        name: 'Memory Page Execution Guard',       status:'enabled',  severity:'Critical', desc:'Prevents code execution from non-executable memory regions (NX/DEP policy).' },
  { id:'trapdoor',  name: 'Trapdoor Endpoint Scanning',        status:'disabled', severity:'Moderate', desc:'Periodically scans for undocumented entry points in kernel space modules.' },
];

const SEV_COLOR = { Critical: 'var(--red)', High: 'var(--amber)', Moderate: 'var(--cyan)' };

const PolicyToggle = ({ on, onToggle }) => (
  <div className={`policy-toggle ${on ? 'on' : ''}`} onClick={onToggle} role="switch" aria-checked={on}>
    <div className="policy-toggle-thumb" />
  </div>
);

const PoliciesView = () => {
  const [policies, setPolicies] = useState(INITIAL_POLICIES);
  const [toast,    setToast]    = useState(null);

  const toggle = (id) => {
    setPolicies(prev => {
      const next = prev.map(p => p.id === id ? { ...p, status: p.status === 'enabled' ? 'disabled' : 'enabled' } : p);
      const pol  = next.find(p => p.id === id);
      setToast(`${pol.name} ${pol.status === 'enabled' ? 'enabled' : 'disabled'}`);
      setTimeout(() => setToast(null), 2500);
      return next;
    });
  };

  const enabled  = policies.filter(p => p.status === 'enabled').length;
  const disabled = policies.filter(p => p.status === 'disabled').length;

  return (
    <div className="view-page">
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 300,
            background: 'rgba(34,211,165,0.1)', border: '1px solid rgba(34,211,165,0.3)',
            borderRadius: 'var(--r-full)', padding: '10px 20px',
            color: 'var(--green)', fontSize: '0.83rem', fontWeight: 600,
            backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          ✓ {toast}
        </motion.div>
      )}

      <div className="view-header">
        <div>
          <div className="view-title">Security Policies</div>
          <div className="view-subtitle">{enabled} active · {disabled} disabled</div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          <button className="btn btn-cyan" style={{ fontSize: '0.78rem' }}
            onClick={() => setPolicies(p => p.map(x => ({ ...x, status: 'enabled' })))}>
            Enable All
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {policies.map((p, i) => (
          <motion.div
            key={p.id}
            className="policy-card"
            style={{
              borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none',
              borderBottom: i < policies.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              background: 'transparent',
            }}
            whileHover={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--r-sm)', flexShrink: 0,
              background: `rgba(${p.status === 'enabled' ? '34,211,165' : '100,100,120'},0.1)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={18} color={p.status === 'enabled' ? 'var(--green)' : 'var(--text-muted)'} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 3 }}>
                {p.name}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{p.desc}</p>
            </div>

            <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: SEV_COLOR[p.severity] || 'var(--cyan)' }}>
                {p.severity}
              </span>
              <PolicyToggle on={p.status === 'enabled'} onToggle={() => toggle(p.id)} />
            </div>
          </motion.div>
        ))}
      </div>

      {disabled > 0 && (
        <div className="rec-panel">
          <div className="rec-header"><Shield size={14} /> Policy Recommendations</div>
          {policies.filter(p => p.status === 'disabled').map(p => (
            <div key={p.id} className="rec-item">
              <div className="rec-dot" style={{ background: 'var(--amber)' }} />
              <span className="rec-text">
                <strong>{p.name}</strong> is currently disabled — consider enabling for improved kernel protection.
              </span>
              <button
                className="rec-action"
                onClick={() => toggle(p.id)}
                style={{ cursor: 'pointer' }}
              >
                Enable
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PoliciesView;
