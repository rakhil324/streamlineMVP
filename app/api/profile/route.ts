import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Simple encryption for profile data
function encryptData(data: string): { encrypted: string; iv: string } {
  const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return { encrypted, iv: iv.toString('base64') };
}

function decryptData(encrypted: string, iv: string): string {
  try {
    const key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      Buffer.from(key.padEnd(32, '0').slice(0, 32)), 
      Buffer.from(iv, 'base64')
    );
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}

/**
 * GET /api/profile
 * Retrieves the user's profile data
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
      // Return empty profile data if no profile exists
      return NextResponse.json({ 
        profileData: null,
        exists: false 
      });
    }

    // Decrypt the profile data
    let profileData = null;
    try {
      const decrypted = decryptData(profile.encryptedData, profile.iv);
      if (decrypted) {
        profileData = JSON.parse(decrypted);
      }
    } catch (parseError) {
      console.error('Error parsing profile data:', parseError);
    }

    return NextResponse.json({
      profileData,
      exists: true,
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
 * Creates or updates the user's profile data
 * 
 * Body: { profileData: UserProfile } or legacy { encryptedData: string, iv: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    let encryptedData: string;
    let iv: string;

    // Handle new format (profileData as JSON)
    if (body.profileData) {
      const dataString = JSON.stringify(body.profileData);
      const encrypted = encryptData(dataString);
      encryptedData = encrypted.encrypted;
      iv = encrypted.iv;
    } 
    // Handle legacy format (already encrypted)
    else if (body.encryptedData && body.iv) {
      encryptedData = body.encryptedData;
      iv = body.iv;
    } else {
      return NextResponse.json(
        { error: 'Missing required fields: profileData or encryptedData/iv' },
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
