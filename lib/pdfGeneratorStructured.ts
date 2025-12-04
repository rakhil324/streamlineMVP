/**
 * Structured PDF Generator
 * Matches original resume format exactly - compact layout
 */

import { Resume } from './resumeTypes';

export async function generatePDFFromResume(resume: Resume, filename: string): Promise<Buffer> {
  const PDFDocument = require('pdfkit');
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,  // Smaller margins like original
        size: 'LETTER',
        bufferPages: true,
      });
      
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));
      
      const pageWidth = doc.page.width;
      const margin = 36;
      const contentWidth = pageWidth - (2 * margin);
      
      let y = 36;
      
      // ========== HEADER - CENTERED ==========
      doc.font('Helvetica-Bold').fontSize(18);
      doc.text(resume.header?.name || '', margin, y, { 
        width: contentWidth, 
        align: 'center' 
      });
      y += 20;
      
      doc.font('Helvetica').fontSize(9);
      const contactParts = [
        resume.header?.location,
        resume.header?.phone,
        resume.header?.email
      ].filter(Boolean);
      doc.text(contactParts.join(' | '), margin, y, { 
        width: contentWidth, 
        align: 'center' 
      });
      y += 14;
      
      // ========== EDUCATION ==========
      y = drawSectionHeader(doc, 'EDUCATION', margin, y, contentWidth);
      
      for (const edu of resume.education || []) {
        // Line 1: Institution (left) | Location (right)
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text(edu.institution || '', margin, y);
        doc.font('Helvetica').fontSize(9);
        doc.text(edu.location || '', margin, y, { width: contentWidth, align: 'right' });
        y += 11;
        
        // Line 2: Degree + GPA (left) | Date (right)
        doc.font('Helvetica-Oblique').fontSize(9);
        let degreeLine = edu.degree || '';
        if (edu.gpa) degreeLine += ` | GPA: ${edu.gpa}`;
        doc.text(degreeLine, margin, y);
        if (edu.gradDate) {
          doc.text(edu.gradDate, margin, y, { width: contentWidth, align: 'right' });
        }
        y += 11;
        
        // Coursework
        if (edu.coursework && edu.coursework.length > 0) {
          doc.font('Helvetica-Bold').fontSize(8);
          doc.text('Courses: ', margin, y, { continued: true });
          doc.font('Helvetica').fontSize(8);
          doc.text(edu.coursework.join(', '));
          y += 10;
        }
      }
      y += 2;
      
      // ========== EXPERIENCE ==========
      y = drawSectionHeader(doc, 'EXPERIENCE', margin, y, contentWidth);
      
      for (const exp of resume.experience || []) {
        // Line 1: Company (left) | Location (right)
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text(exp.company || '', margin, y);
        doc.font('Helvetica').fontSize(9);
        doc.text(exp.location || '', margin, y, { width: contentWidth, align: 'right' });
        y += 11;
        
        // Line 2: Title (left) | Dates (right)
        doc.font('Helvetica-Oblique').fontSize(9);
        doc.text(exp.title || '', margin, y);
        const dateStr = `${exp.start || ''} - ${exp.end || ''}`;
        doc.text(dateStr, margin, y, { width: contentWidth, align: 'right' });
        y += 11;
        
        // Bullets - compact
        doc.font('Helvetica').fontSize(8);
        for (const bullet of exp.bullets || []) {
          if (bullet && bullet.trim()) {
            const bulletText = `●  ${bullet}`;
            const textHeight = doc.heightOfString(bulletText, { width: contentWidth - 12 });
            doc.text(bulletText, margin + 8, y, { width: contentWidth - 12 });
            y += textHeight;
          }
        }
        y += 3;
      }
      
      // ========== PROJECTS ==========
      const projects = resume.extracurriculars || [];
      if (projects.length > 0) {
        y = drawSectionHeader(doc, 'PROJECTS', margin, y, contentWidth);
        
        for (const proj of projects) {
          // Project name | Technologies
          doc.font('Helvetica-Bold').fontSize(9);
          let projTitle = proj.org || '';
          if (proj.role) {
            projTitle += ' | ';
          }
          doc.text(projTitle, margin, y, { continued: !!proj.role });
          if (proj.role) {
            doc.font('Helvetica-Oblique').fontSize(9);
            doc.text(proj.role);
          }
          y += 11;
          
          // Bullets - compact
          doc.font('Helvetica').fontSize(8);
          for (const bullet of proj.bullets || []) {
            if (bullet && bullet.trim()) {
              const bulletText = `●  ${bullet}`;
              const textHeight = doc.heightOfString(bulletText, { width: contentWidth - 12 });
              doc.text(bulletText, margin + 8, y, { width: contentWidth - 12 });
              y += textHeight;
            }
          }
          y += 3;
        }
      }
      
      // ========== SKILLS ==========
      y = drawSectionHeader(doc, 'SKILLS', margin, y, contentWidth);
      
      const skills = resume.skillsAndInterests;
      if (skills) {
        doc.fontSize(8);
        
        if (skills.skills) {
          doc.font('Helvetica-Bold').text('Languages: ', margin, y, { continued: true });
          doc.font('Helvetica').text(skills.skills);
          y += 10;
        }
        
        if (skills.frameworks) {
          doc.font('Helvetica-Bold').text('Frameworks & Libraries: ', margin, y, { continued: true });
          doc.font('Helvetica').text(skills.frameworks);
          y += 10;
        }
        
        if (skills.tools) {
          doc.font('Helvetica-Bold').text('Development/Software Tools: ', margin, y, { continued: true });
          doc.font('Helvetica').text(skills.tools);
          y += 10;
        }
        
        if (skills.interests) {
          doc.font('Helvetica-Bold').text('Interests: ', margin, y, { continued: true });
          doc.font('Helvetica').text(skills.interests);
          y += 10;
        }
      }
      
      doc.end();
    } catch (err: any) {
      reject(new Error(`PDF generation error: ${err.message}`));
    }
  });
}

function drawSectionHeader(doc: any, title: string, margin: number, y: number, contentWidth: number): number {
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text(title, margin, y);
  y += 11;
  
  // Black line under section header
  doc.strokeColor('#000000').lineWidth(0.5);
  doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
  
  return y + 4;
}
