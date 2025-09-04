/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { UserCircleIcon, Cog6ToothIcon, CreditCardIcon, BellIcon, LogoutIcon, ChevronDownIcon } from './icons';

interface UserMenuProps {
  user: User;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout }) => {
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

  const userEmail = user.email || 'user';
  const userInitial = userEmail.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 rounded-full p-1 text-sm font-semibold text-gray-300 hover:bg-gray-700/50 transition-colors">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
          {userInitial}
        </div>
        <span className="hidden md:block">{userEmail}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-fade-in-fast z-50">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="menu-button">
            <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700" role="menuitem">
              <UserCircleIcon className="w-5 h-5" /> Profile
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700" role="menuitem">
              <Cog6ToothIcon className="w-5 h-5" /> Settings
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700" role="menuitem">
              <CreditCardIcon className="w-5 h-5" /> Billing
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700" role="menuitem">
              <BellIcon className="w-5 h-5" /> Notifications
            </a>
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
