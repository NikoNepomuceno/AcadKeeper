# AcadKeeper

A comprehensive school supplies inventory management system built with Next.js, Supabase, and TypeScript. AcadKeeper helps educational institutions track, manage, and maintain their inventory of school supplies with role-based access control and real-time updates.

## Features

- 📦 **Inventory Management**: Add, edit, and track school supplies with categories, quantities, and locations
- 👥 **User Management**: Role-based access control with Super Admin, Admin, and Staff roles
- 📊 **Dashboard Analytics**: Real-time insights into inventory levels and stock status
- 🔔 **Low Stock Alerts**: Automated notifications when items fall below minimum stock levels
- 📝 **Activity Logging**: Complete audit trail of all inventory changes
- 📋 **Stockout Requests**: Staff can request items when out of stock
- 🎨 **Modern UI**: Beautiful, responsive interface built with Tailwind CSS and Radix UI
- 🔐 **Secure Authentication**: Built-in authentication with Supabase Auth

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI Components
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: React Context API
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 18 or higher)
- [pnpm](https://pnpm.io/) (recommended) or npm
- [Git](https://git-scm.com/)
- A [Supabase](https://supabase.com/) account

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd AcadKeeper
```

### 2. Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### 3. Set Up Supabase Database

1. **Create a new Supabase project**:

   - Go to [supabase.com](https://supabase.com/)
   - Sign up/login and create a new project
   - Note down your project URL and anon key

2. **Set up the database schema**:

   - In your Supabase dashboard, go to the SQL Editor
   - Run the SQL scripts from the `scripts/` folder in order:
     ```sql
     -- Run these scripts in sequence:
     -- 001_create_inventory_table.sql
     -- 002_create_logs_table.sql
     -- 003_create_update_trigger.sql
     -- 004_create_user_profiles.sql
     -- 005_fix_rls_policies.sql
     -- 006_fix_rls_recursion.sql
     -- 007_simple_rls_policies.sql
     -- 008_complete_rls_reset.sql
     -- 009_create_stockout_requests.sql
     -- 010_user_status.sql
     ```

3. **Configure Row Level Security (RLS)**:
   - The scripts will set up RLS policies for secure data access
   - Ensure all tables have appropriate RLS policies enabled

### 4. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Where to find these values:**

- `NEXT_PUBLIC_SUPABASE_URL`: Found in your Supabase project settings under "API"
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Found in your Supabase project settings under "API"
- `SUPABASE_SERVICE_ROLE_KEY`: Found in your Supabase project settings under "API" (keep this secret!)

### 5. Create Initial Super Admin

After setting up the database, you need to create a super admin user:

1. **Sign up through the application**:

   - Start the development server (see next step)
   - Go to `/auth/signup` and create an account
   - Note the user ID from the Supabase Auth users table

2. **Run the super admin creation script**:
   - Go to `/api/seed/create-superadmin` in your browser
   - This will create the super admin profile

### 6. Start the Development Server

```bash
# Using pnpm
pnpm dev

# Or using npm
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
AcadKeeper/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── settings/          # Settings page
│   └── superAdmin/        # Super admin dashboard
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── *.tsx             # Feature-specific components
├── lib/                   # Utility libraries
│   ├── supabase/         # Supabase client configurations
│   └── auth-context.tsx  # Authentication context
├── scripts/              # Database setup scripts
├── types/                # TypeScript type definitions
└── public/               # Static assets
```

## Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build the application for production
- `pnpm start` - Start the production server
- `pnpm lint` - Run ESLint

## User Roles

- **Super Admin**: Full system access, user management, all inventory operations
- **Admin**: Inventory management, user oversight, stockout approvals
- **Staff**: Basic inventory viewing, stockout requests

## Database Schema

The application uses the following main tables:

- `inventory` - School supplies inventory items
- `inventory_logs` - Audit trail for inventory changes
- `user_profiles` - User role and status information
- `stockout_requests` - Staff requests for out-of-stock items

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The application can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Troubleshooting

### Common Issues

1. **Database connection errors**:

   - Verify your Supabase URL and keys are correct
   - Ensure your Supabase project is active
   - Check that all database scripts have been run

2. **Authentication issues**:

   - Clear browser cookies and local storage
   - Verify Supabase Auth is enabled in your project
   - Check that RLS policies are properly configured

3. **Build errors**:
   - Ensure all dependencies are installed
   - Check that all environment variables are set
   - Verify TypeScript types are correct

### Getting Help

If you encounter issues:

1. Check the browser console for error messages
2. Verify your Supabase project logs
3. Ensure all database scripts have been executed
4. Check that environment variables are properly set

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository or contact the development team.
