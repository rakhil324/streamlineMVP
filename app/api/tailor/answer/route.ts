import { NextRequest, NextResponse } from 'next/server';

// Try to import Anthropic, but handle if it's not installed
let Anthropic: any = null;
let anthropic: any = null;

try {
  Anthropic = require('@anthropic-ai/sdk');
  if (Anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
} catch (error) {
  console.warn('Anthropic SDK not installed or not configured');
}

export async function POST(request: NextRequest) {
  try {
    const { question, jobDescription, jobTitle, companyName } = await request.json();

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Check if Anthropic is available
    if (!anthropic || !process.env.ANTHROPIC_API_KEY) {
      console.warn('AI service not configured, generating fallback answer');
      
      // Generate a simple fallback answer
      let answer = `I am excited about the opportunity`;
      
      if (jobTitle && companyName) {
        answer = `I am excited about the ${jobTitle} position at ${companyName}. My skills and experience align well with the role's requirements, and I am eager to contribute to the team's success.`;
      } else if (companyName) {
        answer = `I am excited about the opportunity to work at ${companyName}. My background and skills make me a strong fit for this role, and I look forward to contributing to the team.`;
      } else if (jobTitle) {
        answer = `I am excited about the ${jobTitle} position. My experience and skills align well with the requirements, and I am eager to make a meaningful contribution.`;
      }
      
      return NextResponse.json({
        answer,
        fallback: true,
        message: 'Using fallback answer (AI service not configured)'
      });
    }

    // Build context for the AI
    let context = `You are helping someone answer an application question for a job.`;
    
    if (jobTitle) {
      context += `\n\nJob Title: ${jobTitle}`;
    }
    if (companyName) {
      context += `\nCompany: ${companyName}`;
    }
    if (jobDescription) {
      context += `\n\nJob Description:\n${jobDescription.substring(0, 1000)}`;
    }

    // Generate answer using Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `${context}\n\nQuestion: ${question}\n\nPlease provide a concise, professional answer (2-3 sentences max) that would be appropriate for a job application.`
        }
      ]
    });

    const answer = message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Error generating answer:', error);
    
    // Return fallback answer on error
    const { jobTitle, companyName } = await request.json().catch(() => ({}));
    let answer = `I am excited about this opportunity and believe my skills and experience make me a strong candidate for this position.`;
    
    if (jobTitle && companyName) {
      answer = `I am excited about the ${jobTitle} position at ${companyName}. My skills and experience align well with the role's requirements, and I am eager to contribute to the team's success.`;
    }
    
    return NextResponse.json({
      answer,
      fallback: true,
      error: 'AI service error, using fallback answer'
    });
  }
}

