import { NextRequest, NextResponse } from 'next/server';

const SPRING = process.env.NEXT_PUBLIC_SPRING_BASE ?? 'http://localhost:8080';

async function fwd(req: NextRequest, init?: RequestInit) {
  const token = req.cookies.get('anomanet_token')?.value ?? '';
  const res = await fetch(`${SPRING}/api/admin/config`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function GET(req: NextRequest)  { return fwd(req); }
export async function PUT(req: NextRequest)  {
  const body = await req.json();
  return fwd(req, { method: 'PUT', body: JSON.stringify(body) });
}
