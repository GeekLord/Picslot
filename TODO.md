# Picslot - Strategic SaaS Roadmap

This document outlines the strategic roadmap for evolving Picslot from a powerful tool into a professional, scalable, and profitable SaaS platform.

---

## ✅ Phase 1: Foundational Infrastructure (Completed)

**Objective:** Build the core infrastructure required for a professional, account-based system using industry-standard cloud services.

-   [x] **Implement Production-Grade User Authentication (Supabase Auth)**
    -   [x] Secure registration, email confirmation, password reset, and login flows.
    -   [x] Support for email/password and Google social logins.
-   [x] **Implement Cloud-Based Project Storage (Supabase Storage & PostgreSQL)**
    -   [x] Cloud storage for all user-generated images and project assets.
    -   [x] "My Projects" dashboard to view, load, update, and delete saved work.
-   [x] **Implement Full Suite of Core AI Features (Gemini API)**
    -   [x] Generative Mask & Retouching
    -   [x] One-click tools: Background Removal, Auto Enhance, Restore, Studio Portrait, Magic Expand, Composite Card, and Character Turnaround.
-   [x] **Implement Prompt Management System**
    -   [x] Full CRUD for user-saved prompts.
    -   [x] AI-powered prompt enhancement and title generation.
    -   [x] Ability to share prompts with other users via email.

---

## Phase 2: The Professional SaaS Experience

**Objective:** Overhaul the user experience and implement the core features expected of a modern SaaS application.

### Phase 2A: UI/UX & Navigation Overhaul

-   [x] **Comprehensive Navigation System**
    -   [x] **Primary Navigation Bar**: Implemented Dashboard, Projects, and Editor links.
    -   [x] **User Menu**: Profile, Settings, Billing, Notifications, Logout.
    -   [x] **Mobile-Responsive "Hamburger" Menu** with smooth transitions.
    -   [ ] **Breadcrumb Navigation** within nested pages (e.g., Settings > Security).
    -   [x] **Consistent Iconography** with descriptive tooltips.

-   [x] **Enhanced User Dashboard**
    -   [ ] **Usage Analytics Section**:
        -   [ ] Visual progress bar for AI credits used vs. remaining.
        -   [ ] Chart for monthly/weekly project creation trends.
        -   [ ] Donut chart showing most-used AI features.
        -   [x] Added placeholder for this section.
    -   [x] **Quick Actions Panel**:
        -   [x] "Recent Projects" list with thumbnail previews.
        -   [ ] "Start from a Template" gallery.
        -   [ ] "Community Spotlight" to feature inspiring user creations.
    -   [ ] **Notification Center**:
        -   [ ] In-app widget for system updates, feature announcements, and usage alerts.

-   [ ] **Comprehensive User Profile Management**
    -   [x] **Profile Information**:
        -   [x] Profile photo upload (with option for AI background removal and AI user avatar maker).
        -   [x] Display name, professional title, bio, and website link.
    -   [ ] **Public Portfolio**:
        -   [ ] Ability to feature selected projects in a public gallery.
        -   [ ] Unique, shareable public URL (e.g., `picslot.com/username`).
    -   [ ] **Activity Timeline**:
        -   [ ] Chronological feed of recent edits, created projects, and shared prompts.
    -   [ ] **Gamification/Achievements**:
        -   [ ] Award badges for milestones (e.g., "100th Edit," "Restoration Master").

### Phase 2B: Advanced Account & Billing Management

-   [x] **Centralized Settings Interface**
    -   [x] **General**: Manage profile info (Name, Bio). Theme (dark/light mode), language.
    -   [ ] **Security**:
        -   [ ] Password change flow.
        -   [ ] **Two-Factor Authentication (2FA)** setup.
        -   [ ] View and revoke active login sessions.
    -   [ ] **Privacy**: Control public profile visibility and usage analytics opt-in.
    -   [ ] **Notifications**: Granular control over in-app and email notifications.
    -   [ ] **API & Integrations**: (Future) API key management.
    -   [ ] **Data Management**: Export or delete user data.

-   [ ] **Subscription & Billing Portal**
    -   [ ] **Plan Management**: View current plan, see usage against limits, and access upgrade/downgrade options.
    -   [ ] **Billing History**: Access and download past invoices.
    -   [ ] **Payment Methods**: Add or update credit card information.
    -   [ ] **Usage Analytics**: Detailed charts on monthly credit consumption.
    -   [ ] **Credit Packs**: Offer "Pay-as-you-go" credit packs as an alternative to subscriptions.

### Phase 2C: Core Experience & Workflow Enhancements

-   [ ] **Robust Notification System**
    -   [ ] **In-App**: Real-time alerts for AI job completion, shared content, etc.
    -   [ ] **Email**: Welcome series, usage summaries, and feature announcements.

-   [ ] **Integrated Help & Support System**
    -   [ ] **Interactive Onboarding Tour** for new users.
    -   [ ] **In-App Help Center**: Searchable knowledge base and video tutorials.
    -   [ ] **Support Ticketing System** or live chat integration.

-   [ ] **Advanced Project Management**
    -   [ ] **Organization**: Create folders, add tags, and use advanced search/filters.
    -   [x] **Version History**: Create named "snapshots" of an edit history to easily revert to.
    -   [ ] **Templates**: Save a series of edits as a reusable preset.

### Phase 2D: Analytics & Platform Management

-   [ ] **User-Facing Analytics Dashboard**
    -   [ ] Provide insights into personal productivity (e.g., time spent editing, most used tools).
    -   [ ] Show before/after quality metrics on enhancements.

-   [ ] **Admin Panel (for Internal Management)**
    -   [ ] **User Management**: View user list, manage roles, and handle support requests.
    -   [ ] **System Analytics**: Monitor platform-wide usage, performance, and error rates.
    -   [ ] **Content Moderation**: Flag and review potentially inappropriate public content.
    -   [ ] **Feature Flag Management**: Enable/disable new features for specific user segments for A/B testing or phased rollouts.

---

## Phase 3: Monetization & Public Launch

**Objective:** Introduce a Freemium model, integrate a payment gateway, and launch a public-facing marketing website to attract and convert users.

-   [ ] **Implement Freemium Logic**
    -   [ ] Introduce an AI "credit" system (e.g., 10 free credits/month).
    -   [ ] Gate premium features (e.g., high-res export, batch processing) behind a subscription.
    -   [ ] Add a subtle watermark to all exports from the free tier.

-   [ ] **Integrate Payment Gateway (e.g., Stripe)**
    -   [ ] Build a secure checkout flow for subscriptions and credit packs.
    -   [ ] Automate credit allocation and feature access based on subscription status.

-   [ ] **Build Public-Facing Website**
    -   [ ] **Home Page**: Compelling value proposition and hero section.
    -   [ ] **Features Page**: Detailed breakdown of all AI tools.
    -   [ ] **Pricing Page**: Clear comparison of Free and Pro tiers.
    -   [ ] **Community/Gallery Page**: Showcase best user-created content.
    -   [ ] **Blog/Content Hub**: For tutorials and announcements.
    -   [ ] **Legal Pages**: Terms of Use, Privacy Policy.
    -   [ ] **About & Contact Pages**.

---

## Phase 4: Ecosystem & Collaboration

**Objective:** Expand the platform with features for power users, professionals, and teams.

-   [ ] **Batch Processing**: Apply the same edit or filter to multiple images at once.
-   [ ] **Team Workspaces**
    -   [ ] Invite members to a shared workspace.
    -   [ ] Role-based access control (Admin, Editor, Viewer).
    -   [ ] Shared projects, asset libraries, and billing.
    -   [ ] Real-time collaboration features (e.g., commenting on images).
-   [ ] **Public API**
    -   [ ] Allow developers to integrate Picslot's AI capabilities into their own applications.
-   [ ] **Community Marketplace**
    -   [ ] Allow users to share or sell their custom prompts and filter presets.

---

## Technical Implementation Blueprints

### Database Schema

All database schema definitions, including tables, policies, functions, and triggers, are managed in the `SQL.md` file. This serves as the single source of truth for the database structure and should be used for initial setup and any subsequent migrations.

### Proposed Frontend Component Architecture

```
src/
├── components/
│   ├── core/              # Reusable atoms (Button, Input, Spinner)
│   ├── layout/            # Layout components (Navbar, Sidebar, PageWrapper)
│   ├── auth/              # Auth-related components
│   ├── editor/            # All editor-specific components
│   ├── dashboard/
│   │   ├── DashboardLayout.tsx
│   │   ├── AnalyticsCard.tsx
│   │   └── UsageChart.tsx
│   ├── profile/
│   │   ├── ProfileEditor.tsx
│   │   └── PortfolioGallery.tsx
│   ├── settings/
│   │   ├── SettingsLayout.tsx
│   │   ├── SecuritySettings.tsx
│   │   └── BillingSettings.tsx
│   └── admin/
│       ├── AdminLayout.tsx
│       └── UserManagementTable.tsx
├── hooks/                 # Custom hooks (useUser, useSubscription)
├── contexts/              # React contexts (AuthContext, ThemeContext)
├── pages/                 # Page-level components (DashboardPage, SettingsPage)
└── services/              # API services (Supabase, Gemini, Stripe)
```