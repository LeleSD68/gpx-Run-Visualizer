


import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { TrackStats } from '../types';

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
    const parts = text.split(/(\*\*.*?\*\*)/g).filter(part => part);

    return (
        <p className="mb-2">
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-bold text-cyan-400 block mt-2 mb-1">{part.slice(2, -2)}</strong>;
                }
                return <span key={i}>{part}</span>;
            })}
        </p>
    );
};

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

const GeminiTrackAnalysisPanel: React.FC<{ stats: TrackStats }> = ({ stats }) => {
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAnalyze = useCallback(async () => {
        setIsLoading(true);
        setError('');
        setAnalysis('');

        const generatePrompt = () => {
            const hrInfo = stats.avgHr
                ? `- Frequenza Cardiaca Media: ${Math.round(stats.avgHr)} bpm (Max: ${stats.maxHr ?? 'N/A'} bpm)`
                : '';

            const fastestSplit = stats.splits.find(s => s.isFastest);
            const fastestSplitInfo = fastestSplit
                ? `- Chilometro più veloce: Ritmo ${formatPace(fastestSplit.pace)}/km (Km ${fastestSplit.splitNumber})`
                : '';

            return `Sei un esperto running coach. Analizza in modo approfondito i seguenti dati di una singola sessione di corsa, con un tono incoraggiante ma tecnico. Fornisci un'analisi dettagliata, evidenziando i punti di forza e le aree di miglioramento. Concludi con 2-3 consigli pratici e specifici basati sui dati per aiutare l'atleta a migliorare. Formatta la tua risposta usando l'italiano e uno stile markdown per i titoli (es. **Punti di Forza**).

Dati della corsa:
- Distanza Totale: ${stats.totalDistance.toFixed(2)} km
- Tempo in Movimento: ${formatDuration(stats.movingDuration)}
- Ritmo Medio in Movimento: ${formatPace(stats.movingAvgPace)} /km
- Dislivello Positivo: ${Math.round(stats.elevationGain)} m
${hrInfo}
${fastestSplitInfo}

La tua analisi dettagliata:`;
        };

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = generatePrompt();
            
            const apiCall = () => ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
            });

            const response: GenerateContentResponse = await retryWithBackoff(apiCall);
            setAnalysis(response.text);
        } catch (e) {
            setError('Impossibile ottenere l\'analisi dopo diversi tentativi. Riprova più tardi.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [stats]);

    useEffect(() => {
        handleAnalyze();
    }, [handleAnalyze]);


    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-2 border-t border-slate-700 pt-4 flex items-center">
                <SparklesIcon />
                Analisi AI della Corsa
            </h3>

            {isLoading && (
                <div className="flex flex-col items-center justify-center text-center text-slate-400 py-4">
                    <div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="font-semibold">Il tuo coach AI sta analizzando i dati...</p>
                    <p className="text-xs">Potrebbe richiedere qualche secondo.</p>
                </div>
            )}

            {error && <p className="text-red-400 text-center">{error}</p>}

            {analysis && (
                <div className="text-sm text-slate-300 space-y-2 prose prose-invert bg-slate-700/50 p-4 rounded-lg">
                    {analysis.split('\n').map((line, index) => (
                        <FormattedAnalysis key={index} text={line} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default GeminiTrackAnalysisPanel;