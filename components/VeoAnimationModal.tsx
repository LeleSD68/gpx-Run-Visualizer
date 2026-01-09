
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
    "Inizializzazione modello Veo...",
    "Analisi immagine e prompt...",
    "Generazione fotogrammi chiave...",
    "Rendering del movimento...",
    "Montaggio video finale...",
    "Quasi pronto!",
];

const LoadingSpinner: React.FC = () => (
    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
);

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
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Troppi tentativi falliti.");
}

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
        setPrompt(`Un video cinematografico di un corridore su un sentiero panoramico ispirato a questa immagine. Il percorso è di ${track.distance.toFixed(1)} km. Il video deve essere epico e motivante.`);
    }, [track]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (generationState === 'generating') {
            loadingIntervalRef.current = window.setInterval(() => {
                setCurrentLoadingMessage(prev => {
                    const currentIndex = loadingMessages.indexOf(prev);
                    return loadingMessages[(currentIndex + 1) % loadingMessages.length];
                });
            }, 4000);
        } else {
            if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
        }
        return () => { if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current); };
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
            setError('Carica un\'immagine di riferimento.');
            return;
        }
        
        setGenerationState('generating');
        setError('');
        
        try {
            if (!await window.aistudio.hasSelectedApiKey()) {
                await window.aistudio.openSelectKey();
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
                await new Promise(resolve => setTimeout(resolve, 8000));
                const pollingCall = () => ai.operations.getVideosOperation({ operation: operation });
                operation = await retryWithBackoff(pollingCall, 2, 1000) as any;
            }

            if (operation.error) {
                if (operation.error.message.includes("Requested entity was not found")) {
                    setApiKeySelected(false);
                    throw new Error("Chiave API non valida o progetto non trovato. Seleziona una chiave valida.");
                }
                throw new Error(operation.error.message);
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) throw new Error('Generazione fallita.');

            const videoRes = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!videoRes.ok) throw new Error('Errore durante il download del video.');
            
            const videoBlob = await videoRes.blob();
            setGeneratedVideoUrl(URL.createObjectURL(videoBlob));
            setGenerationState('done');
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Errore sconosciuto durante la generazione.");
            setGenerationState('error');
        }
    };

    const resetForm = () => {
        setGenerationState('idle');
        setGeneratedVideoUrl(null);
        setError('');
        setImageFile(null);
        setImagePreview(null);
    };

    const renderContent = () => {
        if (!apiKeySelected) {
            return (
                <div className="text-center p-8">
                    <h3 className="text-lg font-semibold text-slate-200 mb-2">Chiave API Richiesta</h3>
                    <p className="text-sm text-slate-400 mb-4">La generazione video Veo richiede una chiave API di un progetto a pagamento.</p>
                    <button onClick={handleSelectKey} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md">Seleziona Chiave API</button>
                    <p className="text-xs text-slate-500 mt-3">Consulta la <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">documentazione billing</a>.</p>
                </div>
            );
        }

        switch (generationState) {
            case 'generating':
                return (
                    <div className="flex flex-col items-center justify-center p-8 text-center h-96">
                        <LoadingSpinner />
                        <p className="mt-4 font-semibold text-slate-200 text-lg">{currentLoadingMessage}</p>
                        <p className="text-sm text-slate-400">Il processo può richiedere fino a 2-3 minuti.</p>
                    </div>
                );
            case 'done':
                return (
                    <div className="p-6">
                        <video src={generatedVideoUrl!} controls autoPlay loop className="w-full rounded-lg mb-4" />
                        <div className="flex space-x-2">
                           <a href={generatedVideoUrl!} download={`${track.name}_veo.mp4`} className="flex-1 text-center bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md">Scarica</a>
                           <button onClick={resetForm} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Crea Nuovo</button>
                        </div>
                    </div>
                );
            case 'error':
                return (
                    <div className="p-8 text-center">
                        <h3 className="text-lg font-semibold text-red-400 mb-2">Generazione Fallita</h3>
                        <p className="text-sm text-slate-300 bg-red-500/10 p-3 rounded-md mb-4">{error}</p>
                        <button onClick={resetForm} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md">Riprova</button>
                    </div>
                );
            default:
                return (
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">1. Immagine di Riferimento</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    {imagePreview ? <img src={imagePreview} className="mx-auto h-24 rounded-md" /> : <div className="mx-auto h-12 w-12 text-slate-500">🖼️</div>}
                                    <div className="flex text-sm text-slate-400">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-slate-700 rounded-md font-medium text-cyan-400 hover:text-cyan-300 px-2 py-1">
                                            <span>Carica Immagine</span>
                                            <input id="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300">2. Descrizione Video</label>
                            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                        </div>
                        <button onClick={handleGenerate} disabled={!imageFile} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-md">Genera Video AI</button>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[3000] p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-purple-400">Veo Video AI</h2>
                    <button onClick={onClose} className="text-2xl">&times;</button>
                </header>
                <div className="flex-grow overflow-y-auto">{renderContent()}</div>
            </div>
        </div>
    );
};

export default VeoAnimationModal;
