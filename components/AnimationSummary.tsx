





import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { TrackStats, UserProfile } from '../types';

const formatDuration = (ms: number) => {
  if (isNaN(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2">
        <path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" />
    </svg>
);

const FormattedAnalysis: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter(part => part);

    return (
        <p className="mb-2">
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-bold text-cyan-400 block mt-2 mb-1">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <em key={i} className="text-slate-300">{part.slice(1, -1)}</em>;
                }
                return <span key={i}>{part}</span>;
            })}
        </p>
    );
};

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


const AnimationSummary: React.FC<{ trackStats: TrackStats, userProfile: UserProfile, onClose: () => void }> = ({ trackStats, userProfile, onClose }) => {
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAnalyze = useCallback(async () => {
        setIsLoading(true);
        setError('');
        setAnalysis('');

        const fastestSplit = trackStats.splits.find(s => s.isFastest);

        const generatePrompt = () => {
             const hrInfo = trackStats.avgHr
                ? `- Frequenza Cardiaca Media: ${Math.round(trackStats.avgHr)} bpm (Max: ${trackStats.maxHr} bpm)`
                : '';
            const fastestSplitInfo = fastestSplit
                ? `- Chilometro più veloce: Ritmo ${formatPace(fastestSplit.pace)}/km (Km ${fastestSplit.splitNumber})`
                : '';
             const profileInfo = userProfile.age ? `L'atleta ha ${userProfile.age} anni.` : '';
            
            return `Sei un analista di dati sportivi di livello mondiale e un commentatore motivazionale. Analizza in modo creativo ed esaustivo la seguente sessione di corsa. Inventa metriche avanzate e plausibili (come "Potenza di Corsa", "Efficienza Metabolica", "Indice di Resilienza", "Simmetria della Falcata") basandoti sui dati reali forniti. Fornisci un'analisi dettagliata per ogni metrica, spiega cosa significa e come il corridore si è comportato. Concludi con un commento finale incoraggiante e un consiglio chiave per il futuro. La risposta deve essere in italiano e ben formattata in markdown, usando **Titoli in Grassetto** e *corsivo* per enfasi.

Dati reali della corsa:
- Distanza: ${trackStats.totalDistance.toFixed(2)} km
- Tempo in Movimento: ${formatDuration(trackStats.movingDuration)}
- Ritmo Medio: ${formatPace(trackStats.movingAvgPace)} /km
- Dislivello Positivo: ${Math.round(trackStats.elevationGain)} m
${hrInfo}
${fastestSplitInfo}
${profileInfo}

Inizia la tua analisi.
`;
        };

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = generatePrompt();
            
            const apiCall = () => ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
            });

            const response = await retryWithBackoff(apiCall) as GenerateContentResponse;
            setAnalysis(response.text);
        } catch (e) {
            setError('Impossibile ottenere l\'analisi dopo diversi tentativi. Riprova più tardi.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [trackStats, userProfile]);

    useEffect(() => {
        handleAnalyze();
    }, [handleAnalyze]);

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000] p-4 backdrop-blur-sm">
            <div className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
                <div className="p-5 border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-cyan-400">Riepilogo Corsa</h2>
                </div>
                <div className="p-6 overflow-y-auto">
                     {isLoading && (
                        <div className="flex flex-col items-center justify-center text-center text-slate-400 py-10">
                            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="font-semibold text-lg">Analisi in corso...</p>
                            <p className="text-sm">Il tuo coach AI sta esaminando la tua performance.</p>
                        </div>
                    )}
                    {error && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-md">{error}</p>}
                    {analysis && (
                        <div className="text-sm text-slate-300 space-y-2 prose prose-invert max-w-none">
                             {analysis.split('\n').map((line, index) => (
                                <FormattedAnalysis key={index} text={line} />
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-5 border-t border-slate-700 mt-auto">
                    <button
                        onClick={onClose}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
                    >
                        Torna alla Mappa
                    </button>
                </div>
            </div>
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
                 .prose strong { color: #67e8f9; }
                 .prose em { font-style: italic; color: #cbd5e1; }
                 .prose p { margin-bottom: 0.75rem; }
            `}</style>
        </div>
    );
};

export default AnimationSummary;