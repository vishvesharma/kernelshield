import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

import './App.css';

const REFRESH_MS = 5000;

function App() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [events, setEvents] = useState([]);
  const [health, setHealth] = useState(null); // used for status/risk if needed

  useEffect(() => {
    const fetchAll = () => {
      axios.get('/api/v1/system/summary').then(r => setSummary(r.data)).catch(console.error);
      axios.get('/api/v1/system/health/history').then(r => setHistory(r.data)).catch(console.error);
      axios.get('/api/v1/events/recent').then(r => setEvents(r.data)).catch(console.error);
      axios.get('/api/v1/system/health').then(r => setHealth(r.data)).catch(console.error);
    };
    fetchAll();
    const iv = setInterval(fetchAll, REFRESH_MS);

    // websocket for immediate updates
    const socket = new WebSocket('ws://localhost:8000/ws/updates');
    socket.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.event) setEvents(evts => [data.event, ...evts]);
        if (data.summary) setSummary(data.summary);
        if (data.history_point) setHistory(h => [...h, data.history_point]);
        if (data.health) setHealth(data.health);
      } catch (e) {
        console.error('ws parse', e);
      }
    };
    socket.onclose = () => console.log('ws closed');

    return () => {
      clearInterval(iv);
      socket.close();
    };
  }, []);

  const historyData = history.map(h => ({
    time: new Date(h.timestamp).toLocaleTimeString(),
    score: h.score,
  }));

  return (
    <div className="app-container">
      <header>Kernel Shield Dashboard</header>

      <div className="controls">
        <button onClick={() => axios.get('/api/v1/simulate/buffer').catch(console.error)}>Buffer</button>
        <button onClick={() => axios.get('/api/v1/simulate/trapdoor').catch(console.error)}>Trapdoor</button>
        <button onClick={() => axios.get('/api/v1/simulate/cache').catch(console.error)}>Cache</button>
      </div>

      {summary && (
        <div className="summary-cards">
          <div className="card">
            <div>Total events</div>
            <strong>{summary.total_events}</strong>
          </div>
          <div className="card">
            <div>High risk</div>
            <strong>{summary.high_risk_events}</strong>
          </div>
          <div className="card">
            <div>Moderate risk</div>
            <strong>{summary.moderate_risk_events}</strong>
          </div>
          <div className="card">
            <div>Last attack</div>
            <strong>{summary.last_attack_type || '—'}</strong>
          </div>
          {summary.last_threat_tier && (
            <div className="card">
              <div>Last tier</div>
              <strong>{summary.last_threat_tier}</strong>
            </div>
          )}
        </div>
      )}

      {historyData.length > 0 && (
        <div className="chart">
          <h2>Health History</h2>
          <LineChart width={800} height={300} data={historyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="score" stroke="#00ffcc" dot={false} />
          </LineChart>
        </div>
      )}

      {events.length > 0 && (
        <div className="events-feed">
          <h2>Recent Attacks</h2>
          <ul>
            {events.map((ev, idx) => (
              <li key={idx}>
                [{new Date(ev.timestamp).toLocaleTimeString()}] {ev.type} 
                (sev: {ev.severity ?? 'N/A'})
                {ev.threat_tier && (
                  <> - <em>{ev.threat_tier}</em> ({ev.threat_score})</>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!summary && !history.length && !events.length && <p>Loading data...</p>}
    </div>
  );
}

export default App;
