/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, FormEvent, useRef } from 'react';
import type { UserProfile } from '../types';
import Spinner from './Spinner';
import * as supabaseService from '../services/supabaseService';
import { CameraIcon, UserCircleIcon } from './icons';

interface ProfileSettingsProps {
    userProfile: UserProfile | null;
    onSave: (updates: Partial<UserProfile>) => Promise<void>;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ userProfile, onSave }) => {
    const [displayName, setDisplayName] = useState('');
    const [title, setTitle] = useState('');
    const [bio, setBio] = useState('');
    const [website, setWebsite] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (userProfile) {
            setDisplayName(userProfile.display_name || '');
            setTitle(userProfile.title || '');
            setBio(userProfile.bio || '');
            setWebsite(userProfile.website || '');
        }
    }, [userProfile]);

    const isChanged = displayName !== (userProfile?.display_name || '') ||
                      title !== (userProfile?.title || '') ||
                      bio !== (userProfile?.bio || '') ||
                      website !== (userProfile?.website || '');
                      
    // Append a timestamp to the image URL to bypass browser cache when the image is updated
    const avatarUrl = userProfile?.profile_image_url ? `${userProfile.profile_image_url}?t=${new Date(userProfile.updated_at).getTime()}` : null;


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isChanged) return;

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await onSave({
                display_name: displayName.trim(),
                title: title.trim(),
                bio: bio.trim(),
                website: website.trim(),
            });
            setSuccess("Profile updated successfully!");
            setTimeout(() => setSuccess(null), 3000); // Clear success message after 3s
        } catch (err: any) {
            const errorMessage = typeof err?.message === 'string' ? err.message : 'An unexpected error occurred.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !userProfile) {
            return;
        }
        const file = e.target.files[0];
        
        setIsUploadingAvatar(true);
        setError(null);
        setSuccess(null);

        try {
            const publicUrl = await supabaseService.uploadAvatar(userProfile.id, file);
            await onSave({ profile_image_url: publicUrl });
            setSuccess("Avatar updated!");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            const errorMessage = typeof err?.message === 'string' ? err.message : 'Failed to upload avatar.';
            setError(errorMessage);
        } finally {
            setIsUploadingAvatar(false);
            // Reset file input value to allow re-uploading the same file if needed
            if(avatarInputRef.current) {
                avatarInputRef.current.value = "";
            }
        }
    };
    
    const inputClass = "w-full bg-gray-900/50 border border-gray-600 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-base";
    const buttonClass = "bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md shadow-blue-500/20 disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-400";

    return (
        <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-1">Public Profile</h2>
            <p className="text-gray-400 mb-6">This information may be displayed publicly.</p>
            
            <div className="flex flex-col items-center md:items-start md:flex-row gap-8 mb-8">
                {/* Avatar Uploader */}
                <div className="relative flex-shrink-0">
                    <input
                        type="file"
                        id="avatar-upload"
                        ref={avatarInputRef}
                        onChange={handleAvatarUpload}
                        className="hidden"
                        accept="image/png, image/jpeg, image/webp"
                        disabled={isUploadingAvatar}
                    />
                    <label htmlFor="avatar-upload" className="block relative w-32 h-32 rounded-full cursor-pointer group bg-gray-700 overflow-hidden">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Profile Avatar" className="w-full h-full object-cover"/>
                        ) : (
                            <UserCircleIcon className="w-full h-full text-gray-500" />
                        )}

                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {isUploadingAvatar ? <Spinner /> : <CameraIcon className="w-8 h-8 text-white" />}
                        </div>
                    </label>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="flex-grow w-full flex flex-col gap-6">
                    <div>
                        <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                        <input
                            id="displayName"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your name"
                            className={inputClass}
                            maxLength={50}
                        />
                    </div>
                    
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">Professional Title</label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Photographer, Digital Artist"
                            className={inputClass}
                            maxLength={50}
                        />
                    </div>

                    <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                        <textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell us a little about yourself"
                            className={`${inputClass} min-h-[120px] resize-y`}
                            rows={4}
                            maxLength={300}
                        />
                        <p className="text-right text-xs text-gray-500 mt-1">{bio.length} / 300</p>
                    </div>

                    <div>
                        <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                        <input
                            id="website"
                            type="url"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="https://your-portfolio.com"
                            className={inputClass}
                            maxLength={100}
                        />
                    </div>
                    
                    <div className="flex justify-end items-center gap-4">
                        {success && <p className="text-green-400 text-sm animate-fade-in">{success}</p>}
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <button type="submit" disabled={!isChanged || isLoading} className={buttonClass}>
                            {isLoading ? <Spinner size="sm" /> : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileSettings;
