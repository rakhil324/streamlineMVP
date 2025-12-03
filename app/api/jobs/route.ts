import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// GET - List all jobs for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      // For unauthenticated users, return empty jobs list
      const response = NextResponse.json({ jobs: [] });
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
    }

    // Get all jobs for this user from database
    const applications = await prisma.application.findMany({
      where: { userId: session.user.id },
      orderBy: { appliedDate: 'desc' },
    });

    // Transform to expected format
    const jobs = applications.map(app => ({
      id: app.id,
      title: app.jobTitle,
      company: app.company,
      location: app.location || '',
      type: app.jobType || 'Full-time',
      status: app.status,
      appliedDate: app.appliedDate.toISOString().split('T')[0],
      description: '',
      jobUrl: app.jobUrl || '',
      deadline: app.deadline || undefined,
    }));

    const response = NextResponse.json({ jobs });
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  } catch (error) {
    console.error('Error fetching jobs:', error);
    const errorResponse = NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
}

// POST - Create a new job
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      const errorResponse = NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    const { title, company, location, description, jobUrl } = await request.json();

    if (!title || !company) {
      const errorResponse = NextResponse.json(
        { error: 'Title and company are required' },
        { status: 400 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    // Check if job already exists (same title + company for this user)
    const existingApplication = await prisma.application.findFirst({
      where: {
        userId: session.user.id,
        jobTitle: title,
        company: company,
      },
    });

    if (existingApplication) {
      console.log('Job already exists, returning existing job');
      const response = NextResponse.json({ 
        job: {
          id: existingApplication.id,
          title: existingApplication.jobTitle,
          company: existingApplication.company,
          location: existingApplication.location || '',
          status: existingApplication.status,
          appliedDate: existingApplication.appliedDate.toISOString().split('T')[0],
        },
        message: 'Job already exists'
      });
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
    }

    // Create new application in database
    const application = await prisma.application.create({
      data: {
        userId: session.user.id,
        jobTitle: title,
        company: company,
        location: location || '',
        jobUrl: jobUrl || '',
        status: 'Applied',
        platform: 'Extension',
      },
    });

    const job = {
      id: application.id,
      title: application.jobTitle,
      company: application.company,
      location: application.location || '',
      status: application.status,
      appliedDate: application.appliedDate.toISOString().split('T')[0],
      jobUrl: application.jobUrl || '',
    };

    console.log(`Job saved to tracker: ${title} at ${company}`);
    
    const response = NextResponse.json({ job, success: true });
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  } catch (error) {
    console.error('Error creating job:', error);
    const errorResponse = NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
}
