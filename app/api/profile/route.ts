import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/profile
 * Retrieves the user's encrypted profile data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      encryptedData: profile.encryptedData,
      iv: profile.iv,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile
 * Creates or updates the user's encrypted profile data
 * 
 * Body: { encryptedData: string, iv: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { encryptedData, iv } = body;

    if (!encryptedData || !iv) {
      return NextResponse.json(
        { error: 'Missing required fields: encryptedData, iv' },
        { status: 400 }
      );
    }

    // Upsert profile (create or update)
    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      update: {
        encryptedData,
        iv,
      },
      create: {
        userId: session.user.id,
        encryptedData,
        iv,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        updatedAt: profile.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error saving profile:', error);
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profile
 * Deletes the user's profile
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.profile.delete({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500 }
    );
  }
}

