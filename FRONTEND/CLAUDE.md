# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a Next.js 15 financial dashboard application located in `financial-dashboard-2/`. The main application uses:

- **Framework**: Next.js 15 with React 18 and TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Authentication**: Supabase Auth with custom auth context
- **State Management**: React Context (AuthProvider, SettingsProvider)
- **Backend**: External API at `process.env.NEXT_PUBLIC_API_URL` (defaults to localhost:3001)

## Development Commands

All development should be run from the `financial-dashboard-2/` directory:

```bash
cd financial-dashboard-2
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

## Architecture Overview

### Authentication Flow
- Uses Supabase client-side authentication
- `AuthProvider` context manages user state and session handling
- Middleware handles route protection (minimal implementation)
- User profile data fetched from external API after Supabase auth

### Core Structure
- **Pages**: App Router structure in `app/` directory
- **Components**: Feature-based organization (agents, analytics, conversations, etc.)
- **UI Components**: shadcn/ui components in `components/ui/`
- **Contexts**: Auth and Settings contexts for global state
- **API Layer**: Centralized API calls through `lib/api.ts`

### Key Features
- **Dashboard**: Main landing page with stats and charts
- **Agents**: AI agent management with chat preview
- **Analytics**: Business metrics and reporting
- **Conversations**: Chat interface for customer interactions
- **Leads**: Lead management and tracking
- **Organization**: Multi-tenant organization management

## Environment Setup

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (optional, defaults to localhost:3001)

## Component Patterns

- Uses TypeScript with strict typing
- Follows shadcn/ui component patterns
- Context providers wrap the entire app in layout.tsx
- Client components marked with "use client" directive
- Uses Tailwind CSS with custom styles in `styles/`