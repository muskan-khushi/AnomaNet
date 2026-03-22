import { NextRequest, NextResponse } from 'next/server';

const SPRING = process.env.NEXT_PUBLIC_SPRING_BASE ?? 'http://localhost:8080';

async function forward(req: NextRequest, path: string, init?: RequestInit) {
  const token = req.cookies.get('anomanet_token')?.value ?? '';
  const res = await fetch(`${SPRING}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

// POST /api/graph/subgraph  |  POST /api/graph/cycles  |  POST /api/graph/path
export async function POST(req: NextRequest) {
  const suffix = req.nextUrl.pathname.replace('/api/graph', '');
  const body = await req.json();
  return forward(req, `/api/graph${suffix}`, { method: 'POST', body: JSON.stringify(body) });
}

// GET /api/graph/account/:id/stats
export async function GET(req: NextRequest) {
  const suffix = req.nextUrl.pathname.replace('/api/graph', '');
  return forward(req, `/api/graph${suffix}`);
}
