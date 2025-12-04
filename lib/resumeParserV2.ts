/**
 * Resume Parser V2
 * Improved parsing logic that handles more resume formats
 * Specifically designed to work with the LaTeX generation system
 */

import { LatexResumeData } from './latexResume';

/**
 * Parses plain text resume into structured LatexResumeData format
 */
export function parseResumeToLatexData(text: string): LatexResumeData {
  console.log('=== RESUME PARSER DEBUG ===');
  
  const lines = text.split('\n');
  console.log('Total lines:', lines.length);
  
  // Find section boundaries by looking for section headers
  const sectionHeaders = findSectionHeaders(lines);
  console.log('Section headers found:', sectionHeaders);
  
  // Extract header (everything before first section)
  const header = extractHeader(lines, sectionHeaders.firstSectionLine);
  console.log('Header extracted:', header);
  
  // Extract each section based on boundaries
  const education = extractEducation(lines, sectionHeaders);
  console.log('Education entries:', education.length);
  
  const experience = extractExperience(lines, sectionHeaders);
  console.log('Experience entries:', experience.length);
  
  const projects = extractProjects(lines, sectionHeaders);
  console.log('Project entries:', projects.length);
  
  const skills = extractSkills(lines, sectionHeaders);
  console.log('Skills extracted:', Object.keys(skills).filter(k => skills[k as keyof typeof skills]).length);
  
  const result = {
    header,
    education,
    experience,
    projects,
    skills,
  };
  
  console.log('Parsed resume result:', JSON.stringify(result, null, 2));
  console.log('=== END PARSER DEBUG ===');
  
  return result;
}

interface SectionHeaders {
  education: number;
  experience: number;
  projects: number;
  skills: number;
  firstSectionLine: number;
  sectionOrder: string[];
}

/**
 * Finds all section headers in the resume
 */
function findSectionHeaders(lines: string[]): SectionHeaders {
  const result: SectionHeaders = {
    education: -1,
    experience: -1,
    projects: -1,
    skills: -1,
    firstSectionLine: lines.length,
    sectionOrder: [],
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().toUpperCase();
    
    // Check for section headers
    if (/^EDUCATION\b/.test(line)) {
      result.education = i;
      result.sectionOrder.push('education');
    } else if (/^(WORK\s+)?EXPERIENCE\b/.test(line)) {
      result.experience = i;
      result.sectionOrder.push('experience');
    } else if (/^(PROJECTS?|EXTRACURRICULAR)/i.test(line)) {
      result.projects = i;
      result.sectionOrder.push('projects');
    } else if (/^SKILLS?\b/.test(line)) {
      result.skills = i;
      result.sectionOrder.push('skills');
    }
  }
  
  // Find first section line
  const sectionLines = [result.education, result.experience, result.projects, result.skills]
    .filter(l => l >= 0);
  if (sectionLines.length > 0) {
    result.firstSectionLine = Math.min(...sectionLines);
  }
  
  return result;
}

/**
 * Gets the end line of a section (start of next section or end of file)
 */
function getSectionEnd(sectionStart: number, headers: SectionHeaders, totalLines: number): number {
  if (sectionStart < 0) return -1;
  
  const allStarts = [headers.education, headers.experience, headers.projects, headers.skills]
    .filter(s => s > sectionStart);
  
  return allStarts.length > 0 ? Math.min(...allStarts) : totalLines;
}

/**
 * Extracts header information
 */
function extractHeader(lines: string[], firstSectionLine: number): LatexResumeData['header'] {
  const headerLines = lines.slice(0, firstSectionLine).filter(l => l.trim());
  
  let name = '';
  let location = '';
  let phone = '';
  let email = '';
  
  for (const line of headerLines) {
    const trimmed = line.trim();
    
    // Skip decorative lines
    if (/^[─═\-_]+$/.test(trimmed)) continue;
    
    // Look for email
    const emailMatch = trimmed.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) email = emailMatch[0];
    
    // Look for phone
    const phoneMatch = trimmed.match(/\+?1?\s*[\(\d][\d\s\-\(\)]{8,}/);
    if (phoneMatch) phone = phoneMatch[0].trim();
    
    // Look for location (City, ST format)
    const locationMatch = trimmed.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*([A-Z]{2})\b/);
    if (locationMatch && !location) {
      location = `${locationMatch[1]}, ${locationMatch[2]}`;
    }
    
    // First non-contact line is usually the name
    if (!name && trimmed.length > 0 && !trimmed.includes('@') && !/\d{3}/.test(trimmed) && !/^(US\s+)?Citizen/i.test(trimmed)) {
      name = trimmed;
    }
  }
  
  return { name, location, phone, email };
}

/**
 * Extracts education entries
 */
