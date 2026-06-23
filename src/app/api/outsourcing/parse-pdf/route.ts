import { requireUser } from '@/lib/auth/session';
import { parsePdfToPrd, geminiAvailable } from '@/lib/ai/gemini';
import { ok, handleError } from '@/lib/api';
import { HttpError } from '@/lib/auth/session';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Gemini 解析可能较慢

export async function POST(req: Request) {
  try {
    await requireUser();
    if (!geminiAvailable()) throw new HttpError(503, '平台未配置 AI 解析（GEMINI_API_KEY）');
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new HttpError(422, '请上传 PDF 文件');
    if (file.type !== 'application/pdf') throw new HttpError(422, '仅支持 PDF 文件');
    if (file.size > 15 * 1024 * 1024) throw new HttpError(422, 'PDF 不能超过 15MB');
    const buf = Buffer.from(await file.arrayBuffer());
    const base64 = buf.toString('base64');
    const result = await parsePdfToPrd(base64);
    return ok(result);
  } catch (e) { return handleError(e); }
}
