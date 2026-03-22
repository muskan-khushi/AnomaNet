import { NextRequest, NextResponse } from 'next/server';

const SPRING = process.env.NEXT_PUBLIC_SPRING_BASE ?? 'http://localhost:8080';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('anomanet_token')?.value ?? '';
  const q     = req.nextUrl.searchParams.get('q') ?? '';

  const res = await fetch(`${SPRING}/api/accounts/search?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
