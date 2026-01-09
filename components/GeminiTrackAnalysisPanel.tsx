
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { TrackStats, UserProfile, Track, ChatMessage, AiPersonality } from '../types';
import { getHeartRateZoneInfo } from './HeartRateZonePanel';
import FormattedAnalysis from './FormattedAnalysis';
import { calculateTrackStats } from '../services/trackStatsService';
import { loadChatFromDB, saveChatToDB } from '../services/dbService';
import Chatbot from './Chatbot';

const personalityPrompts: Record<AiPersonality, string> = {
    'pro_balanced': "Sei un coach professionista equilibrato. Analizza questa corsa fornendo feedback tecnici oggettivi. Riconosci i progressi in modo misurato e indica le lacune in modo costruttivo e professionale.",
    'strict': "Sei un allenatore severo ma giusto. Analizza questa corsa rispetto allo storico dell'atleta. Sii critico se i ritmi calano o se la tecnica sembra mancare. Usa un tono professionale e autorevole.",
    'motivator': "Sei un motivatore appassionato. Analizza questa corsa trovando i lati positivi anche nelle difficoltà. Sii di supporto e incoraggia l'atleta a continuare a crederci.",
    'enthusiast': "Sei entusiasta e ami la corsa! Commenta i dati con grandissima energia, euforia e tanti punti esclamativi. Ogni progresso è una vittoria leggendaria.",
    'analytic': "Sei uno scienziato dello sport. Analizza i dati in modo neutro, matematico e scientifico. Evita linguaggi emotivi, fornisci solo conclusioni basate sulla statistica pura."
};

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

const ExpandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M13.28 2.22a.75.75 0 0 0-1.06 1.06L14.44 5.5H8a5.5 5.5 0 0 0-5.5 5.5v2.72a.75.75 0 0 0 1.5 0V11a4 4 0 0 1 4-4h6.44l-2.22 2.22a.75.75 0 1 0 1.06 1.06l3.5-3.5a.75.75 0 0 0 0-1.06l-3.5-3.5Z" />
    </svg>
);

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.949a.75.75 0 0 0 .95.95l4.95-1.414a.75.75 0 0 0-.95-.95l-3.539 1.01-1.01-3.54a.75.75 0 0 0-.95-.826ZM12.23 7.77a.75.75 0 0 0-1.06 0l-4.25 4.25a.75.75 0 0 0 0 1.06l4.25 4.25a.75.75 0 0 0 1.06-1.06l-3.72-3.72 3.72-3.72a.75.75 0 0 0 0-1.06ZM15.5 10a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 0 1.5H16.25a.75.75 0 0 1-.75-.75Z" />
    </svg>
);

interface GeminiTrackAnalysisPanelProps {
    stats: TrackStats;
    userProfile: UserProfile;
    track: Track;
    allHistory?: Track[];
}

