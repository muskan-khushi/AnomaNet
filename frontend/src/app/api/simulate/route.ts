import { NextRequest, NextResponse } from 'next/server';

const SPRING = process.env.NEXT_PUBLIC_SPRING_BASE ?? 'http://localhost:8080';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('anomanet_token')?.value ?? '';
  const type  = req.nextUrl.searchParams.get('type') ?? '';

  const res = await fetch(
    `${SPRING}/api/simulate/scenario?type=${type}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
