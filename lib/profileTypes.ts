/**
 * User Profile Types for Onboarding and Autofill
 */

// Address structure
export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

// Work authorization
export interface WorkAuthorization {
  authorizedToWork: boolean;
  requiresSponsorship: boolean;
  citizenshipStatus?: string;
}

// Education entry
export interface Education {
  id: string;
  school: string;
  degree: string;
  fieldOfStudy: string;
  graduationDate: string;
  gpa?: string;
  current?: boolean;
}

// Work experience entry
export interface Experience {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
}

// Salary expectation
export interface SalaryExpectation {
  min: number;
  max: number;
  currency: string;
}

// Demographics (optional EEO data)
export interface Demographics {
  gender?: string;
  race?: string;
  veteranStatus?: string;
  disabilityStatus?: string;
}

// Complete user profile
export interface UserProfile {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: Address;
  linkedIn?: string;
  portfolio?: string;
  dateOfBirth?: string;

  // Work Authorization
  workAuthorization: WorkAuthorization;

  // Education (array of entries)
  education: Education[];

  // Work Experience (array of entries)
  experience: Experience[];

  // Skills & Languages
  skills: string[];
  languages: string[];
  certifications: string[];

  // Job Preferences
  preferredTitles: string[];
  preferredLocations: string[];
  preferredJobTypes: string[]; // Full-time, Part-time, Contract, Remote
  salaryExpectation?: SalaryExpectation;
  availability?: string; // Immediate, 2 weeks, 1 month, etc.

  // Demographics (optional)
  demographics?: Demographics;

  // Meta
  onboardingCompleted: boolean;
  onboardingCompletedAt?: string;
  lastUpdated?: string;
}

// Default empty profile
export const defaultProfile: UserProfile = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: {
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
  },
  linkedIn: '',
  portfolio: '',
  workAuthorization: {
    authorizedToWork: true,
    requiresSponsorship: false,
  },
  education: [],
  experience: [],
  skills: [],
  languages: [],
  certifications: [],
  preferredTitles: [],
  preferredLocations: [],
  preferredJobTypes: [],
  onboardingCompleted: false,
};

// Onboarding step types
export type OnboardingStep = 
  | 'personal'
  | 'work-auth'
  | 'education'
  | 'experience'
  | 'skills'
  | 'preferences';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'personal',
  'work-auth',
  'education',
  'experience',
  'skills',
  'preferences',
];

export const STEP_TITLES: Record<OnboardingStep, string> = {
  'personal': 'Personal Information',
  'work-auth': 'Work Authorization',
  'education': 'Education',
  'experience': 'Work Experience',
  'skills': 'Skills & Languages',
  'preferences': 'Job Preferences',
};

// Degree options
export const DEGREE_OPTIONS = [
  'High School Diploma',
  'Associate Degree',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'Doctorate (PhD)',
  'Professional Degree (MD, JD, etc.)',
  'Certificate',
  'Other',
];

// Job type options
export const JOB_TYPE_OPTIONS = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Remote',
  'Hybrid',
  'On-site',
];

// Availability options
export const AVAILABILITY_OPTIONS = [
  'Immediately',
  '1-2 weeks',
  '2-4 weeks',
  '1-2 months',
  '3+ months',
];

// Currency options
export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
];

// Common skills for suggestions
export const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#',
  'React', 'Next.js', 'Node.js', 'Vue.js', 'Angular',
  'SQL', 'PostgreSQL', 'MongoDB', 'Redis',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
  'Git', 'CI/CD', 'Agile', 'Scrum',
  'Machine Learning', 'Data Analysis', 'Data Science',
  'Product Management', 'Project Management',
  'Communication', 'Leadership', 'Problem Solving',
];

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

