import { NextRequest, NextResponse } from 'next/server';

const SPRING = process.env.NEXT_PUBLIC_SPRING_BASE ?? 'http://localhost:8080';

async function forward(req: NextRequest, path: string, init?: RequestInit) {
  const token = req.cookies.get('anomanet_token')?.value ?? '';
  const res = await fetch(`${SPRING}${path}`, {
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const suffix = req.nextUrl.pathname.endsWith('/explanation') ? '/explanation' : '';
  return forward(req, `/api/alerts/${id}${suffix}`);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const action = req.nextUrl.pathname.endsWith('/assign') ? '/assign' : '/status';
  return forward(req, `/api/alerts/${id}${action}`, { method: 'PUT', body: JSON.stringify(body) });
}
