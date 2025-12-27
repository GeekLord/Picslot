
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
    { label: 'Standard', hint: 'Common photo & video ratios', values: ['1:1', '4:3', '3:4', '16:9', '9:16'] },
];

// Helper component to render a visual icon for the aspect ratio
const AspectRatioIcon: React.FC<{ ratio: OutputAspectRatio }> = ({ ratio }) => {
    if (ratio === 'auto') {
        return (
            <div className="w-4 h-4 flex items-center justify-center text-xs font-bold border border-current rounded-sm opacity-70">A</div>
        );
    }

    // Calculate dimensions for the icon box based on the ratio string (e.g., "16:9")
    let width = 16;
    let height = 16;
    
    if (ratio !== 'auto' && typeof ratio === 'string') {
        const [w, h] = ratio.split(':').map(Number);
        if (!isNaN(w) && !isNaN(h)) {
            // Normalize to fit within a 16x16 box
            if (w > h) {
                width = 16;
                height = (h / w) * 16;
            } else {
                height = 16;
                width = (w / h) * 16;
            }
        }
    }

    return (
        <div 
            className="border border-current rounded-sm" 
            style={{ width: `${width}px`, height: `${height}px` }}
        />
    );
};


const OutputSettingsPanel: React.FC<OutputSettingsPanelProps> = ({ selectedAspect, onSetAspect, isDisabled }) => {
  
  const renderButtons = (values: OutputAspectRatio[]) => {
    return values.map(value => (
        <button
          type="button"
          key={value}
          onClick={() => onSetAspect(value)}
          disabled={isDisabled}
          className={`px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
            selectedAspect === value 
            ? 'bg-blue-600 text-white shadow-md' 
            : 'bg-gray-700/60 hover:bg-gray-700 text-gray-200'
          }`}
        >
          <AspectRatioIcon ratio={value} />
          {value === 'auto' ? 'Auto' : value}
        </button>
    ));
  }

  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in">
      {aspectRatios.map(({ label, hint, values }) => {
        const gridColsClass = values.length <= 2 ? `grid-cols-${values.length}` : `grid-cols-3`;
        
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
