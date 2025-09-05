/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { Project, Prompt, UserProfile } from '../types';

// --- IMPORTANT ---
// This file assumes that you have created a script tag in your index.html
// to define `process.env` for local development. In a production environment,
// you would use a build tool's environment variable system.
//
// Example for index.html:
// <script>
//   window.process = {
//     env: {
//       SUPABASE_URL: "YOUR_SUPABASE_PROJECT_URL_HERE",
//       SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY_HERE"
//     }
//   };
// </script>

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (
    !supabaseUrl || supabaseUrl.includes('YOUR_SUPABASE_PROJECT_URL_HERE') ||
    !supabaseAnonKey || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY_HERE')
) {
    throw new Error("Supabase URL and/or Anon Key are missing or are placeholders. Please update them in index.html according to the README.md setup guide.");
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// ==================================
//        Authentication
// ==================================

export const signUp = (email, password) => {
    return supabase.auth.signUp({ email, password });
};

export const signIn = (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
};

export const signInWithGoogle = () => {
    return supabase.auth.signInWithOAuth({
        provider: 'google',
    });
};

export const sendPasswordResetEmail = (email: string) => {
    // The redirectTo option is where the user will be sent after they confirm the password reset.
    // The link in the email will take them to a Supabase-hosted page to enter a new password.
    return supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`, 
    });
};

export const signOut = () => {
    return supabase.auth.signOut();
};

export const getCurrentUser = async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

export const onAuthStateChange = (callback) => {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(session?.user ?? null);
    });
};

// ==================================
//        User Profile
// ==================================

const AVATAR_BUCKET_NAME = 'avatars';

/**
 * Uploads a user's avatar image to public storage.
 * @param userId The ID of the user, which will be the filename.
 * @param file The image file to upload.
 * @returns The public URL of the uploaded avatar.
 */
export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
    // The user's ID is used as the filename. `upsert: true` ensures that
    // uploading a new avatar will overwrite the old one, saving storage space.
    const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET_NAME)
        .upload(userId, file, {
            upsert: true,
            contentType: file.type,
        });

    if (uploadError) {
        console.error("Error uploading avatar:", uploadError);
        throw uploadError;
    }

    // Get the public URL for the newly uploaded file.
    const { data } = supabase.storage
        .from(AVATAR_BUCKET_NAME)
        .getPublicUrl(userId);

    if (!data.publicUrl) {
        throw new Error("Could not get public URL for avatar.");
    }
    
    return data.publicUrl;
};

/**
 * Fetches a user's public profile.
 * @param userId The ID of the user.
 * @returns The user profile data, or null if not found.
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    // PGRST116: Supabase code for "exact one row not found"
    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching user profile:", error);
        throw error;
    }
    
    return data;
};

/**
 * Updates or creates a user's public profile.
 * @param userId The ID of the user to update.
 * @param updates An object containing the fields to update.
 * @returns The updated user profile data.
 */
export const updateUserProfile = async (userId: string, updates: Partial<Omit<UserProfile, 'id' | 'updated_at'>>): Promise<UserProfile> => {
    // Upsert requires the primary key (`id`) to be part of the payload.
    const payload = {
        id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('user_profiles')
        .upsert(payload)
        .select()
        .single();
    
    if (error) {
        console.error("Error upserting user profile:", error);
        throw error;
    }

    if (!data) {
        // This is a safeguard, as upsert should always return data on success.
        throw new Error("User profile data not returned after update.");
    }
    
    return data;
};


// ==================================
//        Project Storage (Supabase)
// ==================================

const STORAGE_BUCKET_NAME = 'project-images';

/**
 * Uploads a file to Supabase Storage.
 * @param userId - The ID of the user, used for creating a folder path.
 * @param projectId - The ID of the project, used for creating a subfolder.
 * @param file - The file to upload.
 * @returns The path of the uploaded file in the bucket.
 */
export const uploadProjectFile = async (userId: string, projectId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop() || 'png';
    const path = `${userId}/${projectId}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .upload(path, file);

    if (error) {
        console.error('Error uploading file to Supabase Storage:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
    }

    return path;
};

/**
 * Creates a temporary, signed URL to access a private file.
 * The URL is valid for a short period (e.g., 60 seconds).
 * @param path - The path of the file in the bucket.
 * @returns A promise that resolves to the signed URL string.
 */
export const createSignedUrl = async (path: string): Promise<string> => {
    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET_NAME)
        .createSignedUrl(path, 60); // URL is valid for 60 seconds

    if (error) {
        console.error(`Error creating signed URL for path: ${path}`, error);
        throw new Error(`Could not get signed URL: ${error.message}`);
    }
    
    return data.signedUrl;
};


// ==================================
//        Project Database
// ==================================

/**
 * Fetches all projects for a given user ID, sorted by last updated.
 * @param userId - The ID of the user.
 * @returns An array of projects.
 */
export const getProjects = async (userId: string): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching projects:', error);
        throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    return data as Project[];
};


