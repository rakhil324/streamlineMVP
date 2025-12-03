import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Complete Your Profile | Streamline.ai',
  description: 'Set up your profile to enable autofill for job applications',
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {children}
    </div>
  );
}

