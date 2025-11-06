export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  status: 'Applied' | 'Interviewing' | 'Offer' | 'Rejected';
  logo?: string;
  appliedDate: string;
  deadline?: string;
  salary?: string;
  description?: string;
  keywords?: string[];
}

export const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'Google',
    location: 'Mountain View, CA',
    type: 'Full-time',
    status: 'Interviewing',
    appliedDate: '2024-01-15',
    deadline: '2024-02-15',
    salary: '$180,000 - $250,000',
    description: 'Build scalable web applications using React, TypeScript, and modern frontend technologies.',
    keywords: ['React', 'TypeScript', 'JavaScript', 'Frontend', 'Web Development'],
  },
  {
    id: '2',
    title: 'React Developer',
    company: 'Meta',
    location: 'Menlo Park, CA',
    type: 'Full-time',
    status: 'Applied',
    appliedDate: '2024-01-20',
    salary: '$150,000 - $220,000',
    description: 'Develop user-facing features using React and modern JavaScript frameworks.',
    keywords: ['React', 'JavaScript', 'Frontend', 'UI/UX'],
  },
  {
    id: '3',
    title: 'Full Stack Engineer',
    company: 'Netflix',
    location: 'Los Gatos, CA',
    type: 'Full-time',
    status: 'Offer',
    appliedDate: '2024-01-10',
    deadline: '2024-02-10',
    salary: '$170,000 - $240,000',
    description: 'Work on both frontend and backend systems to deliver high-quality streaming experiences.',
    keywords: ['React', 'Node.js', 'Full Stack', 'JavaScript', 'Backend'],
  },
  {
    id: '4',
    title: 'Frontend Architect',
    company: 'Airbnb',
    location: 'San Francisco, CA',
    type: 'Full-time',
    status: 'Interviewing',
    appliedDate: '2024-01-18',
    salary: '$190,000 - $270,000',
    description: 'Design and architect scalable frontend systems for our platform.',
    keywords: ['Architecture', 'React', 'TypeScript', 'Frontend', 'System Design'],
  },
  {
    id: '5',
    title: 'UI/UX Developer',
    company: 'Apple',
    location: 'Cupertino, CA',
    type: 'Full-time',
    status: 'Applied',
    appliedDate: '2024-01-22',
    salary: '$160,000 - $230,000',
    description: 'Create beautiful and intuitive user interfaces for Apple products.',
    keywords: ['UI/UX', 'Design', 'Frontend', 'React', 'CSS'],
  },
  {
    id: '6',
    title: 'Software Engineer II',
    company: 'Microsoft',
    location: 'Redmond, WA',
    type: 'Full-time',
    status: 'Rejected',
    appliedDate: '2024-01-05',
    salary: '$140,000 - $210,000',
    description: 'Build enterprise software solutions using modern technologies.',
    keywords: ['C#', '.NET', 'JavaScript', 'Software Engineering'],
  },
  {
    id: '7',
    title: 'Senior React Developer',
    company: 'Uber',
    location: 'San Francisco, CA',
    type: 'Full-time',
    status: 'Applied',
    appliedDate: '2024-01-25',
    salary: '$175,000 - $245,000',
    description: 'Build performant React applications for our ride-sharing platform.',
    keywords: ['React', 'TypeScript', 'Performance', 'Frontend'],
  },
  {
    id: '8',
    title: 'Frontend Engineer',
    company: 'Stripe',
    location: 'San Francisco, CA',
    type: 'Full-time',
    status: 'Applied',
    appliedDate: '2024-01-28',
    salary: '$165,000 - $235,000',
    description: 'Develop payment interfaces and developer tools.',
    keywords: ['React', 'TypeScript', 'Frontend', 'Payment Systems'],
  },
  {
    id: '9',
    title: 'JavaScript Developer',
    company: 'Twitter',
    location: 'San Francisco, CA',
    type: 'Full-time',
    status: 'Applied',
    appliedDate: '2024-01-30',
    salary: '$155,000 - $225,000',
    description: 'Build features for our social media platform.',
    keywords: ['JavaScript', 'React', 'Frontend', 'Social Media'],
  },
  {
    id: '10',
    title: 'TypeScript Developer',
    company: 'Shopify',
    location: 'Ottawa, Canada',
    type: 'Remote',
    status: 'Applied',
    appliedDate: '2024-02-01',
    salary: '$145,000 - $215,000',
    description: 'Build e-commerce solutions using TypeScript and React.',
    keywords: ['TypeScript', 'React', 'E-commerce', 'Frontend'],
  },
];

export const mockStats = {
  totalApplications: 42,
  interviews: 7,
  offers: 2,
  savedJobs: 15,
};

