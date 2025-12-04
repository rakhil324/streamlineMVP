/**
 * LaTeX Resume Generator
 * Generates LaTeX code that matches the original resume format exactly
 */

export interface LatexResumeData {
  header: {
    name: string;
    location: string;
    phone: string;
    email: string;
    linkedin?: string;
    github?: string;
  };
  education: {
    institution: string;
    location: string;
    degree: string;
    gpa?: string;
    gradDate: string;
    coursework?: string[];
    activities?: string;
  }[];
  experience: {
    company: string;
    location: string;
    title: string;
    start: string;
    end: string;
    bullets: string[];
  }[];
  projects: {
    name: string;
    technologies?: string;
    bullets: string[];
  }[];
  skills: {
    languages?: string;
    frameworks?: string;
    tools?: string;
    interests?: string;
  };
}

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
 * Generates complete LaTeX document from resume data
 */
export function generateLatexResume(data: LatexResumeData): string {
  const latex = `\\documentclass[10pt, letterpaper]{article}

% Packages
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{hyperref}
\\usepackage{xcolor}

% Page geometry - tight margins like original
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
\\titlespacing*{\\section}{0pt}{8pt}{4pt}

% Tight list spacing
\\setlist[itemize]{nosep, leftmargin=1.5em, label=\\textbullet}

% No paragraph indent
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}

% Custom commands
\\newcommand{\\resumeSubheading}[4]{
  \\textbf{#1} \\hfill #2 \\\\
  \\textit{#3} \\hfill \\textit{#4} \\\\[-2pt]
}

\\newcommand{\\projectHeading}[2]{
  \\textbf{#1} \\textbar\\ \\textit{#2} \\\\[-2pt]
}

\\begin{document}

% ===== HEADER =====
\\begin{center}
  {\\LARGE\\bfseries ${escapeLatex(data.header.name)}} \\\\[2pt]
  ${escapeLatex(data.header.location)} \\textbar\\ ${escapeLatex(data.header.phone)} \\textbar\\ ${escapeLatex(data.header.email)}
\\end{center}

\\vspace{-8pt}

% ===== EDUCATION =====
\\section*{EDUCATION}
${data.education.map(edu => `
\\textbf{${escapeLatex(edu.institution)}} \\hfill ${escapeLatex(edu.location)} \\\\
\\textit{${escapeLatex(edu.degree)}${edu.gpa ? ` \\textbar\\ GPA: ${escapeLatex(edu.gpa)}` : ''}} \\hfill \\textit{${escapeLatex(edu.gradDate)}} \\\\[-2pt]
${edu.coursework && edu.coursework.length > 0 ? `\\textbf{Courses:} ${escapeLatex(edu.coursework.join(', '))} \\\\[-2pt]` : ''}
${edu.activities ? `\\textbf{Activities:} ${escapeLatex(edu.activities)} \\\\[-2pt]` : ''}
`).join('\n')}

% ===== EXPERIENCE =====
\\section*{EXPERIENCE}
${data.experience.map(exp => `
\\textbf{${escapeLatex(exp.company)}} \\hfill ${escapeLatex(exp.location)} \\\\
\\textit{${escapeLatex(exp.title)}} \\hfill \\textit{${escapeLatex(exp.start)} - ${escapeLatex(exp.end)}} \\\\[-4pt]
\\begin{itemize}
${exp.bullets.map(bullet => `  \\item ${escapeLatex(bullet)}`).join('\n')}
\\end{itemize}
\\vspace{4pt}
`).join('\n')}

% ===== PROJECTS =====
${data.projects.length > 0 ? `
\\section*{PROJECTS}
${data.projects.map(proj => `
\\textbf{${escapeLatex(proj.name)}}${proj.technologies ? ` \\textbar\\ \\textit{${escapeLatex(proj.technologies)}}` : ''} \\\\[-4pt]
\\begin{itemize}
${proj.bullets.map(bullet => `  \\item ${escapeLatex(bullet)}`).join('\n')}
\\end{itemize}
\\vspace{4pt}
`).join('\n')}
` : ''}

% ===== SKILLS =====
\\section*{SKILLS}
${data.skills.languages ? `\\textbf{Languages:} ${escapeLatex(data.skills.languages)} \\\\[-2pt]` : ''}
${data.skills.frameworks ? `\\textbf{Frameworks \\& Libraries:} ${escapeLatex(data.skills.frameworks)} \\\\[-2pt]` : ''}
${data.skills.tools ? `\\textbf{Development/Software Tools:} ${escapeLatex(data.skills.tools)} \\\\[-2pt]` : ''}
${data.skills.interests ? `\\textbf{Interests:} ${escapeLatex(data.skills.interests)}` : ''}

\\end{document}
`;

  return latex;
}

/**
 * Generate tailoring prompt for LLM
 */
export function generateLatexPrompt(
  resumeData: LatexResumeData,
  jobDescription: string,
  jobTitle: string,
  companyName: string
): string {
  return `You are a resume tailoring expert. Modify the resume content for this job.

JOB: ${jobTitle} at ${companyName}

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME DATA:
${JSON.stringify(resumeData, null, 2)}

STRICT RULES:
1. DO NOT change header (name, contact info) - keep EXACTLY as provided
2. DO NOT change education section - keep EXACTLY as provided  
3. DO NOT change skills section - keep EXACTLY as provided
4. ONLY modify experience and project BULLET POINTS
5. Keep the SAME NUMBER of bullets per experience/project
6. Rephrase bullets to incorporate relevant keywords from job description
7. Use strong action verbs and quantifiable results
8. Keep each bullet concise (under 150 characters)

Return ONLY valid JSON matching the EXACT same structure as input. No markdown code blocks.`;
}
