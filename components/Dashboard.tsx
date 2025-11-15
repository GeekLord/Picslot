/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import type { User } from '@supabase/supabase-js';
import type { Project, UserProfile } from '../types';
import { LayoutGridIcon, BookmarkIcon, PlusIcon, InboxStackIcon, RectangleStackIcon, SwitchHorizontalIcon, PhotoIcon, TicketIcon } from './icons';
import ProjectCard from './ProjectCard';

interface DashboardProps {
  user: User;
  userProfile: UserProfile | null;
  recentProjects: Project[];
  onNavigateToProjects: () => void;
  onStartNewProject: () => void;
  onNavigateToBatch: () => void;
  onNavigateToComposer: () => void;
  onNavigateToGuidedTransform: () => void;
  onNavigateToImageStudio: () => void;
  onNavigateToThumbnailStudio: () => void;
  onOpenPromptManager: () => void;
  onOpenAssetLibrary: () => void;
  onSelectProject: (project: Project) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, userProfile, recentProjects, onNavigateToProjects, onStartNewProject, onNavigateToBatch, onNavigateToComposer, onNavigateToGuidedTransform, onNavigateToImageStudio, onNavigateToThumbnailStudio, onOpenPromptManager, onOpenAssetLibrary, onSelectProject }) => {
  const cardClass = "group relative bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-6 transition-all duration-300 hover:border-violet-500 hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1 flex flex-col items-start text-left";
  const displayName = userProfile?.display_name || user.email?.split('@')[0];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
          Welcome back, {displayName}
        </h1>
        <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">
          Ready to create something amazing? Here's your dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Actions & Recent Projects */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <button type="button" onClick={onStartNewProject} className={cardClass}>
                <div className="flex items-center justify-center w-12 h-12 bg-violet-500/10 text-violet-500 rounded-lg mb-4">
                  <PlusIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">New Project</h3>
                <p className="text-slate-500 dark:text-slate-400">Start with a blank canvas.</p>
              </button>
               <button type="button" onClick={onNavigateToImageStudio} className={cardClass}>
                <div className="flex items-center justify-center w-12 h-12 bg-pink-500/10 text-pink-500 rounded-lg mb-4">
                  <PhotoIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">AI Image Studio</h3>
                <p className="text-slate-500 dark:text-slate-400">Generate original images from text.</p>
              </button>
               <button type="button" onClick={onNavigateToThumbnailStudio} className={cardClass}>
                <div className="flex items-center justify-center w-12 h-12 bg-amber-500/10 text-amber-500 rounded-lg mb-4">
                  <TicketIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">AI Thumbnail Studio</h3>
                <p className="text-slate-500 dark:text-slate-400">Generate high-CTR thumbnails.</p>
              </button>
              <button type="button" onClick={onNavigateToBatch} className={cardClass}>
                <div className="flex items-center justify-center w-12 h-12 bg-purple-500/10 text-purple-500 rounded-lg mb-4">
                  <InboxStackIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Batch Editor</h3>
                <p className="text-slate-500 dark:text-slate-400">Process multiple images at once.</p>
              </button>
              <button type="button" onClick={onNavigateToComposer} className={cardClass}>
                <div className="flex items-center justify-center w-12 h-12 bg-teal-500/10 text-teal-500 rounded-lg mb-4">
                  <RectangleStackIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">AI Scene Composer</h3>
                <p className="text-slate-500 dark:text-slate-400">Combine images to create new scenes.</p>
              </button>
              <button type="button" onClick={onNavigateToGuidedTransform} className={cardClass}>
                <div className="flex items-center justify-center w-12 h-12 bg-orange-500/10 text-orange-500 rounded-lg mb-4">
                  <SwitchHorizontalIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Guided Transform</h3>
                <p className="text-slate-500 dark:text-slate-400">Apply a pose from one image to another.</p>
              </button>
               <button type="button" onClick={onOpenAssetLibrary} className={cardClass}>
                <div className="flex items-center justify-center w-12 h-12 bg-green-500/10 text-green-500 rounded-lg mb-4">
                  <LayoutGridIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Asset Library</h3>
                <p className="text-slate-500 dark:text-slate-400">Manage your saved images.</p>
              </button>
              <button type="button" onClick={onNavigateToProjects} className={cardClass}>
                <div className="flex items-center justify-center w-12 h-12 bg-slate-500/10 text-slate-500 rounded-lg mb-4">
                  <LayoutGridIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">All Projects</h3>
                <p className="text-slate-500 dark:text-slate-400">View and manage all your work.</p>
              </button>
              <button type="button" onClick={onOpenPromptManager} className={`${cardClass} md:col-span-1`}>
                <div className="flex items-center justify-center w-12 h-12 bg-slate-500/10 text-slate-500 rounded-lg mb-4">
                  <BookmarkIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Prompt Library</h3>
                <p className="text-slate-500 dark:text-slate-400">Organize your favorite prompts.</p>
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Recent Projects</h2>
            {recentProjects.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {recentProjects.map(project => (
                   <ProjectCard 
                     key={project.id}
                     project={project}
                     onSelectProject={onSelectProject}
                   />
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/40 p-8 rounded-lg">
                <p>You have no saved projects yet.</p>
                <p>Click "New Project" to get started!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Usage Analytics */}
        <div className="lg:col-span-1">
           <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Usage Analytics</h2>
           <div className={`${cardClass} justify-center items-center text-center`}>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Coming Soon</h3>
              <p className="text-slate-500 dark:text-slate-400">Track your AI credit usage and see insights on your creative workflow.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;