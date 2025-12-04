/**
 * PDF Generation Utility
 * Converts text content to PDF format
 */

/**
 * Strips markdown formatting from text
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/^#+\s+/gm, '') // Headers
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links
    .trim();
}

export async function generatePDF(text: string, filename: string): Promise<Buffer> {
  try {
    // Strip markdown formatting first
    text = stripMarkdown(text);
    
    // Use require for server-side only
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PDFDocument = require('pdfkit');
    
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'LETTER'
        });
        
        const chunks: Buffer[] = [];
        let hasError = false;
        
        doc.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        
        doc.on('end', () => {
          if (!hasError) {
            const buffer = Buffer.concat(chunks);
            if (buffer.length === 0) {
              reject(new Error('Generated PDF buffer is empty'));
            } else {
              console.log(`PDF generated successfully: ${buffer.length} bytes`);
              resolve(buffer);
            }
          }
        });
        
        doc.on('error', (err: Error) => {
          hasError = true;
          console.error('PDFKit error:', err);
          reject(err);
        });
        
        // Preserve exact line structure from original document
        // Split by newlines to preserve line-by-line formatting
        const lines = text.split(/\r\n|\r|\n/);
        console.log(`Processing ${lines.length} lines for PDF`);

        doc.font('Helvetica');
        doc.fontSize(10);

        // Track if we're in the header section (first few lines)
        let headerLinesProcessed = 0;
        const maxHeaderLines = 5;
        
        // Track consecutive blank lines to preserve spacing
        let consecutiveBlanks = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();

          // Skip intro text that LLM might have added
          if (trimmedLine.toLowerCase().startsWith("here's") ||
              trimmedLine.toLowerCase().startsWith("here is") ||
              trimmedLine.toLowerCase().includes("tailored cover letter for")) {
            continue;
          }

          // Handle blank lines - preserve spacing
          if (!trimmedLine) {
            consecutiveBlanks++;
            // Only add spacing if we haven't already added too much
            if (consecutiveBlanks === 1) {
              // Single blank line - add small spacing
              if (headerLinesProcessed < maxHeaderLines) {
                doc.moveDown(0.2); // Small spacing in header
              } else {
                doc.moveDown(0.5); // Normal paragraph spacing
              }
            }
            // Skip additional consecutive blank lines to avoid excessive spacing
            continue;
          }

          // Reset blank line counter when we hit a non-blank line
          consecutiveBlanks = 0;

          try {
            // Determine if this is a header line (name, contact info, date)
            const isHeaderLine = headerLinesProcessed < maxHeaderLines && 
                                 trimmedLine.length < 60 && 
                                 (trimmedLine.includes('@') || // Email
                                  trimmedLine.match(/^\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/) || // Phone
                                  trimmedLine.match(/^\w+\s+\d{1,2},\s+\d{4}$/) || // Date
                                  trimmedLine.length < 40); // Short line likely header

            if (isHeaderLine) {
              headerLinesProcessed++;
              // Header lines: smaller spacing, left-aligned
              doc.fontSize(10).font('Helvetica').text(trimmedLine, {
                align: 'left',
                width: 512
              });
              doc.moveDown(0.2);
            } else {
              // Body text: normal paragraph formatting
              headerLinesProcessed = maxHeaderLines; // Mark header as done
              
              // Check if this looks like a salutation or closing
              const isShortLine = trimmedLine.length < 50 && 
                                  (trimmedLine.startsWith('Dear') || 
                                   trimmedLine.startsWith('Sincerely') ||
                                   trimmedLine.startsWith('Best regards') ||
                                   trimmedLine.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+$/)); // Name pattern
              
              if (isShortLine) {
                doc.fontSize(10).font('Helvetica').text(trimmedLine, {
                  align: 'left',
                  width: 512
                });
                doc.moveDown(0.5);
              } else {
                // Regular paragraph line - wrap text properly
                doc.fontSize(10).font('Helvetica').text(trimmedLine, {
                  align: 'left',
                  width: 512,
                  lineGap: 1.2
                });
                // Don't add spacing here - let blank lines handle it
              }
            }
          } catch (lineError: any) {
            console.error(`Error processing line ${i}:`, lineError?.message);
            // Fallback - just output the line
            try {
              doc.fontSize(10).font('Helvetica').text(trimmedLine, { 
                align: 'left', 
                width: 512 
              });
              doc.moveDown(0.3);
            } catch (fallbackError) {
              console.error('Fallback also failed');
            }
          }
        }
        
        console.log(`Finished processing PDF document`);
        doc.end();
      } catch (err: any) {
        reject(new Error(`PDF generation error: ${err.message}`));
      }
    });
  } catch (error: any) {
    throw new Error(`Failed to initialize PDF generator: ${error.message}. Please install pdfkit: npm install pdfkit`);
  }
}

