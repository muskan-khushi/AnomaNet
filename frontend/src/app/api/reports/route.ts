import { NextRequest, NextResponse } from 'next/server';

const SPRING = process.env.NEXT_PUBLIC_SPRING_BASE ?? 'http://localhost:8080';

async function fwd(req: NextRequest, path: string, init?: RequestInit) {
  const token = req.cookies.get('anomanet_token')?.value ?? '';
  const res = await fetch(`${SPRING}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return fwd(req, '/api/reports/generate', { method: 'POST', body: JSON.stringify(body) });
}

export async function GET(req: NextRequest) {
  const suffix = req.nextUrl.pathname.replace('/api/reports', '');
  return fwd(req, `/api/reports${suffix}`);
}