const GeminiTrackAnalysisPanel: React.FC<GeminiTrackAnalysisPanelProps> = ({ stats, userProfile, track, allHistory = [] }) => {
    // Fix: Ensure messages state is always recognized as ChatMessage[]
    const [messages, setMessages] = useState<ChatMessage[]>([] as ChatMessage[]);
    const [isLoading, setIsLoading] = useState(false);
    const [input, setInput] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const chatSessionRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const SHARED_CHAT_ID = 'global-coach'; // ID Unificato

    const generateSystemInstruction = useCallback(() => {
        const personality = userProfile.aiPersonality || 'pro_balanced';
        const goalsStr = userProfile.goals?.length ? userProfile.goals.join(', ') : 'Salute Generale';
        const today = new Date().toLocaleDateString('it-IT');
        
        const historyContext = allHistory
            .filter(t => t.id !== track.id)
            .sort((a, b) => b.points[0].time.getTime() - a.points[0].time.getTime())
            .slice(0, 10)
            .map(t => {
                const s = calculateTrackStats(t);
                return `- ${t.points[0].time.toLocaleDateString()}: ${t.distance.toFixed(2)}km a ${formatPace(s.movingAvgPace)}/km. Note: ${t.notes || 'Nessuna'}`;
            })
            .join('\n');

        const profileInfo = `Profilo Atleta: Età ${userProfile.age ?? 'N/D'}, FC Max ${userProfile.maxHr ?? 'N/D'} bpm, Obiettivi: ${goalsStr}. 
        Note Personali Generali: ${userProfile.personalNotes || 'Nessuna.'}`;
        
        const hrZoneInfo = getHeartRateZoneInfo(track, userProfile);
        const hrDistribution = hrZoneInfo.zones.map(z => `- ${z.name}: ${z.percent.toFixed(1)}% del tempo`).join('\n');
        const hrContext = stats.avgHr ? `Dati Cardio della corsa attuale: Media ${Math.round(stats.avgHr)} bpm, Distribuzione Zone:\n${hrDistribution}` : '';
        const fastestSplit = stats.splits.find(s => s.isFastest);
        const fastestSplitInfo = fastestSplit ? `- Chilometro più veloce di questa uscita: Km ${fastestSplit.splitNumber} al ritmo di ${formatPace(fastestSplit.pace)}/km` : '';
        const trackNotesInfo = track.notes ? `\nNOTE SPECIFICHE DELL'ATLETA SU QUESTA SESSIONE: "${track.notes}"` : '';

        return `${personalityPrompts[personality]} Rispondi sempre in italiano usando markdown.
        DATA ODIERNA: ${today}.
        HAI MEMORIA DI TUTTE LE NOSTRE CONVERSAZIONI PRECEDENTI.
        ${profileInfo}
        Storico recente dell'atleta:
        ${historyContext}
        
        SESSIONE ATTUALE DA ANALIZZARE (${new Date(track.points[0].time).toLocaleDateString()}):
        Distanza: ${stats.totalDistance.toFixed(2)} km
        Tempo: ${formatDuration(stats.movingDuration)}
        Ritmo Medio: ${formatPace(stats.movingAvgPace)}/km
        Dislivello: +${Math.round(stats.elevationGain)}m
        ${hrContext}
        ${fastestSplitInfo}
        ${trackNotesInfo}

        Analizza la sessione in profondità. Se ci sono note su dolori o infortuni, sii prudente. Considera se la sessione è stata un allenamento di qualità o un rigenerante confrontandola con lo storico.`;
    }, [stats, userProfile, track, allHistory]);

    useEffect(() => {
        const initOrRestoreChat = async () => {
            const savedMessages = await loadChatFromDB(SHARED_CHAT_ID);
            if (savedMessages) {
                setMessages(savedMessages);
            }

            try {
                // Fix: Initialize GoogleGenAI with named parameter for apiKey
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                chatSessionRef.current = ai.chats.create({
                    model: 'gemini-3-flash-preview',
                    config: { systemInstruction: generateSystemInstruction() },
                    history: savedMessages?.map(m => ({
                        role: m.role,
                        parts: [{ text: m.text }]
                    })) || []
                });
            } catch (e) {
                console.error("Errore inizializzazione chat AI:", e);
            }
        };

        initOrRestoreChat();
    }, [track.id, generateSystemInstruction]); // Ricarica se cambia il tracciato per aggiornare le istruzioni di sistema

    useEffect(() => {
        if (messages.length > 0) {
            saveChatToDB(SHARED_CHAT_ID, messages).catch(console.error);
        }
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, SHARED_CHAT_ID]);

    const handleStartAnalysis = async () => {
        if (isLoading || !chatSessionRef.current) return;
        setIsLoading(true);
        try {
            const result = await chatSessionRef.current.sendMessageStream({ message: `Analizziamo questa sessione del ${new Date(track.points[0].time).toLocaleDateString()}. Com'è andata rispetto al solito?` });
            setMessages(prev => [...prev, { role: 'model', text: '' }]);
            let fullText = '';
            // Fix: Cast result chunk to GenerateContentResponse and use .text property getter
            for await (const chunk of result) {
                const c = chunk as GenerateContentResponse;
                fullText += c.text || '';
                if (c.usageMetadata?.totalTokenCount) window.gpxApp?.addTokens(c.usageMetadata.totalTokenCount);
                setMessages((prev: ChatMessage[]) => {
                    const next = [...prev];
                    if (next.length > 0) {
                        next[next.length - 1].text = fullText;
                    }
                    return next;
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        
        if (!chatSessionRef.current) {
            // Fix: Initialize GoogleGenAI with named parameter for apiKey
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            chatSessionRef.current = ai.chats.create({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: generateSystemInstruction() }
            });
        }

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const result = await chatSessionRef.current.sendMessageStream({ message: userMsg });
            setMessages(prev => [...prev, { role: 'model', text: '' }]);
            let fullText = '';
            // Fix: Cast result chunk to GenerateContentResponse and use .text property getter
            for await (const chunk of result) {
                const c = chunk as GenerateContentResponse;
                fullText += c.text || '';
                setMessages((prev: ChatMessage[]) => {
                    const next = [...prev];
                    if (next.length > 0) {
                        next[next.length - 1].text = fullText;
                    }
                    return next;
                });
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', text: 'Spiacente, si è verificato un errore di connessione con il Coach AI.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-6">
            <div className="flex justify-between items-center mb-2 border-t border-slate-700 pt-4">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center">
                    <SparklesIcon /> Coach AI Unificato ({userProfile.aiPersonality || 'pro_balanced'})
                </h3>
                <button 
                    onClick={() => setIsExpanded(true)}
                    className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded transition-all"
                    title="Espandi conversazione"
                >
                    <ExpandIcon />
                </button>
            </div>

            <div className="bg-slate-700/50 p-2 rounded-lg h-[450px] flex flex-col border border-slate-600/30 shadow-inner">
                <div className="flex-grow p-2 overflow-y-auto space-y-4 custom-scrollbar">
                    {messages.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4">
                            <SparklesIcon />
                            <p className="text-sm text-slate-400 mt-2 mb-4">Non hai ancora iniziato a parlare con il Coach.</p>
                            <button onClick={handleStartAnalysis} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg transition-all active:scale-95">
                                Analizza Corsa Corrente
                            </button>
                        </div>
                    )}
                    
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-cyan-700 text-white shadow-sm' : 'bg-slate-800 border border-slate-700 text-slate-200'}`}>
                                <FormattedAnalysis text={msg.text} />
                            </div>
                        </div>
                    ))}
                    {isLoading && messages[messages.length-1]?.role === 'user' && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl animate-pulse">
                                <div className="flex space-x-1">
                                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                <form onSubmit={handleSend} className="p-2 border-t border-slate-600/50 flex gap-2">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        placeholder="Chiedi al coach (conosce il tuo storico)..." 
                        className="flex-grow bg-slate-800 border border-slate-700 p-2.5 rounded-lg text-sm focus:border-cyan-500 outline-none placeholder-slate-500" 
                        disabled={isLoading} 
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading || !input.trim()}
                        className="bg-cyan-600 p-2.5 rounded-lg text-white hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 active:scale-95 transition-all shadow-md"
                    >
                        <SendIcon />
                    </button>
                </form>
            </div>

            {isExpanded && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[5000] flex items-center justify-center p-4">
                    <div className="animate-fade-in w-full max-w-4xl h-[80vh]">
                        <Chatbot 
                            tracksToAnalyze={allHistory} 
                            userProfile={userProfile} 
                            onClose={() => setIsExpanded(false)} 
                            isStandalone 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeminiTrackAnalysisPanel;
