import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSignedUrl, deleteFile } from '@/lib/supabase';

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

    // Generate signed URL for secure file access (expires in 1 hour)
    const signedUrl = await getSignedUrl('resumes', resume.storageUrl.replace(/^resumes\//, ''), 3600);

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

    // Delete from Supabase Storage
    try {
      await deleteFile('resumes', resume.storageUrl.replace(/^resumes\//, ''));
    } catch (error) {
      console.error('Error deleting file from storage:', error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await prisma.resume.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting resume:', error);
    return NextResponse.json(
      { error: 'Failed to delete resume' },
      { status: 500 }
    );
  }
}

