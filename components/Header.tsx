/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { SparkleIcon } from './icons';
import UserMenu from './UserMenu';
import type { User } from '@supabase/supabase-js';
import type { Page } from '../App';

interface HeaderProps {
    user: User | null;
    onLogout: () => void;
    page: Page;
    onNavigate: (page: Page) => void;
    isEditorActive: boolean;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, page, onNavigate, isEditorActive }) => {
  const navLinkClass = (targetPage: Page) => `px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
    page === targetPage 
    ? 'bg-gray-700/80 text-white' 
    : 'text-gray-400 hover:bg-gray-800/80 hover:text-white'
  }`;

  const disabledNavLinkClass = 'px-4 py-2 rounded-md text-sm font-semibold text-gray-600 cursor-not-allowed';

  return (
    <header className="w-full py-3 px-4 md:px-8 border-b border-gray-700/80 bg-gray-900/70 backdrop-blur-sm sticky top-0 z-50 h-[65px]">
      <div className="flex items-center justify-between gap-3 max-w-[1800px] mx-auto">
          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-3" title="Go to Dashboard">
              <SparkleIcon className="w-6 h-6 text-blue-400" />
              <h1 className="text-xl font-bold tracking-tight text-gray-100">
                Picslot
              </h1>
            </button>
            {user && (
              <nav className="hidden md:flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg border border-gray-700/60">
                  <button onClick={() => onNavigate('dashboard')} className={navLinkClass('dashboard')}>Dashboard</button>
                  <button onClick={() => onNavigate('projects')} className={navLinkClass('projects')}>Projects</button>
                  <button 
                    onClick={() => onNavigate('editor')} 
                    disabled={!isEditorActive}
                    className={isEditorActive ? navLinkClass('editor') : disabledNavLinkClass}
                    title={!isEditorActive ? "Upload an image to start editing" : "Go to Editor"}
                  >
                    Editor
                  </button>
              </nav>
            )}
          </div>
          
          <div>
            {user && <UserMenu user={user} onLogout={onLogout} />}
          </div>
      </div>
    </header>
  );
};

export default Header;