function extractEducation(lines: string[], headers: SectionHeaders): LatexResumeData['education'] {
  if (headers.education < 0) return [];
  
  const endLine = getSectionEnd(headers.education, headers, lines.length);
  const sectionLines = lines.slice(headers.education + 1, endLine);
  
  const education: LatexResumeData['education'] = [];
  let current: Partial<LatexResumeData['education'][0]> | null = null;
  
  for (const line of sectionLines) {
    const trimmed = line.trim();
    if (!trimmed || /^[─═\-_]+$/.test(trimmed)) continue;
    
    // Check for university/college name
    if (/university|college|school|institute/i.test(trimmed)) {
      if (current?.institution) {
        education.push(current as LatexResumeData['education'][0]);
      }
      
      // Try to extract location from the end of line (City, ST format)
      // Handle extra whitespace that PDF extraction creates
      const normalizedLine = trimmed.replace(/\s{2,}/g, '  '); // Normalize multiple spaces to double space
      
      // Look for location at the end: "City, ST" or "City ST"
      const locationMatch = normalizedLine.match(/\s{2,}([A-Z][a-z]+(?:ville|town|burg|ton)?),?\s*([A-Z]{2})\s*$/);
      
      let institution = normalizedLine;
      let location = '';
      
      if (locationMatch) {
        location = `${locationMatch[1]}, ${locationMatch[2]}`;
        institution = normalizedLine.substring(0, normalizedLine.indexOf(locationMatch[0])).trim();
      }
      
      // Clean up institution name (remove pipe separators, extra spaces)
      institution = institution.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
      
      current = {
        institution,
        location,
        degree: '',
        gradDate: '',
        coursework: [],
      };
    } else if (current) {
      // Check for degree line
      if (/bachelor|master|b\.\s?[as]|m\.\s?[as]|ph\.?d|associate/i.test(trimmed)) {
        const gpaMatch = trimmed.match(/GPA[:\s]*([\d.]+)/i);
        if (gpaMatch) current.gpa = gpaMatch[1];
        
        // Look for date at the end of line (handles multi-space separation from PDF)
        const normalizedLine = trimmed.replace(/\s{2,}/g, '  ');
        const dateMatch = normalizedLine.match(/\s{2,}((?:January|February|March|April|May|June|July|August|September|October|November|December|Spring|Fall|Summer|Winter)?\s*\d{4})\s*$/i);
        if (dateMatch) {
          current.gradDate = dateMatch[1].trim();
        } else {
          // Try inline date
          const inlineDateMatch = trimmed.match(/((?:January|February|March|April|May|June|July|August|September|October|November|December|Spring|Fall|Summer|Winter)\s+)?\d{4}/i);
          if (inlineDateMatch) current.gradDate = inlineDateMatch[0];
        }
        
        // Extract just the degree part
        let degree = trimmed
          .replace(/GPA[:\s]*[\d.\/]+/gi, '')
          .replace(/\s{2,}.*$/, '') // Remove everything after multiple spaces (date/location)
          .replace(/\|/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (degree) current.degree = degree;
      }
      // Check for coursework
      else if (/course/i.test(trimmed)) {
        const courseworkText = trimmed.replace(/.*courses?[:\s]*/i, '').trim();
        current.coursework = courseworkText.split(',').map(c => c.trim()).filter(c => c);
      }
    }
  }
  
  if (current?.institution) {
    education.push(current as LatexResumeData['education'][0]);
  }
  
  return education;
}

/**
 * Extracts experience entries - more flexible parsing
 */
function extractExperience(lines: string[], headers: SectionHeaders): LatexResumeData['experience'] {
  if (headers.experience < 0) return [];
  
  const endLine = getSectionEnd(headers.experience, headers, lines.length);
  const sectionLines = lines.slice(headers.experience + 1, endLine);
  
  console.log('Experience section lines:', sectionLines.length);
  console.log('Experience section content:', sectionLines.slice(0, 20).join('\n'));
  
  const experience: LatexResumeData['experience'] = [];
  let current: Partial<LatexResumeData['experience'][0]> | null = null;
  let lastLineWasCompany = false;
  
  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const trimmed = line.trim();
    
    // Skip empty and decorative lines
    if (!trimmed || /^[─═\-_]+$/.test(trimmed)) continue;
    
    // Detect bullet points (including ● which is common in PDFs)
    const isBullet = /^[•●○▪▸\-\*]/.test(trimmed);
    
    if (isBullet) {
      // Add bullet to current entry
      if (current) {
        const bullet = trimmed.replace(/^[•●○▪▸\-\*]\s*/, '').trim();
        if (bullet.length > 10) {
          current.bullets = current.bullets || [];
          current.bullets.push(bullet);
        }
      }
      lastLineWasCompany = false;
    } else {
      // Non-bullet line - could be company, title, date, or location
      
      // Extract location if present at end of line
      const locationMatch = trimmed.match(/\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*([A-Z]{2})\s*$/);
      
      // Check if this is a job title line (contains title keywords)
      const isTitleLn = isTitleLine(trimmed);
      
      // Check if this contains a date range
      const hasDate = isDateLine(trimmed);
      
      // A company line is:
      // 1. Has company indicators (Inc., LLC, Partners, etc.)
      // 2. OR is a capitalized name with location but NO title keywords and NO date
      // 3. OR is followed by a title line (checked via context)
      const hasCompanyIndicator = /\b(inc\.?|llc|corp\.?|company|partners|solutions|technologies|systems|group|labs?)\b/i.test(trimmed);
      
      // Check if it looks like a standalone company name (capitalized words, possibly with location)
      const looksLikeCompanyName = 
        !isBullet && 
        !isTitleLn &&
        !hasDate &&
        /^[A-Z]/.test(trimmed) &&
        trimmed.length < 80;
      
      const isCompanyLine = hasCompanyIndicator || (looksLikeCompanyName && locationMatch);
      
      // If the previous line was a company and this line is a title, don't treat as new company
      if (lastLineWasCompany && isTitleLn) {
        // This is a title line for the previous company
        if (current) {
          let titlePart = trimmed;
          if (hasDate) {
            const dateMatch = extractDateRange(trimmed);
            if (dateMatch) {
              current.start = dateMatch.start;
              current.end = dateMatch.end;
              titlePart = trimmed.replace(dateMatch.full, '').trim();
            }
          }
          current.title = titlePart;
        }
        lastLineWasCompany = false;
      } else if (isCompanyLine) {
        // Save previous entry
        if (current?.company && current.bullets && current.bullets.length > 0) {
          experience.push(current as LatexResumeData['experience'][0]);
        }
        
        let company = trimmed;
        let location = '';
        
        if (locationMatch) {
          location = `${locationMatch[1]}, ${locationMatch[2]}`;
          company = trimmed.replace(locationMatch[0], '').trim();
        }
        
        // Clean up company name (remove extra spaces)
        company = company.replace(/\s+/g, ' ').trim();
        
        current = {
          company,
          location,
          title: '',
          start: '',
          end: '',
          bullets: [],
        };
        lastLineWasCompany = true;
      } else if (current) {
        // Try to extract title and/or date
        if (isTitleLn && !current.title) {
          let titlePart = trimmed;
          if (hasDate) {
            const dateMatch = extractDateRange(trimmed);
            if (dateMatch) {
              current.start = dateMatch.start;
              current.end = dateMatch.end;
              titlePart = trimmed.replace(dateMatch.full, '').trim();
            }
          }
          current.title = titlePart;
        } else if (hasDate && !current.start) {
          const dateMatch = extractDateRange(trimmed);
          if (dateMatch) {
            current.start = dateMatch.start;
            current.end = dateMatch.end;
          }
        }
        lastLineWasCompany = false;
      }
    }
  }
  
  // Don't forget last entry
  if (current?.company && current.bullets && current.bullets.length > 0) {
    experience.push(current as LatexResumeData['experience'][0]);
  }
  
  return experience;
}

