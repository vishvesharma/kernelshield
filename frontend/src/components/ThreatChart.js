import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingDown } from 'lucide-react';

/* ─── Custom tooltip ─── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value;
  const color = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{
      background: 'rgba(11,15,25,0.92)',
      border: `1px solid ${color}`,
      borderRadius: 8,
      padding: '10px 14px',
      boxShadow: `0 0 16px rgba(0,0,0,0.6)`,
    }}>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: '0.95rem', fontWeight: 700, color, fontFamily: 'var(--font-heading)' }}>
        Health&nbsp;{score}
      </p>
    </div>
  );
};

/* ─── Stroke color derived from latest score ─── */
const scoreColor = (score) =>
  score >= 80 ? '#22d3a5' : score >= 50 ? '#f59e0b' : '#f43f5e';

const ThreatChart = ({ history, riskLevel }) => {
  const data = history.map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    score: h.score,
  }));

  const latest = data.at(-1)?.score ?? 100;
  const color = scoreColor(latest);

  return (
    <motion.div
      className="card flex-col h-full"
      style={{ minHeight: 280 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Header */}
      <div className="card-header">
        <span className="card-label flex items-center gap-2">
          <TrendingDown size={13} color={color} />
          Security Score Timeline
        </span>
        {data.length > 0 && (
          <span className="text-xs text-muted">{data.length} data points</span>
        )}
      </div>

      {/* Chart area */}
      <div className="flex-1" style={{ minHeight: 200 }}>
        {data.length === 0 ? (
          <div className="empty-state">
            <p>Awaiting telemetry…</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Trigger a simulation to populate the timeline
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="4 4"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />

              {/* Reference lines for thresholds */}
              <ReferenceLine y={80} stroke="rgba(34,211,165,0.2)" strokeDasharray="6 4" />
              <ReferenceLine y={50} stroke="rgba(245,158,11,0.2)" strokeDasharray="6 4" />

              <XAxis
                dataKey="time"
                stroke="transparent"
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                stroke="transparent"
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                tickLine={false}
                tickFormatter={v => `${v}`}
              />

              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />

              <Area
                type="monotone"
                dataKey="score"
                stroke={color}
                strokeWidth={2}
                fill="url(#scoreGrad)"
                dot={false}
                activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }}
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
};

export default ThreatChart;
