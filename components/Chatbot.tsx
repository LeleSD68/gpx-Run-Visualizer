import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Track, ChatMessage, UserProfile, AiPersonality, PlannedWorkout, ActivityType } from '../types';
import { GoogleGenAI, Chat, Type, GenerateContentResponse } from '@google/genai';
import { calculateTrackStats } from '../services/trackStatsService';
import { loadChatFromDB, saveChatToDB } from '../services/dbService';
import FormattedAnalysis from './FormattedAnalysis';
import AiTrainingCoachPanel from './AiTrainingCoachPanel';

interface ChatbotProps {
  tracksToAnalyze: Track[];
  userProfile: UserProfile;
  onClose?: () => void;
  isStandalone?: boolean;
  onAddPlannedWorkout?: (workout: PlannedWorkout) => void;
  isSidebar?: boolean;
}

const SUGGESTIONS = [
    "Cosa dovrei correre domani?",
    "Preparami un programma per la settimana",
    "Analizza il mio carico di lavoro"
];

const personalityPrompts: Record<AiPersonality, string> = {
    'pro_balanced': "Sei un coach professionista equilibrato. Fornisci feedback oggettivi, tecnici e realistici. Non essere eccessivamente motivatore né troppo severo. Di' le cose come stanno in modo costruttivo.",
    'strict': "Sei un allenatore severo ma giusto. Non accetti scuse, punta alla perfezione tecnica e sii molto critico se i dati non sono ottimali. Usa un tono autorevole.",
    'motivator': "Sei un motivatore instancabile. Focalizzati sul superamento dei limiti e sulla crescita personale, infondi coraggio anche se i dati sono negativi.",
    'enthusiast': "Sei entusiasta e pieno di energia! Celebra ogni chilometro come una vittoria epica. Usa un tono molto vivace, colorito e gioioso, con molti punti esclamativi.",
    'analytic': "Sei un analista puramente tecnico e freddo. Basati solo numeri, evita fronzoli emotivi e fornisci insight puramente statistici e scientifici."
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-cyan-400">
        <path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" />
    </svg>
);

