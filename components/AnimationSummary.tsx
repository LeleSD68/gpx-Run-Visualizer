
import React, { useState, useCallback, useRef } from 'react';
import { TrackStats, UserProfile, AiPersonality, Split } from '../types';
import FormattedAnalysis from './FormattedAnalysis';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

interface AnimationSummaryProps {
    trackStats: TrackStats;
    userProfile: UserProfile;
    onClose: () => void;
}

const personalityPrompts: Record<AiPersonality, string> = {
    'pro_balanced': "Sei un coach professionista equilibrato. Analizza la corsa fornendo un riassunto tecnico e realistico.",
    'strict': "Sei un allenatore severo ma giusto. Analizza la corsa con uno stile critico e professionale.",
    'motivator': "Sei un coach motivatore. Analizza la corsa trovando il valore dello sforzo e della costanza.",
    'enthusiast': "Sei entusiasta! Commenta la corsa come se fosse un'impresa leggendaria.",
    'analytic': "Sei un analista biomeccanico. Fornisci un riassunto basato su statistiche ed efficienza."
};

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const AnimationSummary: React.FC<AnimationSummaryProps> = ({ trackStats, userProfile, onClose }) => {
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAiPanel, setShowAiPanel] = useState(false);

    const handleAnalyze = async () => {
        setIsLoading(true);
        setError('');
        setShowAiPanel(true);

        const fastestSplit = trackStats.splits.find(s => s.isFastest);
        const personality = userProfile.aiPersonality || 'pro_balanced';

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `${personalityPrompts[personality]} Analizza questa corsa:
            - Distanza: ${trackStats.totalDistance.toFixed(2)} km
            - Ritmo Medio: ${formatPace(trackStats.movingAvgPace)} /km
            - Dislivello: +${Math.round(trackStats.elevationGain)} m
            Note Atleta: ${userProfile.personalNotes || 'Nessuna'}
            Rispondi in italiano con markdown.`;
            
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            
            setAnalysis(response.text || '');
            window.gpxApp?.addTokens(response.usageMetadata?.totalTokenCount ?? 0);
        } catch (e) {
            setError("Il coach AI è momentaneamente occupato.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 z-[2000] flex justify-between pointer-events-none p-4">
            {/* Pannello Sinistro: Tabella Chilometri */}
            <div className="w-80 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden animate-fade-in-left">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <h2 className="text-lg font-bold text-cyan-400 uppercase tracking-tight">Riepilogo Parziali</h2>
                    <p className="text-[10px] text-slate-400">Statistiche per ogni chilometro</p>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-800 sticky top-0 text-[10px] text-slate-500 uppercase font-bold">
                            <tr>
                                <th className="px-3 py-2">Km</th>
                                <th className="px-3 py-2">Ritmo</th>
                                <th className="px-3 py-2 text-right">Tempo</th>
                                <th className="px-3 py-2 text-right">Disl.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {trackStats.splits.map((split) => (
                                <tr key={split.splitNumber} className={`hover:bg-slate-700/30 transition-colors ${split.isFastest ? 'bg-green-500/10' : ''}`}>
                                    <td className="px-3 py-3 font-bold text-slate-400">{split.splitNumber}</td>
                                    <td className="px-3 py-3 font-mono text-slate-200">{formatPace(split.pace)}</td>
                                    <td className="px-3 py-3 font-mono text-slate-300 text-right">{formatDuration(split.duration)}</td>
                                    <td className="px-3 py-3 text-slate-400 text-right">+{Math.round(split.elevationGain)}m</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex flex-col gap-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Totale:</span>
                        <span className="font-bold">{trackStats.totalDistance.toFixed(2)} km</span>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 rounded transition-colors"
                    >
                        Torna al Menu
                    </button>
                </div>
            </div>

            {/* Pulsante Centrale per Chiudere/Uscire (opzionale, ma utile se i pannelli coprono troppo) */}
            
            {/* Pannello Destro: Analisi AI a richiesta */}
            <div className="w-96 flex flex-col pointer-events-auto gap-4 items-end">
                {!showAiPanel ? (
                    <button 
                        onClick={handleAnalyze}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-full shadow-2xl flex items-center gap-2 animate-bounce-subtle pointer-events-auto"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" /></svg>
                        Analizza con AI Coach
                    </button>
                ) : (
                    <div className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-right h-[80vh]">
                        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                                <span className="text-xl">🧠</span> AI Coach Report
                            </h2>
                            <button onClick={() => setShowAiPanel(false)} className="text-slate-500 hover:text-white">&times;</button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-sm italic">Il Coach sta elaborando i dati...</p>
                                </div>
                            ) : error ? (
                                <p className="text-red-400 text-center text-sm">{error}</p>
                            ) : (
                                <div className="prose prose-invert prose-sm">
                                    <FormattedAnalysis text={analysis} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fade-in-left { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes fade-in-right { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes bounce-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
                .animate-fade-in-left { animation: fade-in-left 0.5s ease-out forwards; }
                .animate-fade-in-right { animation: fade-in-right 0.5s ease-out forwards; }
                .animate-bounce-subtle { animation: bounce-subtle 2s infinite ease-in-out; }
            `}</style>
        </div>
    );
};

export default AnimationSummary;
