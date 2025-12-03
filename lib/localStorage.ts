/**
 * Local File Storage Utility
 * Replaces Supabase Storage for local development
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const STORAGE_PATH = process.env.STORAGE_PATH || './storage';

/**
 * Ensures storage directory exists
 */
async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_PATH, { recursive: true });
  } catch (error) {
    console.error('Error creating storage directory:', error);
  }
}

/**
 * Uploads an encrypted file to local storage
 * @param bucket - Storage bucket name (folder)
 * @param filePath - File path within bucket
 * @param file - File data (Buffer or Blob)
 * @param contentType - MIME type
 * @returns Local file path
 */
export async function uploadEncryptedFile(
  bucket: string,
  filePath: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  await ensureStorageDir();
  
  const bucketPath = path.join(STORAGE_PATH, bucket);
  await fs.mkdir(bucketPath, { recursive: true });
  
  const fullPath = path.join(bucketPath, filePath);
  const dirPath = path.dirname(fullPath);
  
  // Ensure subdirectories exist
  await fs.mkdir(dirPath, { recursive: true });
  
  // Write file
  await fs.writeFile(fullPath, file);
  
  // Return relative path for storage
  return path.join(bucket, filePath);
}

/**
 * Downloads a file from local storage
 * @param bucket - Storage bucket name
 * @param filePath - File path within bucket
 * @returns File data as Buffer
 */
export async function downloadFile(
  bucket: string,
  filePath: string
): Promise<Buffer> {
  const fullPath = path.join(STORAGE_PATH, bucket, filePath);
  return await fs.readFile(fullPath);
}

/**
 * Deletes a file from local storage
 * @param bucket - Storage bucket name
 * @param filePath - File path within bucket
 */
export async function deleteFile(bucket: string, filePath: string): Promise<void> {
  const fullPath = path.join(STORAGE_PATH, bucket, filePath);
  try {
    await fs.unlink(fullPath);
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}

/**
 * Generates a signed URL for secure file access
 * For local storage, just returns the relative path
 * @param bucket - Storage bucket name
 * @param filePath - File path within bucket
 * @param expiresIn - Not used for local storage
 * @returns File path
 */
export async function getSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  // For local storage, return the path
  // In production, this would generate a temporary signed URL
  return path.join(bucket, filePath);
}

/**
 * Get full file system path
 * @param relativePath - Relative storage path
 * @returns Full file system path
 */
export function getFullPath(relativePath: string): string {
  return path.join(STORAGE_PATH, relativePath);
}

