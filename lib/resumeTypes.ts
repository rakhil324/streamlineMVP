/**
 * Structured Resume Data Types
 * Defines the fixed structure for all resumes
 */

export type EducationItem = {
  institution: string;
  location: string;
  degree: string;
  gradDate: string;
  gpa?: string;
  sat?: string;
  coursework?: string[];
};

export type ExperienceItem = {
  company: string;
  location: string;
  title: string;
  start: string;
  end: string;
  bullets: string[];
};

export type ExtracurricularItem = {
  org: string;
  location: string;
  role: string;
  start: string;
  end: string;
  bullets: string[];
};

export type SkillsAndInterests = {
  skills: string;        // Languages
  frameworks?: string;   // Frameworks & Libraries
  tools?: string;        // Tools
  interests: string;
  otherInvolvements?: string;
};

export type Resume = {
  header: {
    name: string;
    location: string;
    email: string;
    phone: string;
  };
  education: EducationItem[];
  experience: ExperienceItem[];
  extracurriculars: ExtracurricularItem[];
  skillsAndInterests: SkillsAndInterests;
};

/**
 * Ensures all required sections are present in the tailored resume
 * If a section is missing or empty, it uses the base resume's section
 * Header is ALWAYS kept from base (never changed by LLM)
 */
export function enforceSections(tailored: Resume, base: Resume): Resume {
  return {
    header: base.header, // ALWAYS keep header from original
    education: tailored.education?.length ? tailored.education : base.education,
    experience: tailored.experience?.length ? tailored.experience : base.experience,
    extracurriculars: tailored.extracurriculars?.length
      ? tailored.extracurriculars
      : base.extracurriculars,
    skillsAndInterests: tailored.skillsAndInterests || base.skillsAndInterests,
  };
}