const Chatbot: React.FC<ChatbotProps> = ({ tracksToAnalyze, userProfile, onClose, isStandalone = false, onAddPlannedWorkout, isSidebar = false }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([] as ChatMessage[]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [dims] = useState({ w: 450, h: 600 });
    const chatRef = useRef<Chat | null>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const CHAT_ID = 'global-coach';
    
    const getSystemInstruction = useCallback(() => {
        const personality = userProfile.aiPersonality || 'pro_balanced';
        const goalsStr = userProfile.goals?.length ? userProfile.goals.join(', ') : 'Salute Generale';
        const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        let userContext = `Profilo Atleta: Età ${userProfile.age ?? 'N/D'}, FC Max ${userProfile.maxHr ?? 'N/D'} bpm, Obiettivi: ${goalsStr}. `;
        if (userProfile.personalNotes) userContext += `\nNote Personali/Salute (Importanti): ${userProfile.personalNotes}`;
        const sortedTracks = [...tracksToAnalyze].sort((a, b) => b.points[0].time.getTime() - a.points[0].time.getTime());
        const last10 = sortedTracks.slice(0, 10);
        let historyData = "Storico ultime sessioni:\n";
        if (last10.length === 0) historyData += "- Nessuna corsa caricata ancora.";
        else {
            last10.forEach(t => {
                const s = calculateTrackStats(t);
                historyData += `- ${t.points[0].time.toLocaleDateString()}: ${t.distance.toFixed(2)}km, Passo ${formatPace(s.movingAvgPace)}/km. `;
                if (t.notes) historyData += `Note Atleta: "${t.notes}"`;
                historyData += `\n`;
            });
        }
        return `${personalityPrompts[personality]} Aiuta l'atleta a capire il suo stato di forma, monitorare i progressi e rispondere a domande tecniche. TIENI SEMPRE PRESENTE LA DATA ODIERNA: ${today}. HAI ACCESSO A TUTTA LA STORIA DELLE NOSTRE CONVERSAZIONI. Rispondi sempre in italiano. ${userContext} ${historyData}`;
    }, [tracksToAnalyze, userProfile]);

    useEffect(() => {
        const initChat = async () => {
            const savedMessages = await loadChatFromDB(CHAT_ID);
            if (savedMessages && savedMessages.length > 0) setMessages(savedMessages);
            else setMessages([{ role: 'model', text: 'Ciao! Sono il tuo Coach AI Globale. Ho analizzato il tuo profilo e le tue corse recenti. Cosa programmiamo per i prossimi giorni?' }]);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            chatRef.current = ai.chats.create({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: getSystemInstruction() },
                history: savedMessages?.map(m => ({ role: m.role, parts: [{ text: m.text }] })) || []
            });
        };
        initChat();
    }, [getSystemInstruction, CHAT_ID]);

    useEffect(() => {
        if (messages.length > 0) saveChatToDB(CHAT_ID, messages).catch(console.error);
        if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }, [messages, isLoading, CHAT_ID]);

    const performSendMessage = async (text: string) => {
        if (!text.trim() || isLoading || !chatRef.current) return;
        const userText = text;
        setInput(''); setMessages(prev => [...prev, { role: 'user', text: userText }]); setIsLoading(true);
        try {
            const result = await chatRef.current.sendMessageStream({ message: userText });
            setMessages(prev => [...prev, { role: 'model', text: '' }]);
            let fullResponse = '';
            for await (const chunk of result) {
                const c = chunk as GenerateContentResponse; fullResponse += c.text || '';
                setMessages((prev: ChatMessage[]) => {
                    const next = [...prev]; if (next.length > 0) { const last = next[next.length - 1]; if (last.role === 'model') last.text = fullResponse; }
                    return next;
                });
            }
        } catch (error) { setMessages(prev => [...prev, { role: 'model', text: "Errore di connessione. Riprova." }]); } finally { setIsLoading(false); }
    };

    const handleSend = (e: React.FormEvent) => { e.preventDefault(); performSendMessage(input); };

    // Responsive window style
    const windowStyle: React.CSSProperties = isMaximized 
        ? { position: 'fixed', top: 0, bottom: 0, left: 0, right: 0, width: 'auto', height: 'auto', zIndex: 6000, borderRadius: 0 }
        : isSidebar 
            ? { width: '100%', height: '100%', position: 'relative' }
            : { 
                width: window.innerWidth < 640 ? '100%' : `${dims.w}px`, 
                height: window.innerWidth < 640 ? '100%' : `${dims.h}px`, 
                position: 'relative', 
                zIndex: 4000 
              };

    return (
        <div style={windowStyle} className={`flex flex-col bg-slate-800 text-white shadow-2xl overflow-hidden border border-slate-700 transition-all duration-300 ${!isMaximized && !isSidebar && window.innerWidth >= 640 ? 'rounded-lg' : ''}`}>
            <header className="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-900 flex-shrink-0 cursor-default select-none">
                <div className="flex items-center">
                    <SparklesIcon />
                    <div className="ml-2">
                        <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-tighter">Coach AI Globale</h2>
                        <p className="text-[10px] text-slate-500">{userProfile.aiPersonality || 'Pro'}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-1">
                    {!isSidebar && window.innerWidth >= 640 && (
                        <button onClick={() => setIsMaximized(!isMaximized)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors active:scale-90" title={isMaximized ? "Riduci" : "Tutto Schermo"}>
                            {isMaximized ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M4.25 10a.75.75 0 0 0-1.78 0v4.25H7a.75.75 0 0 0 0-1.5H4.25V10ZM13 5.75a.75.75 0 0 0 0 1.5h2.75V10a.75.75 0 0 0 1.5 0V5.75H13Z" /><path d="M15.75 10a.75.75 0 0 1 1.5 0v4.25H13a.75.75 0 0 1 0-1.5h2.75V10ZM7 5.75a.75.75 0 0 1 0 1.5H4.25V10a.75.75 0 0 1-1.5 0V5.75H7Z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.25 3A.75.75 0 0 1 4 3.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 3.25 3Zm3.5 0A.75.75 0 0 1 7.5 3.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 6.75 3ZM13.25 3a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Zm3.5 0a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75ZM3.25 13a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75ZM3.5 13a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75ZM6.75 13a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75ZM13.25 13a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75ZM16.75 13a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
                            )}
                        </button>
                    )}
                    {onClose && <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors text-xl leading-none" title="Chiudi">&times;</button>}
                </div>
            </header>
            <div ref={scrollAreaRef} className="flex-grow p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-800/50">
                {messages.length <= 1 && (
                    <div className="mb-6 animate-fade-in-down">
                        <AiTrainingCoachPanel 
                            userProfile={userProfile} 
                            allHistory={tracksToAnalyze} 
                            onAddPlannedWorkout={onAddPlannedWorkout}
                            isCompact={true}
                        />
                    </div>
                )}
                
                {messages.map((msg, index) => (
                    <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-cyan-700 text-white rounded-br-none' : 'bg-slate-700 border border-slate-600 rounded-bl-none'}`}>
                            <FormattedAnalysis text={msg.text} />
                        </div>
                    </div>
                ))}
                {isLoading && <div className="flex space-x-1 p-3 bg-slate-700 rounded-xl w-12 animate-pulse"><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full delay-75"></div><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full delay-150"></div></div>}
            </div>
            <div className="p-3 border-t border-slate-700 bg-slate-900/50 flex-shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar scroll-smooth">
                    {SUGGESTIONS.map((suggestion, i) => (<button key={i} onClick={() => performSendMessage(suggestion)} disabled={isLoading} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-[10px] sm:text-xs text-slate-300 hover:bg-slate-700 hover:border-cyan-500 transition-all disabled:opacity-50 active:scale-95">{suggestion}</button>))}
                </div>
                <form onSubmit={handleSend} className="flex items-center bg-slate-700 rounded-xl px-2 border border-slate-600 focus-within:border-cyan-500 shadow-inner">
                    <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Fai una domanda al coach..." className="w-full bg-transparent p-3 focus:outline-none text-sm placeholder-slate-500" disabled={isLoading} />
                    <button type="submit" disabled={isLoading || !input.trim()} className="p-2 text-cyan-400 hover:text-cyan-300 transition-transform active:scale-90">🚀</button>
                </form>
            </div>
        </div>
    );
};

export default Chatbot;