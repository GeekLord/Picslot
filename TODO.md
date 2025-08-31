# Picslot - Strategic Roadmap & TODO

This document outlines the strategic roadmap for evolving Picslot from a powerful tool into a professional, profitable platform. We will tackle this in logical phases, starting with the foundational elements required for pro features.

---

## ✅ Phase 1: Foundation for "Pro"

**Objective:** Build the core infrastructure required for a professional, account-based system using industry-standard cloud services. This is the top priority.

-   [x] **Implement Production-Grade User Authentication**
    -   [x] **Replace Local Storage Auth:** Removed insecure `localStorage`-based authentication logic.
    -   [x] **Integrate Cloud Auth Provider:** Implemented a secure authentication solution using **Supabase Auth**.
    -   [x] **Implement Secure Flows:** Created robust and secure registration and login flows.
    -   [x] **Support Multiple Auth Methods:** Added support for email/password and **Google social login**.
    -   [x] **Gate Application:** Ensured the main application is accessible only to authenticated users.
    -   [x] **Implement Logout:** Added secure logout functionality that properly terminates the user's session.

-   [x] **Implement Cloud-Based Project Storage**
    -   [x] **Replace Local Storage Projects:** Removed the `localStorage`-based project saving mechanism.
    -   [x] **Integrate Cloud Storage:** Used **Supabase Storage** for all user-generated images and project assets.
    -   [x] **Design Database Schema:** Created a database schema in Supabase's PostgreSQL to store project metadata.
    -   [x] **Implement Project Management:**
        -   [x] Users can save their complete editing sessions to their cloud account.
        -   [x] "My Projects" dashboard to view, load, and manage all saved work from the cloud.

-   [x] **Add High-Demand AI Features**
    -   [x] **Generative Edit:** Users can select an area and fill or replace it with AI-generated content based on a prompt.
    -   [x] **Background Removal & Replacement:** Implemented a one-click tool to remove the background, making it transparent.
    -   [ ] *Idea:* Allow replacing the background with an AI-generated scene.

### **Setup & Integration Checklist (for Supabase)**
-   [x] Create a new project on [Supabase](https://supabase.com/).
-   [x] In the project settings, find the **Project URL** and **`anon` public key**.
-   [x] Set up environment variables for the application (`index.html` script tag).
-   [x] Use the Supabase SQL editor to create a `projects` table for storing project metadata.
-   [x] Enable and configure Supabase Storage, creating a bucket (`project-images`) with appropriate security policies.
-   [x] Install the required client library: `@supabase/supabase-js`.
---

## Phase 2: Monetization Launch

**Objective:** Introduce a Freemium model to convert users into paying customers.

-   [ ] **Implement Freemium Logic**
    -   [ ] Introduce an AI "credit" system for the free tier (e.g., 10 free credits/month).
    -   [ ] Gate premium features (e.g., high-res export) behind a subscription.
    -   [ ] Add a subtle watermark to all exports from the free tier.
-   [ ] **Integrate Payment Gateway**
    -   [ ] Integrate a payment provider like Stripe for handling subscriptions.
    -   [ ] Create a simple pricing page and checkout flow.
-   [ ] **Add Pro-Tier Features**
    -   [ ] Enable high-resolution exports for Pro subscribers.
    -   [ ] Remove watermarks for Pro subscribers.
    -   [ ] Grant unlimited AI credits to Pro subscribers.

---

## Phase 3: Ecosystem & Collaboration

**Objective:** Expand the platform with features for power users, professionals, and teams.
-   [ ] **Build Power-User Features**
    -   [ ] **Batch Processing:** Allow users to apply the same edit or filter to multiple images at once.
    -   [ ] **Asset Library:** Give users a personal cloud library for their uploaded images and generated assets.
-   [ ] **Develop Team/Business Tier Features**
    -   [ ] **Shared Workspaces:** Allow users to create teams and share projects.
    -   [ ] **Commenting & Feedback:** Enable team members to leave comments on image projects.
    -   [ ] **Brand Kit:** Allow teams to upload brand assets (logos, colors, fonts) for easy access.
-   [ ] **Expand Content & Templates**
    -   [ ] Develop a rich library of templates for social media, marketing, and more.