/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateAutoEnhancedImage, generateRestoredImage, generateStudioPortrait, generateCompCard, generateThreeViewShot, generateOutpaintedImage, generateRemovedBackgroundImage, enhancePrompt } from './services/geminiService';
import * as supabaseService from './services/supabaseService';
import Header from './components/Header';
import Spinner from './components/Spinner';
import FilterPanel from './components/FilterPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import CropPanel from './components/CropPanel';
import { UndoIcon, RedoIcon, EyeIcon, MagicWandIcon, RestoreIcon, PortraitIcon, CompCardIcon, ThreeViewIcon, ExpandIcon, ZoomInIcon, AdjustmentsIcon, LayersIcon, CropIcon, DownloadIcon, UploadIcon as UploadIconSVG, SaveIcon, RemoveBgIcon, BrushIcon, BookmarkIcon, LayoutGridIcon, HistoryIcon } from './components/icons';
import StartScreen from './components/StartScreen';
import CompareSlider from './components/CompareSlider';
import ZoomModal from './components/ZoomModal';
import AuthScreen from './components/AuthScreen';
import ProjectsDashboard from './components/ProjectsDashboard';
import SaveProjectModal from './components/SaveProjectModal';
import type { User } from '@supabase/supabase-js';
import BrushCanvas from './components/BrushCanvas';
import BrushControls from './components/BrushControls';
import type { Project, Prompt, UserProfile, Snapshot, Template } from './types';
import PromptManagerModal from './components/PromptManagerModal';
import PromptSelector from './components/PromptSelector';
import Dashboard from './components/Dashboard';
import SettingsPage from './components/SettingsPage';
import SnapshotsModal from './components/SnapshotsModal';


// Helper to convert a data URL string to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

// Helper to convert a fetched Blob to a File object
const blobToFile = async (url: string, filename: string): Promise<File> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
};


type Tool = 'adjust' | 'filters' | 'crop';
export type Page = 'dashboard' | 'projects' | 'upload' | 'editor' | 'settings';


