# Simplify Dashboard - MVP

A modern, lightweight, and highly visual web application that serves as the central control center for managing job applications, saved roles, and AI-assisted tools.

## Features

- **Dashboard**: Quick overview of job search progress with metrics and widgets
- **Job Tracker**: Kanban-style board for tracking application statuses
- **Saved Jobs**: Grid layout for managing favorite job postings
- **Job Search**: Search interface for discovering new opportunities
- **AI Tools**: Placeholder for AI-powered job search assistance
- **Settings**: User profile and preferences management
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark Mode Support**: Toggle between light and dark themes

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

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

## Mock Data

The application uses mock data to demonstrate functionality. All job listings, statistics, and user information are static and provided for UI demonstration purposes only.

## License

MIT
