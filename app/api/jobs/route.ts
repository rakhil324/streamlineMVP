import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

// File-based storage for user jobs
const STORAGE_DIR = path.join(process.cwd(), '.user-jobs');

async function getUserJobsPath(userId: string): Promise<string> {
  // Ensure storage directory exists
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  return path.join(STORAGE_DIR, `${userId}.json`);
}

async function loadUserJobs(userId: string): Promise<any[]> {
  try {
    const filePath = await getUserJobsPath(userId);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error('Error loading user jobs:', error);
    return [];
  }
}

async function saveUserJobs(userId: string, jobs: any[]): Promise<void> {
  const filePath = await getUserJobsPath(userId);
  await fs.writeFile(filePath, JSON.stringify(jobs, null, 2), 'utf-8');
}

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

// GET: Retrieve all jobs for the user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const userId = session.user.id || session.user.email || 'unknown';
    
    if (userId === 'unknown') {
      return NextResponse.json(
        { error: 'Unauthorized - Unable to identify user' },
        { status: 401 }
      );
    }

    const jobs = await loadUserJobs(userId);

    const response = NextResponse.json({
      success: true,
      jobs,
    });
    
    // Add CORS headers for Chrome extension
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  } catch (error: any) {
    console.error('Error retrieving jobs:', error);
    const errorResponse = NextResponse.json(
      { error: error.message || 'Failed to retrieve jobs' },
      { status: 500 }
    );
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
}

// POST: Save a new job
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const userId = session.user.id || session.user.email || 'unknown';
    
    if (userId === 'unknown') {
      return NextResponse.json(
        { error: 'Unauthorized - Unable to identify user' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, company, location, description, jobUrl } = body;

    if (!title || !company) {
      return NextResponse.json(
        { error: 'Title and company are required' },
        { status: 400 }
      );
    }

    // Load existing jobs
    const jobs = await loadUserJobs(userId);

    // Check if job already exists (by title and company)
    const existingJob = jobs.find(
      (job: any) => job.title === title && job.company === company
    );

    if (existingJob) {
      // Job already exists, return it
      const response = NextResponse.json({
        success: true,
        job: existingJob,
        message: 'Job already exists',
      });
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      return response;
    }

    // Create new job
    const newJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      company: company.trim(),
      location: location?.trim() || 'Not specified',
      type: 'Full-time', // Default
      status: 'Applied' as const,
      appliedDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      description: description?.trim() || '',
      jobUrl: jobUrl || '',
    };

    // Add to jobs array
    jobs.push(newJob);

    // Save jobs
    await saveUserJobs(userId, jobs);

    const response = NextResponse.json({
      success: true,
      job: newJob,
    });
    
    // Add CORS headers for Chrome extension
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  } catch (error: any) {
    console.error('Error saving job:', error);
    const errorResponse = NextResponse.json(
      { error: error.message || 'Failed to save job' },
      { status: 500 }
    );
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
}

