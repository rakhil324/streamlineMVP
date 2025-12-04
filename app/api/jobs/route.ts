import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

// DELETE - Delete a job by ID (pass id as query param: /api/jobs?id=xxx)
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      const errorResponse = NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    // Verify the job belongs to this user
    const application = await prisma.application.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!application) {
      const errorResponse = NextResponse.json(
        { error: 'Job not found or access denied' },
        { status: 404 }
      );
      errorResponse.headers.set('Access-Control-Allow-Origin', '*');
      return errorResponse;
    }

    // Delete the job
    await prisma.application.delete({
      where: { id: id },
    });

    console.log(`Job deleted: ${application.jobTitle} at ${application.company}`);
    
    const response = NextResponse.json({ success: true, message: 'Job deleted' });
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  } catch (error) {
    console.error('Error deleting job:', error);
    const errorResponse = NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
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
    const jobs = applications.map(app => {
      // Parse metadata to get description
      let description = '';
      if (app.metadata) {
        try {
          const metadata = JSON.parse(app.metadata);
          description = metadata.description || '';
        } catch (e) {}
      }
      
      return {
        id: app.id,
        title: app.jobTitle,
        company: app.company,
        location: app.location || '',
        type: app.jobType || 'Full-time',
        status: app.status,
        appliedDate: app.appliedDate.toISOString().split('T')[0],
        description: description,
        jobUrl: app.jobUrl || '',
        deadline: app.deadline || undefined,
      };
    });

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
      console.log('Job already exists, checking if update needed...');
      
      // Parse existing metadata
      let existingDescription = '';
      if (existingApplication.metadata) {
        try {
          const metadata = JSON.parse(existingApplication.metadata);
          existingDescription = metadata.description || '';
        } catch (e) {}
      }
      
      // Check if we should update (new data is better/more complete)
      // Consider new description "better" if it has proper formatting (newlines) or is longer
      const hasNewlines = description && description.includes('\n');
      const existingHasNewlines = existingDescription && existingDescription.includes('\n');
      const newDescriptionBetter = description && (
        description.length > existingDescription.length || // Longer is better
        (hasNewlines && !existingHasNewlines) || // Has formatting when old doesn't
        (!existingDescription) // No existing description
      );
      const newLocationBetter = location && !existingApplication.location;
      const newJobUrlBetter = jobUrl && !existingApplication.jobUrl;
      
      if (newDescriptionBetter || newLocationBetter || newJobUrlBetter) {
        console.log('Updating existing job with better data...');
        
        // Build update data
        const updateData: any = {};
        if (newLocationBetter) updateData.location = location;
        if (newJobUrlBetter) updateData.jobUrl = jobUrl;
        if (newDescriptionBetter) {
          updateData.metadata = JSON.stringify({ description: description.substring(0, 8000) });
        }
        
        // Update the existing application
        const updatedApplication = await prisma.application.update({
          where: { id: existingApplication.id },
          data: updateData,
        });
        
        // Parse updated metadata
        let updatedDescription = '';
        if (updatedApplication.metadata) {
          try {
            const metadata = JSON.parse(updatedApplication.metadata);
            updatedDescription = metadata.description || '';
          } catch (e) {}
        }
        
        const response = NextResponse.json({ 
          job: {
            id: updatedApplication.id,
            title: updatedApplication.jobTitle,
            company: updatedApplication.company,
            location: updatedApplication.location || '',
            status: updatedApplication.status,
            appliedDate: updatedApplication.appliedDate.toISOString().split('T')[0],
            description: updatedDescription,
            jobUrl: updatedApplication.jobUrl || '',
          },
          message: 'Job updated with better data',
          success: true
        });
        response.headers.set('Access-Control-Allow-Origin', '*');
        return response;
      }
      
      // No update needed, return existing
      const response = NextResponse.json({ 
        job: {
          id: existingApplication.id,
          title: existingApplication.jobTitle,
          company: existingApplication.company,
          location: existingApplication.location || '',
          status: existingApplication.status,
          appliedDate: existingApplication.appliedDate.toISOString().split('T')[0],
          description: existingDescription,
          jobUrl: existingApplication.jobUrl || '',
        },
        message: 'Job already exists'
      });
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
    }

    // Create new application in database with description in metadata
    const metadata = description ? JSON.stringify({ description: description.substring(0, 8000) }) : null;
    
    const application = await prisma.application.create({
      data: {
        userId: session.user.id,
        jobTitle: title,
        company: company,
        location: location || '',
        jobUrl: jobUrl || '',
        status: 'Applied',
        platform: 'Extension',
        metadata: metadata,
      },
    });

    // Parse metadata to get description back
    let savedDescription = '';
    if (application.metadata) {
      try {
        const parsedMetadata = JSON.parse(application.metadata);
        savedDescription = parsedMetadata.description || '';
      } catch (e) {}
    }
    
    const job = {
      id: application.id,
      title: application.jobTitle,
      company: application.company,
      location: application.location || '',
      status: application.status,
      appliedDate: application.appliedDate.toISOString().split('T')[0],
      jobUrl: application.jobUrl || '',
      description: savedDescription,
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
