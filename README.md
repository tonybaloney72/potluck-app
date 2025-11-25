# Potluck App 🍽️

A social application that allows users to plan and participate in potluck events. Connect with friends, organize gatherings, coordinate contributions, and make event planning effortless!

## About

Potluck App is a modern web application designed to simplify the organization of potluck events. Users can create events, invite friends, manage contributions, and stay connected through messaging and notifications. Built with a focus on user experience, theme customization, and real-time collaboration.

## Features

### Current Features (Phase 1, 2, 3, 4 & 5 Complete)

- ✅ **User Authentication** - Secure sign up, login, and session management via Supabase
- ✅ **User Profiles** - Customizable profiles with avatars, names, and location
- ✅ **Theme System** - Per-user theme preferences (light, dark, or system)
- ✅ **Protected Routes** - Secure access to authenticated pages
- ✅ **Responsive Design** - Modern UI built with Tailwind CSS
- ✅ **Smooth Animations** - Enhanced UX with Motion (Framer Motion)
- ✅ **Friends System** - Connect with other users, send and accept friend requests, manage friendships
  - ✅ **Real-time Updates** - Instant synchronization of friend requests, acceptances, and removals
- ✅ **Messaging** - Direct messaging between friends with conversation-based architecture
  - ✅ **Real-time Messaging** - Instant message delivery and conversation updates
  - ✅ **Smart Notifications** - Message notifications that suppress when actively viewing a conversation
  - ✅ **Auto-scroll** - Automatically scrolls to newest messages
- ✅ **Notifications System** - Real-time notification updates for friend requests, messages, and event invitations
  - ✅ **Real-time Notifications** - Instant notification delivery via Supabase Realtime
  - ✅ **Notification Management** - Mark as read, delete, and navigate to related content
- ✅ **Event Management** - Create, edit, and delete potluck events with full event details
  - ✅ **Inline Event Editing** - Edit event title, theme, description, location, and date/time directly from event page
  - ✅ **Real-time Event Updates** - Instant synchronization of event changes across all viewers
  - ✅ **Calendar Integration** - Add events to Google Calendar or download for Apple Calendar
- ✅ **RSVP System** - Attendees can RSVP with status (going, maybe, not going, pending)
  - ✅ **Real-time RSVP Updates** - See RSVP status changes instantly across all viewers
- ✅ **Contribution Tracking** - Coordinate who's bringing what to events
  - ✅ **Add/Remove Contributions** - Track item names, quantities, and descriptions
  - ✅ **Real-time Contributions** - See contributions added or removed instantly
  - ⚠️ **Role-Based Access** - Currently only hosts can add contributions (full role system in progress)
- ✅ **Event Comments** - Discussion threads for each event
  - ✅ **Real-time Comments** - See new comments appear instantly as they're posted
  - ✅ **Comment Management** - Add and delete your own comments (hosts can delete any)
- ✅ **Role-Based Permissions (Partial)** - Basic role system with host permissions
  - ✅ **Host Permissions** - Hosts can edit events, delete events, add/remove participants, and manage contributions/comments
  - ✅ **Role Assignment** - Roles are assigned when users are invited (default: guest)
  - ⚠️ **Role Management UI** - Role assignment and modification UI coming soon

### Coming Soon

- 🔄 **Advanced Role Management** - Assign and modify user roles when inviting or after event creation
- 🔄 **Role-Based Contributions** - Allow all roles except 'guest' to add contributions
- 🔄 **RSVP Notifications** - Host receives notifications when attendees RSVP

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
│   │   ├── events/     # Events feature
│   │   ├── friends/    # Friends feature
│   │   └── messages/   # Messaging feature
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

This project is currently in active development.

**Completed Phases:**

- ✅ Phase 1: Foundation (Supabase setup, routing, Redux store)
- ✅ Phase 2: User Management (authentication, profiles, theme system)
- ✅ Phase 3: Friends & Messaging (friends system, direct messaging)
- ✅ Phase 4: Notifications (notification system, real-time updates, notification UI)
- ✅ Phase 5: Events Core (create, edit, delete events, RSVP system, contributions, comments)

**In Progress:**

- 🔄 Phase 6: Roles & Permissions (advanced role management, role assignment UI)

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
