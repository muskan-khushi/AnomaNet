# AnomaNet — Frontend

Next.js 14 · TypeScript · D3.js · Zustand · React Query · Tailwind CSS

## Setup

```bash
cd frontend/app
cp ../../.env.example .env.local   # fill in values
npm install
npm run dev                        # http://localhost:3000
```

## Pages

| Route | Owner | Description |
|---|---|---|
| `/login` | Manya | JWT auth, role select |
| `/dashboard` | Manya | Command center — KPIs, live chart, alert feed |
| `/alerts` | Manya | Alert queue with filters, sort by AnomaScore |
| `/alerts/[id]` | Manya | Alert detail — D3 graph, score breakdown, AI explanation |
| `/graph-explorer` | Manya | Free-form graph exploration by account ID |
| `/cases` | Rupali | Case list |
| `/cases/[id]` | Rupali | 4-tab case investigation (Overview / Graph / Timeline / Evidence) |
| `/cases/[id]/evidence` | Rupali | Evidence builder — FIU report PDF generator |
| `/simulator` | Rupali | Fraud scenario trigger panel (5 typologies) |
| `/admin` | Rupali | Threshold sliders, weight config, user management |

## Key Components

| Component | Owner | Notes |
|---|---|---|
| `FundFlowGraph` | Manya | D3 v7 force-directed, zoom/pan, cycle animation, PNG export |
| `ScoreBreakdown` | Manya | Recharts RadarChart + expandable explanation cards |
| `AlertFeed` | Manya | Live WebSocket feed with toast notifications |
| `KPICards` | Manya | Live-updating KPI widgets |
| `CaseTimeline` | Rupali | Transaction timeline with CTR threshold bar chart |
| `ScenarioPanel` | Rupali | 5 fraud scenario trigger cards |

## API Routes (BFF Proxy)

All routes in `src/app/api/` proxy to Spring Boot at `NEXT_PUBLIC_SPRING_BASE`.

```
POST /api/auth          → Spring auth-service     :8086
GET  /api/alerts        → Spring alert-service    :8082
POST /api/graph/subgraph→ Spring graph-service    :8084
GET  /api/cases         → Spring case-service     :8083
POST /api/reports       → Spring report-service   :8085
POST /api/simulate      → Spring simulator-bridge :8087
PUT  /api/admin         → Spring alert-service    :8082
WS   /ws/alerts         → Spring alert-service    :8082 (WebSocket)
```

## Demo Flow

1. Login as `INV-2024-0042`
2. Dashboard shows live KPIs + alert feed
3. Go to **Simulator** → Fire `CIRCULAR` → alert slides into dashboard within 2s
4. Click alert → AlertDetail → D3 graph shows cycle pulsing in red
5. Open Case → 4-tab investigation
6. Evidence tab → Generate FIU Report PDF
