# Kernel Shield

Kernel Shield is a vulnerability simulation, detection, risk assessment, and mitigation framework
for operating system security research. The backend is built with FastAPI and exposes
several endpoints that orchestrate the different modules.

## Setup

1. Create a Python environment (venv/conda) and activate it.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the API

From the workspace root (`osshieldx/`) run:

```bash
uvicorn backend.main:app --reload
```

> **Database initialization**  
> The application automatically initializes its SQLite schema once during
> startup using a FastAPI startup handler. In tests or development you may
> call `store.init_db()` manually, which drops and recreates the `events`
> table.  This ensures that attack simulations no longer wipe previous
> records on each request—a bug present in early versions of the code.

Then open the Swagger UI at `http://127.0.0.1:8000/docs` to explore endpoints.

## Endpoints

- `GET /` – basic health check
- `GET /api/v1/simulate/buffer` – simulate a buffer overflow attack
- `GET /api/v1/simulate/trapdoor` – simulate a trapdoor/backdoor
- `GET /api/v1/simulate/cache` – simulate cache poisoning
- `GET /api/v1/system/health` – aggregated system health score based on recent events

Responses include structured metadata, analysis results, and mitigation suggestions.

### Frontend Dashboard
A React‑based dashboard under `frontend/` visualizes real‑time data from the API. To start:

```bash
cd frontend
npm install    # installs React, Recharts, axios, etc.
npm start      # launches development server on :3000
```

The current skeleton provides:

- **Summary cards** at the top (total events, high/medium risk counts, last attack)
- **Health history line chart** showing score over time
- **Event feed** listing recent attacks
- **Attack trigger buttons** to simulate buffer, trapdoor, or cache incidents
- Dark/neon theme with clean layout

Data is pulled from three backend endpoints (`/summary`, `/health/history`, `/events/recent`) and automatically refreshes every 5 seconds. Additionally a
WebSocket at `/ws/updates` pushes live updates when attacks are simulated; the frontend connects to this stream to achieve instant visibility. The layout prioritizes clarity and will later be enhanced with animations, responsive design, and micro‑interactions (see Stage 3).


## Additional API Endpoints

- `GET /api/v1/events/recent` – retrieve the most recent recorded events (limit query param supported)
- `GET /api/v1/system/health/history` – list of past health scores for trend analysis
- `GET /api/v1/system/summary` – aggregate summary counts for dashboard cards
- `WS  /ws/updates` – websocket stream that pushes new events, health snapshots, and history points when simulations run
- `GET /api/v1/metrics/type_counts` – aggregated counts of events by type (used by the dashboard heatmap)

### Detection Output

The detection module returns rich information, including a new **threat
classification tier** and a **threat score** derived from severity and
confidence:

```json
{
  "vulnerability": "buffer_overflow",
  "detected": true,
  "severity": "High",
  "severity_score": 8.0,
  "anomaly_score": 0.82,
  "confidence": 0.91,
  "indicators": ["pattern1", "pattern2"],
  "explanation": "...",
  "timestamp": "2026-03-01T..."
}
```

The API uses `severity_score` when available (fallbacks otherwise) to power risk
and health calculations, ensuring forward compatibility as the detection layer
becomes more sophisticated.  Additionally the `threat_tier` field provides a
human‑readable classification such as Informational, Suspicious, Exploit
Attempt, or Critical Breach; `threat_score` is a numeric composite used by
events and dashboards.

## Architectural Highlights

- Separation of concerns: routing, simulation, detection, risk, and mitigation.
- Pydantic models enforce response schemas; detection and risk
  outputs are typed results (`DetectionResult`, `RiskProfile`).
- Global exception handler, logging, CORS middleware, and API versioning.
- Event windowing, severity normalization, and weighted exponential health model.

Future work includes enhancing detection intelligence, adding persistent storage,
and implementing recovery/time-decay in the health calculation.

## Configuration

The backend uses a `pydantic` settings model in `backend/config.py` so
values can be overridden via environment variables or a `.env` file without
changing source code. Default values include:

```python
DATABASE_URL = "backend/events.db"
RATE_LIMIT = 100
RATE_WINDOW = 60
MAX_EVENTS = 20
DECAY_FACTOR = 0.97
HEALTH_WINDOW_MINUTES = 10  # ignore events older than this when computing health
```

Legacy `DB_PATH` environment variable is still supported.

## Thread Safety & Production Notes

- SQLite is enabled with WAL mode during initialization to improve concurrency
  under moderate load. For very high throughput switch to PostgreSQL/MySQL
  with a proper connection pool.
- The backend keeps a small in‑memory `event_log` for fast health snapshots; a
  `threading.Lock` now protects access to `event_log` and `health_history` in
  `backend/main.py` to avoid races in the prototype. In production replace the
  in‑memory queue with a durable, concurrent store (Redis, RDBMS) for
  correctness at scale.

---
