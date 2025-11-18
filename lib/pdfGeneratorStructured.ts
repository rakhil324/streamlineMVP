/**
 * Structured PDF Generator
 * Generates PDF from structured Resume object with precise formatting
 * Matches the exact format from the provided image
 */

import { Resume } from './resumeTypes';

export async function generatePDFFromResume(resume: Resume, filename: string): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFDocument = require('pdfkit');
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: 'LETTER',
      });
      
      const chunks: Buffer[] = [];
      let hasError = false;
      
      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      doc.on('end', () => {
        if (!hasError) {
          const buffer = Buffer.concat(chunks);
          if (buffer.length === 0) {
            reject(new Error('Generated PDF buffer is empty'));
          } else {
            resolve(buffer);
          }
        }
      });
      
      doc.on('error', (err: Error) => {
        hasError = true;
        reject(err);
      });
      
      // Constants for formatting
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 35; // Reduced from 50 to fit more content on one page
      const rightMargin = pageWidth - margin;
      const contentWidth = pageWidth - (2 * margin);
      const minGap = 20; // Minimum gap between left and right text to prevent overlap
      
      // Header
      doc.font('Helvetica-Bold').fontSize(20);
      const nameWidth = doc.widthOfString(resume.header.name);
      doc.text(resume.header.name, (pageWidth - nameWidth) / 2, margin);
      
      doc.font('Helvetica').fontSize(10);
      const contactInfo = `${resume.header.location} | ${resume.header.email} | ${resume.header.phone}`;
      const contactWidth = doc.widthOfString(contactInfo);
      doc.text(contactInfo, (pageWidth - contactWidth) / 2, margin + 25);
      
      let y = margin + 45;
      
      // EDUCATION Section
      y = addSectionHeader(doc, 'EDUCATION', margin, y, contentWidth);
      
      for (const edu of resume.education) {
        doc.font('Helvetica').fontSize(11);
        doc.text(edu.institution, margin, y);
        y += 12;
        
        // Date on line below institution, left-aligned, italic
        if (edu.gradDate) {
          doc.font('Helvetica-Oblique').fontSize(9);
          doc.text(edu.gradDate, margin + 5, y);
          y += 11;
        }
        
        // Degree
        if (edu.degree) {
          doc.font('Helvetica').fontSize(10);
          doc.text(edu.degree, margin + 5, y);
          y += 11;
        }
        
        // GPA/SAT
        if (edu.gpa || edu.sat) {
          doc.fontSize(10);
          const gpaSat = [edu.gpa ? `GPA: ${edu.gpa}` : '', edu.sat ? `SAT: ${edu.sat}` : '']
            .filter(Boolean)
            .join(' ');
          doc.text(gpaSat, margin + 5, y);
          y += 11;
        }
        
        // Coursework
        if (edu.coursework && edu.coursework.length > 0) {
          doc.fontSize(10);
          const courseworkText = `Relevant Coursework: ${edu.coursework.join(', ')}`;
          doc.text(courseworkText, margin + 5, y, { width: contentWidth - 5, lineGap: 0.5 });
          y += 11;
        }
        
        y += 3;
      }
      
      // Add extra spacing before next section header to prevent overlap with bullets
      y += 4;
      
      // WORK EXPERIENCE Section
      y = addSectionHeader(doc, 'WORK EXPERIENCE', margin, y, contentWidth);
      
      for (const exp of resume.experience) {
        doc.font('Helvetica-Bold').fontSize(11);
        doc.text(exp.company, margin, y);
        y += 12;
        
        // Title (italic, indented, left-aligned) - always render if it exists
        if (exp.title && exp.title.trim().length > 0) {
          doc.font('Helvetica-Oblique').fontSize(10);
          doc.text(exp.title.trim(), margin + 5, y);
          y += 11;
        }
        
        // Date range, left-aligned, italic, indented
        const dateRange = `${exp.start} - ${exp.end}`;
        doc.font('Helvetica-Oblique').fontSize(9);
        doc.text(dateRange, margin + 5, y);
        y += 11;
        
        // Bullet points
        if (exp.bullets && exp.bullets.length > 0) {
          doc.font('Helvetica').fontSize(10);
          for (const bullet of exp.bullets) {
            if (!bullet || bullet.trim().length === 0) continue;
            const bulletText = `• ${bullet}`;
            // Calculate height if method exists, otherwise use fixed height
            let height = 10;
            try {
              if (typeof doc.heightOfString === 'function') {
                height = doc.heightOfString(bulletText, { width: contentWidth - 5, lineGap: 0.5 });
              }
            } catch (e) {
              // Fallback to fixed height
              height = 10;
            }
            doc.text(bulletText, margin + 5, y, { width: contentWidth - 5, lineGap: 0.5 });
            y += height + 2;
          }
        }
        
        y += 3;
      }
      
      // Add extra spacing before next section header to prevent overlap with bullets
      y += 4;
      
      // EXTRACURRICULAR ACTIVITIES & PROJECTS Section
      y = addSectionHeader(doc, 'EXTRACURRICULAR ACTIVITIES & PROJECTS', margin, y, contentWidth);
      
      for (const extra of resume.extracurriculars) {
        doc.font('Helvetica-Bold').fontSize(11);
        doc.text(extra.org, margin, y);
        y += 12;
        
        // Role (italic, indented, left-aligned) - always render if it exists
        if (extra.role && extra.role.trim().length > 0) {
          doc.font('Helvetica-Oblique').fontSize(10);
          doc.text(extra.role.trim(), margin + 5, y);
          y += 11;
        }
        
        // Date range, left-aligned, italic, indented
        const dateRange = `${extra.start} - ${extra.end}`;
        doc.font('Helvetica-Oblique').fontSize(9);
        doc.text(dateRange, margin + 5, y);
        y += 11;
        
        // Bullet points
        if (extra.bullets && extra.bullets.length > 0) {
          doc.font('Helvetica').fontSize(10);
          for (const bullet of extra.bullets) {
            if (!bullet || bullet.trim().length === 0) continue;
            const bulletText = `• ${bullet}`;
            // Calculate height if method exists, otherwise use fixed height
            let height = 10;
            try {
              if (typeof doc.heightOfString === 'function') {
                height = doc.heightOfString(bulletText, { width: contentWidth - 5, lineGap: 0.5 });
              }
            } catch (e) {
              // Fallback to fixed height
              height = 10;
            }
            doc.text(bulletText, margin + 5, y, { width: contentWidth - 5, lineGap: 0.5 });
            y += height + 2;
          }
        }
        
        y += 3;
      }
      
      // Add extra spacing before next section header to prevent overlap with bullets
      y += 4;
      
      // SKILLS & INTERESTS Section
      y = addSectionHeader(doc, 'SKILLS & INTERESTS', margin, y, contentWidth);
      
      doc.font('Helvetica').fontSize(10);
      
      if (resume.skillsAndInterests.skills) {
        doc.font('Helvetica-Bold');
        const label = 'Skills & Languages: ';
        const labelWidth = doc.widthOfString(label);
        doc.text(label, margin, y);
        doc.font('Helvetica');
        const skillsText = resume.skillsAndInterests.skills;
        doc.text(skillsText, margin + labelWidth, y, {
          width: contentWidth - labelWidth,
        });
        y += 11;
      }
      
      if (resume.skillsAndInterests.otherInvolvements) {
        doc.font('Helvetica-Bold');
        const label = 'Other Involvements: ';
        const labelWidth = doc.widthOfString(label);
        doc.text(label, margin, y);
        doc.font('Helvetica');
        const involvementsText = resume.skillsAndInterests.otherInvolvements;
        doc.text(involvementsText, margin + labelWidth, y, {
          width: contentWidth - labelWidth,
        });
        y += 11;
      }
      
      if (resume.skillsAndInterests.interests) {
        doc.font('Helvetica-Bold');
        const label = 'Interests: ';
        const labelWidth = doc.widthOfString(label);
        doc.text(label, margin, y);
        doc.font('Helvetica');
        const interestsText = resume.skillsAndInterests.interests;
        doc.text(interestsText, margin + labelWidth, y, {
          width: contentWidth - labelWidth,
        });
        y += 11;
      }
      
      // Final check - if we're too close to bottom, we've already adjusted spacing above
      
      doc.end();
    } catch (err: any) {
      reject(new Error(`PDF generation error: ${err.message}`));
    }
  });
}

function addSectionHeader(
  doc: any,
  title: string,
  margin: number,
  y: number,
  contentWidth: number
): number {
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text(title, margin, y);
  
  // Underline - extend all the way across the page
  const pageWidth = doc.page.width;
  const rightMargin = pageWidth - margin;
  doc.moveTo(margin, y + 12)
     .lineTo(rightMargin, y + 12) // Extended all the way across
     .stroke();
  
  return y + 18;
}

