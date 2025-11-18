/**
 * Resume Parser
 * Extracts structured data from plain text resume
 */

import { Resume, EducationItem, ExperienceItem, ExtracurricularItem, SkillsAndInterests } from './resumeTypes';

export function parseResumeFromText(text: string): Resume {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Extract header (first few lines)
  const header = extractHeader(lines);
  
  // Find section boundaries
  const educationStart = findSectionIndex(lines, ['education']);
  const experienceStart = findSectionIndex(lines, ['experience', 'work experience', 'work']);
  const extracurricularStart = findSectionIndex(lines, ['extracurricular', 'activities', 'projects']);
  const skillsStart = findSectionIndex(lines, ['skills', 'interests']);
  
  // Extract sections
  const education = extractEducation(
    lines.slice(educationStart, experienceStart > 0 ? experienceStart : undefined)
  );
  
  const experience = extractExperience(
    lines.slice(experienceStart, extracurricularStart > 0 ? extracurricularStart : undefined)
  );
  
  const extracurriculars = extractExtracurriculars(
    lines.slice(extracurricularStart, skillsStart > 0 ? skillsStart : undefined)
  );
  
  const skillsAndInterests = extractSkillsAndInterests(
    lines.slice(skillsStart)
  );
  
  return {
    header,
    education,
    experience,
    extracurriculars,
    skillsAndInterests,
  };
}

function extractHeader(lines: string[]): Resume['header'] {
  // First line is usually the name
  const name = lines[0] || '';
  
  // Second line is usually contact info
  const contactLine = lines[1] || '';
  const parts = contactLine.split('|').map(p => p.trim());
  
  let location = '';
  let email = '';
  let phone = '';
  
  for (const part of parts) {
    if (part.includes('@')) {
      email = part.replace(/[<>\[\]()]/g, '').trim();
    } else if (/[\d\-\(\)\s]{10,}/.test(part)) {
      phone = part.trim();
    } else if (part.length > 0) {
      location = part.trim();
    }
  }
  
  return { name, location, email, phone };
}

function findSectionIndex(lines: string[], keywords: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (keywords.some(kw => line.includes(kw) && line.length < 50)) {
      return i + 1; // Return line after header
    }
  }
  return -1;
}

function extractEducation(lines: string[]): EducationItem[] {
  const items: EducationItem[] = [];
  let current: Partial<EducationItem> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is a new institution (usually starts with university/college name)
    if (isInstitutionName(line) && !line.toLowerCase().includes('coursework') && !line.toLowerCase().includes('gpa')) {
      if (current && current.institution) {
        items.push(current as EducationItem);
      }
      current = { institution: line, location: '', degree: '', gradDate: '' };
    } else if (current) {
      // Check for location (right-aligned, usually city, state)
      if (isLocation(line) && !current.location) {
        current.location = line;
      }
      // Check for date (right-aligned, usually contains year)
      else if (isDate(line) && !current.gradDate) {
        current.gradDate = line;
      }
      // Check for degree
      else if (line.toLowerCase().includes('b.') || line.toLowerCase().includes('m.') || 
               line.toLowerCase().includes('phd') || line.toLowerCase().includes('degree')) {
        current.degree = line;
      }
      // Check for GPA/SAT
      else if (line.toLowerCase().includes('gpa') || line.toLowerCase().includes('sat')) {
        const gpaMatch = line.match(/gpa[:\s]+([\d.]+)/i);
        const satMatch = line.match(/sat[:\s]+(\d+)/i);
        if (gpaMatch) current.gpa = gpaMatch[1];
        if (satMatch) current.sat = satMatch[1];
      }
      // Check for coursework
      else if (line.toLowerCase().includes('coursework') || line.toLowerCase().includes('relevant')) {
        const courseworkText = line.replace(/.*coursework[:\s]+/i, '').trim();
        current.coursework = courseworkText.split(',').map(c => c.trim()).filter(c => c.length > 0);
      }
    }
  }
  
  if (current && current.institution) {
    items.push(current as EducationItem);
  }
  
  return items;
}

