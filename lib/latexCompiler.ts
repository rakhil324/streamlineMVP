/**
 * LaTeX Compiler
 * Compiles LaTeX to PDF using online API (free)
 * Falls back to PDFKit if compilation fails
 */

import { generatePDF } from './pdfGenerator';
import { Resume } from './resumeTypes';

const LATEX_ONLINE_URL = 'https://latexonline.cc/compile';

/**
 * Converts a Resume object to plain text for PDF generation fallback
 */
function resumeToText(resume: Resume): string {
  const lines: string[] = [];
  
  // Header
  if (resume.header) {
    if (resume.header.name) lines.push(resume.header.name);
    const contact: string[] = [];
    if (resume.header.email) contact.push(resume.header.email);
    if (resume.header.phone) contact.push(resume.header.phone);
    if (resume.header.location) contact.push(resume.header.location);
    if (contact.length > 0) lines.push(contact.join(' | '));
    lines.push('');
  }
  
  // Education
  if (resume.education && resume.education.length > 0) {
    lines.push('EDUCATION');
    for (const edu of resume.education) {
      lines.push(`${edu.degree} - ${edu.institution}`);
      if (edu.gradDate) lines.push(edu.gradDate);
      if (edu.gpa) lines.push(`GPA: ${edu.gpa}`);
      lines.push('');
    }
  }
  
  // Experience
  if (resume.experience && resume.experience.length > 0) {
    lines.push('EXPERIENCE');
    for (const exp of resume.experience) {
      lines.push(`${exp.title} at ${exp.company}`);
      if (exp.location) lines.push(exp.location);
      if (exp.start && exp.end) lines.push(`${exp.start} - ${exp.end}`);
      if (exp.bullets) {
        for (const bullet of exp.bullets) {
          lines.push(`• ${bullet}`);
        }
      }
      lines.push('');
    }
  }
  
  // Extracurriculars
  if (resume.extracurriculars && resume.extracurriculars.length > 0) {
    lines.push('EXTRACURRICULAR ACTIVITIES');
    for (const ext of resume.extracurriculars) {
      lines.push(`${ext.role} at ${ext.org}`);
      if (ext.start && ext.end) lines.push(`${ext.start} - ${ext.end}`);
      if (ext.bullets) {
        for (const bullet of ext.bullets) {
          lines.push(`• ${bullet}`);
        }
      }
      lines.push('');
    }
  }
  
  // Skills
  if (resume.skillsAndInterests) {
    lines.push('SKILLS & INTERESTS');
    if (resume.skillsAndInterests.skills) lines.push(`Skills: ${resume.skillsAndInterests.skills}`);
    if (resume.skillsAndInterests.frameworks) lines.push(`Frameworks: ${resume.skillsAndInterests.frameworks}`);
    if (resume.skillsAndInterests.tools) lines.push(`Tools: ${resume.skillsAndInterests.tools}`);
    if (resume.skillsAndInterests.interests) lines.push(`Interests: ${resume.skillsAndInterests.interests}`);
    lines.push('');
  }
  
  return lines.join('\n');
}

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
    // Convert resume to text format for PDF generation
    const resumeText = resumeToText(fallbackResume);
    const pdf = await generatePDF(resumeText, 'resume.pdf');
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
