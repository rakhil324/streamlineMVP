import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Groq API for LLM
async function callGroqAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that helps job applicants write concise, professional answers to application questions. Keep answers under 200 words unless specifically asked for more detail.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, jobDescription, jobTitle, companyName, resumeText } = body;

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Try to get user's resume from profile if not provided
    let userResume = resumeText || '';
    
    try {
      const session = await auth();
      if (session?.user?.id) {
        const profile = await prisma.profile.findUnique({
          where: { userId: session.user.id },
        });
        
        if (profile?.encryptedData) {
          // For now, just use any resume text we have
          // In production, decrypt the profile data
        }
      }
    } catch (e) {
      // Continue without profile data
    }

    // Check if Groq API is configured
    if (!process.env.GROQ_API_KEY) {
      console.warn('GROQ_API_KEY not configured, generating fallback answer');
      
      // Generate a simple fallback answer
      let answer = `I am excited about this opportunity and believe my skills and experience make me a strong candidate.`;
      
      if (jobTitle && companyName) {
        answer = `I am excited about the ${jobTitle} position at ${companyName}. My skills and experience align well with the role's requirements, and I am eager to contribute to the team's success.`;
      } else if (companyName) {
        answer = `I am excited about the opportunity to work at ${companyName}. My background and skills make me a strong fit for this role.`;
      } else if (jobTitle) {
        answer = `I am excited about the ${jobTitle} position. My experience and skills align well with the requirements.`;
      }
      
      const response = NextResponse.json({
        answer,
        fallback: true,
        message: 'Using fallback answer (GROQ_API_KEY not configured)'
      });
      response.headers.set('Access-Control-Allow-Origin', '*');
      return response;
    }

    // Build the prompt
    let prompt = `Please answer the following job application question professionally and concisely.\n\n`;
    
    if (jobTitle) {
      prompt += `Job Title: ${jobTitle}\n`;
    }
    if (companyName) {
      prompt += `Company: ${companyName}\n`;
    }
    if (jobDescription) {
      prompt += `\nJob Description:\n${jobDescription.substring(0, 1500)}\n`;
    }
    if (userResume) {
      prompt += `\nApplicant's Background:\n${userResume.substring(0, 1000)}\n`;
    }
    
    prompt += `\nQuestion: ${question}\n\nPlease provide a concise, professional answer (2-3 sentences, under 200 words) that would be appropriate for a job application.`;

    // Call Groq API
    const answer = await callGroqAPI(prompt);

    // Clean up the response
    let cleanAnswer = answer.trim();
    cleanAnswer = cleanAnswer.replace(/```[\s\S]*?```/g, '').trim();
    cleanAnswer = cleanAnswer.replace(/^["']|["']$/g, '').trim();

    const response = NextResponse.json({
      success: true,
      answer: cleanAnswer,
    });
    
    // Add CORS headers for Chrome extension
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  } catch (error: any) {
    console.error('Error generating answer:', error);
    
    // Return fallback answer on error
    const response = NextResponse.json({
      answer: 'I am excited about this opportunity and believe my skills and experience make me a strong candidate for this position.',
      fallback: true,
      error: error.message || 'AI service error'
    });
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  }
}
