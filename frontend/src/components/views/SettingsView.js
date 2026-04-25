import React, { useState } from 'react';

const SettingToggle = ({ label, desc, value, onChange }) => (
  <div className="setting-row">
    <div style={{ flex: 1 }}>
      <div className="setting-label">{label}</div>
      <div className="setting-desc">{desc}</div>
    </div>
    <div
      className={`toggle-switch ${value ? 'on' : ''}`}
      onClick={() => onChange(!value)}
      style={{ flexShrink: 0, cursor: 'pointer' }}
      role="switch"
      aria-checked={value}
    >
      <div className="toggle-track"><div className="toggle-thumb" /></div>
    </div>
  </div>
);

const SettingsView = ({ autoSim, onAutoSimChange, darkMode, onDarkModeChange, demoMode, onDemoModeChange }) => {
  const [notifCritical, setNotifCritical] = useState(true);
  const [notifModerate, setNotifModerate] = useState(true);
  const [wsSounds,      setWsSounds]      = useState(false);
  const [simInterval,   setSimInterval]   = useState(30);
  const [saved,         setSaved]         = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="view-page">
      <div className="view-header">
        <div>
          <div className="view-title">Settings</div>
          <div className="view-subtitle">Configure detection behaviour and UI preferences</div>
        </div>
        <button className="btn btn-cyan" style={{ fontSize: '0.8rem' }} onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      {/* Appearance */}
      <div className="card">
        <div className="card-header"><span className="card-label">Appearance</span></div>
        <SettingToggle
          label="Dark Mode"
          desc="Use the dark SOC theme (recommended for prolonged monitoring sessions)."
          value={darkMode}
          onChange={onDarkModeChange}
        />
      </div>

      {/* Demo & Simulation */}
      <div className="card">
        <div className="card-header"><span className="card-label">Demo & Simulation</span></div>
        <SettingToggle
          label="Auto Demo Mode"
          desc="Scripted cursor walkthrough showcasing all dashboard features automatically."
          value={demoMode}
          onChange={onDemoModeChange}
        />
        <SettingToggle
          label="Auto-Simulation Mode"
          desc="Automatically run attack simulations at a set interval to stress-test detection pipelines."
          value={autoSim}
          onChange={onAutoSimChange}
        />
        {autoSim && (
          <div className="setting-row">
            <div style={{ flex: 1 }}>
              <div className="setting-label">Simulation Interval</div>
              <div className="setting-desc">How often to run automatic simulations</div>
            </div>
            <div className="flex items-center gap-3">
              {[15, 30, 60, 120].map(v => (
                <button
                  key={v}
                  onClick={() => setSimInterval(v)}
                  style={{
                    padding: '6px 14px', borderRadius: 'var(--r-full)',
                    border: `1px solid ${simInterval === v ? 'var(--cyan)' : 'var(--border-subtle)'}`,
                    background: simInterval === v ? 'var(--cyan-dim)' : 'transparent',
                    color: simInterval === v ? 'var(--cyan)' : 'var(--text-muted)',
                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {v}s
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="card-header"><span className="card-label">Notifications</span></div>
        <SettingToggle
          label="Critical Breach Alerts"
          desc="Receive notifications for Critical Breach tier events."
          value={notifCritical}
          onChange={setNotifCritical}
        />
        <SettingToggle
          label="Moderate Risk Alerts"
          desc="Receive notifications for Exploit Attempt and Suspicious events."
          value={notifModerate}
          onChange={setNotifModerate}
        />
        <SettingToggle
          label="Alert Sounds"
          desc="Play a subtle sound when new threat events arrive."
          value={wsSounds}
          onChange={setWsSounds}
        />
      </div>

      {/* System Info */}
      <div className="card" style={{ cursor: 'default' }}>
        <div className="card-header"><span className="card-label">System Information</span></div>
        {[
          ['Platform',   'KernelShield SOC Dashboard'],
          ['Version',    'v1.0.0-rc'],
          ['AI Engine',  'KernelShield Detect v1.0'],
          ['Backend',    'FastAPI + SQLite'],
          ['WebSocket',  `ws://${window.location.hostname}:8000/ws/updates`],
          ['Theme',      darkMode ? 'Dark Mode' : 'Light Mode'],
          ['Auto Demo',  demoMode ? 'Active' : 'Off'],
        ].map(([k, v]) => (
          <div key={k} className="modal-detail-row">
            <span className="modal-detail-label">{k}</span>
            <span className="modal-detail-value" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsView;
