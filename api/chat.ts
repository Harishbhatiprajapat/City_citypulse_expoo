// Serverless API endpoint for secure Google Gemini AI communication
// Compatible with Vercel Serverless Functions and Node.js backends

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  // Retrieve API key strictly from server-side environment variables
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length < 5) {
    return res.status(400).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please add GEMINI_API_KEY to your deployment environment variables.',
      code: 'MISSING_API_KEY',
    });
  }

  const { contents, systemInstruction } = req.body || {};

  if (!contents || !Array.isArray(contents)) {
    return res.status(400).json({ error: 'Invalid payload: contents array is required.' });
  }

  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    apiKey.trim()
  )}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 900,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      let parsedErr: any = {};
      try {
        parsedErr = JSON.parse(errBody);
      } catch {}

      if (geminiRes.status === 401 || geminiRes.status === 403) {
        return res.status(403).json({
          error: 'The configured Google Gemini API key was rejected by the provider. Please verify key permissions.',
          code: 'AUTH_FAILED',
        });
      }

      if (geminiRes.status === 429) {
        return res.status(429).json({
          error: 'Gemini rate limit exceeded. Please wait a moment before sending another query.',
          code: 'RATE_LIMIT',
        });
      }

      return res.status(geminiRes.status).json({
        error: parsedErr.error?.message || `Gemini API returned status ${geminiRes.status}`,
        code: 'PROVIDER_ERROR',
      });
    }

    const data = await geminiRes.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({
        error: 'Empty response returned from Google Gemini model.',
        code: 'EMPTY_RESPONSE',
      });
    }

    return res.status(200).json({
      text,
      model,
      usage: data.usageMetadata,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI request timed out after 15 seconds.', code: 'TIMEOUT' });
    }
    return res.status(500).json({
      error: 'Failed to contact Google Gemini AI provider.',
      code: 'NETWORK_ERROR',
    });
  }
}
