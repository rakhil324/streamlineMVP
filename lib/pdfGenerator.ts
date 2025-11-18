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
        
        // Split text into lines and process
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        console.log(`Processing ${lines.length} lines for PDF`);
        
        doc.font('Helvetica');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          try {
            // Skip intro text
            if (line.toLowerCase().includes("here's") || 
                line.toLowerCase().includes("tailored resume") ||
                line.toLowerCase().includes("for a ")) {
              continue;
            }
            
            // Simple formatting: just output the text
            doc.fontSize(10).font('Helvetica').text(line, {
              align: 'left',
              width: 512,
              lineGap: 1.2
            });
            doc.moveDown(0.15);
          } catch (lineError: any) {
            console.error(`Error processing line ${i}:`, lineError?.message);
            // Fallback
            try {
              doc.fontSize(10).font('Helvetica').text(line, { align: 'left', width: 512 });
              doc.moveDown(0.15);
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

