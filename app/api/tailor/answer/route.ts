import { NextRequest, NextResponse } from 'next/server';
import { callLLM, generateApplicationQuestionPrompt } from '@/lib/llm';
import { auth } from '@/lib/auth';
import { decrypt } from '@/lib/encryption';
import fs from 'fs/promises';
import path from 'path';

// File-based storage for user documents
const STORAGE_DIR = path.join(process.cwd(), '.user-documents');

async function getUserDocumentsPath(userId: string): Promise<string> {
  return path.join(STORAGE_DIR, `${userId}.json`);
}

async function loadUserDocuments(userId: string): Promise<{
  resume?: {
    sanitizedText: string;
    encryptedOriginal: string;
    encryptionKey: string;
  };
}> {
  try {
    const filePath = await getUserDocumentsPath(userId);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {};
    }
    console.error('Error loading user documents:', error);
    return {};
  }
}

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
    const { question, jobDescription, jobTitle, companyName } = body;

    if (!question || !jobDescription || !jobTitle || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields: question, jobDescription, jobTitle, companyName' },
        { status: 400 }
      );
    }

    // Load user documents to get resume
    const documents = await loadUserDocuments(userId);

    if (!documents.resume) {
      return NextResponse.json(
        { error: 'No resume found in profile. Please upload a resume first.' },
        { status: 404 }
      );
    }

    // Get resume text (prefer decrypted, fallback to sanitized)
    let resumeText: string;
    try {
      resumeText = decrypt(documents.resume.encryptedOriginal, documents.resume.encryptionKey);
    } catch (error) {
      resumeText = documents.resume.sanitizedText;
    }

    // Get LLM configuration from environment variables
    const llmProvider = (process.env.LLM_PROVIDER || 'groq') as 'openai' | 'anthropic' | 'huggingface' | 'gemini' | 'groq';
    const llmApiKey = process.env.LLM_API_KEY || 
      process.env.OPENAI_API_KEY || 
      process.env.ANTHROPIC_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GROQ_API_KEY ||
      process.env.HUGGINGFACE_API_KEY;
    
    if (!llmApiKey) {
      return NextResponse.json(
        { error: 'LLM API key not configured. Please set one of: GROQ_API_KEY (recommended - free), GEMINI_API_KEY (free), HUGGINGFACE_API_KEY (free), OPENAI_API_KEY, or ANTHROPIC_API_KEY in your .env.local file.' },
        { status: 500 }
      );
    }

    // Generate prompt for LLM
    const prompt = generateApplicationQuestionPrompt(
      question,
      resumeText,
      jobDescription,
      jobTitle,
      companyName
    );

    // Call LLM API
    const llmResponse = await callLLM(prompt, {
      provider: llmProvider,
      apiKey: llmApiKey,
      model: process.env.LLM_MODEL,
    });

    // Clean up the response (remove any markdown, extra whitespace, etc.)
    let answer = llmResponse.content.trim();
    // Remove markdown code blocks if present
    answer = answer.replace(/```[\s\S]*?```/g, '').trim();
    // Remove any leading/trailing quotes
    answer = answer.replace(/^["']|["']$/g, '').trim();

    const response = NextResponse.json({
      success: true,
      answer: answer,
    });
    
    // Add CORS headers for Chrome extension
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return response;
  } catch (error: any) {
    console.error('Error generating answer:', error);
    const errorResponse = NextResponse.json(
      { error: error.message || 'Failed to generate answer' },
      { status: 500 }
    );
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
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

