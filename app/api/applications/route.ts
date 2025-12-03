import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/applications
 * Lists all job applications for the authenticated user
 * Query params: status (optional) - filter by status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const applications = await prisma.application.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
      include: {
        resume: {
          select: {
            id: true,
            fileName: true,
            version: true,
          },
        },
      },
      orderBy: { appliedDate: 'desc' },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/applications
 * Creates a new job application
 * 
 * Body: {
 *   company: string
 *   jobTitle: string
 *   platform?: string
 *   jobUrl?: string
 *   location?: string
 *   jobType?: string
 *   status?: string (default: "Applied")
 *   resumeId?: string
 *   notes?: string
 *   deadline?: string
 *   salary?: string
 *   metadata?: object
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      company,
      jobTitle,
      platform,
      jobUrl,
      location,
      jobType,
      status = 'Applied',
      resumeId,
      notes,
      deadline,
      salary,
      metadata,
    } = body;

    if (!company || !jobTitle) {
      return NextResponse.json(
        { error: 'Missing required fields: company, jobTitle' },
        { status: 400 }
      );
    }

    // Verify resume belongs to user if resumeId is provided
    if (resumeId) {
      const resume = await prisma.resume.findFirst({
        where: {
          id: resumeId,
          userId: session.user.id,
        },
      });

      if (!resume) {
        return NextResponse.json(
          { error: 'Invalid resumeId' },
          { status: 400 }
        );
      }
    }

    const application = await prisma.application.create({
      data: {
        userId: session.user.id,
        company,
        jobTitle,
        platform,
        jobUrl,
        location,
        jobType,
        status,
        resumeId,
        notes,
        deadline,
        salary,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: {
        resume: {
          select: {
            id: true,
            fileName: true,
            version: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      application,
    });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
}

