import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/applications/[id]
 * Gets a specific application by ID
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

    const application = await prisma.application.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        resume: {
          select: {
            id: true,
            fileName: true,
            version: true,
            createdAt: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/applications/[id]
 * Updates an application (typically status changes)
 * 
 * Body: {
 *   status?: string
 *   notes?: string
 *   deadline?: string
 *   salary?: string
 *   metadata?: object
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, notes, deadline, salary, metadata, ...otherFields } = body;

    // Verify application belongs to user
    const existingApplication = await prisma.application.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingApplication) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Update application
    const application = await prisma.application.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(deadline !== undefined && { deadline }),
        ...(salary !== undefined && { salary }),
        ...(metadata && { metadata: JSON.stringify(metadata) }),
        ...otherFields,
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
    console.error('Error updating application:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/applications/[id]
 * Deletes an application
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

    const application = await prisma.application.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    await prisma.application.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting application:', error);
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    );
  }
}

