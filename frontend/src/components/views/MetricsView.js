import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingDown, Database, ShieldOff, Activity } from 'lucide-react';

const COLORS = { High: 'var(--red)', Moderate: 'var(--amber)', Low: 'var(--green)' };

const MetricBox = ({ label, value, color, sub, icon: Icon }) => (
  <motion.div className="card" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} style={{ cursor:'default' }}>
    <div className="flex items-center justify-between mb-3">
      <span className="card-label">{label}</span>
      <div style={{ width:32, height:32, borderRadius:'var(--r-sm)', background:`rgba(${color===COLORS.High?'244,63,94':color===COLORS.Low?'34,211,165':'245,158,11'},0.12)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={16} color={color} />
      </div>
    </div>
    <div style={{ fontFamily:'var(--font-heading)', fontSize:'2rem', fontWeight:700, color, textShadow:`0 0 16px ${color}55` }}>{value}</div>
    <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:6 }}>{sub}</div>
  </motion.div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const s = payload[0].value;
  const c = s>=80?'var(--green)':s>=50?'var(--amber)':'var(--red)';
  return (
    <div style={{ background:'rgba(11,15,25,0.95)', border:`1px solid ${c}`, borderRadius:8, padding:'10px 14px' }}>
      <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:3 }}>{label}</p>
      <p style={{ fontWeight:700, color:c, fontSize:'0.95rem' }}>Score {s}</p>
      <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:2 }}>
        {s>=80?'System healthy':s>=50?'Elevated risk':'Critical state'}
      </p>
    </div>
  );
};

const MetricsView = ({ history, summary, events }) => {
  const chartData = history.map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
    score: h.score,
  }));

  const typeCounts = events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  const barData = Object.entries(typeCounts).map(([k,v]) => ({
    name: { buffer_overflow:'Buffer', trapdoor:'Trapdoor', cache_poisoning:'Cache' }[k] || k,
    count: v,
  }));

  const latest = chartData.at(-1)?.score ?? 100;
  const lineColor = latest>=80?'#22d3a5':latest>=50?'#f59e0b':'#f43f5e';

  return (
    <div className="view-page">
      <div className="view-header">
        <div>
          <div className="view-title">Metrics & Analytics</div>
          <div className="view-subtitle">Real-time system telemetry · {history.length} data points collected</div>
        </div>
      </div>

      {/* Top stats */}
      <div className="metrics-grid">
        <MetricBox label="Total Events"   value={summary?.total_events ?? 0}          color="var(--cyan)"  sub="All recorded kernel events"    icon={Database}  />
        <MetricBox label="High Risk"      value={summary?.high_risk_events ?? 0}       color="var(--red)"   sub="Require immediate action"       icon={ShieldOff} />
        <MetricBox label="Moderate Risk"  value={summary?.moderate_risk_events ?? 0}   color="var(--amber)" sub="Review recommended"              icon={Activity}  />
      </div>

      {/* Timeline */}
      <div className="card flex-col" style={{ minHeight: 300 }}>
        <div className="card-header">
          <span className="card-label flex items-center gap-2"><TrendingDown size={13} color={lineColor} /> Security Score Timeline</span>
          <span className="text-xs text-muted">0 = Critical · 100 = Fully Secure</span>
        </div>
        <div style={{ flex:1, minHeight:220 }}>
          {chartData.length === 0
            ? <div className="empty-state"><p>No history yet</p></div>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top:8, right:4, left:-24, bottom:0 }}>
                  <defs>
                    <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="time" stroke="transparent" tick={{ fill:'var(--text-muted)', fontSize:10 }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis domain={[0,100]} stroke="transparent" tick={{ fill:'var(--text-muted)', fontSize:10 }} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke:'rgba(255,255,255,0.08)' }} />
                  <Area type="monotone" dataKey="score" stroke={lineColor} strokeWidth={2} fill="url(#mg)" dot={false} activeDot={{ r:5, fill:lineColor, stroke:'#fff', strokeWidth:2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>

      {/* Event type bar chart */}
      {barData.length > 0 && (
        <div className="card" style={{ minHeight: 200 }}>
          <div className="card-header">
            <span className="card-label">Events by Attack Vector</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} margin={{ top:8, right:4, left:-24, bottom:0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" stroke="transparent" tick={{ fill:'var(--text-muted)', fontSize:11 }} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill:'var(--text-muted)', fontSize:11 }} tickLine={false} />
              <Tooltip contentStyle={{ background:'#141c2e', border:'1px solid var(--border-strong)', borderRadius:8, fontSize:'0.82rem' }} />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={['#f43f5e','#f59e0b','#00e5ff'][i % 3]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default MetricsView;
