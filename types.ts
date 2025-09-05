/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface Snapshot {
  id: string;
  name: string;
  history_index: number;
  created_at: string;
  thumbnail_path: string; // path in Supabase storage
}

export interface Project {
  id: string;
  name: string;
  updated_at: string;
  history: string[]; // Array of paths in Supabase Storage
  history_index: number;
  thumbnail: string; // Path in Supabase Storage
  snapshots: Snapshot[];
}

export interface Prompt {
  id: string;
  title: string;
  prompt: string;
  updated_at: string;
}

export interface UserProfile {
  id: string; // Corresponds to auth.users.id
  display_name: string | null;
  title: string | null;
  bio: string | null;
  website: string | null;
  profile_image_url: string | null;
  updated_at: string;
}

export interface Template {
  title: string;
  description: string;
  imageUrl: string;
  prompt: string;
}
