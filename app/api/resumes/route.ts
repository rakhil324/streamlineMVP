import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadEncryptedFile } from '@/lib/supabase';
import { encrypt, generateSecureKey } from '@/lib/encryption';

/**
 * GET /api/resumes
 * Lists all resumes for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resumes = await prisma.resume.findMany({
      where: { userId: session.user.id },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        parsedData: true,
      },
    });

    return NextResponse.json({ resumes });
  } catch (error) {
    console.error('Error fetching resumes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resumes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/resumes
 * Uploads a new encrypted resume file
 * 
 * Expects multipart/form-data with:
 * - file: Resume file (PDF, DOCX, TXT)
 * - parsedData: (optional) JSON string of parsed resume data
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const parsedData = formData.get('parsedData') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, DOCX, DOC, and TXT are allowed.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate encryption key and IV
    const encryptionKey = generateSecureKey();
    const encryptedData = encrypt(buffer.toString('base64'), encryptionKey);

    // Extract IV from encrypted data (first part)
    const iv = encryptedData.substring(0, 24); // Simplified IV extraction

    // Generate unique file path
    const timestamp = Date.now();
    const filePath = `${session.user.id}/${timestamp}-${file.name}`;

    // Upload encrypted file to Supabase Storage
    const storageUrl = await uploadEncryptedFile(
      'resumes',
      filePath,
      Buffer.from(encryptedData),
      'application/octet-stream'
    );

    // Get next version number (count existing resumes)
    const resumeCount = await prisma.resume.count({
      where: { userId: session.user.id },
    });

    const nextVersion = resumeCount + 1;

    // Create resume record in database
    const resume = await prisma.resume.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storageUrl,
        version: nextVersion,
        iv,
        parsedData: parsedData || null,
      },
    });

    return NextResponse.json({
      success: true,
      resume: {
        id: resume.id,
        fileName: resume.fileName,
        version: resume.version,
        createdAt: resume.createdAt,
      },
      encryptionKey, // Return this so client can decrypt later
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    return NextResponse.json(
      { error: 'Failed to upload resume' },
      { status: 500 }
    );
  }
}

