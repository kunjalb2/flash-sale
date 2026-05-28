# SeatFlow Frontend

A premium, production-grade flash-sale ticket booking platform built with Next.js 15, TypeScript, and modern UI components.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI primitives)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Payments**: Stripe Frontend SDK
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

3. Configure your environment variables in `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── auth/              # Authentication pages
│   ├── admin/             # Admin pages
│   ├── bookings/          # Booking history
│   ├── dashboard/         # User dashboard
│   ├── events/            # Events listing and details
│   └── layout.tsx         # Root layout
├── components/
│   ├── features/          # Feature-specific components
│   ├── layout/            # Layout components (Header, Footer, Shell)
│   ├── providers/         # React context providers
│   └── ui/                # Reusable UI components (shadcn/ui)
├── config/                # Configuration files
├── guards/                # Route protection (AuthGuard)
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
├── stores/                # Zustand state stores
└── types/                 # TypeScript type definitions
```

## Key Features

### Authentication
- Login and registration pages
- JWT token management with refresh tokens
- Protected routes with role-based access control

### User Features
- Event browsing and filtering
- Event details with ticket information
- Booking history with upcoming and past events
- User dashboard with statistics

### Admin Features
- Admin dashboard with platform statistics
- Event management (CRUD operations)
- Booking overview and management

### UI/UX
- Premium, Apple-inspired design
- Responsive layout (mobile, tablet, desktop)
- Loading states with skeleton components
- Error states with user-friendly messages
- Accessible components (WCAG compliant)
- Dark mode ready

## Design System

### Colors
- **Primary**: Neutral black for primary actions
- **Secondary**: Light gray for secondary actions
- **Muted**: Subtle gray for non-interactive elements
- **Destructive**: Red for destructive actions
- **Accent**: Subtle highlight color

### Typography
- **Display**: Large headings and page titles
- **Body**: Readable body text
- **Mono**: Code and technical content

### Spacing
- Consistent spacing scale from 0.125rem to 24rem
- Based on 4px grid system

### Components
All UI components follow shadcn/ui patterns with premium styling:
- Buttons with multiple variants
- Form inputs and labels
- Cards with consistent padding
- Badges for status indicators
- Dialogs and modals
- Dropdowns and menus
- Tabs for content organization

## API Integration

The frontend uses a custom API client built on Axios with:
- Automatic token injection
- Token refresh on 401 errors
- Request/response interceptors
- Type-safe API calls

### Example Usage
```typescript
import { useApiQuery } from "@/hooks/use-api";

const { data, isLoading, error } = useApiQuery<Event[]>(
  ["events"],
  "/events"
);
```

## State Management

### Zustand Stores
- **auth-store**: User authentication state and methods
- Additional stores can be added as needed

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Code Quality

- Strict TypeScript configuration
- ESLint for code linting
- No unused imports or variables
- Consistent code formatting

## Deployment

The frontend can be deployed to:
- Vercel (recommended)
- Netlify
- Any Node.js hosting platform

### Environment Variables

Ensure all required environment variables are set in your deployment environment.

## License

MIT
