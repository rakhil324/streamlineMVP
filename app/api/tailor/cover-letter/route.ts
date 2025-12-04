import { NextRequest, NextResponse } from 'next/server';
import { callLLM, generateCoverLetterPrompt } from '@/lib/llm';
import { restorePII } from '@/lib/dataSanitization';
import { generatePDF } from '@/lib/pdfGenerator';
import { generateSimpleCoverLetterLatex } from '@/lib/coverLetterLatex';
import { compileLatexToPdf, compileLatexAlternative } from '@/lib/latexCompiler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sanitizedResume,
      jobDescription,
      jobTitle,
      companyName,
      coverLetterTemplate,
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

    // Generate prompt for LLM
    const prompt = generateCoverLetterPrompt(
      sanitizedResume,
      jobDescription,
      jobTitle,
      companyName,
      coverLetterTemplate
    );

    // Call LLM API
    const llmResponse = await callLLM(prompt, {
      provider: llmProvider,
      apiKey: llmApiKey,
      model: process.env.LLM_MODEL,
    });

    // Restore PII if we have the encryption key and removed data
    let finalCoverLetter = llmResponse.content;
    if (encryptedOriginal && encryptionKey && removedData) {
      try {
        const { decrypt } = await import('@/lib/encryption');
        const originalResume = decrypt(encryptedOriginal, encryptionKey);
        // Restore PII into the LLM-generated cover letter
        finalCoverLetter = restorePII(finalCoverLetter, removedData);
      } catch (error) {
        console.error('Failed to restore PII:', error);
        // Continue with sanitized version if restoration fails
      }
    }

    // Strip any introductory/commentary text that the LLM might have added
    finalCoverLetter = stripLLMCommentary(finalCoverLetter);

    // Generate PDF using LaTeX (preferred) or PDFKit (fallback)
    let pdfBuffer: Buffer;
    let method: 'latex' | 'pdfkit' = 'latex';

    try {
      console.log('Starting LaTeX PDF generation for cover letter...');
      console.log('Content length:', finalCoverLetter.length);

      // Step 1: Generate LaTeX from the cover letter text
      const latexContent = generateSimpleCoverLetterLatex(finalCoverLetter, companyName);
      console.log('Generated LaTeX content, length:', latexContent.length);

      // Step 2: Compile LaTeX to PDF
      try {
        pdfBuffer = await compileLatexToPdf(latexContent);
        method = 'latex';
        console.log('✅ LaTeX compilation successful:', pdfBuffer.length, 'bytes');
      } catch (latexError1) {
        console.log('Primary LaTeX API failed, trying alternative...');
        try {
          pdfBuffer = await compileLatexAlternative(latexContent);
          method = 'latex';
          console.log('✅ Alternative LaTeX compilation successful:', pdfBuffer.length, 'bytes');
        } catch (latexError2) {
          console.log('All LaTeX APIs failed, falling back to PDFKit...');
          // Fallback to PDFKit
          pdfBuffer = await generatePDF(finalCoverLetter, `cover-letter-${companyName}.pdf`);
          method = 'pdfkit';
          console.log('✅ PDFKit fallback successful:', pdfBuffer.length, 'bytes');
        }
      }

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('PDF buffer is empty');
      }

      console.log(`PDF generated successfully via ${method}:`, pdfBuffer.length, 'bytes');

      // Return PDF as base64
      const pdfBase64 = pdfBuffer.toString('base64');

      return NextResponse.json({
        success: true,
        content: finalCoverLetter,
        pdf: pdfBase64,
        format: 'pdf',
        method: method,
        usage: llmResponse.usage,
      });
    } catch (error: any) {
      // If all PDF generation fails, log the error and return text content
      console.error('❌ All PDF generation methods failed:', error);
      console.error('Error message:', error.message);
      console.error('Content preview (first 200 chars):', finalCoverLetter.substring(0, 200));
      return NextResponse.json({
        success: true,
        content: finalCoverLetter,
        format: 'text',
        error: `PDF generation failed: ${error.message}. Returning text format.`,
      });
    }
  } catch (error: any) {
    console.error('Cover letter tailoring error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to tailor cover letter' },
      { status: 500 }
    );
  }
}

/**
 * Strips introductory/commentary text that LLMs often add
 * Examples: "Here is a tailored cover letter for...", "Here's your cover letter:"
 */
function stripLLMCommentary(text: string): string {
  // Common intro patterns to remove
  const introPatterns = [
    /^here(?:'s| is) (?:a |your |the )?(?:tailored )?cover letter[^:]*:\s*/i,
    /^here(?:'s| is) (?:a |your |the )?(?:tailored )?letter[^:]*:\s*/i,
    /^i(?:'ve| have) (?:written|created|prepared|drafted)[^:]*:\s*/i,
    /^below is[^:]*:\s*/i,
    /^the following is[^:]*:\s*/i,
  ];

  let cleaned = text.trim();

  for (const pattern of introPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Also remove any trailing commentary
  const outroPatterns = [
    /\n\n(?:i hope this helps|let me know if|feel free to|good luck|best of luck)[^]*$/i,
    /\n\n(?:note:|please note:)[^]*$/i,
  ];

  for (const pattern of outroPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trim();
}

