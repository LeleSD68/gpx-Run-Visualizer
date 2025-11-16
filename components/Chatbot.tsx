
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Track, ChatMessage, TrackStats, UserProfile } from '../types';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { calculateTrackStats } from '../services/trackStatsService';


interface ChatbotProps {
  onClose: () => void;
  tracksToAnalyze: Track[];
  userProfile: UserProfile;
}

const formatDurationForChat = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
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

const isRetryableError = (error: any): boolean => {
    const errorMessage = (error?.message || '').toLowerCase();
    return errorMessage.includes('overloaded') || errorMessage.includes('unavailable') || (error?.status === 'UNAVAILABLE');
};

const Chatbot: React.FC<ChatbotProps> = ({ onClose, tracksToAnalyze, userProfile }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [initialMessage, setInitialMessage] = useState<string>('Ciao! Sono il tuo assistente AI per le corse. Chiedimi di analizzare i tuoi percorsi, confrontare le performance o darti dei consigli.');

    const generateSystemInstruction = useCallback(() => {
        let context = '';
        let userContext = '';

        if (userProfile.age || userProfile.maxHr) {
            userContext = `Ecco i dati dell'atleta: Età: ${userProfile.age ?? 'N/D'}, FC Max: ${userProfile.maxHr ?? 'N/D'}. Usa questi dati per personalizzare le tue risposte.`;
        }

        if (tracksToAnalyze.length === 0) {
            context = "L'utente non ha ancora caricato o selezionato alcuna traccia.";
            setInitialMessage("Carica una traccia GPX per iniziare l'analisi!");
        } else if (tracksToAnalyze.length === 1) {
            const track = tracksToAnalyze[0];
            const stats = calculateTrackStats(track);
            context = `L'utente sta attualmente analizzando una singola traccia: "${track.name}". 
            Ecco un riepilogo dettagliato dei dati:
            - Distanza: ${stats.totalDistance.toFixed(2)} km
            - Durata: ${formatDurationForChat(stats.movingDuration)}
            - Passo Medio: ${Math.floor(stats.movingAvgPace)}:${Math.round((stats.movingAvgPace - Math.floor(stats.movingAvgPace)) * 60).toString().padStart(2, '0')} /km
            - Dislivello: +${Math.round(stats.elevationGain)}m
            Concentra le tue risposte e consigli su questa specifica attività.`;
            setInitialMessage(`Pronto ad analizzare "${track.name}". Cosa vuoi sapere?`);
        } else {
            const trackSummaries = tracksToAnalyze.map(t => {
                const stats = calculateTrackStats(t);
                return `- "${t.name}": ${stats.totalDistance.toFixed(2)} km, passo medio ${Math.floor(stats.movingAvgPace)}:${Math.round((stats.movingAvgPace - Math.floor(stats.movingAvgPace)) * 60).toString().padStart(2, '0')} /km`;
            }).join('\n');
            context = `L'utente ha selezionato ${tracksToAnalyze.length} tracce per il confronto. Ecco i riepiloghi:
            ${trackSummaries}
            Il tuo ruolo è confrontare queste attività, evidenziando differenze, somiglianze e tendenze di performance.`;
            setInitialMessage(`Hai selezionato ${tracksToAnalyze.length} tracce. Chiedimi di confrontarle!`);
        }

        return `Sei un chatbot amichevole e un esperto di running, integrato in un'app di visualizzazione di percorsi GPX. Il tuo scopo è aiutare gli utenti ad analizzare le loro attività. Rispondi in italiano. ${userContext} ${context}`;
    }, [tracksToAnalyze, userProfile]);

    useEffect(() => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        chatRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: generateSystemInstruction(),
            }
        });

        setMessages([{ role: 'model', text: initialMessage }]);

    }, [initialMessage, generateSystemInstruction]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        
        try {
            if (!chatRef.current) throw new Error("Chat not initialized");
            
            const result = await chatRef.current.sendMessageStream({ message: input });
            
            let currentText = '';
            setMessages(prev => [...prev, { role: 'model', text: '' }]);

            // FIX: The `sendMessageStream` method returns an object with a `stream` property that is the async iterator.
            // The loop must iterate over `result.stream`, not `result` itself.
            for await (const chunk of (result as any).stream) {
                currentText += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].text = currentText;
                    return newMessages;
                });
            }

        } catch (error) {
            console.error("Error sending message:", error);
            if (isRetryableError(error)) {
                setMessages(prev => [...prev, { role: 'model', text: 'Spiacente, l\'assistente AI è al momento sovraccarico. Riprova tra poco.' }]);
            } else {
                setMessages(prev => [...prev, { role: 'model', text: 'Spiacente, si è verificato un errore. Riprova.' }]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-slate-800 text-white">
            <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
                <div className="flex items-center">
                    <SparklesIcon />
                    <h2 className="text-lg font-bold ml-2 text-cyan-400">AI Assistant</h2>
                </div>
                <button onClick={onClose} className="text-2xl leading-none p-1 rounded-full hover:bg-slate-700">&times;</button>
            </header>

            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-cyan-600 rounded-br-lg' : 'bg-slate-700 rounded-bl-lg'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                         <div className="max-w-[85%] p-3 rounded-2xl bg-slate-700 rounded-bl-lg">
                            <div className="flex items-center space-x-1.5">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-slate-700 flex-shrink-0">
                <div className="flex items-center bg-slate-700 rounded-lg">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={tracksToAnalyze.length > 0 ? "Chiedi qualcosa..." : "Carica una traccia per iniziare"}
                        className="w-full bg-transparent p-3 focus:outline-none"
                        disabled={isLoading || tracksToAnalyze.length === 0}
                    />
                    <button type="submit" disabled={isLoading || !input.trim() || tracksToAnalyze.length === 0} className="p-3 text-cyan-400 disabled:text-slate-500 disabled:cursor-not-allowed">
                        <SendIcon />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chatbot;
