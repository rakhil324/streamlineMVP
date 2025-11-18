import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { parseResumeFromText } from '@/lib/resumeParser';
import { decrypt } from '@/lib/encryption';
import fs from 'fs/promises';
import path from 'path';

// File-based storage for user documents
const STORAGE_DIR = path.join(process.cwd(), '.user-documents');

async function getUserDocumentsPath(userId: string): Promise<string> {
  return path.join(STORAGE_DIR, `${userId}.json`);
}

async function loadUserDocuments(userId: string): Promise<{
  resume?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    sanitizedText: string;
    encryptedOriginal: string;
    encryptionKey: string;
    removedData: any;
    uploadedAt: string;
  };
  coverLetter?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    content: string;
    uploadedAt: string;
  };
}> {
  try {
    const filePath = await getUserDocumentsPath(userId);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {};
    }
    console.error('Error loading user documents:', error);
    return {};
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// GET: Retrieve user profile data extracted from resume
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const userId = session.user.id || session.user.email || 'unknown';
    
    if (userId === 'unknown') {
      return NextResponse.json(
        { error: 'Unauthorized - Unable to identify user' },
        { status: 401 }
      );
    }

    // Load user documents
    const documents = await loadUserDocuments(userId);

    if (!documents.resume) {
      return NextResponse.json(
        { error: 'No resume found in profile. Please upload a resume first.' },
        { status: 404 }
      );
    }

    // Decrypt and parse resume
    let resumeText: string;
    try {
      const { decrypt: decryptFn } = await import('@/lib/encryption');
      resumeText = decryptFn(documents.resume.encryptedOriginal, documents.resume.encryptionKey);
    } catch (error) {
      // Fallback to sanitized text if decryption fails
      resumeText = documents.resume.sanitizedText;
    }

    // Parse resume to get structured data
    const resumeData = parseResumeFromText(resumeText);

    // Extract profile data for autofill
    const profileData = {
      // Basic info from header
      firstName: resumeData.header.name.split(' ')[0] || '',
      lastName: resumeData.header.name.split(' ').slice(1).join(' ') || '',
      fullName: resumeData.header.name,
      email: resumeData.header.email,
      phone: resumeData.header.phone,
      location: resumeData.header.location,
      
      // Most recent education
      education: resumeData.education.length > 0 ? {
        school: resumeData.education[0].institution,
        degree: resumeData.education[0].degree,
        graduationDate: resumeData.education[0].gradDate,
        gpa: resumeData.education[0].gpa,
      } : null,
      
      // Most recent work experience
      experience: resumeData.experience.length > 0 ? {
        company: resumeData.experience[0].company,
        title: resumeData.experience[0].title,
        startDate: resumeData.experience[0].start,
        endDate: resumeData.experience[0].end,
        location: resumeData.experience[0].location,
      } : null,
      
      // Skills
      skills: resumeData.skillsAndInterests.skills || '',
    };

    const response = NextResponse.json({
      success: true,
      profile: profileData,
    });
    
    // Add CORS headers for Chrome extension
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  } catch (error: any) {
    console.error('Error retrieving profile data:', error);
    const errorResponse = NextResponse.json(
      { error: error.message || 'Failed to retrieve profile data' },
      { status: 500 }
    );
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
}

