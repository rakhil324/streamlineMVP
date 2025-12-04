/**
 * LaTeX Compiler
 * Compiles LaTeX to PDF using online API (free)
 * Falls back to PDFKit if compilation fails
 */

import { generatePDFFromResume } from './pdfGeneratorStructured';
import { Resume } from './resumeTypes';

const LATEX_ONLINE_URL = 'https://latexonline.cc/compile';

/**
 * Compiles LaTeX to PDF using the free latex-online.cc API
 */
export async function compileLatexToPdf(latexContent: string): Promise<Buffer> {
  console.log('Compiling LaTeX via online API...');
  
  try {
    // Use the latex-online.cc API
    const response = await fetch(LATEX_ONLINE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: latexContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LaTeX compilation failed:', response.status, errorText);
      throw new Error(`LaTeX compilation failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    
    // Verify it's a valid PDF (starts with %PDF)
    if (pdfBuffer.length < 100 || !pdfBuffer.toString('utf8', 0, 4).startsWith('%PDF')) {
      console.error('Invalid PDF response from LaTeX compiler');
      throw new Error('Invalid PDF response');
    }
    
    console.log('✅ LaTeX compiled successfully:', pdfBuffer.length, 'bytes');
    return pdfBuffer;
    
  } catch (error: any) {
    console.error('LaTeX online compilation error:', error.message);
    throw error;
  }
}

/**
 * Alternative: Use a different free LaTeX API
 */
export async function compileLatexAlternative(latexContent: string): Promise<Buffer> {
  console.log('Trying alternative LaTeX API...');
  
  try {
    // Try latex.ytotech.com as backup
    const response = await fetch('https://latex.ytotech.com/builds/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        compiler: 'pdflatex',
        resources: [
          {
            main: true,
            content: latexContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Alternative API failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
    
  } catch (error: any) {
    console.error('Alternative LaTeX API error:', error.message);
    throw error;
  }
}

/**
 * Main compilation function with fallbacks
 */
export async function compileToPdf(
  latexContent: string,
  fallbackResume?: Resume
): Promise<{ pdf: Buffer; method: 'latex' | 'pdfkit' }> {
  
  // Try primary LaTeX API
  try {
    const pdf = await compileLatexToPdf(latexContent);
    return { pdf, method: 'latex' };
  } catch (e1) {
    console.log('Primary LaTeX API failed, trying alternative...');
  }
  
  // Try alternative LaTeX API
  try {
    const pdf = await compileLatexAlternative(latexContent);
    return { pdf, method: 'latex' };
  } catch (e2) {
    console.log('Alternative LaTeX API failed, falling back to PDFKit...');
  }
  
  // Fallback to PDFKit
  if (fallbackResume) {
    console.log('Using PDFKit fallback...');
    const pdf = await generatePDFFromResume(fallbackResume, 'resume.pdf');
    return { pdf, method: 'pdfkit' };
  }
  
  throw new Error('All PDF generation methods failed');
}

/**
 * Validates LaTeX content for common issues
 */
export function validateLatex(latexContent: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for document class
  if (!latexContent.includes('\\documentclass')) {
    errors.push('Missing \\documentclass');
  }
  
  // Check for begin/end document
  if (!latexContent.includes('\\begin{document}')) {
    errors.push('Missing \\begin{document}');
  }
  if (!latexContent.includes('\\end{document}')) {
    errors.push('Missing \\end{document}');
  }
  
  // Check for unescaped special characters (common issue)
  const unescapedAmpersand = latexContent.match(/[^\\]&/g);
  if (unescapedAmpersand && unescapedAmpersand.length > 0) {
    // Filter out intentional uses like \&
    const realIssues = unescapedAmpersand.filter(m => !m.includes('\\'));
    if (realIssues.length > 0) {
      errors.push('Possible unescaped & character');
    }
  }
  
  // Check balanced braces (simple check)
  const openBraces = (latexContent.match(/\{/g) || []).length;
  const closeBraces = (latexContent.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
