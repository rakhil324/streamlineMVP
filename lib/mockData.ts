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
  },
  {
    id: '2',
    title: 'React Developer',
    company: 'Meta',
    location: 'Menlo Park, CA',
    type: 'Full-time',
    status: 'Applied',
    appliedDate: '2024-01-20',
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
  },
  {
    id: '4',
    title: 'Frontend Architect',
    company: 'Airbnb',
    location: 'San Francisco, CA',
    type: 'Full-time',
    status: 'Interviewing',
    appliedDate: '2024-01-18',
  },
  {
    id: '5',
    title: 'UI/UX Developer',
    company: 'Apple',
    location: 'Cupertino, CA',
    type: 'Full-time',
    status: 'Applied',
    appliedDate: '2024-01-22',
  },
  {
    id: '6',
    title: 'Software Engineer II',
    company: 'Microsoft',
    location: 'Redmond, WA',
    type: 'Full-time',
    status: 'Rejected',
    appliedDate: '2024-01-05',
  },
];

export const mockStats = {
  totalApplications: 42,
  interviews: 7,
  offers: 2,
  savedJobs: 15,
};

