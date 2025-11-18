# Streamline.ai Dashboard - MVP

A modern, lightweight, and highly visual web application that serves as the central control center for managing job applications, saved roles, and AI-assisted tools.

## Features

- **Dashboard**: Quick overview of job search progress with metrics and widgets
- **Job Tracker**: Kanban-style board for tracking application statuses
- **Saved Jobs**: Grid layout for managing favorite job postings
- **Job Search**: Search interface for discovering new opportunities
- **AI Tools**: AI-powered resume and cover letter tailoring with LLM integration
- **Settings**: User profile and preferences management
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark Mode Support**: Toggle between light and dark themes

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **LLM Integration**: OpenAI / Anthropic Claude
- **PDF Generation**: PDFKit
- **File Processing**: pdf-parse, mammoth
- **Security**: AES-256-GCM encryption, PII sanitization

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file in the root directory with the following:
```env
# LLM API Configuration (choose one provider)
OPENAI_API_KEY=your_openai_api_key_here
LLM_PROVIDER=openai
LLM_MODEL=gpt-4-turbo-preview

# OR for Anthropic
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
# LLM_PROVIDER=anthropic
# LLM_MODEL=claude-3-opus-20240229

# Auth Secret
AUTH_SECRET=your-secret-key-change-in-production
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
simplifyMVP/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Dashboard page
│   ├── tracker/           # Job tracker page
│   ├── saved/             # Saved jobs page
│   ├── search/            # Job search page
│   ├── ai-tools/          # AI tools page
│   ├── settings/          # Settings page
│   └── layout.tsx         # Root layout
├── components/
│   ├── layout/            # Layout components (Sidebar, HeaderBar, etc.)
│   ├── ui/                # Reusable UI components (Button, Card, Tag, etc.)
│   └── providers/         # Context providers (Theme)
├── lib/
│   └── mockData.ts        # Mock data for jobs and statistics
└── public/                # Static assets

## Design System

- **Primary Color**: #5865F2 (bright indigo/blue)
- **Background**: #F8FAFC (off-white/light gray)
- **Typography**: Inter font family
- **Border Radius**: 12-16px for cards, 8px for buttons
- **Shadows**: Subtle drop shadows (0 2px 6px rgba(0,0,0,0.08))

## AI Tools Features

### Resume & Cover Letter Tailoring
- **File Upload**: Support for PDF, Word (.doc, .docx), and text files
- **PII Protection**: Automatic sanitization of personal information before sending to LLMs
- **Encryption**: Original files are encrypted for secure storage
- **LLM Integration**: Real-time tailoring using OpenAI GPT-4 or Anthropic Claude
- **PDF Export**: Download tailored resumes and cover letters as PDFs

### Security & Privacy
- Personal Identifiable Information (PII) is automatically detected and removed before sending to LLMs
- Original data is encrypted using AES-256-GCM encryption
- PII is restored in the final output after LLM processing
- Supported PII types: emails, phone numbers, addresses, names, SSN, credit card numbers

## Mock Data

The application uses mock data for job listings and statistics. Resume and cover letter tailoring uses real LLM APIs when configured.

## License

MIT
