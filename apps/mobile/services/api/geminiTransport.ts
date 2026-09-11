import type { RuntimeSettings } from '../config/settings';
import { AIServiceError, type RequestOptions } from './errors';

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export async function generateJson(
  settings: RuntimeSettings, parts: GeminiPart[], system: string,
  schema: Record<string, unknown>, options: RequestOptions = {},
): Promise<any> {
  if (!settings.geminiApiKey.trim()) {
    throw new AIServiceError('NOT_CONFIGURED', 'Open Profile → API & environment and enter your Gemini API key.');
  }
  if (options.signal?.aborted) throw new AIServiceError('CANCELLED', 'Request cancelled.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, options.timeoutMs ?? 90000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.geminiModel)}:generateContent`,
      {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': settings.geminiApiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseJsonSchema: schema },
        }),
      },
    );
    if (!response.ok) {
      // Do not surface raw provider messages; they can echo request credentials.
      const status = response.status;
      const code = status === 401 || status === 403 ? 'INVALID_API_KEY'
        : status === 429 ? 'RATE_LIMITED' : status === 404 ? 'MODEL_UNAVAILABLE'
        : status === 400 ? 'INVALID_REQUEST' : 'LLM_FAILED';
      const messages: Record<string, string> = {
        INVALID_API_KEY: 'The API key was refused. Check your key and its permissions in API settings.',
        RATE_LIMITED: 'Gemini quota is exhausted or busy. Check your quota, then try again.',
        MODEL_UNAVAILABLE: 'This model is unavailable for your API key. Change the model in API settings.',
        INVALID_REQUEST: 'Gemini rejected the request. Check the model and API key in settings.',
        LLM_FAILED: 'Gemini is temporarily unavailable. Try again.',
      };
      throw new AIServiceError(code, messages[code], status);
    }
    const payload = await response.json();
    const candidate = payload.candidates?.[0];
    if (candidate?.finishReason !== 'STOP') throw new AIServiceError('PROCESSING_ERROR', 'Gemini could not complete the result. Try a clearer recording.');
    const raw = candidate?.content?.parts?.filter((part: any) => !part.thought && typeof part.text === 'string').map((part: any) => part.text).join('');
    try { return JSON.parse(raw); }
    catch { throw new AIServiceError('PROCESSING_ERROR', 'Gemini returned an unreadable result. Please try again.'); }
  } catch (error) {
    if (error instanceof AIServiceError) throw error;
    if (controller.signal.aborted) {
      throw new AIServiceError(options.signal?.aborted ? 'CANCELLED' : 'TIMEOUT', options.signal?.aborted ? 'Request cancelled.' : 'Gemini took too long. Try again.');
    }
    throw new AIServiceError('NETWORK', 'Could not reach Gemini. Check your internet connection.');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

export async function testGeminiConnection(settings: RuntimeSettings): Promise<void> {
  const result = await generateJson(settings, [{ text: 'Return {"ok":true}.' }], 'Test API connectivity.', {
    type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'],
  }, { timeoutMs: 30000 });
  if (result.ok !== true) throw new AIServiceError('PROCESSING_ERROR', 'Connection test returned an unexpected response.');
}
