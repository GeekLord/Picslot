/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { SparkleIcon, Bars3Icon, XMarkIcon, SunIcon, MoonIcon } from './icons';
import UserMenu from './UserMenu';
import type { User } from '@supabase/supabase-js';
import type { Page } from '../App';
import type { UserProfile } from '../types';

interface HeaderProps {
    user: User | null;
    userProfile: UserProfile | null;
    onLogout: () => void;
    page: Page;
    onNavigate: (page: Page) => void;
    isEditorActive: boolean;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, userProfile, onLogout, page, onNavigate, isEditorActive, theme, onToggleTheme }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Close mobile menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const navLinkClass = (targetPage: Page, isMobile: boolean = false) => {
    const baseClass = isMobile 
      ? 'block w-full text-left px-4 py-3 text-base rounded-md'
      : 'px-4 py-2 rounded-md text-sm';
    
    return `${baseClass} font-semibold transition-colors ${
      page === targetPage 
      ? 'bg-slate-200 text-slate-900 dark:bg-slate-700/80 dark:text-white' 
      : 'text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white'
    }`;
  };

  const disabledNavLinkClass = (isMobile: boolean = false) => {
      const baseClass = isMobile ? 'block w-full text-left px-4 py-3 text-base rounded-md' : 'px-4 py-2 rounded-md text-sm';
      return `${baseClass} font-semibold text-slate-400 dark:text-slate-600 cursor-not-allowed`;
  };

  const handleMobileNavClick = (e: React.MouseEvent, targetPage: Page) => {
    e.preventDefault();
    onNavigate(targetPage);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="w-full py-3 px-4 md:px-8 border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50 h-[65px]" ref={headerRef}>
      <div className="flex items-center justify-between gap-3 max-w-[1800px] mx-auto">
          <div className="flex items-center gap-6">
            <button type="button" onClick={(e) => { e.preventDefault(); onNavigate('dashboard'); }} className="flex items-center gap-3" title="Go to Dashboard">
              <SparkleIcon className="w-6 h-6 text-violet-500" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Picslot
              </h1>
            </button>
            {user && (
              <nav className="hidden lg:flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700/60">
                  <button type="button" onClick={(e) => { e.preventDefault(); onNavigate('dashboard'); }} className={navLinkClass('dashboard')}>Dashboard</button>
                  <button type="button" onClick={(e) => { e.preventDefault(); onNavigate('projects'); }} className={navLinkClass('projects')}>Projects</button>
                  <button type="button" onClick={(e) => { e.preventDefault(); onNavigate('imageStudio'); }} className={navLinkClass('imageStudio')}>Image Studio</button>
                  <button type="button" onClick={(e) => { e.preventDefault(); onNavigate('thumbnailStudio'); }} className={navLinkClass('thumbnailStudio')}>Thumbnail Studio</button>
                  <button type="button" onClick={(e) => { e.preventDefault(); onNavigate('batch'); }} className={navLinkClass('batch')}>Batch</button>
                  <button type="button" onClick={(e) => { e.preventDefault(); onNavigate('composer'); }} className={navLinkClass('composer')}>Composer</button>
                  <button type="button" onClick={(e) => { e.preventDefault(); onNavigate('guidedTransform'); }} className={navLinkClass('guidedTransform')}>Transform</button>
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); onNavigate('editor'); }}
                    disabled={!isEditorActive}
                    className={isEditorActive ? navLinkClass('editor') : disabledNavLinkClass()}
                    title={!isEditorActive ? "Upload an image to start editing" : "Go to Editor"}
                  >
                    Editor
                  </button>
              </nav>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={onToggleTheme}
                className="p-2 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle theme"
            >
                {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            {user && <UserMenu user={user} userProfile={userProfile} onLogout={onLogout} onNavigate={onNavigate} />}
            {user && (
              <div className="lg:hidden">
                <button 
                  type="button"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-md text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  aria-controls="mobile-menu"
                  aria-expanded={isMobileMenuOpen}
                >
                  <span className="sr-only">Open main menu</span>
                  {isMobileMenuOpen ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </button>
              </div>
            )}
          </div>
      </div>
      
      {/* Mobile menu, show/hide based on menu state. */}
      {user && (
        <div 
            className={`lg:hidden absolute top-[65px] left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700/80 shadow-xl transition-all duration-300 ease-in-out transform ${isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}`}
            id="mobile-menu"
        >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <button type="button" onClick={(e) => handleMobileNavClick(e, 'dashboard')} className={navLinkClass('dashboard', true)}>Dashboard</button>
                <button type="button" onClick={(e) => handleMobileNavClick(e, 'projects')} className={navLinkClass('projects', true)}>Projects</button>
                <button type="button" onClick={(e) => handleMobileNavClick(e, 'imageStudio')} className={navLinkClass('imageStudio', true)}>Image Studio</button>
                <button type="button" onClick={(e) => handleMobileNavClick(e, 'thumbnailStudio')} className={navLinkClass('thumbnailStudio', true)}>Thumbnail Studio</button>
                <button type="button" onClick={(e) => handleMobileNavClick(e, 'batch')} className={navLinkClass('batch', true)}>Batch</button>
                <button type="button" onClick={(e) => handleMobileNavClick(e, 'composer')} className={navLinkClass('composer', true)}>Composer</button>
                <button type="button" onClick={(e) => handleMobileNavClick(e, 'guidedTransform')} className={navLinkClass('guidedTransform', true)}>Transform</button>
                <button 
                type="button"
                onClick={(e) => handleMobileNavClick(e, 'editor')}
                disabled={!isEditorActive}
                className={isEditorActive ? navLinkClass('editor', true) : disabledNavLinkClass(true)}
                title={!isEditorActive ? "Upload an image to start editing" : "Go to Editor"}
                >
                Editor
                </button>
            </div>
        </div>
      )}
    </header>
  );
};

export default Header;