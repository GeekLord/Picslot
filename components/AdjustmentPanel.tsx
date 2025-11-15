/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface AdjustmentPanelProps {
  onApplyAdjustment: (prompt: string) => Promise<void>;
  isLoading: boolean;
}

const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({ onApplyAdjustment, isLoading }) => {
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  const presets = [
    { name: 'Blur Background', prompt: 'Apply a realistic depth-of-field effect, making the background blurry while keeping the main subject in sharp focus.' },
    { name: 'Enhance Details', prompt: 'Slightly enhance the sharpness and details of the image without making it look unnatural.' },
    { name: 'Warmer Lighting', prompt: 'Adjust the color temperature to give the image warmer, golden-hour style lighting.' },
    { name: 'Studio Light', prompt: 'Add dramatic, professional studio lighting to the main subject.' },
  ];

  const activePrompt = selectedPresetPrompt || customPrompt;

  const handlePresetClick = (prompt: string) => {
    setSelectedPresetPrompt(prompt);
    setCustomPrompt('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPrompt(e.target.value);
    setSelectedPresetPrompt(null);
  };

  const handleApply = async () => {
    if (activePrompt) {
      try {
        await onApplyAdjustment(activePrompt);
        // On success, App.tsx will show the main Regenerate button.
      } catch (e) {
        console.error("Adjustment failed, not showing regenerate button.", e);
      }
    }
  };


  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in">
      <div className="grid grid-cols-2 gap-2">
        {presets.map(preset => (
          <button
            type="button"
            key={preset.name}
            onClick={() => handlePresetClick(preset.prompt)}
            disabled={isLoading}
            className={`w-full text-center bg-slate-200 dark:bg-slate-700/60 border-2 text-slate-800 dark:text-slate-200 font-semibold py-3 px-2 rounded-md transition-all duration-200 ease-in-out hover:bg-slate-300 dark:hover:bg-slate-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${selectedPresetPrompt === preset.prompt ? 'border-violet-500' : 'border-transparent dark:border-slate-700/60'}`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={customPrompt}
        onChange={handleCustomChange}
        placeholder="Or describe an adjustment..."
        className="flex-grow bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-violet-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
        disabled={isLoading}
      />

      {activePrompt && (
        <div className="animate-fade-in flex flex-col gap-2 pt-2">
            <button
                type="button"
                onClick={handleApply}
                className="w-full bg-gradient-to-br from-violet-500 to-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/40 hover:-translate-y-px active:scale-95 text-base disabled:from-slate-500 disabled:to-slate-600 disabled:shadow-none disabled:cursor-not-allowed"
                disabled={isLoading || !activePrompt.trim()}
            >
                Apply Adjustment
            </button>
        </div>
      )}
    </div>
  );
};

export default AdjustmentPanel;