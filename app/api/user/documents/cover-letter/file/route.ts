import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

// File-based storage for user documents
const STORAGE_DIR = path.join(process.cwd(), '.user-documents');

async function getUserDocumentsPath(userId: string): Promise<string> {
  return path.join(STORAGE_DIR, `${userId}.json`);
}

async function loadUserDocuments(userId: string): Promise<{
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
    const parsed = JSON.parse(data);
    return { coverLetter: parsed.coverLetter };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {};
    }
    console.error('Error loading user documents:', error);
    return {};
  }
}

// GET: Download cover letter file
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id || session.user.email || 'unknown';
    
    if (userId === 'unknown') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const documents = await loadUserDocuments(userId);
    
    if (!documents.coverLetter) {
      return NextResponse.json(
        { error: 'No cover letter found' },
        { status: 404 }
      );
    }

    // Get the cover letter content
    const content = documents.coverLetter.content;
    const fileName = documents.coverLetter.fileName || 'cover-letter.txt';
    const fileType = documents.coverLetter.fileType || 'text/plain';
    
    const response = new NextResponse(content, {
      headers: {
        'Content-Type': fileType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
    
    return response;
  } catch (error: any) {
    console.error('Error retrieving cover letter file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve cover letter file' },
      { status: 500 }
    );
  }
}