/**
 * Checks if a line looks like a job title
 */
function isTitleLine(line: string): boolean {
  const titleKeywords = /\b(intern|engineer|developer|analyst|manager|consultant|designer|specialist|associate|coordinator|assistant|director|lead|senior|junior|staff|principal)\b/i;
  return titleKeywords.test(line);
}

/**
 * Checks if a line contains a date range
 */
function isDateLine(line: string): boolean {
  // Matches: "January 2024 - Present", "Jan 2024 - Aug 2024", "2024 - 2025", etc.
  return /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|spring|summer|fall|winter)?\s*\d{4}\s*[-–—]\s*(present|\d{4}|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec|spring|summer|fall|winter)/i.test(line);
}

/**
 * Extracts date range from a line
 */
function extractDateRange(line: string): { start: string; end: string; full: string } | null {
  const datePattern = /(((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Spring|Summer|Fall|Winter)\s+)?\d{4})\s*[-–—]\s*(((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Spring|Summer|Fall|Winter)\s+)?\d{4}|Present)/i;
  const match = line.match(datePattern);
  if (match) {
    return {
      start: match[1].trim(),
      end: match[3].trim(),
      full: match[0]
    };
  }
  return null;
}

/**
 * Extracts projects
 */
function extractProjects(lines: string[], headers: SectionHeaders): LatexResumeData['projects'] {
  if (headers.projects < 0) return [];
  
  const endLine = getSectionEnd(headers.projects, headers, lines.length);
  const sectionLines = lines.slice(headers.projects + 1, endLine);
  
  console.log('Projects section lines:', sectionLines.length);
  
  const projects: LatexResumeData['projects'] = [];
  let current: Partial<LatexResumeData['projects'][0]> | null = null;
  
  for (const line of sectionLines) {
    const trimmed = line.trim();
    if (!trimmed || /^[─═\-_]+$/.test(trimmed)) continue;
    
    const isBullet = /^[•●○▪▸\-\*]/.test(trimmed);
    
    if (isBullet) {
      if (current) {
        const bullet = trimmed.replace(/^[•●○▪▸\-\*]\s*/, '').trim();
        if (bullet.length > 10) {
          current.bullets = current.bullets || [];
          current.bullets.push(bullet);
        }
      }
    } else {
      // Non-bullet line
      // Check if this is a new project or a sub-section of current project
      
      // A new project line typically has:
      // 1. A pipe with technologies: "ProjectName | Tech1, Tech2"
      // 2. Or starts with a distinctive name that's not a sub-heading
      
      const hasTechPipe = /\|/.test(trimmed) && /[a-z]/i.test(trimmed.split('|')[1] || '');
      
      // Check if this looks like a sub-heading of current project (e.g., "Resell.ai Features")
      const isSubHeading = current && current.name && trimmed.startsWith(current.name.split(/\s+/)[0]);
      
      if (isSubHeading) {
        // This is a sub-section - treat bullets under it as part of current project
        // Don't create a new project
        continue;
      }
      
      if (hasTechPipe || (!current && trimmed.length > 3)) {
        // This is a new project
        if (current?.name && current.bullets && current.bullets.length > 0) {
          projects.push(current as LatexResumeData['projects'][0]);
        }
        
        // Parse: "Project Name | Technologies Used"
        const parts = trimmed.split(/\s*\|\s*/);
        const projectName = parts[0]?.trim() || trimmed;
        const technologies = parts.slice(1).join(', ').replace(/[*_]/g, '').trim();
        
        current = {
          name: projectName,
          technologies: technologies,
          bullets: [],
        };
      } else if (!current) {
        // First project line without pipe
        current = {
          name: trimmed,
          technologies: '',
          bullets: [],
        };
      }
      // Otherwise, ignore non-bullet lines that aren't project headers
    }
  }
  
  if (current?.name && current.bullets && current.bullets.length > 0) {
    projects.push(current as LatexResumeData['projects'][0]);
  }
  
  return projects;
}

