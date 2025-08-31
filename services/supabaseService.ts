/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { Project } from '../App';

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
//        Project Storage (AWS S3)
// ==================================

const S3_BUCKET_NAME = 'picslot-project-images';
const S3_BUCKET_REGION = 'us-east-1';

/**
 * Uploads a file to AWS S3 by first obtaining a pre-signed URL from a Supabase Edge Function.
 * @param userId - The ID of the user.
 * @param projectId - The ID of the project.
 * @param file - The file to upload.
 * @returns The S3 key of the uploaded file.
 */
export const uploadProjectFile = async (userId: string, projectId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop() || 'png';
    const key = `${userId}/${projectId}/${Date.now()}.${fileExt}`;

    // 1. Get pre-signed URL from Supabase Edge Function
    const { data: presignedData, error: presignedError } = await supabase.functions.invoke('get-s3-presigned-url', {
        body: { key, contentType: file.type },
    });
    
    if (presignedError) {
        console.error('Error getting pre-signed URL:', presignedError);
        throw new Error(`Could not get an upload link: ${presignedError.message}`);
    }
    
    const { presignedUrl } = presignedData;
    if (!presignedUrl) {
        throw new Error('Pre-signed URL was not returned from the function.');
    }
    
    // 2. Upload the file to S3 using the pre-signed URL
    const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
    });
    
    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('S3 Upload Error:', errorText);
        throw new Error(`Failed to upload file to S3: ${uploadResponse.statusText}`);
    }
    
    // 3. Return the S3 key
    return key;
};

/**
 * Gets the public URL for a file in AWS S3.
 * @param path - The S3 key of the file.
 * @returns The public S3 URL string.
 */
export const getPublicUrl = (path: string): string => {
    // Construct the public S3 URL
    return `https://${S3_BUCKET_NAME}.s3.${S3_BUCKET_REGION}.amazonaws.com/${path}`;
};


// ==================================
//        Project Database
// ==================================

/**
 * Fetches all projects for a given user ID.
 * @param userId - The ID of the user.
 * @returns An array of projects.
 */
export const getProjects = async (userId: string): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching projects:', error);
        throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    // Supabase returns the raw data. We need to cast it.
    // In a real app, you might use a library like Zod for validation.
    return data as Project[];
};


/**
 * Saves or updates a project in the database.
 * @param projectData - The project data to save.
 * @returns The saved project data.
 */
export const saveProject = async (projectData: Omit<Project, 'id' | 'updated_at' | 'user_id'> & { id?: string | null; user_id: string; }): Promise<Project> => {
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