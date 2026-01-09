import React, { useState, useEffect } from 'react';
import { Track, UserProfile, AiPersonality } from '../types';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { calculateTrackStats } from '../services/trackStatsService';
import FormattedAnalysis from './FormattedAnalysis';

interface AiReviewModalProps {
    track: Track;
    userProfile: UserProfile;
    onClose: () => void;
}

const personalityPrompts: Record<AiPersonality, string> = {
    'pro_balanced': "Sei un coach professionista equilibrato. Spiega perché hai dato questo voto.",
    'strict': "Sei un allenatore severo. Giustifica questo voto con un'analisi critica basata sui dati.",
    'motivator': "Sei un coach motivatore. Spiega il voto evidenziando i progressi, anche piccoli.",
    'enthusiast': "Sei entusiasta! Spiega questo voto celebrando l'impresa dell'atleta.",
    'analytic': "Sei uno scienziato dello sport. Giustifica il voto con puri dati statistici e biomeccanici."
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const AiReviewModal: React.FC<AiReviewModalProps> = ({ track, userProfile, onClose }) => {
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const generateReview = async () => {
            try {
                const stats = calculateTrackStats(track);
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const personality = userProfile.aiPersonality || 'pro_balanced';
                
                const prompt = `${personalityPrompts[personality]} 
                Questa corsa ha ricevuto una valutazione di ${track.rating} stelle su 5.
                Motivazione breve originale: "${track.ratingReason}".
                
                DATI TECNICI SPECIFICI:
                - Distanza: ${track.distance.toFixed(2)} km
                - Ritmo Medio: ${formatPace(stats.movingAvgPace)} /km
                - Dislivello: +${Math.round(stats.elevationGain)} m
                - FC Media: ${stats.avgHr ? Math.round(stats.avgHr) + ' bpm' : 'N/D'}
                
                Analizza PERCHÉ questo allenamento merita ${track.rating} stelle. Sii specifico su questa sessione, non generalizzare. Confronta il ritmo col dislivello se rilevante. Rispondi in italiano con markdown.`;

                const result = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: prompt
                });

                setAnalysis(result.text || '');
                if (result.usageMetadata?.totalTokenCount) window.gpxApp?.addTokens(result.usageMetadata.totalTokenCount);
            } catch (e) {
                setAnalysis("Spiacente, non è stato possibile generare il resoconto dettagliato in questo momento.");
            } finally {
                setIsLoading(false);
            }
        };

        generateReview();
    }, [track, userProfile]);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9500] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map(s => (
                                <span key={s} className={`text-xl ${s <= (track.rating || 0) ? 'text-amber-400' : 'text-slate-700'}`}>★</span>
                            ))}
                        </div>
                        <h2 className="text-sm font-black text-white uppercase tracking-tighter">Report Valutazione</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white text-2xl">&times;</button>
                </header>
                <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generazione Resoconto...</p>
                        </div>
                    ) : (
                        <div className="prose prose-invert prose-sm max-w-none">
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-6 italic text-slate-300 text-xs">
                                "{track.ratingReason}"
                            </div>
                            <FormattedAnalysis text={analysis} />
                        </div>
                    )}
                </div>
                <footer className="p-4 bg-slate-800/30 border-t border-slate-800">
                    <button onClick={onClose} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg active:scale-95">
                        Ho capito, Coach
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AiReviewModal;