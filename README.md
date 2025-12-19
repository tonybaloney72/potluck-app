# Potluck App 🍽️

A social application that allows users to plan and participate in potluck events. Connect with friends, organize gatherings, coordinate contributions, and make event planning effortless!

## About

Potluck App is a modern web application designed to simplify the organization of potluck events. Users can create events, invite friends, manage contributions, and stay connected through messaging and notifications. Built with a focus on user experience, theme customization, and real-time collaboration.

## Features

### Current Features (Phase 1, 2, 3, 4, 5, 6 & 7 Complete)

- ✅ **User Authentication** - Secure sign up, login, and session management via Supabase
  - ✅ **Account Deactivation** - Users can deactivate their accounts while preserving data
  - ✅ **Account Reactivation** - Deactivated users can reactivate their accounts by logging in
  - ✅ **Account Deletion** - Users can permanently delete their accounts with automatic cleanup after 30 days
  - ✅ **Inactive User Handling** - Inactive users are hidden from searches and cannot send/receive messages
  - ✅ **Guest Account** - Pre-configured guest account with dummy data for testing without creating accounts
- ✅ **User Profiles** - Customizable profiles with avatars, names, and interactive location selection
  - ✅ **Interactive Location Map** - Select location using map interface with address search
  - ✅ **Location Storage** - Locations stored as JSONB with coordinates (lat, lng) and formatted address
  - ✅ **Profile Privacy Settings** - Control profile visibility with private profile option
  - ✅ **View User Profiles** - View other users' profiles with contextual actions (send message, add/remove friend)
  - ✅ **Privacy Controls** - Private profiles hide details from non-friends (only name and avatar visible)
- ✅ **Theme System** - Per-user theme preferences (light, dark, or system)
- ✅ **Protected Routes** - Secure access to authenticated pages with deep linking support
- ✅ **Responsive Design** - Modern UI built with Tailwind CSS
- ✅ **Smooth Animations** - Enhanced UX with Motion (Framer Motion)
- ✅ **Accessibility (A11y)** - WCAG 2.1 Level AA compliant with ARIA labels, semantic HTML, keyboard navigation, focus management, and screen reader support
- ✅ **Navigation Enhancements** - Smooth page transitions, scroll position management, back buttons, and deep linking with login redirect
- ✅ **Friends System** - Connect with other users, send and accept friend requests, manage friendships
  - ✅ **Real-time Updates** - Instant synchronization of friend requests, acceptances, and removals
  - ✅ **Mutual Friends** - View mutual friends between you and other users
  - ✅ **Social Metadata** - Friend count and mutual friend information displayed on profiles and friend cards
- ✅ **Messaging** - Direct messaging between friends with conversation-based architecture
  - ✅ **Real-time Messaging** - Instant message delivery and conversation updates
  - ✅ **Smart Notifications** - Message notifications that suppress when actively viewing a conversation
  - ✅ **Auto-scroll** - Automatically scrolls to newest messages
- ✅ **Notifications System** - Real-time notification updates for friend requests, messages, event invitations, and RSVP updates
  - ✅ **Real-time Notifications** - Instant notification delivery via Supabase Realtime
  - ✅ **Notification Management** - Mark as read, delete, and navigate to related content
  - ✅ **RSVP Notifications** - Hosts receive notifications when attendees RSVP to their events
- ✅ **Event Management** - Create, edit, and delete potluck events with full event details
  - ✅ **Inline Event Editing** - Edit event title, theme, description, location, and date/time directly from event page
  - ✅ **Interactive Location Selection** - Select event locations using interactive map with address search and click-to-place functionality
  - ✅ **Location Storage** - Event locations stored as JSONB with coordinates (lat, lng) and formatted address
  - ✅ **Real-time Event Updates** - Instant synchronization of event changes across all viewers
  - ✅ **Calendar Integration** - Add events to Google Calendar or download for Apple Calendar
  - ✅ **Event Filtering** - Filter events by status (upcoming, past, all) and search by title
  - ✅ **Event Pagination** - Paginated event lists for better performance with large event collections
  - ✅ **Public Events** - Events can be marked as public, making them discoverable to all users
  - ✅ **Event Discovery** - Discover public events via interactive map and location-based search
  - ✅ **Join Request System** - Users can request to join public events with role selection (guest or contributor)
  - ✅ **Join Request Management** - Hosts can approve or deny join requests based on event settings and conditions
  - ✅ **Pending Requests Page** - Centralized page for managing incoming and outgoing join requests
