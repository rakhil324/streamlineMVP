import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Decrypt profile data (same as in profile route)
function decryptData(encrypted: string, iv: string): string {
  try {
    const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      Buffer.from(key.padEnd(32, '0').slice(0, 32)), 
      Buffer.from(iv, 'base64')
    );
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}

/**
 * GET /api/autofill
 * Returns user profile data formatted for autofill
 * This endpoint is used by the browser extension to autofill job applications
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile from database
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ 
        error: 'Profile not found',
        message: 'Please complete your profile setup first'
      }, { status: 404 });
    }

    // Decrypt the profile data
    let profileData = null;
    try {
      const decrypted = decryptData(profile.encryptedData, profile.iv);
      if (decrypted) {
        profileData = JSON.parse(decrypted);
      }
    } catch (parseError) {
      console.error('Error parsing profile data:', parseError);
      return NextResponse.json({ error: 'Failed to parse profile data' }, { status: 500 });
    }

    if (!profileData) {
      return NextResponse.json({ error: 'No profile data available' }, { status: 404 });
    }

    // Format data for autofill - flat structure that's easy to map to form fields
    const autofillData = {
      // Personal Information
      firstName: profileData.firstName || '',
      lastName: profileData.lastName || '',
      fullName: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim(),
      email: profileData.email || session.user.email || '',
      phone: profileData.phone || '',
      
      // Address
      address: profileData.address?.street || '',
      street: profileData.address?.street || '',
      city: profileData.address?.city || '',
      state: profileData.address?.state || '',
      zip: profileData.address?.zip || '',
      zipCode: profileData.address?.zip || '',
      postalCode: profileData.address?.zip || '',
      country: profileData.address?.country || 'United States',
      fullAddress: [
        profileData.address?.street,
        profileData.address?.city,
        profileData.address?.state,
        profileData.address?.zip,
        profileData.address?.country
      ].filter(Boolean).join(', '),

      // Social Links
      linkedIn: profileData.linkedIn || '',
      linkedInUrl: profileData.linkedIn || '',
      portfolio: profileData.portfolio || '',
      website: profileData.portfolio || '',

      // Work Authorization
      authorizedToWork: profileData.workAuthorization?.authorizedToWork ?? true,
      requiresSponsorship: profileData.workAuthorization?.requiresSponsorship ?? false,
      citizenshipStatus: profileData.workAuthorization?.citizenshipStatus || '',

      // Education (most recent first)
      education: profileData.education || [],
      mostRecentEducation: profileData.education?.[0] || null,
      school: profileData.education?.[0]?.school || '',
      university: profileData.education?.[0]?.school || '',
      degree: profileData.education?.[0]?.degree || '',
      major: profileData.education?.[0]?.fieldOfStudy || '',
      fieldOfStudy: profileData.education?.[0]?.fieldOfStudy || '',
      graduationDate: profileData.education?.[0]?.graduationDate || '',
      graduationYear: profileData.education?.[0]?.graduationDate?.split('-')[0] || '',
      gpa: profileData.education?.[0]?.gpa || '',

      // Experience (most recent first)
      experience: profileData.experience || [],
      mostRecentExperience: profileData.experience?.[0] || null,
      currentCompany: profileData.experience?.find((e: any) => e.current)?.company || profileData.experience?.[0]?.company || '',
      currentTitle: profileData.experience?.find((e: any) => e.current)?.title || profileData.experience?.[0]?.title || '',
      yearsOfExperience: calculateYearsOfExperience(profileData.experience || []),

      // Skills
      skills: profileData.skills || [],
      skillsText: (profileData.skills || []).join(', '),
      languages: profileData.languages || [],
      languagesText: (profileData.languages || []).join(', '),
      certifications: profileData.certifications || [],
      certificationsText: (profileData.certifications || []).join(', '),

      // Job Preferences
      preferredTitles: profileData.preferredTitles || [],
      preferredLocations: profileData.preferredLocations || [],
      preferredJobTypes: profileData.preferredJobTypes || [],
      salaryExpectation: profileData.salaryExpectation || null,
      expectedSalary: profileData.salaryExpectation 
        ? `${profileData.salaryExpectation.currency || 'USD'} ${profileData.salaryExpectation.min?.toLocaleString()} - ${profileData.salaryExpectation.max?.toLocaleString()}`
        : '',
      availability: profileData.availability || '',

      // Meta
      profileComplete: profileData.onboardingCompleted || false,
      lastUpdated: profileData.lastUpdated || profile.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: autofillData,
    });
  } catch (error) {
    console.error('Error fetching autofill data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch autofill data' },
      { status: 500 }
    );
  }
}

// Helper function to calculate years of experience
function calculateYearsOfExperience(experience: any[]): number {
  if (!experience || experience.length === 0) return 0;

  let totalMonths = 0;
  
  experience.forEach((exp) => {
    if (!exp.startDate) return;
    
    const start = new Date(exp.startDate);
    const end = exp.current ? new Date() : (exp.endDate ? new Date(exp.endDate) : new Date());
    
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    totalMonths += Math.max(0, months);
  });

  return Math.round(totalMonths / 12);
}

