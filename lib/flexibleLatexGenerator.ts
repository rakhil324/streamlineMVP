/**
 * Flexible LaTeX Generator
 * Generates LaTeX from ANY resume structure
 * Preserves original sections and formatting
 */

import { FlexibleResume, ResumeSection, SectionEntry } from './flexibleResumeTypes';

/**
 * Escapes special LaTeX characters
 */
function escapeLatex(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/</g, '\\textless{}')
    .replace(/>/g, '\\textgreater{}');
}

/**
 * Generates complete LaTeX document from flexible resume
 */
export function generateFlexibleLatex(resume: FlexibleResume): string {
  const preamble = generatePreamble();
  const header = generateHeader(resume.header);
  const sections = resume.sections.map(generateSection).join('\n');
  
  return `${preamble}

\\begin{document}

${header}

${sections}

\\end{document}`;
}

/**
 * LaTeX preamble with packages and formatting
 */
function generatePreamble(): string {
  return `\\documentclass[10pt, letterpaper]{article}

% Packages
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{hyperref}

% Page geometry - tight margins
\\geometry{
  letterpaper,
  top=0.4in,
  bottom=0.4in,
  left=0.5in,
  right=0.5in
}

% Remove page numbers
\\pagestyle{empty}

% Section formatting - bold with underline
\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{6pt}{4pt}

% Tight list spacing
\\setlist[itemize]{nosep, leftmargin=1.5em, topsep=2pt, itemsep=1pt}

% No paragraph indent
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}`;
}

/**
 * Generates header (name + contact line)
 */
function generateHeader(header: { name: string; contactLine: string }): string {
  return `% ===== HEADER =====
\\begin{center}
  {\\LARGE\\bfseries ${escapeLatex(header.name)}} \\\\[2pt]
  ${escapeLatex(header.contactLine)}
\\end{center}

\\vspace{-6pt}`;
}

/**
 * Generates a single section
 */
function generateSection(section: ResumeSection): string {
  const sectionHeader = `\\section*{${escapeLatex(section.name)}}`;
  
  // If section has raw content (couldn't parse into entries)
  if (section.rawContent) {
    return `${sectionHeader}
${escapeLatex(section.rawContent)}
\\vspace{4pt}`;
  }
  
  // Generate entries
  const entries = section.entries.map(entry => generateEntry(entry, section.name)).join('\n');
  
  return `${sectionHeader}
${entries}`;
}

/**
 * Generates a single entry within a section
 */
function generateEntry(entry: SectionEntry, sectionName: string): string {
  const lines: string[] = [];
  
  // Determine if this is a simple entry (like awards) or complex (like jobs)
  const hasStructure = entry.subtitle || entry.location || entry.dates;
  
  if (hasStructure) {
    // Complex entry: title + location on line 1, subtitle + dates on line 2
    if (entry.title) {
      let line1 = `\\textbf{${escapeLatex(entry.title)}}`;
      if (entry.location) {
        line1 += ` \\hfill ${escapeLatex(entry.location)}`;
      }
      lines.push(line1 + ' \\\\');
    }
    
    if (entry.subtitle || entry.dates) {
      let line2 = '';
      if (entry.subtitle) {
        line2 += `\\textit{${escapeLatex(entry.subtitle)}}`;
      }
      if (entry.dates) {
        if (line2) {
          line2 += ` \\hfill \\textit{${escapeLatex(entry.dates)}}`;
        } else {
          line2 += `\\hfill \\textit{${escapeLatex(entry.dates)}}`;
        }
      }
      lines.push(line2 + ' \\\\[-4pt]');
    }
  } else if (entry.title) {
    // Simple entry: just title (like awards)
    lines.push(`\\textbf{${escapeLatex(entry.title)}} \\\\[-2pt]`);
  }
  
  // Additional text lines
  if (entry.additionalText && entry.additionalText.length > 0) {
    for (const text of entry.additionalText) {
      lines.push(`${escapeLatex(text)} \\\\[-2pt]`);
    }
  }
  
  // Bullet points
  if (entry.bullets && entry.bullets.length > 0) {
    lines.push('\\begin{itemize}');
    for (const bullet of entry.bullets) {
      lines.push(`  \\item ${escapeLatex(bullet)}`);
    }
    lines.push('\\end{itemize}');
  }
  
  // Add spacing after entry
  lines.push('\\vspace{4pt}');
  
  return lines.join('\n');
}

/**
 * Convert FlexibleResume to plain text (for preview)
 */
export function flexibleResumeToText(resume: FlexibleResume): string {
  let text = `${resume.header.name}\n${resume.header.contactLine}\n\n`;
  
  for (const section of resume.sections) {
    text += `${section.name}\n${'─'.repeat(50)}\n`;
    
    if (section.rawContent) {
      text += `${section.rawContent}\n\n`;
      continue;
    }
    
    for (const entry of section.entries) {
      if (entry.title) {
        text += entry.title;
        if (entry.location) text += ` | ${entry.location}`;
        text += '\n';
      }
      
      if (entry.subtitle) {
        text += entry.subtitle;
        if (entry.dates) text += ` | ${entry.dates}`;
        text += '\n';
      } else if (entry.dates) {
        text += entry.dates + '\n';
      }
      
      if (entry.additionalText) {
        for (const t of entry.additionalText) {
          text += `${t}\n`;
        }
      }
      
      if (entry.bullets) {
        for (const bullet of entry.bullets) {
          text += `• ${bullet}\n`;
        }
      }
      
      text += '\n';
    }
  }
  
  return text;
}

