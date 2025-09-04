/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, FormEvent } from 'react';
import Spinner from './Spinner';

interface SharePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (email: string) => Promise<void>;
  promptTitle: string;
}

const SharePromptModal: React.FC<SharePromptModalProps> = ({ isOpen, onClose, onShare, promptTitle }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await onShare(email.trim());
      setSuccessMessage(`Successfully shared prompt with ${email.trim()}!`);
      setEmail(''); // Clear input on success
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setEmail('');
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
    onClose();
  };


  return (
    <div
      className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-gray-800/80 border border-gray-700/80 rounded-xl p-8 backdrop-blur-lg shadow-2xl w-full max-w-md mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-2">Share Prompt</h2>
        <p className="text-gray-400 mb-6">
          Share "<span className="font-semibold text-blue-300">{promptTitle}</span>" with another user. Enter their registered email address.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-300 p-3 rounded-lg mb-4 text-center">
            {successMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="recipient@example.com"
            className="w-full bg-gray-900/50 border border-gray-600 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-base"
            required
            autoFocus
          />
          
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="bg-gray-700/80 hover:bg-gray-700 text-gray-200 font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md shadow-blue-500/20 disabled:bg-gray-600 disabled:cursor-not-allowed min-w-[100px] flex items-center justify-center"
              disabled={!email.trim() || isLoading}
            >
              {isLoading ? <Spinner size="sm" /> : 'Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SharePromptModal;