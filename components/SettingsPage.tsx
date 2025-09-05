/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '../types';
import ProfileSettings from './ProfileSettings';
import { IdentificationIcon, Cog6ToothIcon, CreditCardIcon } from './icons';

interface SettingsPageProps {
  user: User;
  userProfile: UserProfile | null;
  onProfileUpdate: (updates: Partial<UserProfile>) => Promise<void>;
}

type SettingsTab = 'profile' | 'account' | 'billing';

const SettingsPage: React.FC<SettingsPageProps> = ({ user, userProfile, onProfileUpdate }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    const navItemClass = (tab: SettingsTab) => {
        const isActive = activeTab === tab;
        return `flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg transition-all duration-200 text-base font-semibold ${
            isActive 
                ? 'bg-gray-700/80 text-white shadow-sm' 
                : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
        }`;
    };
    
    const disabledNavItemClass = `flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-base font-semibold text-gray-600 cursor-not-allowed`;


    return (
        <div className="w-full max-w-6xl mx-auto animate-fade-in flex flex-col md:flex-row gap-8 lg:gap-12">
            <aside className="w-full md:w-1/4 lg:w-1/5 flex-shrink-0">
                <h1 className="text-2xl font-bold text-white mb-6 px-4 md:px-0">Settings</h1>
                <nav className="flex flex-col gap-2">
                    <button onClick={() => setActiveTab('profile')} className={navItemClass('profile')}>
                        <IdentificationIcon className="w-5 h-5" /> Profile
                    </button>
                     <button className={disabledNavItemClass} disabled title="Coming Soon">
                        <Cog6ToothIcon className="w-5 h-5" /> Account
                    </button>
                    <button className={disabledNavItemClass} disabled title="Coming Soon">
                        <CreditCardIcon className="w-5 h-5" /> Billing
                    </button>
                </nav>
            </aside>
            <main className="flex-grow w-full md:w-3/4 lg:w-4/5">
                {activeTab === 'profile' && (
                    <ProfileSettings userProfile={userProfile} onSave={onProfileUpdate} />
                )}
                {/* Future settings components will go here */}
            </main>
        </div>
    );
};

export default SettingsPage;
