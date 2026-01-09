import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Track, TrackStats, UserProfile, PlannedWorkout, ActivityType } from '../types';
import { calculateTrackStats } from '../services/trackStatsService';
import FormattedAnalysis from './FormattedAnalysis';

interface AiTrainingCoachPanelProps {
    track?: Track;
    stats?: TrackStats;
    userProfile: UserProfile;
    allHistory: Track[];
    onAddPlannedWorkout?: (workout: PlannedWorkout) => void;
    isCompact?: boolean;
}

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 text-cyan-400">
        <path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" />
    </svg>
);

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75ZM10 9.75a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);

const AiTrainingCoachPanel: React.FC<AiTrainingCoachPanelProps> = ({ track, stats, userProfile, allHistory, onAddPlannedWorkout, isCompact }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [error, setError] = useState('');

    const handleGenerateProgram = async () => {
        setIsGenerating(true);
        setError('');
        setSuggestions([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const today = new Date().toISOString().split('T')[0];
            const goalsStr = userProfile.goals?.length ? userProfile.goals.join(', ') : 'Salute Generale';
            
            const historySummary = allHistory
                .sort((a, b) => b.points[0].time.getTime() - a.points[0].time.getTime())
                .slice(0, 7)
                .map(t => {
                    const s = calculateTrackStats(t);
                    return `- ${t.points[0].time.toLocaleDateString()}: ${t.distance.toFixed(1)}km a ${formatPace(s.movingAvgPace)}/km.`;
                }).join('\n');

            let contextPrompt = "";
            if (track && stats) {
                contextPrompt = `Analizza la corsa appena conclusa (${track.distance.toFixed(2)}km in ${formatPace(stats.movingAvgPace)}/km) e lo storico recente dell'atleta per proporre i PROSSIMI DUE allenamenti specifici.`;
            } else {
                contextPrompt = `Analizza lo storico recente dell'atleta per proporre i PROSSIMI DUE allenamenti specifici basati sul suo stato di forma attuale e i suoi obiettivi.`;
            }

            const prompt = `Sei un Coach Professionista di Corsa. 
            ${contextPrompt}
            
            Profilo Atleta: 
            - Età: ${userProfile.age ?? 'N/D'}
            - Obiettivi: ${goalsStr}
            - FC Max: ${userProfile.maxHr ?? 'N/D'} bpm
            - Note: ${userProfile.personalNotes || 'Nessuna'}
            
            Storico Recente:
            ${historySummary}
            
            Data di oggi: ${today}.
            
            Proponi due sessioni distinte (es. una di recupero/lento e una di qualità) con date realistiche.
            Specifica per ogni sessione:
            - Titolo accattivante
            - Tipo di attività (Lento, Fartlek, Gara, Ripetute, Lungo, Altro)
            - Data prevista (ISO format YYYY-MM-DD)
            - Descrizione dettagliata con: Obiettivo, Ritmi target (es. @4:50), Zone FC suggerite, e una Breve Tecnica suggerita (es. cadenza, postura).
            
            Rispondi esclusivamente con un array JSON di due oggetti.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                activityType: { type: Type.STRING, enum: ['Lento', 'Fartlek', 'Gara', 'Ripetute', 'Lungo', 'Altro'] },
                                date: { type: Type.STRING },
                                description: { type: Type.STRING }
                            },
                            required: ['title', 'activityType', 'date', 'description']
                        }
                    }
                }
            });

            const data = JSON.parse(response.text || '[]');
            setSuggestions(data);
            window.gpxApp?.addTokens(response.usageMetadata?.totalTokenCount ?? 0);
        } catch (e) {
            console.error(e);
            setError("Impossibile contattare il Coach AI. Riprova più tardi.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleImport = (suggestion: any) => {
        if (!onAddPlannedWorkout) return;
        const workout: PlannedWorkout = {
            id: `planned-coach-${Date.now()}-${Math.random()}`,
            title: suggestion.title,
            description: suggestion.description,
            date: new Date(suggestion.date),
            activityType: suggestion.activityType as ActivityType,
            isAiSuggested: true
        };
        onAddPlannedWorkout(workout);
    };

    if (isCompact && suggestions.length === 0 && !isGenerating) {
        return (
            <button 
                onClick={handleGenerateProgram}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center transition-all active:scale-95 border border-cyan-400/30"
            >
                <SparklesIcon />
                Pianifica Prossime Sessioni con AI
            </button>
        );
    }

    return (
        <div className={`mt-6 ${track ? 'border-t border-slate-700 pt-6' : ''}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-cyan-400 flex items-center">
                    <SparklesIcon /> Coach AI Training
                </h3>
                <button 
                    onClick={handleGenerateProgram}
                    disabled={isGenerating}
                    className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg shadow-lg flex items-center justify-center transition-all active:scale-95"
                >
                    {isGenerating ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : <SparklesIcon />}
                    {suggestions.length > 0 ? 'Rigenera Piano' : 'Genera Suggerimenti'}
                </button>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg text-red-400 text-sm mb-4">
                    {error}
                </div>
            )}

            <div className={`grid grid-cols-1 ${isCompact ? '' : 'sm:grid-cols-2'} gap-4`}>
                {suggestions.map((s, i) => (
                    <div key={i} className="bg-slate-700/40 border border-slate-600 rounded-xl overflow-hidden animate-fade-in-down flex flex-col">
                        <div className="p-4 border-b border-slate-600 bg-slate-800/30 flex justify-between items-start">
                            <div className="min-w-0">
                                <span className="bg-cyan-900/50 text-cyan-400 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-cyan-500/30 mb-2 inline-block">
                                    Opzione {i + 1}
                                </span>
                                <h4 className="text-base font-bold text-white leading-tight truncate">{s.title}</h4>
                                <p className="text-[10px] text-slate-400 font-mono uppercase mt-1">
                                    {new Date(s.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </p>
                            </div>
                            <div className="flex-shrink-0 ml-2">
                                <span className="bg-purple-600/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                                    {s.activityType}
                                </span>
                            </div>
                        </div>
                        <div className="p-4 flex-grow flex flex-col">
                            <div className="prose prose-invert prose-sm mb-4 max-w-none flex-grow">
                                <FormattedAnalysis text={s.description} />
                            </div>
                            <button 
                                onClick={() => handleImport(s)}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold py-2 rounded-lg border border-cyan-500/30 flex items-center justify-center transition-colors text-xs"
                            >
                                <CalendarIcon /> Aggiungi a Calendario
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {suggestions.length === 0 && !isGenerating && !isCompact && (
                <div className="bg-slate-900/30 border border-dashed border-slate-700 rounded-xl p-8 text-center">
                    <p className="text-slate-400 text-sm italic">
                        {track 
                            ? "Fai analizzare questa uscita per ricevere suggerimenti mirati."
                            : "Analizza il tuo storico complessivo per pianificare i prossimi allenamenti."
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

export default AiTrainingCoachPanel;