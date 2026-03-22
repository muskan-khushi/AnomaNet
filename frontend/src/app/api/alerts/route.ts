import { NextRequest, NextResponse } from 'next/server';

const SPRING = process.env.NEXT_PUBLIC_SPRING_BASE ?? 'http://localhost:8080';

async function forward(req: NextRequest, path: string, init?: RequestInit) {
  const token = req.cookies.get('anomanet_token')?.value ?? '';
  const url = `${SPRING}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function GET(req: NextRequest) {
  const search = req.nextUrl.search;
  return forward(req, `/api/alerts${search}`);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return forward(req, '/api/alerts', { method: 'POST', body: JSON.stringify(body) });
}
