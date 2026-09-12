# AI Provider Configuration

The TPO AI layer keeps **NVIDIA NIM as the primary provider** and can automatically fall back to **Google Gemini** when NVIDIA exhausts its configured retries.

The existing mock-interview question generation, mock-interview evaluation, and career-roadmap flows continue to call the same NVIDIA wrapper. Their system prompts, user prompts, JSON contracts, parsers, and Zod validation are unchanged.

## Environment variables

```env
NVIDIA_API_KEY=your_nvidia_key
NVIDIA_MODEL=openai/gpt-oss-20b
NVIDIA_NIM_ENDPOINT=https://integrate.api.nvidia.com/v1

# Fallback provider. Defaults to gemini when omitted.
AI_FALLBACK_PROVIDER=gemini

# Google AI Studio key
GEMINI_API_KEY=your_gemini_key

# Gemini fallback model
GEMINI_MODEL=gemini-3.5-flash
```

## Provider order

```text
AI request
   |
   v
NVIDIA NIM
   |
   | success
   +--------------------> existing parser / validator / feature
   |
   | failure after NVIDIA retries
   v
Gemini
   |
   | success
   +--------------------> existing parser / validator / feature
   |
   | failure
   v
existing AI error handling
```

## Important behavior

- NVIDIA remains the first and preferred provider.
- NVIDIA's existing retry/backoff behavior is preserved.
- Gemini is called only after NVIDIA's retry budget is exhausted.
- The exact same `system` and `user` messages are forwarded to Gemini.
- Gemini returns an OpenAI-compatible completion shape, so existing callers do not need provider-specific parsing changes.
- No API key or model response is logged.
- Set `AI_FALLBACK_PROVIDER=none` if fallback should be disabled.

Gemini API keys must be configured as server-side environment variables in the deployment platform. Never expose `GEMINI_API_KEY` through a `NEXT_PUBLIC_*` variable.
