import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Wifi, WifiOff, Bell, Activity, User, X, CheckCheck, Play, Square, Sun, Moon } from 'lucide-react';

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

const Dropdown = ({ trigger, children, open, setOpen }) => {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [setOpen]);
  return (
    <div className="dropdown-anchor" ref={ref}>
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>
      {open && <div className="dropdown-panel">{children}</div>}
    </div>
  );
};

const Navbar = ({
  healthStatus, connected, lastScan,
  notifications, onMarkAllRead,
  autoSim, onAutoSimChange,
  demoMode, onDemoModeChange,
  darkMode, onDarkModeChange,
  onNavigate,
}) => {
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isAlert   = healthStatus === 'High';
  const isWarning = healthStatus === 'Moderate';
  const dotClass  = isAlert ? 'dot dot-red' : isWarning ? 'dot dot-amber' : 'dot dot-green';
  const statusLabel = isAlert ? 'THREAT DETECTED' : isWarning ? 'ELEVATED RISK' : 'ALL SYSTEMS NORMAL';
  const unread    = notifications.filter(n => !n.read).length;

  return (
    <div className="topbar">
      {/* Brand */}
      <div className="topbar-brand">
        <ShieldCheck size={22} color="var(--cyan)" strokeWidth={2} />
        <span className="topbar-title">KERNELSHIELD</span>
      </div>

      <div className="topbar-right">
        {/* Status pill */}
        <div className="topbar-status" style={{ cursor: 'default' }}>
          <div className={dotClass} />
          <span>{statusLabel}</span>
        </div>

        {/* WS live pill */}
        <div className="topbar-status" title={connected ? 'Live WebSocket feed' : 'Reconnecting…'} style={{ cursor: 'default' }}>
          {connected ? <Wifi size={13} color="var(--green)" /> : <WifiOff size={13} color="var(--amber)" />}
          <span style={{ color: connected ? 'var(--green)' : 'var(--amber)', fontSize: '0.75rem' }}>
            {connected ? 'LIVE' : 'RECONNECTING'}
          </span>
        </div>

        {/* Dark mode toggle */}
        <button
          className="topbar-icon-btn"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          onClick={() => onDarkModeChange(!darkMode)}
          style={{ color: darkMode ? 'var(--amber)' : 'var(--cyan)' }}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Demo mode toggle */}
        <button
          className="topbar-icon-btn"
          title={demoMode ? 'Stop Auto Demo' : 'Start Auto Demo'}
          onClick={() => onDemoModeChange(!demoMode)}
          style={{
            color: demoMode ? 'var(--red)' : 'var(--text-muted)',
            background: demoMode ? 'rgba(244,63,94,0.1)' : 'transparent',
            border: demoMode ? '1px solid rgba(244,63,94,0.3)' : '1px solid transparent',
            borderRadius: 'var(--r-sm)',
            padding: '6px 10px',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.72rem', fontWeight: 600,
          }}
        >
          {demoMode ? <><Square size={13} /> DEMO</> : <><Play size={13} /> DEMO</>}
        </button>

        {/* Activity (static) */}
        <button className="topbar-icon-btn" title="Activity" style={{ cursor: 'default', opacity: 0.5 }}>
          <Activity size={18} />
        </button>

        {/* Notifications */}
        <Dropdown
          open={notifOpen} setOpen={setNotifOpen}
          trigger={
            <div style={{ position: 'relative' }} data-demo="notif-bell">
              <button className="topbar-icon-btn" title="Notifications">
                <Bell size={18} />
              </button>
              {unread > 0 && <span className="badge-count">{unread > 9 ? '9+' : unread}</span>}
            </div>
          }
        >
          <div className="dropdown-header">
            <span className="dropdown-title">Notifications</span>
            {unread > 0 && (
              <button onClick={onMarkAllRead} style={{
                background: 'none', border: 'none', color: 'var(--cyan)',
                fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {notifications.length === 0
              ? <div style={{ padding: 'var(--sp-5)', color: 'var(--text-muted)', fontSize: '0.83rem', textAlign: 'center' }}>No notifications</div>
              : notifications.map(n => (
                <div key={n.id} className={`notif-item unread-${n.color || 'red'}`} style={{ opacity: n.read ? 0.5 : 1 }}>
                  <p className="notif-text">{n.message}</p>
                  <p className="notif-time">{timeAgo(n.ts)}</p>
                </div>
              ))
            }
          </div>
        </Dropdown>

        {/* Profile */}
        <Dropdown
          open={profileOpen} setOpen={setProfileOpen}
          trigger={<div className="avatar" style={{ cursor: 'pointer' }}><User size={16} /></div>}
        >
          <div className="dropdown-header">
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>SOC Analyst</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>analyst@kernelshield.io</div>
            </div>
          </div>
          <div className="dropdown-item" onClick={() => { onNavigate('settings'); setProfileOpen(false); }}>⚙ Account Settings</div>
          <div className="dropdown-item" style={{ cursor: 'default', opacity: 0.5 }}>🔒 Change Password</div>
          <div className="dropdown-item" onClick={() => { onNavigate('alerts'); setProfileOpen(false); }}>📋 Activity Log</div>
          <div className="dropdown-item danger" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <X size={14} /> Sign Out
          </div>
        </Dropdown>
      </div>
    </div>
  );
};

export default Navbar;
