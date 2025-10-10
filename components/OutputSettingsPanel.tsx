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

const aspectRatios: { label: string, values: OutputAspectRatio[] }[] = [
    { label: 'Automatic', values: ['auto'] },
    { label: 'Landscape', values: ['21:9', '16:9', '4:3', '3:2'] },
    { label: 'Square', values: ['1:1'] },
    { label: 'Portrait', values: ['9:16', '3:4', '2:3'] },
    { label: 'Flexible', values: ['5:4', '4:5'] }
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
      {aspectRatios.map(({ label, values }) => {
        const gridColsClass = values.length <= 2 ? `grid-cols-2` : values.length === 3 ? 'grid-cols-3' : `grid-cols-4`;
        
        return (
          <div key={label}>
              {label !== 'Automatic' && <p className="text-xs text-gray-400 mb-1">{label}</p>}
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
