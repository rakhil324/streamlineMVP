/**
 * Cover Letter LaTeX Generator
 * Generates professional LaTeX cover letters with proper formatting
 */

export interface CoverLetterData {
  // Header info
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;

  // Letter info
  date: string;
  recipientName?: string;
  recipientTitle?: string;
  companyName: string;
  companyAddress?: string;

  // Content
  salutation: string;
  bodyParagraphs: string[];
  closing: string;
  signature: string;
}

/**
 * Escape special LaTeX characters
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
    .replace(/"/g, "''")
    .replace(/'/g, "'");
}

/**
 * Parse raw cover letter text into structured data
 */
export function parseCoverLetterText(text: string, companyName: string): CoverLetterData {
  const lines = text.split('\n').map(l => l.trim());

  // Find different sections
  let name = '';
  let email = '';
  let phone = '';
  let addressLine = '';
  let cityStateZip = '';
  let date = '';
  let salutation = 'Dear Hiring Manager,';
  let closing = 'Sincerely,';
  let signature = '';
  const bodyParagraphs: string[] = [];

  let section: 'header' | 'date' | 'salutation' | 'body' | 'closing' = 'header';
  let currentParagraph = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines but track paragraph breaks
    if (!line) {
      if (currentParagraph && section === 'body') {
        bodyParagraphs.push(currentParagraph.trim());
        currentParagraph = '';
      }
      continue;
    }

    // Detect header elements (first few lines)
    if (section === 'header') {
      // Check for email
      if (line.includes('@') && !email) {
        // Line might be "email | phone" or just "email@domain.com"
        const parts = line.split(/[|,]/).map(p => p.trim());
        for (const part of parts) {
          if (part.includes('@')) email = part;
          else if (part.match(/\d{3}.*\d{4}/)) phone = part;
        }
        continue;
      }

      // Check for phone number
      if (line.match(/^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/) && !phone) {
        phone = line;
        continue;
      }

      // Check for date (e.g., "November 30, 2025" or "11/30/2025")
      if (line.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$/i) ||
          line.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        date = line;
        section = 'date';
        continue;
      }

      // Check for address pattern (street address)
      if (line.match(/^\d+\s+\w+/)) {
        addressLine = line;
        continue;
      }

      // Check for city, state zip
      if (line.match(/^[A-Za-z\s]+,?\s+[A-Z]{2},?\s+\d{5}/)) {
        cityStateZip = line;
        continue;
      }

      // First non-empty line without patterns is likely the name
      if (!name && !line.includes('@') && !line.match(/\d{3}.*\d{4}/)) {
        name = line;
        continue;
      }
    }

    // Detect salutation
    if (line.toLowerCase().startsWith('dear ')) {
      salutation = line;
      section = 'body';
      continue;
    }

    // Detect closing
    if (line.match(/^(Sincerely|Best regards|Regards|Thank you|Respectfully|Yours truly),?$/i)) {
      if (currentParagraph) {
        bodyParagraphs.push(currentParagraph.trim());
        currentParagraph = '';
      }
      closing = line.endsWith(',') ? line : line + ',';
      section = 'closing';
      continue;
    }

    // After closing, the next non-empty line is the signature
    if (section === 'closing' && line) {
      signature = line;
      continue;
    }

    // Body paragraphs
    if (section === 'body' || section === 'date') {
      section = 'body';
      currentParagraph += (currentParagraph ? ' ' : '') + line;
    }
  }

  // Add any remaining paragraph
  if (currentParagraph) {
    bodyParagraphs.push(currentParagraph.trim());
  }

  // Use defaults if not found
  if (!date) {
    date = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  if (!signature) signature = name;

  return {
    name,
    email: email || undefined,
    phone: phone || undefined,
    address: addressLine || undefined,
    city: cityStateZip ? cityStateZip.split(',')[0]?.trim() : undefined,
    state: cityStateZip ? cityStateZip.match(/[A-Z]{2}/)?.[0] : undefined,
    zip: cityStateZip ? cityStateZip.match(/\d{5}/)?.[0] : undefined,
    date,
    companyName,
    salutation,
    bodyParagraphs,
    closing,
    signature,
  };
}

/**
 * Generate LaTeX for a cover letter
 */
export function generateCoverLetterLatex(data: CoverLetterData): string {
  const escapedData = {
    name: escapeLatex(data.name),
    email: data.email ? escapeLatex(data.email) : '',
    phone: data.phone ? escapeLatex(data.phone) : '',
    address: data.address ? escapeLatex(data.address) : '',
    city: data.city ? escapeLatex(data.city) : '',
    state: data.state ? escapeLatex(data.state) : '',
    zip: data.zip ? escapeLatex(data.zip) : '',
    date: escapeLatex(data.date),
    recipientName: data.recipientName ? escapeLatex(data.recipientName) : '',
    recipientTitle: data.recipientTitle ? escapeLatex(data.recipientTitle) : '',
    companyName: escapeLatex(data.companyName),
    companyAddress: data.companyAddress ? escapeLatex(data.companyAddress) : '',
    salutation: escapeLatex(data.salutation),
    closing: escapeLatex(data.closing),
    signature: escapeLatex(data.signature),
    bodyParagraphs: data.bodyParagraphs.map(p => escapeLatex(p)),
  };

  // Build contact line
  const contactParts = [];
  if (escapedData.email) contactParts.push(escapedData.email);
  if (escapedData.phone) contactParts.push(escapedData.phone);
  const contactLine = contactParts.join(' $|$ ');

  // Build address line
  let addressLine = '';
  if (escapedData.address) {
    addressLine = escapedData.address;
    if (escapedData.city || escapedData.state || escapedData.zip) {
      const cityStateZip = [
        escapedData.city,
        escapedData.state,
        escapedData.zip
      ].filter(Boolean).join(', ');
      addressLine += ` \\\\ ${cityStateZip}`;
    }
  }

  return `\\documentclass[11pt,letterpaper]{article}

% Page geometry
\\usepackage[margin=1in]{geometry}

% Fonts
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}

% Disable page numbers
\\pagenumbering{gobble}

% Paragraph formatting
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{12pt}

% Hyperlinks (optional, for email)
\\usepackage[hidelinks]{hyperref}

\\begin{document}

% Header with name and contact info
\\begin{center}
{\\Large\\textbf{${escapedData.name}}}

${contactLine ? `${contactLine}` : ''}
${addressLine ? `\\\\[4pt] ${addressLine}` : ''}
\\end{center}

\\vspace{12pt}

% Date
${escapedData.date}

\\vspace{12pt}

% Recipient (if known)
${escapedData.recipientName ? `${escapedData.recipientName}` : 'Hiring Manager'}${escapedData.recipientTitle ? ` \\\\ ${escapedData.recipientTitle}` : ''} \\\\
${escapedData.companyName}${escapedData.companyAddress ? ` \\\\ ${escapedData.companyAddress}` : ''}

\\vspace{12pt}

% Salutation
${escapedData.salutation}

\\vspace{6pt}

% Body paragraphs
${escapedData.bodyParagraphs.map(p => p).join('\n\n')}

\\vspace{12pt}

% Closing
${escapedData.closing}

\\vspace{24pt}

% Signature
${escapedData.signature}

\\end{document}
`;
}

/**
 * Alternative simpler LaTeX template
 */
export function generateSimpleCoverLetterLatex(
  coverLetterText: string,
  companyName: string
): string {
  // Parse the cover letter into structured data
  const data = parseCoverLetterText(coverLetterText, companyName);
  return generateCoverLetterLatex(data);
}
