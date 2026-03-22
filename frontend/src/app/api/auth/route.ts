import { NextRequest, NextResponse } from 'next/server';

const SPRING = process.env.NEXT_PUBLIC_SPRING_BASE ?? 'http://localhost:8080';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const upstream = await fetch(`${SPRING}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const data = await upstream.json();

  const res = NextResponse.json(data, { status: 200 });
  res.cookies.set('anomanet_token', data.token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });

  return res;
}
