/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import type { AspectRatio, OutputAspectRatio } from '../services/geminiService';

interface OutputSettingsPanelProps {
  selectedAspect: OutputAspectRatio;
  onSetAspect: (aspect: OutputAspectRatio) => void;
  isDisabled: boolean;
}

const aspectRatios: { label: string, hint: string, values: OutputAspectRatio[] }[] = [
    { label: 'Automatic', hint: 'AI decides the best fit', values: ['auto'] },
    { label: 'Landscape', hint: 'Widescreen, Banners, YouTube', values: ['16:9', '3:2', '4:3', '21:9'] },
    { label: 'Portrait', hint: 'Stories, Reels, Social Posts', values: ['9:16', '2:3', '3:4', '4:5'] },
    { label: 'Square & Other', hint: 'Profile Pictures, Posts', values: ['1:1', '5:4'] },
];

const OutputSettingsPanel: React.FC<OutputSettingsPanelProps> = ({ selectedAspect, onSetAspect, isDisabled }) => {
  
  const renderButtons = (values: OutputAspectRatio[]) => {
    return values.map(value => (
        <button
          type="button"
          key={value}
          onClick={() => onSetAspect(value)}
          disabled={isDisabled}
          className={`px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedAspect === value 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'bg-gray-700/60 hover:bg-gray-700 text-gray-200'
          }`}
        >
          {value === 'auto' ? 'Auto' : value}
        </button>
    ));
  }

  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in">
      {aspectRatios.map(({ label, hint, values }) => {
        const gridColsClass = values.length <= 2 ? `grid-cols-${values.length}` : `grid-cols-4`;
        
        return (
          <div key={label}>
              <p className="text-sm font-semibold text-gray-300">{label}</p>
              <p className="text-xs text-gray-400 mb-2">{hint}</p>
              <div className={`grid ${gridColsClass} gap-2`}>
                {renderButtons(values)}
              </div>
          </div>
        )
      })}
    </div>
  );
};

export default OutputSettingsPanel;