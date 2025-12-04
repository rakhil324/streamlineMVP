import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const MAX_TAILORED_RESUMES = 5;

// GET - Fetch all tailored resumes for the user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const tailoredResumes = await prisma.tailoredResume.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        jobTitle: true,
        companyName: true,
        fileName: true,
        isOriginal: true,
        createdAt: true,
        // Don't include pdfBase64 in list view - too large
      },
    });

    return NextResponse.json({ resumes: tailoredResumes });
  } catch (error) {
    console.error('Error fetching tailored resumes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tailored resumes' },
      { status: 500 }
    );
  }
}

// POST - Save a new tailored resume
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { jobTitle, companyName, fileName, pdfBase64, textContent, isOriginal } = body;

    if (!jobTitle || !companyName || !pdfBase64) {
      return NextResponse.json(
        { error: 'Missing required fields: jobTitle, companyName, pdfBase64' },
        { status: 400 }
      );
    }

    // Get current count of non-original tailored resumes
    const existingResumes = await prisma.tailoredResume.findMany({
      where: { 
        userId: session.user.id,
        isOriginal: false,
      },
      orderBy: { createdAt: 'asc' },
    });

    // If we have 5 or more non-original resumes, delete the oldest ones
    if (existingResumes.length >= MAX_TAILORED_RESUMES) {
      const resumesToDelete = existingResumes.slice(0, existingResumes.length - MAX_TAILORED_RESUMES + 1);
      await prisma.tailoredResume.deleteMany({
        where: {
          id: { in: resumesToDelete.map(r => r.id) },
        },
      });
      console.log(`Deleted ${resumesToDelete.length} old tailored resumes to make room`);
    }

    // Create the new tailored resume
    const newResume = await prisma.tailoredResume.create({
      data: {
        userId: session.user.id,
        jobTitle,
        companyName,
        fileName: fileName || `Resume - ${companyName} - ${jobTitle}.pdf`,
        pdfBase64,
        textContent: textContent || '',
        isOriginal: isOriginal || false,
      },
    });

    console.log(`Saved tailored resume: ${newResume.fileName} for ${companyName}`);

    return NextResponse.json({ 
      success: true, 
      resume: {
        id: newResume.id,
        jobTitle: newResume.jobTitle,
        companyName: newResume.companyName,
        fileName: newResume.fileName,
        isOriginal: newResume.isOriginal,
        createdAt: newResume.createdAt,
      }
    });
  } catch (error) {
    console.error('Error saving tailored resume:', error);
    return NextResponse.json(
      { error: 'Failed to save tailored resume' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific tailored resume
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Resume ID is required' },
        { status: 400 }
      );
    }

    // Verify the resume belongs to the user and is not the original
    const resume = await prisma.tailoredResume.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    if (resume.isOriginal) {
      return NextResponse.json(
        { error: 'Cannot delete original resume' },
        { status: 400 }
      );
    }

    await prisma.tailoredResume.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Error deleting tailored resume:', error);
    return NextResponse.json(
      { error: 'Failed to delete tailored resume' },
      { status: 500 }
    );
  }
}

