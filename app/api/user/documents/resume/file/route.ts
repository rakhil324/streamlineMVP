import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
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
}> {
  try {
    const filePath = await getUserDocumentsPath(userId);
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    return { resume: parsed.resume };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {};
    }
    console.error('Error loading user documents:', error);
    return {};
  }
}

// GET: Download resume file
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
    
    if (!documents.resume) {
      return NextResponse.json(
        { error: 'No resume found' },
        { status: 404 }
      );
    }

    // Decrypt the original text
    const originalText = decrypt(documents.resume.encryptedOriginal, documents.resume.encryptionKey);
    
    // Determine file type and create appropriate response
    const fileName = documents.resume.fileName || 'resume.txt';
    const fileType = documents.resume.fileType || 'text/plain';
    
    // For MVP, we'll return as text/plain since we only have the text content
    // In production, you'd want to store the original file buffer
    const response = new NextResponse(originalText, {
      headers: {
        'Content-Type': fileType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
    
    return response;
  } catch (error: any) {
    console.error('Error retrieving resume file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve resume file' },
      { status: 500 }
    );
  }
}

