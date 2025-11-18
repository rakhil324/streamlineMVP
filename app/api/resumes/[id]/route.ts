import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSignedUrl, downloadFile } from '@/lib/localStorage';

/**
 * GET /api/resumes/[id]
 * Gets a specific resume by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await prisma.resume.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    // For local storage, storageUrl is the relative path
    // Generate signed URL for secure access (for local, it's just the path)
    const signedUrl = await getSignedUrl('resumes', resume.storageUrl, 3600);

    return NextResponse.json({
      resume: {
        id: resume.id,
        fileName: resume.fileName,
        fileSize: resume.fileSize,
        mimeType: resume.mimeType,
        version: resume.version,
        iv: resume.iv,
        parsedData: resume.parsedData,
        createdAt: resume.createdAt,
        signedUrl, // Temporary URL to download file
      },
    });
  } catch (error) {
    console.error('Error fetching resume:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resume' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/resumes/[id]
 * Deletes a specific resume
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resume = await prisma.resume.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    // Delete from database
    await prisma.resume.delete({
      where: { id: params.id },
    });

    // Note: We're not deleting from Supabase Storage for safety
    // You can add deleteFile() call here if you want to remove from storage too

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting resume:', error);
    return NextResponse.json(
      { error: 'Failed to delete resume' },
      { status: 500 }
    );
  }
}

