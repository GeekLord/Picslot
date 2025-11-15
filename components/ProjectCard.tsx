/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import type { Project } from '../types';
import { createSignedUrl } from '../services/supabaseService';
import { TrashIcon } from './icons';

interface ProjectCardProps {
  project: Project;
  onSelectProject: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

const cardClass = "group relative aspect-square w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-violet-500 hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1";

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onSelectProject, onDelete }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchThumbnailUrl() {
      try {
        const url = await createSignedUrl(project.thumbnail);
        if (isMounted) {
          setThumbnailUrl(url);
        }
      } catch (error) {
        console.error(`Failed to load thumbnail for project ${project.name}:`, error);
      }
    }

    fetchThumbnailUrl();

    return () => {
      isMounted = false;
    };
  }, [project.thumbnail, project.name]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card's onClick from firing
    if (onDelete) {
      onDelete(project);
    }
  };

  return (
    <div onClick={() => onSelectProject(project)} className={cardClass}>
      {thumbnailUrl ? (
        <img 
          src={thumbnailUrl} 
          alt={project.name} 
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 animate-fade-in" 
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
            <div className="animate-pulse w-1/2 h-1/2 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 p-3 w-full">
        <h3 className="font-bold text-white truncate">{project.name}</h3>
        <p className="text-xs text-slate-300">
          {new Date(project.updated_at).toLocaleDateString()}
        </p>
      </div>
      {onDelete && (
        <button 
          onClick={handleDeleteClick}
          className="absolute top-2 right-2 p-2 rounded-full bg-black/40 text-slate-300 hover:bg-rose-500 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100 backdrop-blur-sm z-10"
          aria-label={`Delete project ${project.name}`}
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default ProjectCard;