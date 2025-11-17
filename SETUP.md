# Setup Guide for AI Tools

## Step 1: Environment Variables

Create a `.env.local` file in the root directory with your LLM API key:

```env
# OpenAI Configuration (recommended)
OPENAI_API_KEY=your_openai_api_key_here
LLM_PROVIDER=openai
LLM_MODEL=gpt-4-turbo-preview

# OR Anthropic Configuration
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
# LLM_PROVIDER=anthropic
# LLM_MODEL=claude-3-opus-20240229

# Auth Secret (required)
AUTH_SECRET=your-secret-key-change-in-production
```

### Getting API Keys:
- **OpenAI**: Get your API key from https://platform.openai.com/api-keys
- **Anthropic**: Get your API key from https://console.anthropic.com/

## Step 2: Start the Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

## Step 3: Testing the AI Tools

### Test Resume Tailoring:

1. **Navigate to AI Tools**
   - Go to http://localhost:3000/ai-tools
   - Click on "Resume Builder" card

2. **Upload a Resume**
   - You'll see a file upload section
   - Click "Choose File" and select a resume file (PDF, Word, or TXT)
   - Supported formats: `.pdf`, `.doc`, `.docx`, `.txt`
   - Max file size: 10MB
   - Wait for the upload to complete (you'll see a green checkmark)

3. **Select a Job**
   - A job selector modal will appear
   - Choose one of the mock jobs (e.g., "Senior Frontend Developer at Google")
   - Click "Use This Job"

4. **Generate Tailored Resume**
   - The system will:
     - Sanitize your resume (remove PII)
     - Send sanitized version to LLM
     - Generate tailored resume
     - Restore PII in the final output
   - You'll see progress steps during generation

5. **Download PDF**
   - Once generated, click "Download PDF" button
   - The tailored resume will download as a PDF file

### Test Cover Letter Tailoring:

1. **Navigate to AI Tools**
   - Go to http://localhost:3000/ai-tools
   - Click on "Cover Letter Writer" card

2. **Upload a Resume** (same as above)
   - The resume is used as context for the cover letter

3. **Select a Job** (same as above)

4. **Generate Cover Letter**
   - The system will generate a tailored cover letter
   - Progress steps will be shown

5. **Download PDF**
   - Click "Download PDF" to get the cover letter as PDF

## Testing Without API Key

If you don't have an API key yet, the system will show an error message when you try to generate content. The file upload and sanitization will still work, but the LLM tailoring will fail.

## Troubleshooting

### Error: "LLM API key not configured"
- Make sure your `.env.local` file exists in the root directory
- Verify the API key is correct
- Restart the development server after adding/changing environment variables

### Error: "Failed to extract text from PDF"
- Make sure `pdf-parse` is installed (should be installed with `npm install`)
- Try with a different PDF file or convert to text format

### Error: "Failed to generate PDF"
- Make sure `pdfkit` is installed (should be installed with `npm install`)
- Check that the generated content is valid

### File Upload Issues
- Check file size (must be under 10MB)
- Verify file format is supported (.pdf, .doc, .docx, .txt)
- Try a different file if one doesn't work

## Security Features Tested

The system automatically:
- ✅ Detects and removes PII (emails, phones, addresses, names, etc.)
- ✅ Encrypts original files
- ✅ Sends only sanitized data to LLMs
- ✅ Restores PII in final output
- ✅ Generates secure PDF downloads

## Sample Test Files

You can create a simple test resume in a `.txt` file:

```
JOHN DOE
Software Engineer

PROFESSIONAL SUMMARY
Experienced software engineer with 5+ years in web development.

TECHNICAL SKILLS
• JavaScript, React, Node.js
• Python, SQL
• Git, Docker

EXPERIENCE
Senior Software Engineer | Tech Corp | 2020 - Present
• Built scalable web applications
• Led team of 5 developers
• Improved performance by 40%

Software Engineer | Startup Inc | 2018 - 2020
• Developed REST APIs
• Implemented CI/CD pipelines

EDUCATION
Bachelor of Science in Computer Science | State University | 2018
```

Save this as `test-resume.txt` and use it for testing!

