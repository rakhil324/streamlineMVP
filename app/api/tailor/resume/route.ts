import { NextRequest, NextResponse } from 'next/server';
import { callLLM, generateResumePrompt } from '@/lib/llm';
import { restorePII } from '@/lib/dataSanitization';
import { generatePDFFromResume } from '@/lib/pdfGeneratorStructured';
import { parseResumeFromText } from '@/lib/resumeParser';
import { enforceSections, Resume } from '@/lib/resumeTypes';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sanitizedResume,
      jobDescription,
      jobTitle,
      companyName,
      encryptedOriginal,
      encryptionKey,
      removedData,
    } = body;

    if (!sanitizedResume || !jobDescription || !jobTitle || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get LLM configuration from environment variables
    const llmProvider = (process.env.LLM_PROVIDER || 'groq') as 'openai' | 'anthropic' | 'huggingface' | 'gemini' | 'groq';
    const llmApiKey = process.env.LLM_API_KEY || 
      process.env.OPENAI_API_KEY || 
      process.env.ANTHROPIC_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.HUGGINGFACE_API_KEY;
    
    if (!llmApiKey) {
      return NextResponse.json(
        { error: 'LLM API key not configured. Please set one of: GROQ_API_KEY (recommended - free), GEMINI_API_KEY (free), HUGGINGFACE_API_KEY (free), OPENAI_API_KEY, or ANTHROPIC_API_KEY in your .env.local file.' },
        { status: 500 }
      );
    }

    // Parse the uploaded resume into structured format
    let baseResume: Resume;
    try {
      console.log('Parsing resume into structured format...');
      baseResume = parseResumeFromText(sanitizedResume);
      console.log('Parsed resume structure:', {
        education: baseResume.education.length,
        experience: baseResume.experience.length,
        extracurriculars: baseResume.extracurriculars.length,
      });
    } catch (parseError: any) {
      console.error('Failed to parse resume:', parseError);
      return NextResponse.json(
        { error: `Failed to parse resume: ${parseError.message}` },
        { status: 400 }
      );
    }

    // Restore PII in the base resume if we have encryption data
    if (encryptedOriginal && encryptionKey && removedData) {
      try {
        const { decrypt } = await import('@/lib/encryption');
        const originalResumeText = decrypt(encryptedOriginal, encryptionKey);
        // Re-parse with original resume to get PII back
        baseResume = parseResumeFromText(originalResumeText);
      } catch (error) {
        console.error('Failed to restore PII:', error);
        // Continue with sanitized version
      }
    }

    // Convert base resume to JSON string for LLM
    const resumeJson = JSON.stringify(baseResume, null, 2);

    // Generate prompt for LLM with structured JSON
    const prompt = generateResumePrompt(
      resumeJson,
      jobDescription,
      jobTitle,
      companyName
    );

    // Call LLM API
    const llmResponse = await callLLM(prompt, {
      provider: llmProvider,
      apiKey: llmApiKey,
      model: process.env.LLM_MODEL,
    });

    // Parse LLM response as JSON
    let tailoredResume: Resume;
    try {
      // Try to extract JSON from response (might have markdown code blocks)
      let jsonText = llmResponse.content.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '');
      }
      
      const parsed = JSON.parse(jsonText);
      // Enforce sections to ensure structure integrity
      tailoredResume = enforceSections(parsed, baseResume);
      console.log('Tailored resume structure:', {
        education: tailoredResume.education.length,
        experience: tailoredResume.experience.length,
        extracurriculars: tailoredResume.extracurriculars.length,
      });
    } catch (parseError: any) {
      console.error('Failed to parse LLM response as JSON:', parseError);
      console.error('LLM response:', llmResponse.content.substring(0, 500));
      // Fallback: use base resume if LLM response is invalid
      tailoredResume = baseResume;
    }

    // Generate PDF from structured resume
    let pdfBuffer: Buffer;
    try {
      console.log('Starting PDF generation from structured resume...');
      pdfBuffer = await generatePDFFromResume(tailoredResume, `resume-${companyName}.pdf`);
      
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('PDF buffer is empty');
      }
      
      console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');
      
      // Return PDF as base64
      const pdfBase64 = pdfBuffer.toString('base64');

      // Convert structured resume back to text for content field (for display)
      const finalResumeText = resumeToText(tailoredResume);

      return NextResponse.json({
        success: true,
        content: finalResumeText,
        pdf: pdfBase64,
        format: 'pdf',
        usage: llmResponse.usage,
      });
    } catch (error: any) {
      // If PDF generation fails, log the error and return text content
      console.error('❌ PDF generation failed:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      const finalResumeText = resumeToText(tailoredResume);
      return NextResponse.json({
        success: true,
        content: finalResumeText,
        format: 'text',
        error: `PDF generation failed: ${error.message}. Returning text format.`,
      });
    }
  } catch (error: any) {
    console.error('Resume tailoring error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to tailor resume' },
      { status: 500 }
    );
  }
}

/**
 * Converts structured resume back to text format (for display/fallback)
 */
function resumeToText(resume: Resume): string {
  let text = `${resume.header.name}\n${resume.header.location} | ${resume.header.email} | ${resume.header.phone}\n\n`;
  
  text += 'EDUCATION\n';
  for (const edu of resume.education) {
    text += `${edu.institution}${edu.location ? ` | ${edu.location}` : ''}\n`;
    if (edu.gradDate) text += `${edu.gradDate}\n`;
    if (edu.degree) text += `${edu.degree}\n`;
    if (edu.gpa || edu.sat) {
      const parts = [];
      if (edu.gpa) parts.push(`GPA: ${edu.gpa}`);
      if (edu.sat) parts.push(`SAT: ${edu.sat}`);
      text += `• ${parts.join(' ')}\n`;
    }
    if (edu.coursework && edu.coursework.length > 0) {
      text += `• Relevant Coursework: ${edu.coursework.join(', ')}\n`;
    }
    text += '\n';
  }
  
  text += 'WORK EXPERIENCE\n';
  for (const exp of resume.experience) {
    text += `${exp.company}${exp.location ? ` | ${exp.location}` : ''}\n`;
    text += `${exp.start} - ${exp.end}\n`;
    if (exp.title) text += `${exp.title}\n`;
    for (const bullet of exp.bullets) {
      text += `• ${bullet}\n`;
    }
    text += '\n';
  }
  
  text += 'EXTRACURRICULAR ACTIVITIES & PROJECTS\n';
  for (const extra of resume.extracurriculars) {
    text += `${extra.org}${extra.location ? ` | ${extra.location}` : ''}\n`;
    text += `${extra.start} - ${extra.end}\n`;
    if (extra.role) text += `${extra.role}\n`;
    for (const bullet of extra.bullets) {
      text += `• ${bullet}\n`;
    }
    text += '\n';
  }
  
  text += 'SKILLS & INTERESTS\n';
  if (resume.skillsAndInterests.skills) {
    text += `Skills & Languages: ${resume.skillsAndInterests.skills}\n`;
  }
  if (resume.skillsAndInterests.otherInvolvements) {
    text += `Other Involvements: ${resume.skillsAndInterests.otherInvolvements}\n`;
  }
  if (resume.skillsAndInterests.interests) {
    text += `Interests: ${resume.skillsAndInterests.interests}\n`;
  }
  
  return text;
}

