
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

const AnimationSummary: React.FC<{ trackStats: TrackStats, userProfile: UserProfile, onClose: () => void }> = ({ trackStats, userProfile, onClose }) => {
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAnalyze = useCallback(async () => {
        setIsLoading(true);
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
            // FIX: Initialize GenAI with named parameter for apiKey
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = generatePrompt();
            
            // FIX: Use gemini-3-pro-preview for complex reasoning tasks
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
            });
            window.gpxApp?.addTokens(response.usageMetadata?.totalTokenCount ?? 0);
            
            // FIX: Access .text property directly
            setAnalysis(response.text || '');
        } catch (e) {
            console.error(e);
            setAnalysis("Impossibile generare l'analisi creativa al momento.");
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