- ✅ **RSVP System** - Attendees can RSVP with status (going, maybe, not going, pending)
  - ✅ **Real-time RSVP Updates** - See RSVP status changes instantly across all viewers
  - ✅ **Contribution Tracking** - Coordinate who's bringing what to events
  - ✅ **Add/Remove Contributions** - Track item names, quantities, and descriptions
  - ✅ **Real-time Contributions** - See contributions added or removed instantly
  - ✅ **Role-Based Access** - Hosts, co-hosts, and contributors can add contributions (guests can view only)
- ✅ **Event Comments** - Discussion threads for each event
  - ✅ **Real-time Comments** - See new comments appear instantly as they're posted
  - ✅ **Comment Management** - Add and delete your own comments (hosts can delete any)
- ✅ **Role-Based Permissions** - Complete role system with granular permissions
  - ✅ **Host Permissions** - Hosts can edit events, delete events, add/remove participants, and manage contributions/comments
  - ✅ **Role Assignment** - Assign roles (host, co_host, contributor, guest) when inviting users to events
  - ✅ **Role Modification** - Hosts and co-hosts can modify participant roles after event creation
  - ✅ **Role Protection** - Host roles cannot be modified or removed by anyone
  - ✅ **Role-Based Contributions** - All roles except 'guest' can add contributions (host, co_host, contributor)
  - ✅ **RSVP Notifications** - Host receives real-time notifications when attendees RSVP to their events
- ✅ **UI/UX Improvements** - Enhanced hover states, button states, and visual feedback throughout the application
- ✅ **Performance Optimizations** - Optimized Redux state management with normalized data structures for O(1) lookups

## Tech Stack

- **Frontend Framework**: React 19 with TypeScript
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS v4
- **Animations**: Motion (Framer Motion)
- **Routing**: React Router v7
- **Maps & Geocoding**:
  - **Leaflet** - Interactive map library for displaying and interacting with maps
  - **React Leaflet** - React bindings for Leaflet
  - **Geoapify** - Geocoding and reverse geocoding API for address search and coordinate conversion
