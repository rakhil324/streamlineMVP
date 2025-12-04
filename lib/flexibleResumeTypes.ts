/**
 * Flexible Resume Types
 * Supports ANY resume format with dynamic sections
 */

/**
 * Header information - kept flexible
 */
export interface ResumeHeader {
  name: string;
  contactLine: string;  // Keep entire contact line as-is (emails, phone, links, etc.)
}

/**
 * An entry within a section (job, school, project, award, etc.)
 */
export interface SectionEntry {
  // Primary line (company name, school name, organization, award name, etc.)
  title?: string;
  
  // Secondary line (job title, degree, role, etc.)
  subtitle?: string;
  
  // Right-aligned info (location)
  location?: string;
  
  // Right-aligned info (dates)
  dates?: string;
  
  // Bullet points - THESE ARE WHAT WE TAILOR
  bullets?: string[];
  
  // Any additional text that doesn't fit the above
  additionalText?: string[];
}

/**
 * A section in the resume (EDUCATION, EXPERIENCE, AWARDS, etc.)
 */
export interface ResumeSection {
  // Section name exactly as it appears (EDUCATION, PROFESSIONAL EXPERIENCE, AWARDS & HONORS, etc.)
  name: string;
  
  // Entries in this section
  entries: SectionEntry[];
  
  // For sections we can't parse into entries, keep raw text
  rawContent?: string;
}

/**
 * Complete flexible resume structure
 */
export interface FlexibleResume {
  header: ResumeHeader;
  sections: ResumeSection[];
}

/**
 * Identifies if a section typically contains tailorable bullet points
 */
export function isTailorableSection(sectionName: string): boolean {
  const name = sectionName.toUpperCase();
  const tailorableSections = [
    'EXPERIENCE',
    'PROFESSIONAL EXPERIENCE',
    'WORK EXPERIENCE',
    'EMPLOYMENT',
    'PROJECTS',
    'LEADERSHIP',
    'LEADERSHIP EXPERIENCE',
    'ACTIVITIES',
    'EXTRACURRICULAR',
    'EXTRACURRICULARS',
    'VOLUNTEER',
    'VOLUNTEERING',
    'RESEARCH',
  ];
  
  return tailorableSections.some(s => name.includes(s));
}

/**
 * Sections that should NOT be modified
 */
export function isProtectedSection(sectionName: string): boolean {
  const name = sectionName.toUpperCase();
  const protectedSections = [
    'EDUCATION',
    'SKILLS',
    'CERTIFICATIONS',
    'AWARDS',
    'HONORS',
    'PUBLICATIONS',
    'LANGUAGES',
  ];
  
  return protectedSections.some(s => name.includes(s));
}

