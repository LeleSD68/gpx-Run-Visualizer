
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Track, ChatMessage, UserProfile } from '../types';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { calculateTrackStats } from '../services/trackStatsService';
import FormattedAnalysis from './FormattedAnalysis';

interface ChatbotProps {
  tracksToAnalyze: Track[]; // In questo contesto, allHistory o selection
  userProfile: UserProfile;
}

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" />
    </svg>
);

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.949a.75.75 0 0 0 .95.95l4.95-1.414a.75.75 0 0 0-.95-.95l-3.539 1.01-1.01-3.54a.75.75 0 0 0-.95-.826ZM12.23 7.77a.75.75 0 0 0-1.06 0l-4.25 4.25a.75.75 0 0 0 0 1.06l4.25 4.25a.75.75 0 0 0 1.06-1.06l-3.72-3.72 3.72-3.72a.75.75 0 0 0 0-1.06ZM15.5 10a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 0 1.5H16.25a.75.75 0 0 1-.75-.75Z" />
    </svg>
);

const Chatbot: React.FC<ChatbotProps> = ({ tracksToAnalyze, userProfile }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    
    const getSystemInstruction = useCallback(() => {
        let userContext = `Profilo Atleta: Età ${userProfile.age ?? 'N/D'}, FC Max ${userProfile.maxHr ?? 'N/D'} bpm, Obiettivo: ${userProfile.goal ?? 'Salute Generale'}. `;

        // Analisi dello storico (ultime 10 corse)
        const sortedTracks = [...tracksToAnalyze].sort((a, b) => b.points[0].time.getTime() - a.points[0].time.getTime());
        const last10 = sortedTracks.slice(0, 10);
        
        let historyData = "Storico ultime sessioni:\n";
        if (last10.length === 0) {
            historyData += "- Nessuna corsa caricata ancora.";
        } else {
            last10.forEach(t => {
                const s = calculateTrackStats(t);
                historyData += `- ${t.points[0].time.toLocaleDateString()}: ${t.distance.toFixed(2)}km, Passo ${formatPace(s.movingAvgPace)}/km\n`;
            });
        }

        return `Sei un Personal Running Coach AI. Il tuo compito è aiutare l'atleta a capire il suo stato di forma, monitorare i progressi e rispondere a domande tecniche sulla corsa.
Utilizza i dati dello storico forniti per dare risposte precise e personalizzate. Se noti miglioramenti nel passo o nella costanza, sottolineali.
Sii motivante ma professionale. Rispondi sempre in italiano.

${userContext}

${historyData}

Conosci ora tutto dell'atleta. Rispondi alle sue domande basandoti su questi dati reali.`;
    }, [tracksToAnalyze, userProfile]);

    useEffect(() => {
        // Se cambiano le tracce o il profilo, resettiamo la sessione per aggiornare il contesto
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        chatRef.current = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: { systemInstruction: getSystemInstruction() }
        });
        
        if (messages.length === 0) {
            setMessages([{ role: 'model', text: 'Ciao! Ho analizzato il tuo profilo e le tue ultime corse. Come posso aiutarti oggi nel tuo percorso di allenamento?' }]);
        }
    }, [getSystemInstruction]); // Riavvia sessione se cambiano i dati base

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chatRef.current) return;

        const userText = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setIsLoading(true);

        try {
            const result = await chatRef.current.sendMessageStream({ message: userText });
            setMessages(prev => [...prev, { role: 'model', text: '' }]);

            for await (const chunk of result) {
                const chunkText = chunk.text || '';
                if (chunk.usageMetadata?.totalTokenCount) {
                    window.gpxApp?.addTokens(chunk.usageMetadata.totalTokenCount);
                }
                
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastIdx = newMessages.length - 1;
                    if (newMessages[lastIdx].role === 'model') {
                        newMessages[lastIdx] = { 
                            ...newMessages[lastIdx], 
                            text: newMessages[lastIdx].text + chunkText 
                        };
                    }
                    return newMessages;
                });
            }
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: "Spiacente, si è verificato un errore di connessione. Riprova tra poco." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-slate-800 text-white">
            <header className="flex items-center p-3 border-b border-slate-700 bg-slate-900 flex-shrink-0">
                <SparklesIcon />
                <div className="ml-2">
                    <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-tighter">Coach AI Personale</h2>
                    <p className="text-[10px] text-slate-500">Conosce i tuoi ultimi 10 allenamenti</p>
                </div>
            </header>

            <div ref={scrollAreaRef} className="flex-grow p-4 overflow-y-auto space-y-4 custom-scrollbar">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] p-3 rounded-2xl ${
                            msg.role === 'user' 
                                ? 'bg-cyan-700 text-white rounded-br-none shadow-md' 
                                : 'bg-slate-700 border border-slate-600 rounded-bl-none shadow-lg'
                        }`}>
                            <FormattedAnalysis text={msg.text} />
                        </div>
                    </div>
                ))}
                {isLoading && messages[messages.length-1]?.role === 'user' && (
                    <div className="flex justify-start">
                        <div className="p-3 bg-slate-700 border border-slate-600 rounded-2xl rounded-bl-none animate-pulse">
                            <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full delay-75"></div>
                                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full delay-150"></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-slate-700 bg-slate-900/50">
                <div className="flex items-center bg-slate-700 rounded-xl px-2 border border-slate-600 focus-within:border-cyan-500/50 transition-colors">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Chiedi al tuo coach..."
                        className="w-full bg-transparent p-3 focus:outline-none text-sm placeholder-slate-500"
                        disabled={isLoading}
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading || !input.trim()} 
                        className="p-2 text-cyan-400 hover:text-cyan-300 disabled:opacity-30 transition-colors"
                    >
                        <SendIcon />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chatbot;
