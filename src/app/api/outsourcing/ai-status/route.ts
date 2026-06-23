import { geminiAvailable } from '@/lib/ai/gemini';
import { ok } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET() { return ok({ pdfParse: geminiAvailable() }); }
