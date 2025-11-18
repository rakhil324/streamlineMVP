# Free LLM API Setup Guide

Since you've exceeded your OpenAI quota, here are **FREE alternatives** you can use:

## Option 1: Groq (Recommended - Fastest & Easiest) ⚡

**Free Tier**: 14,400 requests/day, very fast responses

1. **Get API Key**: 
   - Go to https://console.groq.com/
   - Sign up (free)
   - Create an API key

2. **Update .env.local**:
```env
GROQ_API_KEY=your_groq_api_key_here
LLM_PROVIDER=groq
LLM_MODEL=mixtral-8x7b-32768
```

**Available Models**:
- `mixtral-8x7b-32768` (default, recommended)
- `llama2-70b-4096`
- `gemma-7b-it`

## Option 2: Google Gemini (Free Tier) 🆓

**Free Tier**: 60 requests/minute, 1,500 requests/day

1. **Get API Key**:
   - Go to https://makersuite.google.com/app/apikey
   - Sign in with Google account
   - Create API key (free)

2. **Update .env.local**:
```env
GEMINI_API_KEY=your_gemini_api_key_here
LLM_PROVIDER=gemini
LLM_MODEL=gemini-pro
```

## Option 3: Hugging Face (Free Tier) 🤗

**Free Tier**: Limited but free

1. **Get API Key**:
   - Go to https://huggingface.co/settings/tokens
   - Sign up (free)
   - Create a token

2. **Update .env.local**:
```env
HUGGINGFACE_API_KEY=your_hf_token_here
LLM_PROVIDER=huggingface
LLM_MODEL=mistralai/Mistral-7B-Instruct-v0.2
```

**Note**: First request may take longer (model loading)

## Quick Setup (Groq - Recommended)

1. Sign up at https://console.groq.com/
2. Get your API key
3. Update `.env.local`:
```env
GROQ_API_KEY=your_key_here
LLM_PROVIDER=groq
LLM_MODEL=mixtral-8x7b-32768
AUTH_SECRET=ZYeIkF7YB9scB2tLjMyaO7+SPEaHHcqJMdmBki7x+rQ=
```

4. Restart dev server: `npm run dev`

That's it! Groq is the fastest and easiest free option.
