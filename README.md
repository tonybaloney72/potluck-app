# Potluck App 🍽️

A social application that allows users to plan and participate in potluck events. Connect with friends, organize gatherings, coordinate contributions, and make event planning effortless!

## About

Potluck App is a modern web application designed to simplify the organization of potluck events. Users can create events, invite friends, manage contributions, and stay connected through messaging and notifications. Built with a focus on user experience, theme customization, and real-time collaboration.

## Features

### Current Features (Phase 1 & 2 Complete)

- ✅ **User Authentication** - Secure sign up, login, and session management via Supabase
- ✅ **User Profiles** - Customizable profiles with avatars, names, and location
- ✅ **Theme System** - Per-user theme preferences (light, dark, or system)
- ✅ **Protected Routes** - Secure access to authenticated pages
- ✅ **Responsive Design** - Modern UI built with Tailwind CSS
- ✅ **Smooth Animations** - Enhanced UX with Motion (Framer Motion)

### Coming Soon

- 🔄 **Friends System** - Connect with other users, send friend requests
- 🔄 **Event Management** - Create, edit, and manage potluck events
- 🔄 **RSVP System** - Let attendees confirm their participation
- 🔄 **Contribution Tracking** - Coordinate who's bringing what
- 🔄 **Role-Based Permissions** - Creators, co-creators, contributors, and guests
- 🔄 **Messaging** - Direct messaging between users
- 🔄 **Notifications** - Real-time updates for event changes
- 🔄 **Event Comments** - Discussion threads for each event

## Tech Stack

- **Frontend Framework**: React 19 with TypeScript
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS v4
- **Animations**: Motion (Framer Motion)
- **Routing**: React Router v7
- **Backend & Database**: Supabase
  - Authentication
  - PostgreSQL Database
  - Row Level Security (RLS)
- **Build Tool**: Vite
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase account and project

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd potluck-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory:

   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Set up Supabase:

   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Run the database migrations (see database setup in project documentation)
   - Configure authentication settings

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
potluck-app/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── common/      # Common components (Button, Input, etc.)
│   │   └── layout/     # Layout components (Header, Layout)
│   ├── context/        # React contexts (Theme, etc.)
│   ├── features/       # Feature-specific code
│   │   ├── auth/       # Authentication feature
│   │   ├── events/     # Events feature (coming soon)
│   │   ├── friends/    # Friends feature (coming soon)
│   │   └── messages/   # Messaging feature (coming soon)
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Page components
│   ├── routes/         # Route configuration
│   ├── services/       # API services (Supabase client)
│   ├── store/          # Redux store
│   │   └── slices/     # Redux slices
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── public/             # Static assets
└── dist/              # Build output (generated)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Development Status

This project is currently in active development. Phase 1 (Foundation) and Phase 2 (User Management) are complete. We're working on Phase 3 (Friends & Messaging) next.

## Future Plans

- Support for additional event types beyond potlucks
- Mobile app (React Native)
- Advanced event features (recurring events, event templates)
- Social features (event discovery, public events)
- Integration with calendar applications

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

[Add your license here]

---

Built with ❤️ using React, TypeScript, and Supabase
