import { NextRequest, NextResponse } from 'next/server';
import { callLLM, generateCoverLetterPrompt } from '@/lib/llm';
import { restorePII } from '@/lib/dataSanitization';
import { generatePDF } from '@/lib/pdfGenerator';

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

    // Generate PDF
    let pdfBuffer: Buffer;
    try {
      console.log('Starting PDF generation for cover letter...');
      console.log('Content length:', finalCoverLetter.length);
      pdfBuffer = await generatePDF(finalCoverLetter, `cover-letter-${companyName}.pdf`);
      
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('PDF buffer is empty');
      }
      
      console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');
      
      // Return PDF as base64
      const pdfBase64 = pdfBuffer.toString('base64');

      return NextResponse.json({
        success: true,
        content: finalCoverLetter,
        pdf: pdfBase64,
        format: 'pdf',
        usage: llmResponse.usage,
      });
    } catch (error: any) {
      // If PDF generation fails, log the error and return text content
      console.error('❌ PDF generation failed:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
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

