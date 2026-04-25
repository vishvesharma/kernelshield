import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Filter } from 'lucide-react';
import EventDetailModal from '../modals/EventDetailModal';

const TIERS = ['All', 'Critical Breach', 'Exploit Attempt', 'Suspicious', 'Informational'];
const TYPES = { buffer_overflow: 'Buffer Overflow', trapdoor: 'Trapdoor Access', cache_poisoning: 'Cache Poisoning' };
const DESCS = {
  buffer_overflow: 'Stack smash via oversized payload — memory boundary violated.',
  trapdoor:        'Hidden entry-point triggered with elevated privileges.',
  cache_poisoning: 'Malicious DNS/cache record injected — integrity check failed.',
};
const tierBg = { 'Critical Breach': 'badge badge-red', 'Exploit Attempt': 'badge badge-amber', 'Suspicious': 'badge badge-green', 'Informational': 'badge badge-cyan' };

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const AlertsView = ({ events }) => {
  const [filter,    setFilter]    = useState('All');
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);

  const visible = events.filter(e => {
    const matchTier = filter === 'All' || e.threat_tier === filter;
    const matchSearch = !search || (TYPES[e.type] || e.type).toLowerCase().includes(search.toLowerCase());
    return matchTier && matchSearch;
  });

  return (
    <div className="view-page">
      <div className="view-header">
        <div>
          <div className="view-title">Alert Log</div>
          <div className="view-subtitle">{events.length} total events · {events.filter(e=>e.threat_tier==='Critical Breach').length} critical</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Search events…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {TIERS.map(t => (
          <button key={t} className={`filter-chip ${filter===t?'active':''}`} onClick={() => setFilter(t)}>{t}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {visible.length === 0 ? (
          <div className="empty-state" style={{ minHeight: 200 }}>
            <div className="empty-icon"><ShieldAlert size={22} color="var(--text-muted)" /></div>
            <p>No matching alerts</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Try adjusting your filters</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th><th>Description</th><th>Severity</th><th>Tier</th><th>Time</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {visible.map((ev, i) => (
                  <motion.tr key={`${ev.timestamp}-${i}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ cursor: 'pointer' }} onClick={() => setSelected(ev)}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{TYPES[ev.type] || ev.type}</td>
                    <td style={{ maxWidth: 260 }}>{DESCS[ev.type] || '—'}</td>
                    <td>{ev.severity_score?.toFixed(1) ?? ev.severity ?? '—'}</td>
                    <td>{ev.threat_tier && <span className={tierBg[ev.threat_tier] || 'badge badge-cyan'}>{ev.threat_tier}</span>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{timeAgo(ev.timestamp)}</td>
                    <td>
                      <button className="btn btn-cyan" style={{ padding: '4px 12px', fontSize: '0.72rem' }}
                        onClick={e => { e.stopPropagation(); setSelected(ev); }}>
                        Investigate
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {selected && <EventDetailModal event={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default AlertsView;
