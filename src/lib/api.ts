import { NextResponse } from 'next/server';
import { HttpError } from './auth/session';
import { ZodError } from 'zod';

export function handleError(e: unknown): NextResponse {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  if (e instanceof ZodError) {
    return NextResponse.json({ error: '输入校验失败', issues: e.flatten() }, { status: 422 });
  }
  if (e && typeof e === 'object' && 'code' in e && 'message' in e) {
    const code = (e as { code: string }).code;
    if (code === 'INVALID_TRANSITION' || code === 'FORBIDDEN') {
      return NextResponse.json({ error: String((e as { message: unknown }).message) }, { status: 409 });
    }
  }
  console.error('Unhandled API error:', e);
  return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
