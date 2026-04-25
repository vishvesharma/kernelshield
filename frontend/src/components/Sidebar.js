import React from 'react';
import { LayoutDashboard, AlertTriangle, BarChart3, Shield, Terminal, Settings, Zap } from 'lucide-react';

const NAV = [
  { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard',   demo: 'dashboard-tab'   },
  { id: 'alerts',      icon: AlertTriangle,   label: 'Alerts',      demo: 'alerts-tab'      },
  { id: 'metrics',     icon: BarChart3,       label: 'Metrics',     demo: 'metrics-tab'     },
  { id: 'simulations', icon: Terminal,        label: 'Simulations', demo: 'sims-tab'        },
  { id: 'policies',    icon: Shield,          label: 'Policies',    demo: 'policies-tab'    },
];

const Sidebar = ({ active, onNavigate, alertCount }) => (
  <div className="sidebar">
    <div className="sidebar-logo">
      <Zap size={20} color="var(--cyan)" strokeWidth={2.5} />
      <span className="sidebar-logo-text">KERNEL</span>
    </div>

    <span className="sidebar-section-label">Navigation</span>
    <nav className="sidebar-nav">
      {NAV.map(({ id, icon: Icon, label, demo }) => (
        <div
          key={id}
          className={`sidebar-item${active === id ? ' active' : ''}`}
          onClick={() => onNavigate(id)}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onNavigate(id)}
          data-demo={demo}
        >
          <Icon size={18} strokeWidth={active === id ? 2.5 : 2} />
          <span>{label}</span>
          {id === 'alerts' && alertCount > 0 && (
            <span style={{
              marginLeft: 'auto', background: 'var(--red)', color: '#fff',
              fontSize: '0.62rem', fontWeight: 700,
              padding: '1px 6px', borderRadius: 'var(--r-full)',
            }}>{alertCount > 9 ? '9+' : alertCount}</span>
          )}
        </div>
      ))}
    </nav>

    <span className="sidebar-section-label">System</span>
    <nav style={{ padding: '0 var(--sp-3) var(--sp-3)' }}>
      <div
        className={`sidebar-item${active === 'settings' ? ' active' : ''}`}
        onClick={() => onNavigate('settings')}
        role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onNavigate('settings')}
        data-demo="settings-tab"
      >
        <Settings size={18} strokeWidth={active === 'settings' ? 2.5 : 2} />
        <span>Settings</span>
      </div>
    </nav>

    <div className="sidebar-footer">
      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
        v1.0.0 · SOC Platform
      </div>
    </div>
  </div>
);

export default Sidebar;
