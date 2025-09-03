/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import type { Project } from '../types';
import { PlusIcon, ChevronLeftIcon } from './icons';
import ProjectCard from './ProjectCard';
import ConfirmationModal from './ConfirmationModal';

interface ProjectsDashboardProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onStartNewProject: () => void;
  onDeleteProject: (project: Project) => void;
  onBack: () => void;
}

const ProjectsDashboard: React.FC<ProjectsDashboardProps> = ({ projects, onSelectProject, onStartNewProject, onDeleteProject, onBack }) => {
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  const cardClass = "group relative aspect-square w-full bg-gray-800/50 border border-gray-700/60 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1";

  const handleConfirmDelete = () => {
    if (projectToDelete) {
      onDeleteProject(projectToDelete);
      setProjectToDelete(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 rounded-full bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 hover:text-white transition-colors" aria-label="Back to Control Panel">
            <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <div className="text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-100 sm:text-5xl">
            My Projects
            </h1>
            <p className="mt-2 text-lg text-gray-400">
            Select a project to continue editing, or start a new one.
            </p>
        </div>
      </div>


      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {/* New Project Card */}
        <button
          onClick={onStartNewProject}
          className={`${cardClass} flex flex-col items-center justify-center gap-3 text-gray-400 hover:text-white`}
        >
          <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center border-2 border-dashed border-gray-600 group-hover:border-blue-500 transition-colors">
            <PlusIcon className="w-8 h-8" />
          </div>
          <span className="font-semibold text-lg">New Project</span>
        </button>

        {/* Project Cards */}
        {projects.map(project => (
          <ProjectCard 
            key={project.id}
            project={project}
            onSelectProject={onSelectProject}
            onDelete={setProjectToDelete}
          />
        ))}
      </div>
      
      {projects.length === 0 && (
          <div className="mt-12 text-center text-gray-500">
            <p>You have no saved projects yet.</p>
            <p>Click "New Project" to get started!</p>
          </div>
        )}
        
      <ConfirmationModal 
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Project?"
        message={`Are you sure you want to permanently delete "${projectToDelete?.name}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default ProjectsDashboard;