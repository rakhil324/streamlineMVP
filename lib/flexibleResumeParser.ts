/**
 * Flexible Resume Parser
 * Parses ANY resume format into dynamic sections
 * Preserves original structure - only identifies what to tailor
 */

import {
  FlexibleResume,
  ResumeHeader,
  ResumeSection,
  SectionEntry,
} from './flexibleResumeTypes';

/**
 * Main parsing function - uses LLM for accurate parsing
 */
export async function parseResumeFlexible(
  resumeText: string,
  llmOptions: { provider: string; apiKey: string; model?: string }
): Promise<FlexibleResume> {
  const { callLLM } = await import('./llm');
  
  const prompt = createParsingPrompt(resumeText);
  
  const response = await callLLM(prompt, {
    provider: llmOptions.provider as any,
    apiKey: llmOptions.apiKey,
    model: llmOptions.model,
  });
  
  let jsonText = response.content.trim();
  
  // Remove markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '');
  }
  
  try {
    const parsed = JSON.parse(jsonText);
    return sanitizeFlexibleResume(parsed);
  } catch (error) {
    console.error('Failed to parse LLM response:', error);
    console.error('Response was:', jsonText.substring(0, 500));
    throw new Error('Failed to parse resume structure');
  }
}

/**
 * Creates the LLM prompt for flexible parsing
 */
function createParsingPrompt(resumeText: string): string {
  return `You are a resume parser. Extract the EXACT structure of this resume into JSON.

CRITICAL RULES:
1. Preserve ALL sections exactly as they appear (EDUCATION, EXPERIENCE, AWARDS, LEADERSHIP, etc.)
2. Preserve ALL information - do not drop anything
3. Keep section names EXACTLY as written (e.g., "PROFESSIONAL EXPERIENCE" not "EXPERIENCE")
4. Extract bullet points as arrays
5. Keep dates, locations, titles exactly as written
6. If a section doesn't have structured entries, put content in "rawContent"

RESUME TEXT:
${resumeText}

Return JSON matching this TypeScript interface:

interface FlexibleResume {
  header: {
    name: string;           // Full name
    contactLine: string;    // ALL contact info on one line (emails, phone, location, links)
  };
  sections: {
    name: string;           // Section header EXACTLY as written (e.g., "AWARDS & HONORS")
    entries: {
      title?: string;       // Primary line (company, school, org name)
      subtitle?: string;    // Secondary line (job title, degree, role)
      location?: string;    // Location if present
      dates?: string;       // Dates if present (keep format like "Summer 2023 - Summer 2024")
      bullets?: string[];   // Bullet points as array (without bullet characters)
      additionalText?: string[];  // Any other text lines
    }[];
    rawContent?: string;    // For sections that don't fit entry structure
  }[];
}

Return ONLY valid JSON. No explanations. No markdown code blocks.`;
}

/**
 * Sanitizes and validates the parsed resume
 */
function sanitizeFlexibleResume(data: any): FlexibleResume {
  return {
    header: {
      name: data?.header?.name || '',
      contactLine: data?.header?.contactLine || '',
    },
    sections: Array.isArray(data?.sections) 
      ? data.sections.map(sanitizeSection)
      : [],
  };
}

/**
 * Sanitizes a single section
 */
function sanitizeSection(section: any): ResumeSection {
  return {
    name: section?.name || 'UNTITLED',
    entries: Array.isArray(section?.entries)
      ? section.entries.map(sanitizeEntry)
      : [],
    rawContent: section?.rawContent || undefined,
  };
}

/**
 * Sanitizes a single entry
 */
function sanitizeEntry(entry: any): SectionEntry {
  return {
    title: entry?.title || undefined,
    subtitle: entry?.subtitle || undefined,
    location: entry?.location || undefined,
    dates: entry?.dates || undefined,
    bullets: Array.isArray(entry?.bullets) 
      ? entry.bullets.filter((b: any) => typeof b === 'string' && b.trim())
      : undefined,
    additionalText: Array.isArray(entry?.additionalText)
      ? entry.additionalText.filter((t: any) => typeof t === 'string' && t.trim())
      : undefined,
  };
}

/**
 * Creates prompt for tailoring only the bullet points
 */
export function createTailoringPrompt(
  resume: FlexibleResume,
  jobDescription: string,
  jobTitle: string,
  companyName: string
): string {
  // Extract only the tailorable sections for the prompt
  const tailorableSections = resume.sections.filter(s => {
    const name = s.name.toUpperCase();
    return name.includes('EXPERIENCE') || 
           name.includes('PROJECT') || 
           name.includes('LEADERSHIP') ||
           name.includes('ACTIVITIES') ||
           name.includes('VOLUNTEER') ||
           name.includes('RESEARCH');
  });
  
  // Count bullets per section/entry for validation
  const bulletCounts = tailorableSections.map(s => ({
    section: s.name,
    entries: s.entries.map(e => ({
      title: e.title,
      bulletCount: e.bullets?.length || 0
    }))
  }));

  return `You are a resume optimizer. Modify ONLY the bullet points to better match the job.

JOB: ${jobTitle} at ${companyName}

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME STRUCTURE:
${JSON.stringify(resume, null, 2)}

STRICT RULES:
1. Return the EXACT same JSON structure
2. Keep header EXACTLY as-is
3. Keep ALL section names EXACTLY as-is
4. Keep ALL titles, subtitles, locations, dates EXACTLY as-is
5. Keep sections like EDUCATION, SKILLS, AWARDS COMPLETELY UNCHANGED
6. ONLY modify bullet points in EXPERIENCE, PROJECTS, LEADERSHIP sections
7. Keep the SAME NUMBER of bullets: ${JSON.stringify(bulletCounts)}
8. Rephrase bullets to incorporate job keywords, but keep the meaning
9. Each bullet should be one concise sentence

Return ONLY the complete JSON with modified bullets. No explanations.`;
}

