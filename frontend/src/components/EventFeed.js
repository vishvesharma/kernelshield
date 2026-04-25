import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, ShieldAlert, Filter } from 'lucide-react';
import EventDetailModal from './modals/EventDetailModal';

const TIER_ORDER = { 'Critical Breach': 0, 'Exploit Attempt': 1, 'Suspicious': 2, 'Informational': 3 };

const tierBadge = (tier) => ({
  'Critical Breach': 'badge badge-red',
  'Exploit Attempt': 'badge badge-amber',
  'Suspicious':      'badge badge-green',
  'Informational':   'badge badge-cyan',
}[tier] || 'badge badge-cyan');

const FMT = { buffer_overflow: 'Buffer Overflow', trapdoor: 'Trapdoor Access', cache_poisoning: 'Cache Poisoning' };

const DESCS = {
  buffer_overflow: 'Stack smash via oversized payload — memory boundary violated.',
  trapdoor:        'Hidden entry-point triggered with elevated privileges.',
  cache_poisoning: 'Malicious DNS/cache record injected — integrity check failed.',
};

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 5)  return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const SeverityDot = ({ tier }) => {
  const c = { 'Critical Breach': 'var(--red)', 'Exploit Attempt': 'var(--amber)', 'Suspicious': 'var(--green)' }[tier] || 'var(--cyan)';
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}`, flexShrink: 0 }} />;
};

const EventRow = ({ ev, onClick }) => (
  <motion.div
    className="event-row-clickable"
    onClick={() => onClick(ev)}
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 12 }}
    layout
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <SeverityDot tier={ev.threat_tier} />
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {FMT[ev.type] || ev.type}
        </span>
      </div>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{timeAgo(ev.timestamp)}</span>
    </div>

    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>{DESCS[ev.type]}</p>

    <div className="flex items-center gap-2" style={{ marginTop: 2 }}>
      {ev.threat_tier && <span className={tierBadge(ev.threat_tier)}>{ev.threat_tier}</span>}
      {ev.confidence != null && (
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {Math.round(ev.confidence * 100)}% conf
        </span>
      )}
      <span style={{ fontSize: '0.68rem', color: 'var(--cyan)', marginLeft: ev.confidence == null ? 'auto' : 0 }}>
        Investigate →
      </span>
    </div>
  </motion.div>
);

const EventFeed = ({ events }) => {
  const [selected,  setSelected]  = useState(null);
  const [filter,    setFilter]    = useState('all');
  const [sortBySev, setSortBySev] = useState(false);

  const FILTERS = ['all', 'Critical Breach', 'Exploit Attempt', 'Suspicious'];

  const filtered = events
    .filter(e => filter === 'all' || e.threat_tier === filter)
    .sort((a, b) => sortBySev
      ? (TIER_ORDER[a.threat_tier] ?? 9) - (TIER_ORDER[b.threat_tier] ?? 9)
      : 0
    );

  return (
    <>
      <motion.div className="card flex-col" style={{ height: 460 }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {/* Header */}
        <div className="card-header">
          <span className="card-label flex items-center gap-2">
            <Radio size={13} color="var(--cyan)" />
            Live Threat Feed
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSortBySev(v => !v)}
              title="Sort by severity"
              style={{
                background: sortBySev ? 'var(--cyan-dim)' : 'transparent',
                border: `1px solid ${sortBySev ? 'var(--cyan)' : 'var(--border-subtle)'}`,
                color: sortBySev ? 'var(--cyan)' : 'var(--text-muted)',
                borderRadius: 'var(--r-sm)', padding: '4px 10px',
                fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all var(--ease-fast)', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Filter size={11} /> Severity
            </button>
            <div className="flex items-center gap-2">
              <div className="dot dot-cyan" />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{events.length}</span>
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2" style={{ marginBottom: 'var(--sp-3)', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              className={`filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><ShieldAlert size={22} color="var(--text-muted)" /></div>
              <p>{filter === 'all' ? 'No threats detected' : `No "${filter}" events`}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {filter === 'all' ? 'Run a simulation to generate events' : 'Try a different filter'}
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map((ev, i) => (
                <EventRow key={`${ev.timestamp}-${i}`} ev={ev} onClick={setSelected} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>

      {selected && (
        <EventDetailModal event={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
};

export default EventFeed;