function extractExperience(lines: string[]): ExperienceItem[] {
  const items: ExperienceItem[] = [];
  let current: Partial<ExperienceItem> | null = null;
  let collectingBullets = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is a new company (usually a company name, not a bullet)
    if (isCompanyName(line) && !line.startsWith('•') && !line.startsWith('-')) {
      if (current && current.company) {
        items.push(current as ExperienceItem);
      }
      current = { company: line, location: '', title: '', start: '', end: '', bullets: [] };
      collectingBullets = false;
    } else if (current) {
      // Check for title/role first (may have "Role:" prefix)
      if (!current.title && !line.startsWith('•') && !isLocation(line) && !isDateRange(line)) {
        // Handle "Role:" prefix
        if (line.toLowerCase().startsWith('role:')) {
          current.title = line.replace(/^role:\s*/i, '').trim();
        } else if (!isDateRange(line) && !isLocation(line) && line.length > 0 && line.length < 100) {
          // Only set title if it's not already set and line looks like a title
          current.title = line;
        }
      }
      // Check for location
      else if (isLocation(line) && !current.location) {
        current.location = line;
      }
      // Check for date range
      else if (isDateRange(line) && !current.start) {
        const dateMatch = line.match(/(.+?)\s*[-–]\s*(.+)/);
        if (dateMatch) {
          current.start = dateMatch[1].trim();
          current.end = dateMatch[2].trim();
        }
      }
      // Collect bullet points
      else if (line.startsWith('•') || line.startsWith('-')) {
        collectingBullets = true;
        const bullet = line.replace(/^[•\-]\s*/, '').trim();
        if (bullet.length > 0) {
          current.bullets = current.bullets || [];
          current.bullets.push(bullet);
        }
      }
    }
  }
  
  if (current && current.company) {
    items.push(current as ExperienceItem);
  }
  
  return items;
}

function extractExtracurriculars(lines: string[]): ExtracurricularItem[] {
  const items: ExtracurricularItem[] = [];
  let current: Partial<ExtracurricularItem> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is a new organization
    if (isOrganizationName(line) && !line.startsWith('•') && !line.startsWith('-')) {
      if (current && current.org) {
        items.push(current as ExtracurricularItem);
      }
      current = { org: line, location: '', role: '', start: '', end: '', bullets: [] };
    } else if (current) {
      // Check for role first (may have "Role:" prefix)
      if (!current.role && !line.startsWith('•') && !isLocation(line) && !isDateRange(line)) {
        // Handle "Role:" prefix
        if (line.toLowerCase().startsWith('role:')) {
          current.role = line.replace(/^role:\s*/i, '').trim();
        } else if (!isDateRange(line) && !isLocation(line) && line.length > 0 && line.length < 100) {
          // Only set role if it's not already set and line looks like a role
          current.role = line;
        }
      }
      // Check for location
      else if (isLocation(line) && !current.location) {
        current.location = line;
      }
      // Check for date range
      else if (isDateRange(line) && !current.start) {
        const dateMatch = line.match(/(.+?)\s*[-–]\s*(.+)/);
        if (dateMatch) {
          current.start = dateMatch[1].trim();
          current.end = dateMatch[2].trim();
        }
      }
      // Collect bullet points
      else if (line.startsWith('•') || line.startsWith('-')) {
        const bullet = line.replace(/^[•\-]\s*/, '').trim();
        if (bullet.length > 0) {
          current.bullets = current.bullets || [];
          current.bullets.push(bullet);
        }
      }
    }
  }
  
  if (current && current.org) {
    items.push(current as ExtracurricularItem);
  }
  
  return items;
}

function extractSkillsAndInterests(lines: string[]): SkillsAndInterests {
  const result: SkillsAndInterests = { skills: '', interests: '' };
  
  for (const line of lines) {
    if (line.toLowerCase().includes('skills') || line.toLowerCase().includes('languages')) {
      const match = line.match(/(?:skills| languages)[:\s]+(.+)/i);
      if (match) {
        result.skills = match[1].trim();
      }
    } else if (line.toLowerCase().includes('interests')) {
      const match = line.match(/interests[:\s]+(.+)/i);
      if (match) {
        result.interests = match[1].trim();
      }
    } else if (line.toLowerCase().includes('involvements')) {
      const match = line.match(/involvements[:\s]+(.+)/i);
      if (match) {
        result.otherInvolvements = match[1].trim();
      }
    }
  }
  
  return result;
}

// Helper functions
function isInstitutionName(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes('university') ||
    lower.includes('college') ||
    lower.includes('school') ||
    lower.includes('institute')
  );
}

function isCompanyName(line: string): boolean {
  // Usually a company name if it's not a bullet, not a date, not a location pattern
  return (
    !line.startsWith('•') &&
    !line.startsWith('-') &&
    !isDateRange(line) &&
    !isLocation(line) &&
    line.length > 2 &&
    line.length < 100
  );
}

function isOrganizationName(line: string): boolean {
  // Similar to company name
  return isCompanyName(line);
}

function isLocation(line: string): boolean {
  // Usually city, state format or just city
  return /^[A-Z][a-z]+(?:\s*,\s*[A-Z]{2})?$/.test(line) || 
         /^[A-Z][a-z]+\s+[A-Z]{2}$/.test(line);
}

function isDate(line: string): boolean {
  // Contains month names or year patterns
  return /(january|february|march|april|may|june|july|august|september|october|november|december|\d{4})/i.test(line);
}

function isDateRange(line: string): boolean {
  // Contains date range pattern like "Jan 2020 - Dec 2022" or "2020 - 2022"
  return /[-–]/.test(line) && isDate(line);
}

