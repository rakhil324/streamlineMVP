/**
 * LLM-based Resume Parser
 * Uses AI to parse resumes into structured format
 * Much more robust than text-based parsing
 */

import { callLLM } from './llm';
import { LatexResumeData } from './latexResume';

/**
 * Uses LLM to parse raw resume text into structured format
 */
export async function parseResumeWithLLM(
  rawText: string,
  options: {
    provider: 'openai' | 'anthropic' | 'huggingface' | 'gemini' | 'groq';
    apiKey: string;
    model?: string;
  }
): Promise<LatexResumeData> {
  const prompt = createParsingPrompt(rawText);
  
  console.log('Calling LLM to parse resume...');
  
  const response = await callLLM(prompt, options);
  
  // Parse the JSON response
  let jsonText = response.content.trim();
  
  // Remove markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '');
  }
  
  try {
    const parsed = JSON.parse(jsonText);
    
    // Validate and sanitize the structure
    return sanitizeResumeData(parsed);
  } catch (error: any) {
    console.error('Failed to parse LLM response:', error.message);
    console.error('Response preview:', jsonText.substring(0, 500));
    throw new Error('LLM returned invalid JSON format');
  }
}

/**
 * Creates the prompt for resume parsing
 */
function createParsingPrompt(rawText: string): string {
  return `You are a resume parser. Extract ALL information from this resume into a structured JSON format.

CRITICAL INSTRUCTIONS:
1. Extract EVERY bullet point COMPLETELY - do not truncate or summarize
2. Include ALL experiences, projects, education entries
3. Preserve exact dates, company names, job titles
4. Keep the full text of each bullet point - do not cut off mid-sentence
5. If information seems incomplete in the source, still include what's there

OUTPUT FORMAT (JSON):
{
  "header": {
    "name": "Full Name",
    "location": "City, State",
    "phone": "phone number",
    "email": "email@example.com"
  },
  "education": [
    {
      "institution": "University Name",
      "location": "City, State",
      "degree": "Degree Type in Major",
      "gpa": "X.X",
      "gradDate": "Month Year",
      "coursework": ["Course 1", "Course 2"],
      "activities": "Activities if any"
    }
  ],
  "experience": [
    {
      "company": "Company Name",
      "location": "City, State",
      "title": "Job Title",
      "start": "Month Year",
      "end": "Month Year or Present",
      "bullets": [
        "Complete bullet point 1 - include the ENTIRE text",
        "Complete bullet point 2 - include the ENTIRE text"
      ]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "technologies": "Tech1, Tech2, Tech3",
      "bullets": [
        "Complete bullet point 1",
        "Complete bullet point 2"
      ]
    }
  ],
  "skills": {
    "languages": "Language1, Language2",
    "frameworks": "Framework1, Framework2",
    "tools": "Tool1, Tool2",
    "interests": "Interest1, Interest2"
  }
}

RESUME TEXT TO PARSE:
---
${rawText}
---

Return ONLY the JSON object. No explanations, no markdown, just valid JSON.`;
}

/**
 * Sanitizes and validates the parsed resume data
 */
function sanitizeResumeData(data: any): LatexResumeData {
  return {
    header: {
      name: data?.header?.name || '',
      location: data?.header?.location || '',
      phone: data?.header?.phone || '',
      email: data?.header?.email || '',
    },
    education: Array.isArray(data?.education) ? data.education.map((edu: any) => ({
      institution: edu?.institution || '',
      location: edu?.location || '',
      degree: edu?.degree || '',
      gpa: edu?.gpa,
      gradDate: edu?.gradDate || '',
      coursework: Array.isArray(edu?.coursework) ? edu.coursework : [],
      activities: edu?.activities || '',
    })) : [],
    experience: Array.isArray(data?.experience) ? data.experience.map((exp: any) => ({
      company: exp?.company || '',
      location: exp?.location || '',
      title: exp?.title || '',
      start: exp?.start || '',
      end: exp?.end || '',
      bullets: Array.isArray(exp?.bullets) ? exp.bullets.filter((b: any) => b && typeof b === 'string') : [],
    })) : [],
    projects: Array.isArray(data?.projects) ? data.projects.map((proj: any) => ({
      name: proj?.name || '',
      technologies: proj?.technologies || '',
      bullets: Array.isArray(proj?.bullets) ? proj.bullets.filter((b: any) => b && typeof b === 'string') : [],
    })) : [],
    skills: {
      languages: data?.skills?.languages || '',
      frameworks: data?.skills?.frameworks || '',
      tools: data?.skills?.tools || '',
      interests: data?.skills?.interests || '',
    },
  };
}

/**
 * Creates prompt for tailoring a parsed resume to a job
 */
export function createTailoringPrompt(
  resumeData: LatexResumeData,
  jobDescription: string,
  jobTitle: string,
  companyName: string
): string {
  return `You are a resume tailoring expert. Optimize this resume for the specified job.

RULES:
1. DO NOT change header (name, contact) - keep exactly as is
2. DO NOT invent new experiences or skills - only rephrase existing content
3. Reorder bullets to put most relevant first
4. Enhance bullet points with stronger action verbs and metrics where appropriate
5. Naturally incorporate relevant keywords from the job description
6. Keep ALL existing experiences and projects - don't remove any
7. Keep bullet points COMPLETE - don't truncate

Job: ${jobTitle} at ${companyName}

Job Description:
${jobDescription}

Current Resume Data:
${JSON.stringify(resumeData, null, 2)}

Return the modified resume in the EXACT same JSON structure. Only JSON, no explanations.`;
}