const App: React.FC = () => {
  console.log('[App] --- Component Render/Re-render ---');
  // Auth & Project State
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Editor State
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Prompt Manager State
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isPromptManagerOpen, setIsPromptManagerOpen] = useState(false);

  // UI State
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [isSnapshotsModalOpen, setIsSnapshotsModalOpen] = useState<boolean>(false);
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);

  // Brush / Mask State
  const [isBrushMode, setIsBrushMode] = useState<boolean>(false);
  const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState<number>(40);
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const brushCanvasRef = useRef<{ clear: () => void }>(null);

  // Crop State
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>();

  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentImage = history[historyIndex] ?? null;
  const originalImage = history[0] ?? null;

  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  console.log('[App] Current State:', {
    user: user === undefined ? 'undefined (loading)' : (user ? `User(${user.id})` : 'null'),
    userProfile: !!userProfile,
    page,
    isLoading,
    projectsLoaded,
    hasCurrentImage: !!currentImage,
  });

  // === Effects ===

  // Use onAuthStateChange as the single source of truth for the user's session.
  useEffect(() => {
    console.log('[App Auth Effect] Setting up onAuthStateChange listener.');
    const { data: authListener } = supabaseService.supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log(`[App Auth Effect] onAuthStateChange triggered. Event: ${_event}, Session exists: ${!!session}`);
      const currentUser = session?.user ?? null;
      setUser(currentUser); // Trigger re-render with user object or null
      console.log(`[App Auth Effect] setUser state updated to: ${currentUser ? currentUser.id : 'null'}`);
      if (currentUser) {
        console.log('[App Auth Effect] User found, fetching profile...');
        try {
          const profile = await supabaseService.getUserProfile(currentUser.id);
          setUserProfile(profile);
          console.log('[App Auth Effect] User profile fetched and set.');
        } catch (e) {
          console.error("[App] Failed to fetch user profile:", e);
          setError("Could not load your user profile.");
        }
      } else {
        console.log('[App Auth Effect] No user session. Resetting state.');
        // If user logs out, reset state and go to dashboard (which will then show AuthScreen)
        setHistory([]);
        setHistoryIndex(-1);
        setUserProfile(null);
        setPage('dashboard');
        // Reset loading state to prevent it from persisting across sessions
        setIsLoading(false);
      }
    });
  
    return () => {
      console.log('[App Auth Effect] Cleaning up: Unsubscribing from onAuthStateChange.');
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Callback for child components (like PromptManager) to trigger a refresh of prompts
  const handleRefreshPrompts = useCallback(async () => {
    if (!user) {
      console.log('[App Prompts] Refresh requested but no user is logged in.');
      return;
    }
    console.log('[App Prompts] Refreshing user prompts...');
    try {
        const userPrompts = await supabaseService.getPrompts(user.id);
        setPrompts(userPrompts);
        console.log(`[App Prompts] Successfully refreshed ${userPrompts.length} prompts.`);
    } catch (e) {
        console.error("Failed to refresh prompts:", e);
        setError("Could not refresh your prompts list.");
    }
  }, [user]);

  // Load all user data (projects, prompts) when the user logs in or a session is detected
  useEffect(() => {
    const loadUserData = async () => {
        if (user) {
            console.log('[App Data Effect] User detected, loading data.');
            setProjectsLoaded(false);
            try {
                const [loadedProjects, userPrompts] = await Promise.all([
                    supabaseService.getProjects(user.id),
                    supabaseService.getPrompts(user.id)
                ]);

                setProjects(loadedProjects);
                console.log(`[App Data Effect] Loaded ${loadedProjects.length} projects.`);
                
                setPrompts(userPrompts);
                console.log(`[App Prompts] Successfully refreshed ${userPrompts.length} prompts.`);

            } catch (e) {
                console.error("Failed to load user data:", e);
                setError("Could not load your saved data.");
                setProjects([]);
                setPrompts([]);
            } finally {
                setProjectsLoaded(true);
                console.log('[App Data Effect] User data loading finished.');
            }
        } else {
            console.log('[App Data Effect] No user detected. Clearing projects and prompts.');
            setProjects([]);
            setPrompts([]);
            setProjectsLoaded(false);
        }
    };

    loadUserData();
  }, [user]);

  // Clean up compare mode when tool changes
  useEffect(() => {
    if (activeTool !== null || isBrushMode) {
      if (isCompareMode) {
        console.log('[App UI Effect] Active tool changed, disabling compare mode.');
        setIsCompareMode(false);
      }
    }
  }, [activeTool, isBrushMode, isCompareMode]);

  // Deactivate brush mode if another tool is selected
  useEffect(() => {
    if (activeTool !== null) {
      if (isBrushMode) {
        console.log('[App UI Effect] Active tool selected, disabling brush mode.');
        setIsBrushMode(false);
      }
    }
  }, [activeTool, isBrushMode]);
  

  // Create Object URLs for images in history for performance
  useEffect(() => {
    if (currentImage) {
      console.log('[App Image URL Effect] Creating Object URL for current image.');
      const url = URL.createObjectURL(currentImage);
      setCurrentImageUrl(url);
      return () => {
        console.log('[App Image URL Effect] Revoking Object URL for current image.');
        URL.revokeObjectURL(url);
      }
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentImage]);
  
  useEffect(() => {
    if (originalImage) {
      console.log('[App Image URL Effect] Creating Object URL for original image.');
      const url = URL.createObjectURL(originalImage);
      setOriginalImageUrl(url);
      return () => {
        console.log('[App Image URL Effect] Revoking Object URL for original image.');
        URL.revokeObjectURL(url);
      }
    } else {
      setOriginalImageUrl(null);
    }
  }, [originalImage]);

  // === History Management ===

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const addImageToHistory = useCallback((newImageFile: File) => {
    console.log('[App History] Adding new image to history.');
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    console.log(`[App History] History updated. New length: ${newHistory.length}, New index: ${newHistory.length - 1}`);
    // Clear transient state
    setCrop(undefined);
    setCompletedCrop(undefined);
    brushCanvasRef.current?.clear();
    setMaskDataUrl(null);
    setIsBrushMode(false);
  }, [history, historyIndex]);

  // === Event Handlers ===
  
  const handleImageUpload = useCallback((file: File, initialPrompt: string = '') => {
    console.log('[App Event] Handling new image upload.');
    setError(null);
    setHistory([file]);
    setHistoryIndex(0);
    setActiveProjectId(null);
    setActiveTool(null);
    setIsBrushMode(false);
    setMaskDataUrl(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setIsCompareMode(false);
    setPrompt(initialPrompt);
    setPage('editor');
    console.log('[App Event] Image upload complete, state reset for editor.');
  }, []);

  const handleSelectTemplate = useCallback(async (template: Template) => {
    console.log(`[App Event] Template selected: "${template.title}"`);
    setIsLoading(true);
    setError(null);
    try {
        const imageFile = await blobToFile(template.imageUrl, `template-${template.title.replace(/\s+/g, '-')}.png`);
        handleImageUpload(imageFile, template.prompt);
    } catch (e) {
        console.error('[App Event] Error loading template:', e);
        setError("Failed to load the template image. Please try again.");
    } finally {
        setIsLoading(false);
        console.log('[App Event] Template loading finished.');
    }
  }, [handleImageUpload]);
  
  // === Navigation ===
  const handleNavigate = useCallback((targetPage: Page) => {
    setPage(currentPage => {
        console.log(`[App Navigation] Navigating from '${currentPage}' to '${targetPage}'.`);
        if (currentPage === 'editor' && targetPage !== 'editor') {
            console.log('[App Navigation] Leaving editor page, performing cleanup.');
            setIsLoading(false);
            setHistory([]);
            setHistoryIndex(-1);
            setActiveProjectId(null);
            setIsCompareMode(false);
            setActiveTool(null);
            setIsBrushMode(false);
            setMaskDataUrl(null);
            setPrompt('');
            console.log('[App Navigation] Editor state has been reset.');
        }
        return targetPage;
    });
  }, []);

  // === Project Management ===

  const handleSaveProject = async (projectName: string) => {
    if (!currentImage || !user) {
      console.warn('[App Project] Save aborted: no current image or user.');
      return;
    }
    console.log(`[App Project] Saving project with name: "${projectName}"`);
    setIsLoading(true);

    try {
        const existingProject = projects.find(p => p.id === activeProjectId) || null;
        console.log(`[App Project] Is this an existing project? ${!!existingProject}`);
        
        console.log('[App Project] Uploading history files to storage...');
        const historyPaths = await Promise.all(
            history.map((file, index) => 
                supabaseService.uploadProjectFile(user.id, activeProjectId || `temp_${Date.now()}`, file, `history_item_${index}_${Date.now()}.png`)
            )
        );
        console.log(`[App Project] Uploaded ${historyPaths.length} history files.`);
        
        const thumbnailPath = historyPaths[historyIndex];

        const projectData = {
            ...existingProject,
            id: activeProjectId,
            user_id: user.id,
            name: projectName,
            history: historyPaths,
            history_index: historyIndex,
            thumbnail: thumbnailPath,
            snapshots: existingProject?.snapshots || [],
        };

        console.log('[App Project] Saving project metadata to database...');
        const savedProject = await supabaseService.saveProject(projectData);
        console.log(`[App Project] Project saved successfully. ID: ${savedProject.id}`);
        
        setProjects(prevProjects => {
            const existingIndex = prevProjects.findIndex(p => p.id === savedProject.id);
            if (existingIndex > -1) {
                const newProjects = [...prevProjects];
                newProjects[existingIndex] = savedProject;
                return newProjects;
            }
            return [...prevProjects, savedProject];
        });
        setActiveProjectId(savedProject.id);

    } catch (e: any) {
        console.error('[App Project] Failed to save project:', e);
        setError(`Failed to save project: ${e.message}`);
    } finally {
        setIsSaveModalOpen(false);
        setIsLoading(false);
        console.log('[App Project] Save operation finished.');
    }
  };

  const handleLoadProject = useCallback(async (project: Project) => {
    console.log(`[App Project] Loading project: "${project.name}" (ID: ${project.id})`);
    setIsLoading(true);
    setError(null);
    setPage('editor');
    try {
        console.log('[App Project] Creating signed URLs for history files...');
        const signedUrlPromises = project.history.map(path => supabaseService.createSignedUrl(path));
        const imageUrls = await Promise.all(signedUrlPromises);
        console.log(`[App Project] Fetched ${imageUrls.length} signed URLs. Converting to File objects...`);
        const newHistoryFiles = await Promise.all(
            imageUrls.map((url, index) => blobToFile(url, `history-${project.id}-${index}.png`))
        );
        console.log('[App Project] Converted all files. Updating editor state.');

        setHistory(newHistoryFiles);
        setHistoryIndex(project.history_index);
        setActiveProjectId(project.id);

        setCrop(undefined);
        setCompletedCrop(undefined);
        setActiveTool(null);
        setMaskDataUrl(null);
        setIsBrushMode(false);
        setPrompt('');
        setIsCompareMode(false);
        console.log('[App Project] Editor state reset for loaded project.');
    } catch (e) {
        console.error('[App Project] Failed to load project files:', e);
        setError("Failed to load project files from the cloud.");
    } finally {
        setIsLoading(false);
        console.log('[App Project] Load operation finished.');
    }
  }, []);

  const handleDeleteProject = useCallback(async (project: Project) => {
    console.log(`[App Project] Deleting project: "${project.name}" (ID: ${project.id})`);
    setIsLoading(true);
    try {
      await supabaseService.deleteProject(project);
      setProjects(prevProjects => prevProjects.filter(p => p.id !== project.id));
      console.log('[App Project] Project deleted successfully.');
    } catch (e: any) {
      console.error('[App Project] Failed to delete project:', e);
      setError(`Failed to delete project: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      console.warn('[App Profile] Update aborted: no user.');
      return;
    }
    console.log('[App Profile] Updating user profile with:', updates);
    try {
      await supabaseService.updateUserProfile(user.id, updates);
      const refreshedProfile = await supabaseService.getUserProfile(user.id);
      setUserProfile(refreshedProfile);
      console.log('[App Profile] Profile updated and re-fetched successfully.');
    } catch (e: any) {
      console.error('[App Profile] Failed to update profile:', e);
      setError(`Failed to update profile: ${e.message}`);
      throw e;
    }
  };


  // === AI & Editing Handlers ===

  const handleGenerate = useCallback(async () => {
    if (!currentImage || !prompt.trim()) {
      console.warn('[App AI] Generate aborted: no image or prompt.');
      return;
    }
    console.log('[App AI] Starting image generation...');
    setIsLoading(true);
    setError(null);
    try {
        let imageToSend = currentImage;
        let finalPrompt = prompt;

        if (maskDataUrl) {
            console.log('[App AI] Mask detected. Preparing image for inpainting.');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get canvas context");
            
            const originalImg = new Image();
            originalImg.src = URL.createObjectURL(currentImage);
            await new Promise((resolve, reject) => { originalImg.onload = resolve; originalImg.onerror = reject; });
            
            canvas.width = originalImg.naturalWidth;
            canvas.height = originalImg.naturalHeight;
            
            ctx.drawImage(originalImg, 0, 0);

            const maskImg = new Image();
            maskImg.src = maskDataUrl;
            await new Promise((resolve, reject) => { maskImg.onload = resolve; maskImg.onerror = reject; });
            
            ctx.globalCompositeOperation = 'destination-out';
            ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);

            const inpaintingImageDataUrl = canvas.toDataURL('image/png');
            imageToSend = dataURLtoFile(inpaintingImageDataUrl, `inpainting-${Date.now()}.png`);
            
            finalPrompt = `The user has provided an image with a transparent area. Your task is to seamlessly and photorealistically fill in ONLY the transparent area based on the user's request: "${prompt}". The existing, non-transparent parts of the image MUST be perfectly preserved.`;
            console.log('[App AI] Inpainting image and prompt prepared.');
        }
        
        const editedImageUrl = await generateEditedImage(imageToSend, finalPrompt);
        const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
        addImageToHistory(newImageFile);
        console.log('[App AI] Generation successful, new image added to history.');
    } catch (err) {
        console.error('[App AI] Image generation failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to generate the image. ${errorMessage}`);
    } finally {
        setIsLoading(false);
        console.log('[App AI] Generation operation finished.');
    }
  }, [currentImage, prompt, addImageToHistory, maskDataUrl]);
  
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    console.log('[App AI] Enhancing prompt...');
    setIsEnhancingPrompt(true);
    setError(null);
    try {
        const enhanced = await enhancePrompt(prompt);
        setPrompt(enhanced);
        console.log('[App AI] Prompt enhanced successfully.');
    } catch (err) {
        console.error('[App AI] Prompt enhancement failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to enhance prompt. ${errorMessage}`);
    } finally {
        setIsEnhancingPrompt(false);
    }
  }

  const createApiHandler = (apiFn: (file: File, prompt?: string) => Promise<string>, actionName: string) => async (promptOrFile?: string | File) => {
      if (!currentImage) {
        console.warn(`[App AI] ${actionName} aborted: no current image.`);
        return;
      }
      console.log(`[App AI] Starting one-click action: ${actionName}`);
      setIsLoading(true);
      setError(null);
      try {
          const resultUrl = await (typeof promptOrFile === 'string' ? apiFn(currentImage, promptOrFile) : apiFn(currentImage));
          const newImageFile = dataURLtoFile(resultUrl, `${actionName}-${Date.now()}.png`);
          addImageToHistory(newImageFile);
          console.log(`[App AI] Action ${actionName} successful.`);
      } catch (err) {
          console.error(`[App AI] Action ${actionName} failed:`, err);
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(`Failed to ${actionName}. ${errorMessage}`);
      } finally {
          setIsLoading(false);
          console.log(`[App AI] Action ${actionName} finished.`);
      }
  };

  const handleApplyFilter = createApiHandler(generateFilteredImage, 'filter');
  const handleApplyAdjustment = createApiHandler(generateAdjustedImage, 'adjustment');
  const handleAutoEnhance = createApiHandler(generateAutoEnhancedImage, 'auto-enhance');
  const handleRestoreImage = createApiHandler(generateRestoredImage, 'restore');
  const handleRemoveBackground = createApiHandler(generateRemovedBackgroundImage, 'remove-background');
  const handleStudioPortrait = createApiHandler(generateStudioPortrait, 'studio-portrait');
  const handleGenerateCompCard = createApiHandler(generateCompCard, 'comp-card');
  const handleGenerateThreeViewShot = createApiHandler(generateThreeViewShot, '3-view-shot');
  const handleOutpaint = createApiHandler(generateOutpaintedImage, 'outpaint');

  const handleApplyCrop = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
        console.warn('[App Crop] Apply crop aborted: no completed crop or image ref.');
        return;
    }
    console.log('[App Crop] Applying crop.');
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, completedCrop.width, completedCrop.height);
    const croppedImageUrl = canvas.toDataURL('image/png');
    const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
    addImageToHistory(newImageFile);
    setActiveTool(null);
    console.log('[App Crop] Crop applied and added to history.');
  }, [completedCrop, addImageToHistory]);

  // === Top Bar Action Handlers ===
  const handleUndo = useCallback(() => {
      if (canUndo) {
          console.log('[App History] Performing Undo.');
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          brushCanvasRef.current?.clear();
          setMaskDataUrl(null);
          setIsBrushMode(false);
          if (newIndex === 0) {
              setIsCompareMode(false);
          }
      }
  }, [canUndo, historyIndex]);

  const handleRedo = useCallback(() => {
      if (canRedo) {
          console.log('[App History] Performing Redo.');
          setHistoryIndex(historyIndex + 1);
          brushCanvasRef.current?.clear();
          setMaskDataUrl(null);
          setIsBrushMode(false);
      }
  }, [canRedo, historyIndex]);

  const handleReset = useCallback(() => {
      if (history.length > 0) {
          console.log('[App History] Resetting to original image.');
          setHistoryIndex(0);
          brushCanvasRef.current?.clear();
          setMaskDataUrl(null);
          setIsBrushMode(false);
          setIsCompareMode(false);
      }
  }, [history]);

  const handleDownload = useCallback(() => {
      if (currentImage) {
          console.log('[App Event] Downloading current image.');
          const link = document.createElement('a');
          link.href = URL.createObjectURL(currentImage);
          link.download = `picslot-edited-${currentImage.name}`;
          link.click();
          URL.revokeObjectURL(link.href);
      }
  }, [currentImage]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
        handleImageUpload(files[0]);
    }
  };
  
  const handleNewImageClick = useCallback(() => {
    console.log('[App Event] "New Image" button clicked, triggering file input.');
    fileInputRef.current?.click();
  }, []);

  const handleLogout = useCallback(async () => {
    console.log('[App Auth] User logging out.');
    await supabaseService.signOut();
    console.log('[App Auth] Sign out successful. onAuthStateChange will handle state reset.');
  }, []);

  const handleClearMask = useCallback(() => {
      console.log('[App Brush] Clearing mask.');
      brushCanvasRef.current?.clear();
      setMaskDataUrl(null);
  }, []);

  const handleBrushContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isBrushMode) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCursorPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleBrushContainerMouseLeave = () => {
    setCursorPosition(null);
  };

  // === Snapshots Handlers ===
  const handleSaveSnapshot = async (snapshotName: string) => {
    if (!currentImage || !user || !activeProjectId) {
        throw new Error("Cannot save snapshot without an active, saved project.");
    }
    const project = projects.find(p => p.id === activeProjectId);
    if (!project) {
      throw new Error("Active project not found.");
    }

    const snapshotId = `snap_${Date.now()}`;
    const thumbnailPath = await supabaseService.uploadProjectFile(user.id, activeProjectId, currentImage, `snapshots/${snapshotId}.png`);

    const newSnapshot: Snapshot = {
        id: snapshotId,
        name: snapshotName,
        history_index: historyIndex,
        created_at: new Date().toISOString(),
        thumbnail_path: thumbnailPath,
    };

    const updatedSnapshots = [...(project.snapshots || []), newSnapshot];
    const updatedProjectData = { ...project, user_id: user.id, snapshots: updatedSnapshots };

    const savedProject = await supabaseService.saveProject(updatedProjectData);

    setProjects(prev => prev.map(p => p.id === savedProject.id ? savedProject : p));
  };
  
  const handleRestoreSnapshot = (snapshot: Snapshot) => {
    console.log(`[App Snapshot] Restoring snapshot: "${snapshot.name}"`);
    setHistoryIndex(snapshot.history_index);
    setIsSnapshotsModalOpen(false);
    brushCanvasRef.current?.clear();
    setMaskDataUrl(null);
    setIsBrushMode(false);
  };

  const handleDeleteSnapshot = async (snapshot: Snapshot) => {
      if (!user || !activeProjectId) {
        throw new Error("Cannot delete snapshot without an active, saved project.");
      }
      const project = projects.find(p => p.id === activeProjectId);
      if (!project) {
        throw new Error("Active project not found.");
      }
      console.log(`[App Snapshot] Deleting snapshot: "${snapshot.name}"`);

      try {
        await supabaseService.supabase.storage.from('project-images').remove([snapshot.thumbnail_path]);
      } catch (storageError) {
          console.error("Failed to delete snapshot thumbnail from storage, but proceeding:", storageError);
      }

      const updatedSnapshots = project.snapshots.filter(s => s.id !== snapshot.id);
      const updatedProjectData = { ...project, user_id: user.id, snapshots: updatedSnapshots };
      const savedProject = await supabaseService.saveProject(updatedProjectData);

      setProjects(prev => prev.map(p => p.id === savedProject.id ? savedProject : p));
      console.log(`[App Snapshot] Snapshot deleted.`);
  };


  // === RENDER LOGIC ===

  if (error) {
     console.log('[App Render] Rendering ERROR screen.');
     return (
        <div className="min-h-screen w-full flex items-center justify-center p-4">
            <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
                <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
                <p className="text-md text-red-400">{error}</p>
                <button type="button" onClick={() => setError(null)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors">Try Again</button>
            </div>
        </div>
      );
  }
  
  if (user === undefined) {
    console.log('[App Render] Auth state is UNDEFINED. Rendering full-page spinner.');
    return (
        <div className="min-h-screen w-full flex items-center justify-center">
            <Spinner size="lg" />
        </div>
    );
  }

  if (user === null) {
    console.log('[App Render] User is NULL. Rendering AuthScreen.');
    return <AuthScreen />;
  }
  
  const mainToolButtonClass = (tool: Tool) => `flex flex-col items-center justify-center gap-2 w-full font-semibold py-3 px-2 rounded-lg transition-all duration-200 text-sm ${activeTool === tool ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700/50 text-gray-300 hover:text-white hover:bg-gray-700'}`;
  const sidebarToolButtonClass = `flex items-center justify-start text-left bg-gray-700/50 border border-transparent text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 hover:border-gray-600 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-700/50`;

  const renderPageContent = () => {
    console.log(`[App Render] Determining page content for page: '${page}'.`);
    if (page !== 'editor' && (!projectsLoaded || isLoading)) {
        console.log('[App Render] Page is not editor and data is loading. Rendering spinner.');
        return <Spinner size="lg" />;
    }

    switch (page) {
        case 'dashboard':
            console.log('[App Render] Rendering Dashboard page.');
            return <Dashboard 
                        user={user}
                        userProfile={userProfile}
                        recentProjects={projects.slice(0, 5)}
                        onNavigateToProjects={() => handleNavigate('projects')}
                        onStartNewProject={() => handleNavigate('upload')}
                        onOpenPromptManager={() => setIsPromptManagerOpen(true)}
                        onSelectProject={handleLoadProject}
                        onSelectTemplate={handleSelectTemplate}
                    />;
        case 'projects':
            console.log('[App Render] Rendering ProjectsDashboard page.');
            return <ProjectsDashboard 
                      projects={projects} 
                      onSelectProject={handleLoadProject} 
                      onDeleteProject={handleDeleteProject}
                      onNavigate={handleNavigate}
                    />;
        case 'upload':
            console.log('[App Render] Rendering StartScreen (upload) page.');
            return <StartScreen onFileSelect={handleFileSelect} />;
        case 'settings':
            console.log('[App Render] Rendering SettingsPage.');
            return <SettingsPage 
                      user={user} 
                      userProfile={userProfile} 
                      onProfileUpdate={handleUpdateProfile}
                   />;
        case 'editor':
            if (!currentImageUrl) {
                console.log('[App Render] Editor page is active but no image. Falling back to StartScreen.');
                return <StartScreen onFileSelect={handleFileSelect} />;
            }
            console.log('[App Render] Rendering Editor page with image.');
            return (
                <div className="flex-grow w-full max-w-[1800px] mx-auto flex flex-col md:flex-row gap-8">
                  <div className="flex-grow flex flex-col gap-4 items-center md:w-[65%] lg:w-[70%]">
                      <div className="relative w-full shadow-2xl rounded-xl overflow-hidden bg-black/20 group">
                          {isLoading && (
                              <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                                  <Spinner size="lg" />
                                  <p className="text-gray-300">AI is working its magic...</p>
                              </div>
                          )}
                          {activeTool === 'crop' ? (
                            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={aspect} className="max-h-[70vh]">
                              <img ref={imgRef} src={currentImageUrl} alt="Crop this image" className="w-full h-auto object-contain max-h-[70vh] rounded-xl"/>
                            </ReactCrop>
                          ) : isCompareMode && originalImageUrl ? (
                              <CompareSlider originalImageUrl={originalImageUrl} currentImageUrl={currentImageUrl} />
                          ) : (
                            <div 
                              className={`relative w-full h-full ${isBrushMode ? 'cursor-none' : ''}`}
                              onMouseMove={handleBrushContainerMouseMove}
                              onMouseLeave={handleBrushContainerMouseLeave}
                            >
                              <img ref={imgRef} src={currentImageUrl} alt="Current" className="w-full h-auto object-contain max-h-[70vh] rounded-xl pointer-events-none" />
                              {isBrushMode && imgRef.current && (
                                  <BrushCanvas
                                    ref={brushCanvasRef}
                                    width={imgRef.current.clientWidth}
                                    height={imgRef.current.clientHeight}
                                    brushSize={brushSize}
                                    isErasing={isErasing}
                                    onMaskChange={setMaskDataUrl}
                                  />
                              )}
                              {isBrushMode && cursorPosition && (
                                  <div
                                      className={`absolute rounded-full border-2 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-colors duration-100 ${isErasing ? 'border-red-500 bg-red-500/20' : 'border-white bg-white/20'}`}
                                      style={{
                                          left: `${cursorPosition.x}px`,
                                          top: `${cursorPosition.y}px`,
                                          width: `${brushSize}px`,
                                          height: `${brushSize}px`,
                                      }}
                                      aria-hidden="true"
                                  />
                              )}
                            </div>
                          )}
                          
                          {isBrushMode && (
                              <BrushControls 
                                  brushSize={brushSize}
                                  isErasing={isErasing}
                                  onBrushSizeChange={setBrushSize}
                                  onIsErasingChange={setIsErasing}
                                  onClear={handleClearMask}
                              />
                          )}

                          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                              <button type="button" onClick={() => setIsZoomModalOpen(true)} disabled={isLoading} className="flex items-center gap-2 bg-black/50 hover:bg-black/80 text-white font-semibold py-2 px-4 rounded-full transition-colors backdrop-blur-sm"><ZoomInIcon className="w-5 h-5"/>Zoom</button>
                              {canUndo && <button type="button" onClick={() => setIsCompareMode(!isCompareMode)} disabled={isLoading || activeTool !== null || isBrushMode} className={`flex items-center gap-2 font-semibold py-2 px-4 rounded-full transition-colors backdrop-blur-sm ${isCompareMode ? 'bg-blue-500 text-white' : 'bg-black/50 hover:bg-black/80 text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}><EyeIcon className="w-5 h-5"/>Compare</button>}
                          </div>
                      </div>

                      <div className={`w-full flex flex-col items-center gap-0 transition-opacity duration-300 ${(activeTool !== null || isCompareMode) ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                          <PromptSelector prompts={prompts} onSelect={setPrompt} />
                          <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                              <div className="relative flex-grow">
                                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., 'change shirt color to blue' or 'make the sky dramatic'" rows={2} className="flex-grow bg-gray-800 border border-gray-700 text-gray-200 rounded-b-lg p-4 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 resize-none pr-28" disabled={isLoading || (isBrushMode && !maskDataUrl)}/>
                                  <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center gap-2">
                                      <button type="button" onClick={handleEnhancePrompt} title="Enhance Prompt with AI" className="p-2 text-gray-400 hover:text-purple-400 disabled:opacity-50 disabled:cursor-wait" disabled={isEnhancingPrompt || !prompt.trim()}>
                                        {isEnhancingPrompt ? <Spinner size="sm" /> : <MagicWandIcon className="w-5 h-5"/>}
                                      </button>
                                      <button type="button" onClick={() => setIsPromptManagerOpen(true)} title="Manage Prompts" className="p-2 text-gray-400 hover:text-blue-400">
                                        <BookmarkIcon className="w-5 h-5"/>
                                      </button>
                                  </div>
                              </div>
                              <button type="submit" className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:translate-y-px active:scale-95 disabled:from-gray-600 disabled:to-gray-700 disabled:shadow-none disabled:cursor-not-allowed self-stretch" disabled={isLoading || !prompt.trim() || (isBrushMode && !maskDataUrl)}>Generate</button>
                          </form>
                      </div>
                  </div>
                  
                  <aside className="w-full md:w-[35%] lg:w-[30%] bg-gray-800/80 border border-gray-700/80 rounded-xl p-4 flex flex-col gap-4 self-start sticky top-[128px] max-h-[calc(100vh-140px)] overflow-y-auto">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-3 border-b border-gray-700 pb-2">Retouch & AI Tools</h3>
                        <div className="grid grid-cols-1 gap-2">
                          <button 
                            type="button"
                            onClick={() => {
                                setIsBrushMode(!isBrushMode);
                                setActiveTool(null);
                            }} 
                            className={`flex items-center justify-start text-left border text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 hover:border-gray-600 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed ${isBrushMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700/50 border-transparent'}`}
                            disabled={isLoading}
                          >
                              <BrushIcon className="w-5 h-5 mr-3"/>Generative Mask
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <button type="button" onClick={() => handleAutoEnhance()} disabled={isLoading} className={sidebarToolButtonClass} title="Automatically improve lighting, color, and sharpness with a single click."><MagicWandIcon className="w-5 h-5 mr-3 text-purple-400"/>Auto Enhance</button>
                          <button type="button" onClick={() => handleRemoveBackground()} disabled={isLoading} className={sidebarToolButtonClass} title="Instantly remove the background and make it transparent."><RemoveBgIcon className="w-5 h-5 mr-3 text-pink-400"/>Remove Background</button>
                          <button type="button" onClick={() => handleRestoreImage()} disabled={isLoading} className={sidebarToolButtonClass} title="Repair old, blurry, or damaged photos by removing scratches and restoring color."><RestoreIcon className="w-5 h-5 mr-3 text-amber-400"/>Photo Restore</button>
                          <button type="button" onClick={() => handleStudioPortrait()} disabled={isLoading} className={sidebarToolButtonClass} title="Convert your photo into a professional headshot with a clean studio background."><PortraitIcon className="w-5 h-5 mr-3 text-cyan-400"/>Studio Portrait</button>
                          <button type="button" onClick={() => handleGenerateCompCard()} disabled={isLoading} className={sidebarToolButtonClass} title="Generate a professional, multi-pose modeling composite card."><CompCardIcon className="w-5 h-5 mr-3 text-red-400"/>Composite Card</button>
                          <button type="button" onClick={() => handleGenerateThreeViewShot()} disabled={isLoading} className={sidebarToolButtonClass} title="Create a 3-view (front, side, back) reference shot of a person."><ThreeViewIcon className="w-5 h-5 mr-3 text-sky-400"/>Character Turnaround</button>
                          <button type="button" onClick={() => handleOutpaint()} disabled={isLoading} className={sidebarToolButtonClass} title="Expand a cropped image to reveal the full body and a complete background."><ExpandIcon className="w-5 h-5 mr-3 text-green-400"/>Magic Expand</button>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-200 mt-4 mb-3 border-b border-gray-700 pb-2">Manual Edits</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => setActiveTool(activeTool === 'adjust' ? null : 'adjust')} className={mainToolButtonClass('adjust')}><AdjustmentsIcon className="w-6 h-6"/>Adjust</button>
                            <button type="button" onClick={() => setActiveTool(activeTool === 'filters' ? null : 'filters')} className={mainToolButtonClass('filters')}><LayersIcon className="w-6 h-6"/>Filters</button>
                            <button type="button" onClick={() => setActiveTool(activeTool === 'crop' ? null : 'crop')} className={mainToolButtonClass('crop')}><CropIcon className="w-6 h-6"/>Crop</button>
                        </div>
                        <div className="mt-4">
                            {activeTool === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} />}
                            {activeTool === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
                            {activeTool === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
                        </div>
                      </div>
                  </aside>
                </div>
            );
        default:
            console.log(`[App Render] Switch case default hit. This should not happen. Page: ${page}`);
            return null;
    }
  };
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => handleFileSelect(e.target.files)} 
        className="hidden" 
        accept="image/*" 
      />
      <Header 
        user={user} 
        userProfile={userProfile}
        onLogout={handleLogout} 
        page={page}
        onNavigate={handleNavigate}
        isEditorActive={!!currentImageUrl}
      />
      
      {page === 'editor' && currentImageUrl && (
          <div className="w-full bg-gray-900/70 backdrop-blur-sm border-b border-gray-700/80 p-2 flex items-center justify-between gap-2 sticky top-[65px] z-40">
            <div className="flex items-center gap-2">
                <button type="button" onClick={handleUndo} disabled={!canUndo || isLoading} className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><UndoIcon className="w-5 h-5"/>Undo</button>
                <button type="button" onClick={handleRedo} disabled={!canRedo || isLoading} className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><RedoIcon className="w-5 h-5"/>Redo</button>
                <button type="button" onClick={handleReset} disabled={!canUndo || isLoading} className="bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Reset</button>
            </div>
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => setIsSaveModalOpen(true)} disabled={isLoading} className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><SaveIcon className="w-5 h-5"/>Save</button>
                <button type="button" onClick={() => setIsSnapshotsModalOpen(true)} disabled={!activeProjectId || isLoading} title={!activeProjectId ? "Save the project first to enable snapshots" : "Manage Snapshots"} className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><HistoryIcon className="w-5 h-5"/>Snapshots</button>
                <button type="button" onClick={() => handleNavigate('upload')} disabled={isLoading} className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><UploadIconSVG className="w-5 h-5"/>New Image</button>
                <button type="button" onClick={handleDownload} disabled={isLoading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-md transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"><DownloadIcon className="w-5 h-5"/>Download</button>
            </div>
          </div>
      )}

      <main className={`flex-grow w-full mx-auto ${
          page === 'editor' && currentImageUrl
          ? 'max-w-[1800px] p-4 md:p-8'
          : 'max-w-7xl p-4 md:p-8 flex justify-center items-center'
      }`}>
        {renderPageContent()}
      </main>
      
      <ZoomModal isOpen={isZoomModalOpen} onClose={() => setIsZoomModalOpen(false)} imageUrl={currentImageUrl} />
      <SaveProjectModal 
        isOpen={isSaveModalOpen} 
        onSave={handleSaveProject}
        onClose={() => setIsSaveModalOpen(false)}
        initialName={activeProject?.name || ''}
      />
       {activeProject && (
          <SnapshotsModal
            isOpen={isSnapshotsModalOpen}
            onClose={() => setIsSnapshotsModalOpen(false)}
            snapshots={activeProject.snapshots || []}
            onSave={handleSaveSnapshot}
            onRestore={handleRestoreSnapshot}
            onDelete={handleDeleteSnapshot}
          />
        )}
      {user && (
          <PromptManagerModal
            isOpen={isPromptManagerOpen}
            onClose={() => setIsPromptManagerOpen(false)}
            user={user}
            onRefreshPrompts={handleRefreshPrompts}
            initialPrompts={prompts}
          />
      )}
    </div>
  );
};

export default App;
