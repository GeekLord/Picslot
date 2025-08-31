/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, FormEvent } from 'react';

interface SaveProjectModalProps {
  isOpen: boolean;
  onSave: (projectName: string) => void;
  onClose: () => void;
  initialName?: string;
}

const SaveProjectModal: React.FC<SaveProjectModalProps> = ({ isOpen, onSave, onClose, initialName }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialName || '');
    }
  }, [isOpen, initialName]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-gray-800/80 border border-gray-700/80 rounded-xl p-8 backdrop-blur-lg shadow-2xl w-full max-w-md mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4">Save Project</h2>
        <p className="text-gray-400 mb-6">
          {initialName ? 'Update the project name or save with the current name.' : 'Give your project a name to save your progress.'}
        </p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Summer Vacation Photos"
            className="w-full bg-gray-900/50 border border-gray-600 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-base"
            required
            autoFocus
          />
          
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-700/80 hover:bg-gray-700 text-gray-200 font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md shadow-blue-500/20 disabled:bg-gray-600 disabled:cursor-not-allowed"
              disabled={!name.trim()}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveProjectModal;