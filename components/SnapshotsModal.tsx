/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, FormEvent } from 'react';
import type { Snapshot } from '../types';
import * as supabaseService from '../services/supabaseService';
import { HistoryIcon, TrashIcon, XMarkIcon } from './icons';
import Spinner from './Spinner';

interface SnapshotItemProps {
    snapshot: Snapshot;
    onRestore: (snapshot: Snapshot) => void;
    onDelete: (snapshot: Snapshot) => void;
    isLoading: boolean;
}

const SnapshotItem: React.FC<SnapshotItemProps> = ({ snapshot, onRestore, onDelete, isLoading }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        async function fetchThumbnail() {
            if (snapshot.thumbnail_path) {
                try {
                    const url = await supabaseService.createSignedUrl(snapshot.thumbnail_path);
                    if (isMounted) setThumbnailUrl(url);
                } catch (error) {
                    console.error("Failed to load snapshot thumbnail:", error);
                }
            }
        }
        fetchThumbnail();
        return () => { isMounted = false; };
    }, [snapshot.thumbnail_path]);

    return (
        <li className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg">
            <div className="w-20 h-16 bg-gray-700 rounded-md overflow-hidden flex-shrink-0">
                {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt={snapshot.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full animate-pulse bg-gray-600" />
                )}
            </div>
            <div className="flex-grow">
                <p className="font-semibold text-white truncate">{snapshot.name}</p>
                <p className="text-xs text-gray-400">
                    Saved on {new Date(snapshot.created_at).toLocaleString()}
                </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={() => onRestore(snapshot)}
                    disabled={isLoading}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-md transition-colors text-sm disabled:opacity-50"
                >
                    Restore
                </button>
                <button
                    onClick={() => onDelete(snapshot)}
                    disabled={isLoading}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
                    title="Delete snapshot"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </li>
    );
};


interface SnapshotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: Snapshot[];
  onSave: (name: string) => Promise<void>;
  onRestore: (snapshot: Snapshot) => void;
  onDelete: (snapshot: Snapshot) => Promise<void>;
}

const SnapshotsModal: React.FC<SnapshotsModalProps> = ({ isOpen, onClose, snapshots, onSave, onRestore, onDelete }) => {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
      if (isOpen) {
          setName('');
          setError(null);
      }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    setError(null);
    try {
        await onSave(name.trim());
        setName(''); // Clear input on success
    } catch (err: any) {
        setError(err.message || 'Failed to save snapshot.');
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async (snapshot: Snapshot) => {
      if (!window.confirm(`Are you sure you want to delete the snapshot "${snapshot.name}"? This cannot be undone.`)) {
          return;
      }
      setIsDeleting(true);
      setError(null);
      try {
          await onDelete(snapshot);
      } catch (err: any) {
          setError(err.message || 'Failed to delete snapshot.');
      } finally {
          setIsDeleting(false);
      }
  };
  
  const isLoading = isSaving || isDeleting;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm"
      onClick={onClose}
      role="dialog" aria-modal="true"
    >
      <div
        className="bg-gray-800/80 border border-gray-700/80 rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] mx-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-3">
                <HistoryIcon className="w-6 h-6 text-blue-400"/>
                <h2 className="text-xl font-bold text-white">Version History (Snapshots)</h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                <XMarkIcon className="w-6 h-6" />
            </button>
        </header>
        
        <div className="flex-grow p-4 overflow-y-auto">
            {snapshots.length > 0 ? (
                <ul className="space-y-3">
                    {snapshots.slice().reverse().map(snapshot => (
                        <SnapshotItem 
                            key={snapshot.id} 
                            snapshot={snapshot}
                            onRestore={onRestore}
                            onDelete={handleDelete}
                            isLoading={isLoading}
                        />
                    ))}
                </ul>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                    <HistoryIcon className="w-16 h-16 mb-4"/>
                    <h3 className="text-xl font-semibold">No snapshots saved yet</h3>
                    <p>Save a version of your current progress using the form below.</p>
                </div>
            )}
        </div>
        
        <footer className="p-4 border-t border-gray-700 flex-shrink-0 bg-gray-900/50 rounded-b-xl">
             {error && <p className="text-red-400 bg-red-500/10 p-2 rounded-md mb-3 text-center text-sm">{error}</p>}
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Final Version, Before color change..."
                    className="flex-grow bg-gray-900/50 border border-gray-600 text-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-base"
                    required
                />
                <button 
                    type="submit"
                    disabled={!name.trim() || isSaving}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md shadow-blue-500/20 disabled:bg-gray-700 disabled:cursor-wait min-w-[180px] flex items-center justify-center"
                >
                    {isSaving ? <Spinner /> : 'Save Current Version'}
                </button>
            </form>
        </footer>
      </div>
    </div>
  );
};

export default SnapshotsModal;