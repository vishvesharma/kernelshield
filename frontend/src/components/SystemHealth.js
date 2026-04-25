import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

/* Animated counter that smoothly counts to the target number */
const Counter = ({ to, style }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v));
  const ref = useRef(null);

  useEffect(() => {
    const controls = animate(count, to, { duration: 1.4, ease: 'easeOut' });
    return controls.stop;
  }, [count, to]); // count is a MotionValue — safe to include

  return <motion.span ref={ref} style={style}>{rounded}</motion.span>;
};

const SystemHealth = ({ score, riskLevel, eventsTracked }) => {
  const isHigh     = riskLevel === 'High';
  const isModerate = riskLevel === 'Moderate';

  const color      = isHigh ? 'var(--red)'   : isModerate ? 'var(--amber)' : 'var(--green)';
  const glowColor  = isHigh ? 'var(--red-glow)' : isModerate ? 'var(--amber-glow)' : 'var(--green-glow)';
  const badgeClass = isHigh ? 'badge badge-red' : isModerate ? 'badge badge-amber' : 'badge badge-green';
  const statusText = isHigh ? 'Critical' : isModerate ? 'Elevated' : 'Nominal';

  const RADIUS = 54;
  const STROKE = 10;
  const C = 2 * Math.PI * RADIUS;
  const offset = C - (score / 100) * C;

  return (
    <motion.div
      className="card flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{ position: 'relative' }}
    >
      {/* Header */}
      <div className="card-header w-full">
        <span className="card-label flex items-center gap-2">
          <ShieldCheck size={14} color={color} />
          System Health
        </span>
        <span className={badgeClass}>{statusText}</span>
      </div>

      {/* Circular progress */}
      <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 'var(--sp-4)' }}>
        <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx="70" cy="70" r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={STROKE}
          />
          {/* Progress */}
          <motion.circle
            cx="70" cy="70" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
          />
        </svg>

        {/* Center value */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <motion.div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2.2rem',
              fontWeight: 700,
              lineHeight: 1,
              color,
              textShadow: `0 0 20px ${glowColor}`,
            }}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Counter to={score} style={{ color, textShadow: `0 0 20px ${glowColor}` }} />
          </motion.div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>/ 100</span>
        </div>
      </div>

      {/* Footer meta */}
      <div className="flex gap-4 text-xs text-muted">
        <span>Risk: <span style={{ color }}>{riskLevel}</span></span>
        {eventsTracked !== undefined && (
          <span>Tracked: <span style={{ color: 'var(--text-secondary)' }}>{eventsTracked}</span></span>
        )}
      </div>
    </motion.div>
  );
};

export default SystemHealth;
