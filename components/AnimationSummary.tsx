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
  if (isNaN(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

        const personality = userProfile.aiPersonality || 'pro_balanced';

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `${personalityPrompts[personality]} Analizza questa corsa fornendo un debriefing approfondito basato sui parziali. 
            DATI:
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
            if (response.usageMetadata?.totalTokenCount) window.gpxApp?.addTokens(response.usageMetadata.totalTokenCount);
        } catch (e) {
            setError("Il coach AI è momentaneamente occupato.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 z-[2000] flex justify-between pointer-events-none p-4 sm:p-8">
            {/* Pannello Sinistro: Tabella Chilometri */}
            <div className="w-80 sm:w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden animate-fade-in-left">
                <div className="p-5 border-b border-slate-700 bg-slate-800/50">
                    <h2 className="text-xl font-black text-cyan-400 uppercase tracking-tighter">Report Parziali</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Intertempi della sessione</p>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-800 sticky top-0 text-[10px] text-slate-500 uppercase font-black tracking-widest border-b border-slate-700">
                            <tr>
                                <th className="px-4 py-4">Km</th>
                                <th className="px-4 py-4">Ritmo</th>
                                <th className="px-4 py-4 text-right">Tempo</th>
                                <th className="px-4 py-4 text-right">Disl.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {trackStats.splits.map((split) => (
                                <tr key={split.splitNumber} className={`group hover:bg-slate-700/40 transition-colors ${split.isFastest ? 'bg-green-500/10' : split.isSlowest ? 'bg-red-500/5' : ''}`}>
                                    <td className="px-4 py-4 font-black text-slate-300">{split.splitNumber}</td>
                                    <td className={`px-4 py-4 font-mono font-bold ${split.isFastest ? 'text-green-400' : 'text-slate-100'}`}>{formatPace(split.pace)}</td>
                                    <td className="px-4 py-4 font-mono text-slate-300 text-right">{formatDuration(split.duration)}</td>
                                    <td className="px-4 py-4 text-slate-400 text-right font-mono">+{Math.round(split.elevationGain)}m</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-5 border-t border-slate-700 bg-slate-900/80 flex flex-col gap-4">
                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                        <span className="text-slate-500">Distanza Totale</span>
                        <span className="text-cyan-400 font-mono text-base">{trackStats.totalDistance.toFixed(2)} km</span>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-widest py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-cyan-900/30"
                    >
                        Chiudi Replay
                    </button>
                </div>
            </div>

            {/* Pannello Destro: Coach AI */}
            <div className="w-96 flex flex-col pointer-events-auto gap-4 items-end">
                {!showAiPanel ? (
                    <button 
                        onClick={handleAnalyze}
                        className="bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest text-[10px] py-4 px-10 rounded-full shadow-2xl flex items-center gap-3 animate-bounce-subtle pointer-events-auto border border-purple-400/30 active:scale-95 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" /></svg>
                        Debriefing Coach AI
                    </button>
                ) : (
                    <div className="w-full bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-right h-[70vh]">
                        <div className="p-5 border-b border-slate-700 bg-slate-800/80 flex justify-between items-center">
                            <h2 className="text-sm font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="text-xl">🧠</span> AI REPORT
                            </h2>
                            <button onClick={() => setShowAiPanel(false)} className="text-slate-500 hover:text-white transition-colors text-2xl leading-none">&times;</button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                                    <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Analisi in corso...</p>
                                </div>
                            ) : error ? (
                                <p className="text-red-400 text-center text-sm font-bold bg-red-500/10 p-4 rounded-lg">{error}</p>
                            ) : (
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <FormattedAnalysis text={analysis} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fade-in-left { from { opacity: 0; transform: translateX(-50px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes fade-in-right { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes bounce-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
                .animate-fade-in-left { animation: fade-in-left 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
                .animate-fade-in-right { animation: fade-in-right 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
                .animate-bounce-subtle { animation: bounce-subtle 2.5s infinite ease-in-out; }
            `}</style>
        </div>
    );
};

export default AnimationSummary;