/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { LayoutGridIcon, BookmarkIcon } from './icons';

interface ControlPanelProps {
  onNavigateToProjects: () => void;
  onOpenPromptManager: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onNavigateToProjects, onOpenPromptManager }) => {
  const cardClass = "group relative bg-gray-800/50 border border-gray-700/60 rounded-xl p-8 transition-all duration-300 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 flex flex-col items-start text-left";

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-100 sm:text-6xl">
          Control Panel
        </h1>
        <p className="mt-4 text-lg text-gray-400">
          Manage your creative assets and workflows from one central hub.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Projects Card */}
        <div className={cardClass}>
          <div className="flex items-center justify-center w-12 h-12 bg-gray-700 rounded-lg mb-4">
            <LayoutGridIcon className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Project Hub</h2>
          <p className="text-gray-400 mb-6 flex-grow">
            Access your saved projects, continue editing, or start a new creation from scratch.
          </p>
          <button onClick={onNavigateToProjects} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-colors w-full md:w-auto mt-auto">
            Manage Projects
          </button>
        </div>

        {/* Prompts Card */}
        <div className={cardClass}>
          <div className="flex items-center justify-center w-12 h-12 bg-gray-700 rounded-lg mb-4">
            <BookmarkIcon className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Prompt Library</h2>
          <p className="text-gray-400 mb-6 flex-grow">
            Create, edit, and organize your favorite AI prompts for quick access in the editor.
          </p>
          <button onClick={onOpenPromptManager} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors w-full md:w-auto mt-auto">
            Manage Prompts
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;