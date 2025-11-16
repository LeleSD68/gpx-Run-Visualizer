import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Track } from '../types';
import { GoogleGenAI } from '@google/genai';

const fileToBase64 = (file: File): Promise<{ mimeType: string; data: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const [header, data] = result.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
            resolve({ mimeType, data });
        };
        reader.onerror = error => reject(error);
    });
};

const loadingMessages = [
    "Initializing Veo model...",
    "Analyzing your image and prompt...",
    "Generating key video frames...",
    "Rendering the motion...",
    "Stitching video together...",
    "Applying final touches...",
    "This can take a few minutes, hang tight!",
];

const LoadingSpinner: React.FC = () => (
    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
);

// START: Retry Logic Helpers
const isRetryableError = (error: any): boolean => {
    const errorMessage = (error?.message || '').toLowerCase();
    return errorMessage.includes('overloaded') || errorMessage.includes('unavailable') || (error?.status === 'UNAVAILABLE');
};

async function retryWithBackoff<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await apiCall();
    } catch (error: any) {
      attempt++;
      if (attempt >= maxRetries || !isRetryableError(error)) {
        throw error;
      }
      const jitter = Math.random() * initialDelay * 0.5;
      const delay = (initialDelay * Math.pow(2, attempt - 1)) + jitter;
      console.warn(`API call failed. Retrying in ${Math.round(delay)}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries reached. The API is still unavailable.");
}
// END: Retry Logic Helpers


const VeoAnimationModal: React.FC<{ track: Track; onClose: () => void }> = ({ track, onClose }) => {
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [generationState, setGenerationState] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState(loadingMessages[0]);
    const loadingIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        const checkApiKey = async () => {
            if (await window.aistudio.hasSelectedApiKey()) {
                setApiKeySelected(true);
            }
        };
        checkApiKey();
        
        setPrompt(`A cinematic video of a person running on a scenic route inspired by this image. The route is ${track.distance.toFixed(1)} km long. The video should feel epic and inspiring.`);
    }, [track]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    useEffect(() => {
        if (generationState === 'generating') {
            loadingIntervalRef.current = window.setInterval(() => {
                setCurrentLoadingMessage(prev => {
                    const currentIndex = loadingMessages.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % loadingMessages.length;
                    return loadingMessages[nextIndex];
                });
            }, 4000);
        } else {
            if (loadingIntervalRef.current) {
                clearInterval(loadingIntervalRef.current);
                loadingIntervalRef.current = null;
            }
        }
        return () => {
            if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
        };
    }, [generationState]);

    const handleSelectKey = async () => {
        await window.aistudio.openSelectKey();
        setApiKeySelected(true);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            if (imagePreview) URL.revokeObjectURL(imagePreview);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleGenerate = async () => {
        if (!imageFile) {
            setError('Please upload an image.');
            return;
        }
        
        setGenerationState('generating');
        setError('');
        setGeneratedVideoUrl(null);
        
        try {
            if (!await window.aistudio.hasSelectedApiKey()) {
                await window.aistudio.openSelectKey();
                if (!await window.aistudio.hasSelectedApiKey()) {
                    throw new Error("API key is required.");
                }
            }
            setApiKeySelected(true);

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const { mimeType, data: base64Data } = await fileToBase64(imageFile);
            
            const initialCall = () => ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt,
                image: { imageBytes: base64Data, mimeType },
                config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
            });

            let operation: any = await retryWithBackoff(initialCall, 3, 2000);

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                
                const pollingCall = () => ai.operations.getVideosOperation({ operation: operation });
                operation = await retryWithBackoff(pollingCall, 2, 1000) as any;
            }

            if (operation.error) throw new Error(operation.error.message);

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) throw new Error('Video generation failed to return a download link.');

            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) {
                if (response.status === 404 && (await response.text()).includes("Requested entity was not found.")) {
                   setError("API key is invalid. Please select a valid key.");
                   setApiKeySelected(false);
                   setGenerationState('error');
                   return;
                }
                throw new Error(`Failed to download video: ${response.statusText}`);
            }
            const videoBlob = await response.blob();
            const videoUrl = URL.createObjectURL(videoBlob);

            setGeneratedVideoUrl(videoUrl);
            setGenerationState('done');
        } catch (err: any) {
            console.error(err);
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("Requested entity was not found.")) {
                setError("API key is invalid. Please select a valid key.");
                setApiKeySelected(false);
            } else if (isRetryableError(err)) {
                setError("The video generation service is currently busy. Please try again later.");
            } else {
                setError(msg);
            }
            setGenerationState('error');
        }
    };

    const resetForm = () => {
        setGenerationState('idle');
        setGeneratedVideoUrl(null);
        setError('');
        setImageFile(null);
        setImagePreview(null);
    }

    const renderContent = () => {
        if (!apiKeySelected) {
            return (
                <div className="text-center p-8">
                    <h3 className="text-lg font-semibold text-slate-200 mb-2">API Key Required</h3>
                    <p className="text-sm text-slate-400 mb-4">
                        Video generation with Veo requires a Project API key. Please select a key to continue.
                    </p>
                    <button onClick={handleSelectKey} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md">
                        Select API Key
                    </button>
                    <p className="text-xs text-slate-500 mt-3">
                        For more information on billing, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-400">documentation</a>.
                    </p>
                </div>
            );
        }

        switch (generationState) {
            case 'generating':
                return (
                    <div className="flex flex-col items-center justify-center p-8 text-center h-96">
                        <LoadingSpinner />
                        <p className="mt-4 font-semibold text-slate-200 text-lg">{currentLoadingMessage}</p>
                        <p className="text-sm text-slate-400">Video generation is an intensive process.</p>
                    </div>
                );
            case 'done':
                return (
                    <div className="p-6">
                        <video src={generatedVideoUrl!} controls autoPlay loop className="w-full rounded-lg mb-4" />
                        <div className="flex space-x-2">
                           <a href={generatedVideoUrl!} download={`${track.name.replace(/\s+/g, '_')}_veo.mp4`} className="flex-1 text-center bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md">Download</a>
                           <button onClick={resetForm} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Create Another</button>
                        </div>
                    </div>
                );
            case 'error':
                return (
                    <div className="p-8 text-center">
                        <h3 className="text-lg font-semibold text-red-400 mb-2">Generation Failed</h3>
                        <p className="text-sm text-slate-300 bg-red-500/10 p-3 rounded-md mb-4">{error}</p>
                        <button onClick={resetForm} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md">Try Again</button>
                    </div>
                );
            default:
                return (
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">1. Upload Starting Image</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="mx-auto h-24 rounded-md" />
                                    ) : (
                                        <svg className="mx-auto h-12 w-12 text-slate-500" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                    <div className="flex text-sm text-slate-400">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-slate-700 rounded-md font-medium text-cyan-400 hover:text-cyan-300 focus-within:outline-none px-2 py-1">
                                            <span>Upload a file</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="prompt" className="block text-sm font-medium text-slate-300">2. Describe the Video</label>
                            <textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500" />
                        </div>
                        <div>
                            <h3 className="block text-sm font-medium text-slate-300">3. Aspect Ratio</h3>
                            <div className="mt-2 flex space-x-4">
                                {(['16:9', '9:16'] as const).map(ratio => (
                                    <label key={ratio} className="flex items-center">
                                        <input type="radio" name="aspectRatio" value={ratio} checked={aspectRatio === ratio} onChange={() => setAspectRatio(ratio)} className="h-4 w-4 text-cyan-600 bg-slate-600 border-slate-500 focus:ring-cyan-500" />
                                        <span className="ml-2 text-sm text-slate-300">{ratio} ({ratio === '16:9' ? 'Landscape' : 'Portrait'})</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <button onClick={handleGenerate} disabled={!imageFile} className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md">Generate Video</button>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[3000] p-4 animate-fade-in" onClick={onClose}>
            <div 
                role="dialog"
                aria-modal="true"
                aria-labelledby="veo-modal-title"
                className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                    <h2 id="veo-modal-title" className="text-xl font-bold text-purple-400">Veo Video Generation</h2>
                    <button onClick={onClose} className="text-2xl leading-none p-1 rounded-full hover:bg-slate-700" aria-label="Close Veo modal">&times;</button>
                </header>
                <div className="flex-grow overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
             <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default VeoAnimationModal;