/**
 * Extracts skills
 */
function extractSkills(lines: string[], headers: SectionHeaders): LatexResumeData['skills'] {
  if (headers.skills < 0) return {};
  
  const endLine = getSectionEnd(headers.skills, headers, lines.length);
  const sectionLines = lines.slice(headers.skills + 1, endLine);
  
  const skills: LatexResumeData['skills'] = {};
  
  for (const line of sectionLines) {
    const trimmed = line.trim();
    if (!trimmed || /^[─═\-_]+$/.test(trimmed)) continue;
    
    // Parse "Label: Value" format
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const label = trimmed.substring(0, colonIndex).trim().toLowerCase();
      const value = trimmed.substring(colonIndex + 1).trim();
      
      if (label.includes('language')) {
        skills.languages = value;
      } else if (label.includes('framework') || label.includes('librar')) {
        skills.frameworks = value;
      } else if (label.includes('tool') || label.includes('development') || label.includes('software')) {
        skills.tools = value;
      } else if (label.includes('interest')) {
        skills.interests = value;
      }
    }
  }
  
  return skills;
}

/**
 * Converts LatexResumeData to the standard Resume type for backward compatibility
 */
export function latexDataToResume(data: LatexResumeData): import('./resumeTypes').Resume {
  return {
    header: data.header,
    education: (data.education || []).map(edu => ({
      institution: edu.institution || '',
      location: edu.location || '',
      degree: edu.degree || '',
      gradDate: edu.gradDate || '',
      gpa: edu.gpa,
      coursework: edu.coursework || [],
    })),
    experience: (data.experience || []).map(exp => ({
      company: exp.company || '',
      location: exp.location || '',
      title: exp.title || '',
      start: exp.start || '',
      end: exp.end || '',
      bullets: exp.bullets || [],
    })),
    extracurriculars: (data.projects || []).map(proj => ({
      org: proj.name || '',
      location: '',
      role: proj.technologies || '',
      start: '',
      end: '',
      bullets: proj.bullets || [],
    })),
    skillsAndInterests: {
      skills: data.skills?.languages || '',
      frameworks: data.skills?.frameworks || '',
      tools: data.skills?.tools || '',
      interests: data.skills?.interests || '',
    },
  };
}
