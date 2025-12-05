import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { parseResumeFlexible, createTailoringPrompt } from '@/lib/flexibleResumeParser';
import { generateFlexibleLatex, flexibleResumeToText } from '@/lib/flexibleLatexGenerator';
import { FlexibleResume } from '@/lib/flexibleResumeTypes';
import { compileToPdf } from '@/lib/latexCompiler';

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
    } = body;

    if (!sanitizedResume || !jobDescription || !jobTitle || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get LLM configuration
    const llmProvider = (process.env.LLM_PROVIDER || 'groq') as 'openai' | 'anthropic' | 'huggingface' | 'gemini' | 'groq';
    const llmApiKey = process.env.LLM_API_KEY || 
      process.env.OPENAI_API_KEY || 
      process.env.ANTHROPIC_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.HUGGINGFACE_API_KEY;
    
    if (!llmApiKey) {
      return NextResponse.json(
        { error: 'LLM API key not configured.' },
        { status: 500 }
      );
    }

    // Get the original resume text (restore PII if encrypted)
    let resumeText = sanitizedResume;
    if (encryptedOriginal && encryptionKey) {
      try {
        const { decrypt } = await import('@/lib/encryption');
        resumeText = decrypt(encryptedOriginal, encryptionKey);
      } catch (error) {
        console.error('Failed to restore PII:', error);
      }
    }

    console.log('=== FLEXIBLE RESUME TAILORING ===');

    // STEP 1: Parse resume with flexible parser (preserves ALL sections)
    console.log('Step 1: Parsing resume structure...');
    let parsedResume: FlexibleResume;
    try {
      parsedResume = await parseResumeFlexible(resumeText, {
        provider: llmProvider,
        apiKey: llmApiKey,
        model: process.env.LLM_MODEL,
      });
      
      console.log('Parsed sections:', parsedResume.sections.map(s => s.name));
      console.log('Total entries:', parsedResume.sections.reduce((acc, s) => acc + s.entries.length, 0));
    } catch (parseError: any) {
      console.error('Resume parsing failed:', parseError.message);
      return NextResponse.json(
        { error: `Failed to parse resume: ${parseError.message}` },
        { status: 400 }
      );
    }

    // STEP 2: Tailor bullet points only (preserve everything else)
    console.log('Step 2: Tailoring bullet points...');
    let tailoredResume: FlexibleResume;
    try {
      const tailorPrompt = createTailoringPrompt(parsedResume, jobDescription, jobTitle, companyName);
      const response = await callLLM(tailorPrompt, {
        provider: llmProvider,
        apiKey: llmApiKey,
        model: process.env.LLM_MODEL,
      });
      
      let jsonText = response.content.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '');
      }
      
      tailoredResume = JSON.parse(jsonText);
      
      // SAFETY: Ensure header and protected sections stay unchanged
      tailoredResume.header = parsedResume.header;
      tailoredResume = preserveProtectedSections(tailoredResume, parsedResume);
      
      console.log('Tailoring complete. Sections preserved:', tailoredResume.sections.map(s => s.name));
    } catch (error: any) {
      console.error('Tailoring failed, using original:', error.message);
      tailoredResume = parsedResume;
    }

    // STEP 3: Generate LaTeX
    console.log('Step 3: Generating LaTeX...');
    const latexContent = generateFlexibleLatex(tailoredResume);

    // STEP 4: Compile to PDF
    console.log('Step 4: Compiling PDF...');
    try {
      const { pdf, method } = await compileToPdf(latexContent, undefined);
      
      console.log(`✅ PDF generated via ${method}:`, pdf.length, 'bytes');
      
      return NextResponse.json({
        success: true,
        content: flexibleResumeToText(tailoredResume),
        pdf: pdf.toString('base64'),
        format: 'pdf',
        method: method,
        sectionsPreserved: tailoredResume.sections.map(s => s.name),
      });
    } catch (pdfError: any) {
      console.error('PDF generation failed:', pdfError.message);
      
      // Return text content as fallback
      return NextResponse.json({
        success: true,
        content: flexibleResumeToText(tailoredResume),
        format: 'text',
        warning: 'PDF generation failed, returning text content',
        sectionsPreserved: tailoredResume.sections.map(s => s.name),
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
 * Ensures protected sections (Education, Skills, Awards) stay unchanged
 */
function preserveProtectedSections(tailored: FlexibleResume, original: FlexibleResume): FlexibleResume {
  const protectedKeywords = ['EDUCATION', 'SKILLS', 'AWARDS', 'HONORS', 'CERTIFICATIONS', 'PUBLICATIONS'];
  
  // Create a map of original protected sections
  const protectedOriginals = new Map<string, typeof original.sections[0]>();
  for (const section of original.sections) {
    const isProtected = protectedKeywords.some(kw => section.name.toUpperCase().includes(kw));
    if (isProtected) {
      protectedOriginals.set(section.name, section);
    }
  }
  
  // Replace protected sections in tailored with originals
  tailored.sections = tailored.sections.map(section => {
    const original = protectedOriginals.get(section.name);
    if (original) {
      return original; // Keep original completely unchanged
    }
    return section;
  });
  
  // Ensure no sections were dropped
  protectedOriginals.forEach((section, name) => {
    if (!tailored.sections.find(s => s.name === name)) {
      tailored.sections.push(section);
    }
  });
  
  return tailored;
}
