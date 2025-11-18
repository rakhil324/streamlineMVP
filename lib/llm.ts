/**
 * LLM Integration Utility
 * Handles communication with LLM APIs (OpenAI, Anthropic, Hugging Face, Google Gemini, Groq, etc.)
 */

interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'huggingface' | 'gemini' | 'groq';
  apiKey: string;
  model?: string;
}

interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Calls LLM API to generate tailored content
 */
export async function callLLM(
  prompt: string,
  config: LLMConfig
): Promise<LLMResponse> {
  if (config.provider === 'openai') {
    return await callOpenAI(prompt, config);
  } else if (config.provider === 'anthropic') {
    return await callAnthropic(prompt, config);
  } else if (config.provider === 'huggingface') {
    return await callHuggingFace(prompt, config);
  } else if (config.provider === 'gemini') {
    return await callGemini(prompt, config);
  } else if (config.provider === 'groq') {
    return await callGroq(prompt, config);
  } else {
    throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

/**
 * Calls OpenAI API
 */
async function callOpenAI(prompt: string, config: LLMConfig): Promise<LLMResponse> {
  // Default to gpt-4o, fallback to gpt-3.5-turbo if not available
  const model = config.model || 'gpt-4o';
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional resume and cover letter writing assistant. Generate high-quality, tailored content based on the user\'s requirements.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`OpenAI API error: ${error.error?.message || JSON.stringify(error)}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || '',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

/**
 * Calls Anthropic API
 */
async function callAnthropic(prompt: string, config: LLMConfig): Promise<LLMResponse> {
  const model = config.model || 'claude-3-opus-20240229';
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are a professional resume and cover letter writing assistant. Generate high-quality, tailored content based on the user's requirements.\n\n${prompt}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Anthropic API error: ${error.error?.message || JSON.stringify(error)}`);
  }

  const data = await response.json();
  
  return {
    content: data.content[0]?.text || '',
    usage: data.usage ? {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
    } : undefined,
  };
}

/**
 * Calls Google Gemini API (FREE TIER AVAILABLE)
 */
async function callGemini(prompt: string, config: LLMConfig): Promise<LLMResponse> {
  const model = config.model || 'gemini-pro';
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are a professional resume and cover letter writing assistant. Generate high-quality, tailored content based on the user's requirements.\n\n${prompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Gemini API error: ${error.error?.message || JSON.stringify(error)}`);
  }

  const data = await response.json();
  
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
  };
}

/**
 * Calls Groq API (FREE TIER AVAILABLE - Very Fast!)
 */
async function callGroq(prompt: string, config: LLMConfig): Promise<LLMResponse> {
  // Updated to use currently available models
  // Try: llama-3.1-8b-instant, llama-3.2-3b-instruct, or llama-3.3-70b-versatile
  const model = config.model || 'llama-3.1-8b-instant';
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional resume and cover letter writing assistant. Generate high-quality, tailored content based on the user\'s requirements.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Groq API error: ${error.error?.message || JSON.stringify(error)}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || '',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

/**
 * Calls Hugging Face Inference API (FREE TIER AVAILABLE)
 */
async function callHuggingFace(prompt: string, config: LLMConfig): Promise<LLMResponse> {
  const model = config.model || 'mistralai/Mistral-7B-Instruct-v0.2';
  
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      inputs: `You are a professional resume and cover letter writing assistant. Generate high-quality, tailored content based on the user's requirements.\n\n${prompt}`,
      parameters: {
        max_new_tokens: 2000,
        temperature: 0.7,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`Hugging Face API error: ${error}`);
  }

  const data = await response.json();
  
  // Hugging Face returns an array
  const text = Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || '';
  
  return {
    content: text,
  };
}

/**
 * Generates a prompt for resume tailoring with structured JSON
 */
export function generateResumePrompt(
  resumeJson: string,
  jobDescription: string,
  jobTitle: string,
  companyName: string
): string {
  return `You are a resume tailoring assistant. You will receive a resume in JSON format and a job description.

CRITICAL RULES:
1. DO NOT change the header (name, location, email, phone) - keep it EXACTLY as provided
2. DO NOT add, delete, or rename any sections - you must return all four sections: education, experience, extracurriculars, skillsAndInterests
3. DO NOT change section order - always return sections in this exact order: education, experience, extracurriculars, skillsAndInterests
4. **STRONGLY ENCOURAGED**: Reorder items WITHIN each section to prioritize the most relevant items first. Put the most job-relevant experience, education, and extracurriculars at the top of their respective sections.
5. **IMPORTANT**: Expand and enhance bullet points to be more detailed and impactful. Add specific metrics, results, and accomplishments where possible. Make bullets comprehensive and compelling, not brief.
6. You CAN refine wording of bullets, descriptions, and content to better match the job
7. You CAN optimize keywords from the job description naturally throughout
8. If a section is empty in the original, keep it empty (empty array)

Job Title: ${jobTitle}
Company: ${companyName}

Job Description:
${jobDescription}

Resume JSON:
${resumeJson}

Return ONLY valid JSON matching this exact structure. Do NOT include markdown code blocks, explanations, or any text outside the JSON:
{
  "header": { "name": "...", "location": "...", "email": "...", "phone": "..." },
  "education": [{ "institution": "...", "location": "...", "degree": "...", "gradDate": "...", "gpa": "...", "sat": "...", "coursework": [...] }],
  "experience": [{ "company": "...", "location": "...", "title": "...", "start": "...", "end": "...", "bullets": [...] }],
  "extracurriculars": [{ "org": "...", "location": "...", "role": "...", "start": "...", "end": "...", "bullets": [...] }],
  "skillsAndInterests": { "skills": "...", "interests": "...", "otherInvolvements": "..." }
}`;
}

/**
 * Generates a prompt for cover letter tailoring
 */
export function generateCoverLetterPrompt(
  originalResume: string,
  jobDescription: string,
  jobTitle: string,
  companyName: string,
  coverLetterTemplate?: string
): string {
  const basePrompt = `Please write a tailored cover letter for the position of "${jobTitle}" at "${companyName}".

Job Description:
${jobDescription}

Candidate's Resume (for context):
${originalResume}

${coverLetterTemplate ? `Cover Letter Template/Previous Version:\n${coverLetterTemplate}\n\n` : ''}Please:
1. Address the hiring manager professionally
2. Highlight 2-3 key qualifications that match the job requirements
3. Show enthusiasm for the specific role and company
4. Keep it concise (3-4 paragraphs, under 400 words)
5. Use a professional but engaging tone
6. Include a strong closing statement

Return the cover letter in plain text format (NO markdown, NO asterisks, NO bold formatting) with proper paragraph breaks. Do not use any markdown syntax like ** or *.`;

  return basePrompt;
}