/**
 * Saves or updates a project in the database.
 * @param projectData - The project data to save.
 * @returns The saved project data.
 */
export const saveProject = async (projectData: Omit<Partial<Project>, 'id' | 'updated_at'> & { id?: string | null; user_id: string; }): Promise<Project> => {
    const { id, ...updateData } = projectData;

    const dbPayload = {
        ...updateData,
        updated_at: new Date().toISOString(),
    };

    let response;
    if (id) {
        // Update existing project
        response = await supabase
            .from('projects')
            .update(dbPayload)
            .eq('id', id)
            .select()
            .single();
    } else {
        // Create new project
        response = await supabase
            .from('projects')
            .insert(dbPayload)
            .select()
            .single();
    }
    
    const { data, error } = response;

    if (error) {
        console.error('Error saving project:', error);
        throw new Error(`Failed to save project: ${error.message}`);
    }

    return data as Project;
};

/**
 * Deletes a project and all its associated files from storage.
 * @param project - The project object to delete.
 */
export const deleteProject = async (project: Project): Promise<void> => {
    // 1. Delete all associated files from storage.
    // The `history` array contains all file paths for this project.
    const filePaths = project.history;
    if (filePaths && filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
            .from(STORAGE_BUCKET_NAME)
            .remove(filePaths);
        
        if (storageError) {
            console.error('Error deleting project files from storage:', storageError);
            // We'll still try to delete the DB record, but we throw an error at the end.
            throw new Error(`Failed to delete project files: ${storageError.message}`);
        }
    }

    // 2. Delete the project record from the database.
    const { error: dbError } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

    if (dbError) {
        console.error('Error deleting project from database:', dbError);
        throw new Error(`Failed to delete project record: ${dbError.message}`);
    }
};

// ==================================
//        Prompt Database
// ==================================

export const getPrompts = async (userId: string): Promise<Prompt[]> => {
    const { data, error } = await supabase
        .from('prompts')
        .select('id, title, prompt, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching prompts:', error);
        throw new Error(`Failed to fetch prompts: ${error.message}`);
    }
    return data as Prompt[];
};

export const savePrompt = async (promptData: { id?: string | null; user_id: string; title: string; prompt: string; }): Promise<Prompt> => {
    const { id, ...updateData } = promptData;

    const dbPayload = {
        ...updateData,
        updated_at: new Date().toISOString(),
    };
    
    let response;
    if (id) {
        // Update existing prompt
        response = await supabase
            .from('prompts')
            .update(dbPayload)
            .eq('id', id)
            .select()
            .single();
    } else {
        // Create new prompt
        response = await supabase
            .from('prompts')
            .insert(dbPayload)
            .select()
            .single();
    }
    
    const { data, error } = response;

    if (error) {
        console.error('Error saving prompt:', error);
        throw new Error(`Failed to save prompt: ${error.message}`);
    }

    return data as Prompt;
};

export const deletePrompt = async (promptId: string): Promise<void> => {
    const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', promptId);

    if (error) {
        console.error('Error deleting prompt:', error);
        throw new Error(`Failed to delete prompt: ${error.message}`);
    }
};

export const sharePrompt = async (promptId: string, recipientEmail: string): Promise<void> => {
    const { error } = await supabase.rpc('share_prompt_with_user', {
        prompt_id_to_share: promptId,
        recipient_email: recipientEmail,
    });

    if (error) {
        console.error('Error sharing prompt:', error);
        // Provide a more user-friendly error message
        if (error.message.includes('Recipient email not found')) {
            throw new Error('No user found with that email address. Please check the email and try again.');
        }
        throw new Error(`Failed to share prompt: ${error.message}`);
    }
};