import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromFile, validateFile } from '@/lib/fileProcessor';
import { sanitizeText } from '@/lib/dataSanitization';
import { encrypt, generateSecureKey } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Extract text from file
    const originalText = await extractTextFromFile(file);

    // Sanitize the text (remove PII)
    const sanitizationResult = sanitizeText(originalText);

    // Generate encryption key for storing original data securely
    const encryptionKey = generateSecureKey();
    
    // Encrypt the original text (with PII) for storage
    const encryptedOriginal = encrypt(originalText, encryptionKey);

    // Return sanitized text for LLM processing and encrypted original for later restoration
    return NextResponse.json({
      success: true,
      sanitizedText: sanitizationResult.sanitizedText,
      encryptedOriginal,
      encryptionKey, // In production, store this securely (e.g., in session or database)
      removedData: sanitizationResult.removedData,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process file' },
      { status: 500 }
    );
  }
}

