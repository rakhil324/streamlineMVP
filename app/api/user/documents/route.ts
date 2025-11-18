import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { extractTextFromFile, validateFile } from '@/lib/fileProcessor';
import { sanitizeText } from '@/lib/dataSanitization';
import { encrypt, generateSecureKey } from '@/lib/encryption';
import fs from 'fs/promises';
import path from 'path';

// File-based storage for user documents (persists across server restarts)
const STORAGE_DIR = path.join(process.cwd(), '.user-documents');

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating storage directory:', error);
  }
}

// Initialize storage directory on module load
ensureStorageDir();

// Helper functions for file-based persistence
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
    // File doesn't exist yet, return empty object
    if (error.code === 'ENOENT') {
      return {};
    }
    console.error('Error loading user documents:', error);
    return {};
  }
}

async function saveUserDocuments(
  userId: string,
  documents: {
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
  }
): Promise<void> {
  try {
    const filePath = await getUserDocumentsPath(userId);
    await fs.writeFile(filePath, JSON.stringify(documents, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving user documents:', error);
    throw error;
  }
}

// GET: Retrieve user documents
export async function GET(request: NextRequest) {
  try {
    // Get session - in NextAuth v5, auth() should work without passing request
    const session = await auth();
    
    console.log('GET documents - Session:', JSON.stringify(session, null, 2));
    console.log('GET documents - User:', session?.user);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      console.log('GET documents - Unauthorized: No session');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to access your documents' },
        { status: 401 }
      );
    }

    // For now, use email as userId if id is not available (fallback)
    const userId = session.user.id || session.user.email || 'unknown';
    
    if (userId === 'unknown') {
      console.log('GET documents - Unauthorized: No user identifier');
      return NextResponse.json(
        { error: 'Unauthorized - Unable to identify user' },
        { status: 401 }
      );
    }

    const documents = await loadUserDocuments(userId);

    // Check if full data is requested (for use in tailoring)
    const { searchParams } = new URL(request.url);
    const includeFullData = searchParams.get('full') === 'true';

    return NextResponse.json({
      success: true,
      resume: documents.resume ? (includeFullData ? {
        fileName: documents.resume.fileName,
        fileType: documents.resume.fileType,
        fileSize: documents.resume.fileSize,
        uploadedAt: documents.resume.uploadedAt,
        sanitizedText: documents.resume.sanitizedText,
        encryptedOriginal: documents.resume.encryptedOriginal,
        encryptionKey: documents.resume.encryptionKey,
        removedData: documents.resume.removedData,
      } : {
        fileName: documents.resume.fileName,
        fileType: documents.resume.fileType,
        fileSize: documents.resume.fileSize,
        uploadedAt: documents.resume.uploadedAt,
      }) : null,
      coverLetter: documents.coverLetter ? (includeFullData ? {
        fileName: documents.coverLetter.fileName,
        fileType: documents.coverLetter.fileType,
        fileSize: documents.coverLetter.fileSize,
        uploadedAt: documents.coverLetter.uploadedAt,
        content: documents.coverLetter.content,
      } : {
        fileName: documents.coverLetter.fileName,
        fileType: documents.coverLetter.fileType,
        fileSize: documents.coverLetter.fileSize,
        uploadedAt: documents.coverLetter.uploadedAt,
      }) : null,
    });
  } catch (error: any) {
    console.error('Error retrieving documents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve documents' },
      { status: 500 }
    );
  }
}

// POST: Upload a document (resume or cover letter)
export async function POST(request: NextRequest) {
  try {
    // Get session
    const session = await auth();
    
    console.log('POST documents - Session:', JSON.stringify(session, null, 2));
    console.log('POST documents - User:', session?.user);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      console.log('POST documents - Unauthorized: No session');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to upload documents' },
        { status: 401 }
      );
    }

    // For now, use email as userId if id is not available (fallback)
    const userId = session.user.id || session.user.email || 'unknown';
    
    if (userId === 'unknown') {
      console.log('POST documents - Unauthorized: No user identifier');
      return NextResponse.json(
        { error: 'Unauthorized - Unable to identify user' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('type') as string; // 'resume' or 'coverLetter'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!documentType || !['resume', 'coverLetter'].includes(documentType)) {
      return NextResponse.json(
        { error: 'Invalid document type. Must be "resume" or "coverLetter"' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Load existing documents
    const documents = await loadUserDocuments(userId);

    if (documentType === 'resume') {
      // Extract text from file
      const originalText = await extractTextFromFile(file);

      // Sanitize the text (remove PII)
      const sanitizationResult = sanitizeText(originalText);

      // Generate encryption key for storing original data securely
      const encryptionKey = generateSecureKey();
      
      // Encrypt the original text (with PII) for storage
      const encryptedOriginal = encrypt(originalText, encryptionKey);

      // Store resume data
      documents.resume = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        sanitizedText: sanitizationResult.sanitizedText,
        encryptedOriginal,
        encryptionKey,
        removedData: sanitizationResult.removedData,
        uploadedAt: new Date().toISOString(),
      };
    } else if (documentType === 'coverLetter') {
      // For cover letters, just extract text (no sanitization needed)
      const content = await extractTextFromFile(file);

      documents.coverLetter = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        content,
        uploadedAt: new Date().toISOString(),
      };
    }

    // Save documents to file
    await saveUserDocuments(userId, documents);

    return NextResponse.json({
      success: true,
      message: `${documentType === 'resume' ? 'Resume' : 'Cover letter'} uploaded successfully`,
      document: documentType === 'resume' 
        ? {
            fileName: documents.resume!.fileName,
            uploadedAt: documents.resume!.uploadedAt,
          }
        : {
            fileName: documents.coverLetter!.fileName,
            uploadedAt: documents.coverLetter!.uploadedAt,
          },
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a document
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // For now, use email as userId if id is not available (fallback)
    const userId = session.user.id || session.user.email || 'unknown';
    
    if (userId === 'unknown') {
      return NextResponse.json(
        { error: 'Unauthorized - Unable to identify user' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('type'); // 'resume' or 'coverLetter'

    if (!documentType || !['resume', 'coverLetter'].includes(documentType)) {
      return NextResponse.json(
        { error: 'Invalid document type. Must be "resume" or "coverLetter"' },
        { status: 400 }
      );
    }

    // Load existing documents
    const documents = await loadUserDocuments(userId);
    
    if (documentType === 'resume') {
      delete documents.resume;
    } else {
      delete documents.coverLetter;
    }
    
    // Save updated documents
    await saveUserDocuments(userId, documents);

    return NextResponse.json({
      success: true,
      message: `${documentType === 'resume' ? 'Resume' : 'Cover letter'} deleted successfully`,
    });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}

