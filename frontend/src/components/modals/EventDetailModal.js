import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Clock, Shield, Activity } from 'lucide-react';

const IMPACT_MAP = {
  buffer_overflow:  'Memory corruption risk — kernel stack may be overwritten, enabling arbitrary code execution.',
  trapdoor:         'Unauthorized persistence risk — elevated session could allow backdoor installation.',
  cache_poisoning:  'Data integrity risk — DNS/cache records poisoned; clients may receive malicious responses.',
};

const REMEDIATION = {
  buffer_overflow:  'Enable ASLR and stack canaries. Enforce strict input validation at all entry points.',
  trapdoor:         'Revoke elevated session. Audit source code for hidden entry points. Enforce MFA.',
  cache_poisoning:  'Flush affected cache entries. Implement DNSSEC. Validate all cache write operations.',
};

const FMT = {
  buffer_overflow: 'Buffer Overflow',
  trapdoor:        'Trapdoor Access',
  cache_poisoning: 'Cache Poisoning',
};

const tierColor = {
  'Critical Breach': 'var(--red)',
  'Exploit Attempt': 'var(--amber)',
  'Suspicious':      'var(--green)',
  'Informational':   'var(--cyan)',
};

const EventDetailModal = ({ event, onClose }) => {
  if (!event) return null;

  const color = tierColor[event.threat_tier] || 'var(--cyan)';
  const sev   = event.severity_score?.toFixed(1) ?? event.severity ?? '—';
  const conf  = event.confidence != null ? Math.round(event.confidence * 100) : null;

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

          {/* Header */}
          <div className="flex items-center gap-3 mb-4" style={{ marginBottom: 'var(--sp-5)' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--r-md)',
              background: `rgba(${color === 'var(--red)' ? '244,63,94' : color === 'var(--amber)' ? '245,158,11' : '0,229,255'}, 0.12)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={20} color={color} />
            </div>
            <div>
              <div className="modal-title">{FMT[event.type] || event.type}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {event.threat_tier || 'Unknown tier'}
              </div>
            </div>
          </div>

          {/* Detail rows */}
          <div style={{ marginBottom: 'var(--sp-5)' }}>
            {[
              { label: 'Severity Score', value: sev, icon: Shield },
              { label: 'Confidence',     value: conf != null ? `${conf}%` : '—', icon: Activity },
              { label: 'Detected At',    value: new Date(event.timestamp).toLocaleString(), icon: Clock },
              { label: 'Impact',         value: event.impact || '—', icon: AlertTriangle },
              { label: 'Risk Level',     value: event.risk_level || '—', icon: Shield },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="modal-detail-row">
                <span className="modal-detail-label flex items-center gap-2">
                  <Icon size={13} /> {label}
                </span>
                <span className="modal-detail-value" style={{
                  color: label === 'Severity Score' ? color : undefined,
                }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Impact description */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--sp-4)',
            marginBottom: 'var(--sp-5)',
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Impact Assessment
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {IMPACT_MAP[event.type] || 'No detailed impact data available for this event type.'}
            </p>
          </div>

          {/* Remediation */}
          <div style={{
            background: 'rgba(34,211,165,0.04)',
            border: '1px solid rgba(34,211,165,0.15)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--sp-4)',
            marginBottom: 'var(--sp-5)',
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Recommended Remediation
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {REMEDIATION[event.type] || 'Investigate further and consult your security playbook.'}
            </p>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button className="btn btn-cyan" onClick={onClose}>Acknowledge</button>
            <button className="btn btn-red" onClick={onClose}>Mark Resolved</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EventDetailModal;