- **Backend & Database**: Supabase
  - Authentication
  - PostgreSQL Database
  - Row Level Security (RLS)
  - JSONB support for structured location data
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
   VITE_GEOAPIFY_API_KEY=your_geoapify_api_key
   ```

   **Note**: Get your Geoapify API key from [geoapify.com](https://www.geoapify.com/). The free tier includes geocoding and map tiles.

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
│   │   ├── common/      # Common components (Button, Input, Map, etc.)
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
- ✅ Phase 6: Roles & Permissions (role assignment, role modification, role-based contributions, RSVP notifications)
- ✅ Phase 7: UI/UX Polish & Accessibility (accessibility improvements, navigation enhancements, hover states, page transitions)

## Recent Improvements

### Accessibility (A11y) Enhancements

- **WCAG 2.1 Level AA Compliance**: Full accessibility support with ARIA labels, semantic HTML, and keyboard navigation
- **Focus Management**: Visible focus indicators for keyboard users, focus traps in modals
- **Screen Reader Support**: Comprehensive ARIA attributes, skip links, and semantic landmarks
- **Form Accessibility**: Proper labels, error associations, and required field indicators
- **Keyboard Navigation**: Full keyboard support for all interactive elements

### Navigation Improvements

- **Page Transitions**: Smooth fade animations between routes for better visual continuity
- **Scroll Position Management**: Automatic scroll-to-top on route changes, ensuring new pages start at the top
- **Back Buttons**: Consistent back button implementation across Event Details, Create Event, and Profile pages
- **Deep Linking**: Protected routes redirect to login and automatically return users to their intended destination after authentication

### UI/UX Enhancements

- **Hover States**: Enhanced hover effects with consistent transitions, shadows, and color changes across all interactive elements
- **Button States**: Improved focus, disabled, loading, and active states for better user feedback
- **Visual Feedback**: Smooth transitions and animations throughout the application

### Performance Optimizations

- **Redux State Normalization**: Events state changed from array to normalized object structure (`eventsById`) for O(1) lookup complexity
- **Efficient Data Access**: Direct event access by ID eliminates need for array searches, improving performance with large event lists
- **Extended State Normalization**: Friends, conversations, and notifications now use normalized state structures for improved performance and consistency
- **Centralized Realtime Hooks**: Realtime subscription hooks moved to App component for better organization and lifecycle management
- **Enhanced Login Data Fetching**: Login process now fetches comprehensive user data (friends, conversations, notifications) for immediate availability

### Messaging & Navigation Improvements

- **URL-Based Messaging**: Messages now use URL-based routing for better navigation, deep linking, and browser history support
- **Improved Friend Page Navigation**: Enhanced navigation flow between friends list and messaging interface
- **Smart Message Notifications**: Improved notification handling for messaging friends with better context awareness

### Mobile & UI Refinements

- **Mobile Styling Fixes**: Resolved mobile-specific styling issues for better responsive experience across devices
- **Improved Language**: Enhanced copy and messaging on MyEventsPage for clearer user communication

### Event Management Enhancements

- **Event Filtering**: Filter events by status (upcoming, past, all) to quickly find relevant events
- **Event Search**: Search events by title to locate specific events quickly
- **Event Pagination**: Paginated event lists improve performance and navigation with large event collections
- **Improved Event Organization**: Better event list management with filtering, searching, and pagination controls

### Account Management

- **Account Deactivation**: Users can deactivate their accounts from the profile settings page
  - **Data Preservation**: All user data (events, messages, friendships) is preserved for reactivation
  - **Automatic Sign Out**: Users are automatically signed out after deactivation
  - **Temporary Status**: Accounts remain deactivated until user chooses to reactivate
- **Account Reactivation**: Deactivated users can reactivate by logging in
  - **Reactivation Flow**: Login redirects inactive users to a reactivation page
  - **Full Access Restoration**: Reactivation restores all account functionality immediately
- **Account Deletion**: Users can permanently delete their accounts
  - **30-Day Grace Period**: Deleted accounts are marked for deletion and scheduled for cleanup after 30 days
  - **Data Cleanup**: Automatic deletion of user data after grace period via scheduled cron job
  - **Irreversible Action**: Account deletion is permanent and cannot be undone after grace period
  - **Immediate Restrictions**: Deleted accounts are immediately restricted from all app features
- **Inactive User Restrictions**:
  - **Hidden from Searches**: Inactive users don't appear in friend searches
  - **Message Restrictions**: Cannot send or receive messages
  - **Friend Request Restrictions**: Cannot send or receive friend requests
  - **Conversation Handling**: Existing conversations with inactive users are visible but un-interactable
  - **Event Restrictions**: Cannot create or join new events

### Profile & Social Features

- **View User Profiles**: Navigate to any user's profile page (`/profile/:userId`)
  - **Profile Links**: Click on user names/avatars throughout the app to view their profiles
  - **Contextual Actions**: Actions change based on friendship status:
    - **Not Friends**: "Add Friend" button
    - **Request Sent**: "Cancel Request" button
    - **Friends**: "Send Message" and "Remove Friend" buttons
- **Profile Privacy Settings**:
  - **Private Profiles**: Users can enable private profile mode from settings
  - **Privacy Enforcement**: Private profiles hide location and email from non-friends
  - **Friend Access**: Friends can always see full profile details regardless of privacy setting
  - **Public Default**: Profiles are public by default, users can opt into privacy
- **Enhanced Navigation**: Profile links added to:
  - Friend cards in friends list
  - Conversation lists and headers in messages
  - Event participant cards

### Location & Mapping Features

- **Interactive Map Component**: Custom Map component built with Leaflet and React Leaflet for location selection
  - **Address Search**: Integrated Geoapify autocomplete for searching and selecting addresses
  - **Click-to-Place**: Click anywhere on the map to set a location with automatic reverse geocoding
  - **Visual Feedback**: Map markers and zoom adjustments for selected locations
  - **US-Only Filtering**: Address search filtered to US locations for better relevance

- **Location Data Structure**: Unified JSONB location format across events and profiles
  - **Structured Storage**: Locations stored as `{lat: number, lng: number, address: string}` in PostgreSQL JSONB columns
  - **Event Locations**: Events use JSONB location field for complete location data (coordinates + address)
  - **Profile Locations**: User profiles updated to use same JSONB structure for consistency
  - **Type Safety**: TypeScript interfaces ensure type safety for location data throughout the application

- **Geocoding Integration**:
  - **Forward Geocoding**: Convert addresses to coordinates via Geoapify autocomplete
  - **Reverse Geocoding**: Convert map clicks (coordinates) to formatted addresses
  - **Fallback Handling**: Graceful fallback to coordinate display if geocoding fails

### Public Events & Discovery

- **Public Event System**: Events can be marked as public during creation or editing
  - **Public Visibility**: Public events are visible to all authenticated users, not just friends
  - **Discovery Access**: Public events appear in discovery features and can be found by anyone
  - **Private by Default**: Events are private by default, requiring explicit opt-in for public visibility

- **Event Discovery Page** (`/discover`): Comprehensive discovery interface for finding public events
  - **Interactive Map View**: Visual map display showing all nearby public events with markers
  - **Location-Based Search**: Search for events by location with address autocomplete
  - **Radius Filtering**: Adjustable search radius (5, 10, 25, 50, or 100 miles)
  - **Distance Calculation**: Events display distance from your current location
  - **Event List View**: Scrollable list of nearby events with pagination (load more functionality)
  - **Map Popups**: Click event markers to see event details and navigate to full event page
  - **Location Priority**: Uses browser location, stored location, or profile location in priority order

- **Join Request Workflow**: Users can request to join public events they discover
  - **Role Selection**: Choose to join as a guest (view-only) or contributor (can add contributions)
  - **Request Submission**: Submit join requests with optional contribution details
  - **Approval Required**: Contributor requests require host approval; guest requests may auto-approve
  - **Request Status**: Track pending requests in dedicated Pending Requests page
  - **Host Notifications**: Hosts receive notifications when users request to join their events

- **Join Request Management**: Hosts control who can join their public events
  - **Approval/Denial**: Hosts can approve or deny join requests based on event capacity and settings
  - **Conditional Approval**: Approval logic considers event capacity, existing participants, and user relationships
  - **Request Rescinding**: Users can cancel their own pending join requests
  - **Real-time Updates**: Request status updates instantly across all viewers

### Guest Account & Testing

- **Guest Account System**: Pre-configured account for testing without creating new accounts
  - **Guest Login**: Use `guest@potluck-app.com` with configured password for instant access
  - **Dummy Data**: Comprehensive test data including friends, events, messages, and notifications
  - **Auto-Reset**: Guest data can be reset to provide fresh testing scenarios
  - **Realistic Experience**: Full app functionality with pre-populated social connections and events

- **Dummy Data Features**:
  - **8 Dummy Friends**: Pre-created friend accounts with various relationship statuses
  - **Multiple Events**: Mix of hosted events, attending events, and pending RSVPs
  - **Conversations**: Pre-populated message threads with multiple messages
  - **Notifications**: Sample notifications covering all notification types
  - **Event Participation**: Events include participants, contributions, and comments

### Social Features & Metadata

- **Mutual Friends**: Enhanced social discovery through mutual connections
  - **Mutual Friend Calculation**: Automatically calculates shared friends between users
  - **Profile Display**: Mutual friend count and list displayed on user profiles
  - **Friend Card Integration**: Mutual friends shown on friend cards in friends list
  - **Expandable Lists**: Click to expand and view full list of mutual friends
  - **Social Context**: Helps users understand their connection to others in the network

- **Social Metadata**: Rich profile information for better social context
  - **Friend Count**: Total number of friends displayed on profiles
  - **Mutual Friend Count**: Number of shared friends with the current user
  - **Profile Statistics**: Additional metadata to help users make social decisions

## Future Plans

- Support for additional event types beyond potlucks
- Enhanced event discovery filters (by date, event type, host)
- Integration with calendar applications
- Event sharing and social media integration

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

[Add your license here]

---

Built with ❤️ using React, TypeScript, and Supabase
