/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { UserCircleIcon, Cog6ToothIcon, CreditCardIcon, BellIcon, LogoutIcon, ChevronDownIcon } from './icons';
import type { UserProfile } from '../types';
import type { Page } from '../App';

interface UserMenuProps {
  user: User;
  userProfile: UserProfile | null;
  onLogout: () => void;
  onNavigate: (page: Page) => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, userProfile, onLogout, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigation = (page: Page) => {
    onNavigate(page);
    setIsOpen(false);
  };
  
  const displayName = userProfile?.display_name || user.email?.split('@')[0] || 'User';
  const userInitial = displayName.charAt(0).toUpperCase();
  // Append a timestamp to the image URL to bypass browser cache when the image is updated
  const avatarUrl = userProfile?.profile_image_url ? `${userProfile.profile_image_url}?t=${new Date(userProfile.updated_at).getTime()}` : null;


  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 rounded-full p-1 text-sm font-semibold text-gray-300 hover:bg-gray-700/50 transition-colors">
        {avatarUrl ? (
          <img src={avatarUrl} alt="User avatar" className="w-8 h-8 rounded-full object-cover bg-gray-700" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
            {userInitial}
          </div>
        )}
        <span className="hidden md:block">{displayName}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-fade-in-fast z-50">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="menu-button">
            <button onClick={() => {}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" role="menuitem" disabled>
              <UserCircleIcon className="w-5 h-5" /> Profile
            </button>
            <button onClick={() => handleNavigation('settings')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700" role="menuitem">
              <Cog6ToothIcon className="w-5 h-5" /> Settings
            </button>
            <button onClick={() => {}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" role="menuitem" disabled>
              <CreditCardIcon className="w-5 h-5" /> Billing
            </button>
            <button onClick={() => {}} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" role="menuitem" disabled>
              <BellIcon className="w-5 h-5" /> Notifications
            </button>
            <div className="border-t border-gray-700 my-1"></div>
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-700" role="menuitem">
              <LogoutIcon className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;