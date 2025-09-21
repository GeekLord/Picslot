/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import type { User } from '@supabase/supabase-js';
import type { Project, UserProfile, Template } from '../types';
import { LayoutGridIcon, BookmarkIcon, PlusIcon, InboxStackIcon, RectangleStackIcon } from './icons';
import ProjectCard from './ProjectCard';
import TemplateGallery from './TemplateGallery';

interface DashboardProps {
  user: User;
  userProfile: UserProfile | null;
  recentProjects: Project[];
  onNavigateToProjects: () => void;
  onStartNewProject: () => void;
  onNavigateToBatch: () => void;
  onNavigateToComposer: () => void;
  onOpenPromptManager: () => void;
  onSelectProject: (project: Project) => void;
  onSelectTemplate: (template: Template) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, userProfile, recentProjects, onNavigateToProjects, onStartNewProject, onNavigateToBatch, onNavigateToComposer, onOpenPromptManager, onSelectProject, onSelectTemplate }) => {
  const cardClass = "group relative bg-gray-800/50 border border-gray-700/60 rounded-xl p-6 transition-all duration-300 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 flex flex-col items-start text-left";
  const displayName = userProfile?.display_name || user.email?.split('@')[0];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-100 sm:text-5xl">
          Welcome back, {displayName}
        </h1>
        <p className="mt-2 text-lg text-gray-400">
          Ready to create something amazing? Here's your dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Actions & Recent Projects */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <button type="button" onClick={onStartNewProject} className={cardClass}>
                <div className="flex items-center justify-center w-12 h-12 bg-blue-600/20 text-blue-400 rounded-lg mb-4">
                  <PlusIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">New Project</h3>
                <p className="text-gray-400">Start with a blank canvas.</p>
              </button>
              <button type="button" onClick={onNavigateToBatch} className={cardClass}>
                <div className="flex items-center justify-center w-12 h-12 bg-purple-600/20 text-purple-400 rounded-lg mb-4">
                  <InboxStackIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Batch Editor</h3>
                <p className="text-gray-400">Process multiple images at once.</p>
              </button>
              <button type="button" onClick={onNavigateToComposer} className={cardClass}>
                <div className="flex items-center justify-center w-12 h-12 bg-teal-600/20 text-teal-400 rounded-lg mb-4">
                  <RectangleStackIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">AI Scene Composer</h3>
                <p className="text-gray-400">Combine images to create new scenes.</p>
              </button>
              <button type="button" onClick={onNavigateToProjects} className={cardClass}>
                <div className="flex items-center justify-center w-12 h-12 bg-gray-700 rounded-lg mb-4">
                  <LayoutGridIcon className="w-7 h-7 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">All Projects</h3>
                <p className="text-gray-400">View and manage all your work.</p>
              </button>
              <button type="button" onClick={onOpenPromptManager} className={`${cardClass} md:col-span-2`}>
                <div className="flex items-center justify-center w-12 h-12 bg-gray-700 rounded-lg mb-4">
                  <BookmarkIcon className="w-7 h-7 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Prompt Library</h3>
                <p className="text-gray-400">Organize your favorite prompts.</p>
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Recent Projects</h2>
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
              <div className="text-center text-gray-500 bg-gray-800/40 p-8 rounded-lg">
                <p>You have no saved projects yet.</p>
                <p>Click "New Project" to get started!</p>
              </div>
            )}
          </div>

          <TemplateGallery onSelectTemplate={onSelectTemplate} />
        </div>

        {/* Right Column: Usage Analytics */}
        <div className="lg:col-span-1">
           <h2 className="text-2xl font-bold text-white mb-4">Usage Analytics</h2>
           <div className={`${cardClass} justify-center items-center text-center`}>
              <h3 className="text-xl font-bold text-white mb-2">Coming Soon</h3>
              <p className="text-gray-400">Track your AI credit usage and see insights on your creative workflow.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;