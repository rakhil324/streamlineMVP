import { NextRequest, NextResponse } from 'next/server';

// In-memory job storage (for demo purposes)
// In production, this should be stored in a database
const jobsStorage: Map<string, any[]> = new Map();

// GET - List all jobs for the current user
export async function GET(request: NextRequest) {
  try {
    // For demo, use a default user ID
    const userId = 'demo-user';
    
    // Get all jobs for this user
    const jobs = jobsStorage.get(userId) || [];

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// POST - Create a new job
export async function POST(request: NextRequest) {
  try {
    const { title, company, location, description, jobUrl } = await request.json();

    if (!title || !company) {
      return NextResponse.json(
        { error: 'Title and company are required' },
        { status: 400 }
      );
    }

    // For demo, use a default user ID
    const userId = 'demo-user';
    
    // Get existing jobs for this user
    const userJobs = jobsStorage.get(userId) || [];

    // Check if job already exists (same title + company + URL)
    const existingJob = userJobs.find(
      (j) => j.title === title && j.company === company && j.jobUrl === jobUrl
    );

    if (existingJob) {
      console.log('Job already exists, returning existing job');
      return NextResponse.json({ job: existingJob });
    }

    // Create new job
    const job = {
      id: Date.now().toString(), // Simple ID generation
      userId,
      title,
      company,
      location: location || '',
      description: description || '',
      jobUrl: jobUrl || '',
      status: 'applied',
      appliedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // Add to storage
    userJobs.push(job);
    jobsStorage.set(userId, userJobs);

    console.log(`Job saved to tracker: ${title} at ${company}`);
    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}

