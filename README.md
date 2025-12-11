# SDBA Admin System

A Next.js-based admin dashboard for managing SDBA (Sports Database Administration) registrations, approvals, and exports.

## Features

- **Admin Dashboard**: Overview with KPIs and statistics
- **Application Management**: Review, approve, and reject team registrations
- **Real-time Updates**: Live notifications for new pending registrations
- **CSV Exports**: Export team data for different event types (TN, WU, SC)
- **Authentication**: Secure admin-only access with Supabase Auth
- **Responsive Design**: Modern UI built with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Notifications**: Sonner (Toast notifications)
- **Validation**: Zod

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account and project
- Environment variables configured (see below)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd SDBA_admin_system-3
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Where to find these values:**
- Go to your Supabase project dashboard
- Navigate to Settings → API
- Copy the Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- Copy the `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy the `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **Important**: Never commit `.env.local` to version control. The service role key has full database access.

### 4. Set up the database

Run the SQL schema from `db_schema/main.sql` in your Supabase SQL editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `db_schema/main.sql`
4. Execute the script

This will create all necessary tables, views, functions, and RLS policies.

### 5. Create an admin user

Admin users are identified by having `is_admin: true` in their `user_metadata` or `app_metadata`. You can create an admin user through:

- The Supabase dashboard (Auth → Users → Create user)
- The signup API endpoint (`/api/auth/signup`) - automatically sets `is_admin: true`

### 6. Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── admin/              # Admin dashboard pages
│   ├── api/                # API routes
│   │   ├── admin/          # Admin-only endpoints
│   │   ├── auth/           # Authentication endpoints
│   │   └── public/         # Public endpoints
│   ├── auth/               # Login page
│   └── layout.tsx          # Root layout with providers
├── components/             # Reusable React components
│   ├── ErrorBoundary.tsx   # Error boundary component
│   └── Spinner.tsx         # Loading spinner component
├── lib/                    # Utility libraries
│   ├── api-errors.ts       # Standardized error handling
│   ├── auth.ts             # Authentication utilities
│   ├── env.ts              # Environment variable validation
│   ├── logger.ts           # Logging utility
│   ├── supabaseClient.ts   # Client-side Supabase client
│   └── supabaseServer.ts   # Server-side Supabase client
├── types/                  # TypeScript type definitions
│   ├── api.ts              # API request/response types
│   └── auth.ts             # Authentication types
└── db_schema/              # Database schema
    └── main.sql            # Main database schema (single source of truth)
```

## API Documentation

### Admin Endpoints

All admin endpoints require authentication and admin privileges.

#### `GET /api/admin/list`
List registrations with filtering and pagination.

**Query Parameters:**
- `page` (number, default: 1): Page number
- `pageSize` (number, default: 50): Items per page
- `q` (string, optional): Search query
- `status` (string): Filter by status (`pending`, `approved`, `rejected`, `all`)
- `event` (string): Filter by event type (`tn`, `wu`, `sc`, `all`)
- `season` (number, optional): Filter by season

**Response:**
```json
{
  "ok": true,
  "page": 1,
  "pageSize": 50,
  "total": 100,
  "items": [...]
}
```

#### `POST /api/admin/approve`
Approve a pending registration.

**Request Body:**
```json
{
  "registration_id": "uuid",
  "notes": "optional notes"
}
```

**Response:**
```json
{
  "ok": true,
  "team_meta_id": "uuid"
}
```

#### `POST /api/admin/reject`
Reject a pending registration.

**Request Body:**
```json
{
  "registration_id": "uuid",
  "notes": "required rejection reason"
}
```

**Response:**
```json
{
  "ok": true
}
```

#### `GET /api/admin/counters`
Get dashboard statistics.

**Response:**
```json
{
  "ok": true,
  "total": 100,
  "pending": 10,
  "approved": 80,
  "rejected": 10,
  "new_today": 5
}
```

#### `POST /api/admin/export`
Export team data as CSV.

**Request Body:**
```json
{
  "mode": "tn" | "wu" | "sc" | "all",
  "season": 2025,  // optional, 2000-2100
  "category": "men_open" | "ladies_open" | "mixed_open" | "mixed_corporate"  // optional
}
```

**Response:** CSV file download

### Auth Endpoints

#### `POST /api/auth/signin`
Sign in with email and password.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

#### `POST /api/auth/signup`
Create a new admin user (requires service role key).

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

### Public Endpoints

#### `POST /api/public/register`
Submit a new team registration.

**Request Body:**
```json
{
  "race_category": "men_open" | "ladies_open" | "mixed_open" | "mixed_corporate",
  "num_teams": 5,
  "num_teams_opt1": 2,
  "num_teams_opt2": 1,
  "season": 2025,
  "org_name": "Organization Name",
  "org_address": "Address",
  "team_names": ["Team A", "Team B"],
  "team_options": ["Option 1", "Option 2"],
  "managers": {
    "manager1_name": "Name",
    "manager1_mobile": "1234567890",
    "manager1_email": "email@example.com",
    ...
  }
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) | Yes |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The app will automatically deploy on every push to the main branch.

### Manual Deployment

```bash
npm run build
npm start
```

## Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

- TypeScript strict mode enabled
- ESLint with Next.js config
- Prettier (if configured)

## Security Considerations

- **Service Role Key**: Never expose the service role key to the client. It's only used in server-side code.
- **RLS Policies**: Database uses Row Level Security (RLS) policies to restrict access.
- **Admin Authentication**: All admin routes check for admin privileges.
- **Input Validation**: All API endpoints validate input using Zod schemas.
- **Error Handling**: Errors are handled consistently and don't expose sensitive information.

## Troubleshooting

### "Missing required environment variables" error

Make sure all environment variables are set in `.env.local` (development) or your deployment platform (production).

### "Access denied" or 403 errors

- Verify you're logged in as an admin user
- Check that the user has `is_admin: true` in their metadata
- Ensure cookies are enabled in your browser

### Database connection errors

- Verify your Supabase project is active
- Check that the database URL and keys are correct
- Ensure RLS policies are properly configured

## License

[Add your license here]

## Support

[Add support contact information here]
