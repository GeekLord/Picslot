/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { ZoomInIcon, ZoomOutIcon, RestoreIcon } from './icons';

interface OutpaintPanelProps {
  onApplyOutpaint: () => void;
  isLoading: boolean;
  onZoom: (factor: number) => void;
  onReset: () => void;
}

const OutpaintPanel: React.FC<OutpaintPanelProps> = ({ onApplyOutpaint, isLoading, onZoom, onReset }) => {
  return (
    <div className="w-full flex flex-col items-center gap-4 animate-fade-in">
      <p className="text-sm text-gray-400 -mt-2 text-center">
        Drag the image to position it on the new canvas. The empty areas will be filled by AI.
      </p>

      <div className="flex items-center justify-center gap-2 w-full">
        <button
          type="button"
          onClick={() => onZoom(1 / 1.2)}
          disabled={isLoading}
          className="p-3 rounded-md bg-gray-700/60 hover:bg-gray-700 text-gray-200 transition-colors"
          title="Zoom Out"
        >
          <ZoomOutIcon className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={isLoading}
          className="p-3 rounded-md bg-gray-700/60 hover:bg-gray-700 text-gray-200 transition-colors"
          title="Reset Position & Zoom"
        >
          <RestoreIcon className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={() => onZoom(1.2)}
          disabled={isLoading}
          className="p-3 rounded-md bg-gray-700/60 hover:bg-gray-700 text-gray-200 transition-colors"
          title="Zoom In"
        >
          <ZoomInIcon className="w-6 h-6" />
        </button>
      </div>

      <button
        type="button"
        onClick={onApplyOutpaint}
        disabled={isLoading}
        className="w-full mt-2 bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 text-base disabled:from-gray-600 disabled:to-gray-700 disabled:shadow-none disabled:cursor-not-allowed"
      >
        Apply Outpaint
      </button>
    </div>
  );
};

export default OutpaintPanel;
