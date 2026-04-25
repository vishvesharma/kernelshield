import { useEffect, useRef, useCallback } from 'react';

/* Scripted demo steps — each step moves the cursor to a target and optionally clicks */
const DEMO_SCRIPT = [
  { target: '[data-demo="alerts-tab"]',     delay: 1200, click: true,  label: 'Navigating to Alerts…' },
  { target: '[data-demo="filter-exploit"]', delay: 1800, click: true,  label: 'Filtering by Exploit Attempt…' },
  { target: '[data-demo="first-event"]',    delay: 1500, click: true,  label: 'Investigating threat…' },
  { target: '[data-demo="modal-close"]',    delay: 2200, click: true,  label: 'Closing detail view…' },
  { target: '[data-demo="metrics-tab"]',    delay: 1000, click: true,  label: 'Navigating to Metrics…' },
  { target: '[data-demo="sims-tab"]',       delay: 2000, click: true,  label: 'Navigating to Simulations…' },
  { target: '[data-demo="sim-buffer"]',     delay: 1500, click: true,  label: 'Launching Buffer Overflow…' },
  { target: '[data-demo="sim-confirm"]',    delay: 1800, click: true,  label: 'Confirming simulation…' },
  { target: '[data-demo="dashboard-tab"]',  delay: 3000, click: true,  label: 'Returning to Dashboard…' },
  { target: '[data-demo="notif-bell"]',     delay: 1500, click: true,  label: 'Checking notifications…' },
  { target: '[data-demo="notif-bell"]',     delay: 2000, click: true,  label: 'Closing notifications…' },
];

function getCenter(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function useDemoMode(enabled, onNavigate, onStepLabel) {
  const cursorRef  = useRef(null);
  const activeRef  = useRef(true);
  const stepRef    = useRef(0);

  /* Create / destroy cursor DOM node */
  useEffect(() => {
    if (!enabled) {
      if (cursorRef.current) {
        cursorRef.current.remove();
        cursorRef.current = null;
      }
      return;
    }

    const el = document.createElement('div');
    el.className = 'demo-cursor';
    el.style.left = '50%';
    el.style.top  = '50%';
    document.body.appendChild(el);
    cursorRef.current = el;
    activeRef.current = true;
    stepRef.current   = 0;

    return () => {
      activeRef.current = false;
      el.remove();
      cursorRef.current = null;
    };
  }, [enabled]);

  /* Move cursor to position */
  const moveTo = useCallback((x, y) => {
    if (!cursorRef.current) return;
    cursorRef.current.style.left = `${x}px`;
    cursorRef.current.style.top  = `${y}px`;
  }, []);

  /* Simulate a click at current cursor position */
  const simulateClick = useCallback((el) => {
    if (!cursorRef.current) return;
    cursorRef.current.classList.add('clicking');
    setTimeout(() => cursorRef.current?.classList.remove('clicking'), 300);
    if (el) el.click();
  }, []);

  /* Run the demo script */
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const runStep = async (index) => {
      if (cancelled || !activeRef.current) return;
      const step = DEMO_SCRIPT[index % DEMO_SCRIPT.length];

      // Announce step label
      if (onStepLabel) onStepLabel(step.label);

      // Find target element
      const target = document.querySelector(step.target);
      if (target) {
        const { x, y } = getCenter(target);
        moveTo(x, y);

        // Wait for cursor to arrive, then click
        await new Promise(r => setTimeout(r, 650));
        if (cancelled) return;

        if (step.click) simulateClick(target);
      }

      // Wait between steps
      await new Promise(r => setTimeout(r, step.delay));
      if (cancelled) return;

      // Loop through script
      runStep(index + 1);
    };

    // Small initial delay before starting
    const timer = setTimeout(() => runStep(0), 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [enabled, moveTo, simulateClick, onStepLabel]);
}
