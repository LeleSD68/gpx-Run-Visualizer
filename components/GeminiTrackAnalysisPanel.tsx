
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { TrackStats, UserProfile, Track, ChatMessage } from '../types';
import { getHeartRateZoneInfo } from './HeartRateZonePanel';
import FormattedAnalysis from './FormattedAnalysis';
import { calculateTrackStats } from '../services/trackStatsService';

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

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.949a.75.75 0 0 0 .95.95l4.95-1.414a.75.75 0 0 0-.95-.95l-3.539 1.01-1.01-3.54a.75.75 0 0 0-.95-.826ZM12.23 7.77a.75.75 0 0 0-1.06 0l-4.25 4.25a.75.75 0 0 0 0 1.06l4.25 4.25a.75.75 0 0 0 1.06-1.06l-3.72-3.72 3.72-3.72a.75.75 0 0 0 0-1.06ZM15.5 10a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 0 1.5H16.25a.75.75 0 0 1-.75-.75Z" />
    </svg>
);

type ReportStyle = 'synthetic' | 'short' | 'normal' | 'meticulous';

interface GeminiTrackAnalysisPanelProps {
    stats: TrackStats;
    userProfile: UserProfile;
    track: Track;
    allHistory?: Track[];
}

const GeminiTrackAnalysisPanel: React.FC<GeminiTrackAnalysisPanelProps> = ({ stats, userProfile, track, allHistory = [] }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [input, setInput] = useState('');
    const [reportStyle, setReportStyle] = useState<ReportStyle>('normal');
    const [includePlan, setIncludePlan] = useState(false);
    const chatSessionRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const generateSystemInstruction = useCallback(() => {
        // Estrazione ultimi 10 allenamenti per il contesto
        const historyContext = allHistory
            .filter(t => t.id !== track.id) // Escludi la corsa attuale
            .sort((a, b) => b.points[0].time.getTime() - a.points[0].time.getTime())
            .slice(0, 10)
            .map(t => {
                const s = calculateTrackStats(t);
                return `- ${t.points[0].time.toLocaleDateString()}: ${t.distance.toFixed(2)}km a ${formatPace(s.movingAvgPace)}/km`;
            })
            .join('\n');

        const profileInfo = `Dati dell'atleta: Età: ${userProfile.age ?? 'N/D'}, FC Massima: ${userProfile.maxHr ?? 'N/D'}, Obiettivo Corrente: ${userProfile.goal ?? 'Salute Generale'}.`;
        const hrZoneInfo = getHeartRateZoneInfo(track, userProfile);
        const hrDistribution = hrZoneInfo.zones.map(z => `- ${z.name}: ${z.percent.toFixed(1)}% del tempo`).join('\n');
        const hrContext = stats.avgHr ? `Dati FC corsa attuale: Media ${Math.round(stats.avgHr)} bpm, Distribuzione Zone:\n${hrDistribution}` : '';
        const fastestSplit = stats.splits.find(s => s.isFastest);
        const fastestSplitInfo = fastestSplit ? `- Chilometro più veloce attuale: Ritmo ${formatPace(fastestSplit.pace)}/km (Km ${fastestSplit.splitNumber})` : '';
        
        const styleGuides: Record<ReportStyle, string> = {
            synthetic: "Produci un report sintetico. Solo i 3 punti chiave principali e i dati tecnici essenziali in una lista puntata. Massima brevità.",
            short: "Produci un report breve. Un paragrafo di analisi generale e un piccolo elenco di pro e contro.",
            normal: "Analisi standard bilanciata tra tecnica e motivazione. Evidenzia punti di forza e aree di miglioramento.",
            meticulous: "Analisi meticolosa e profonda. Esamina ogni dettaglio dei parziali, l'andamento della FC in relazione al dislivello e valuta la tenuta atletica nel finale."
        };

        const planInstruction = includePlan ? "Alla fine del report, proponi una tabella 'Piano Suggerito' per le prossime 3 uscite basata su questa corsa, sullo storico e sull'obiettivo dell'atleta." : "";

        return `Sei un esperto running coach. Analizza i dati di questa corsa in relazione all'obiettivo dell'atleta e alla sua progressione storica. 
Hai a disposizione i dati delle ultime 10 corse per capire lo stato di forma e il trend.
${styleGuides[reportStyle]} ${planInstruction} Rispondi in italiano con stile markdown.

${profileInfo}

Storico Ultime 10 Corse (Progressione):
${historyContext || "Nessuno storico disponibile."}

Dati della corsa ATTUALE da analizzare:
- Distanza: ${stats.totalDistance.toFixed(2)} km
- Tempo in Movimento: ${formatDuration(stats.movingDuration)}
- Ritmo Medio: ${formatPace(stats.movingAvgPace)} /km
- Dislivello: +${Math.round(stats.elevationGain)} m
${hrContext}
${fastestSplitInfo}

Analizza se l'atleta sta migliorando rispetto allo storico e fornisci feedback mirati.`;
    }, [stats, userProfile, track, reportStyle, includePlan, allHistory]);

    const handleStartAnalysis = async () => {
        setIsLoading(true);
        setError('');
        setMessages([]);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            chatSessionRef.current = ai.chats.create({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: generateSystemInstruction() }
            });

            const initialPrompt = "Genera l'analisi della corsa basandoti sulle mie preferenze di stile, considerando il mio storico e i miei obiettivi.";
            const result = await chatSessionRef.current.sendMessageStream({ message: initialPrompt });
            
            setMessages([{ role: 'model', text: '' }]);

            for await (const chunk of result as any) {
                const chunkText = chunk.text || '';
                if (chunk.usageMetadata?.totalTokenCount) {
                    window.gpxApp?.addTokens(chunk.usageMetadata.totalTokenCount);
                }
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'model') {
                        newMessages[newMessages.length - 1] = { 
                            ...lastMessage, 
                            text: lastMessage.text + chunkText 
                        };
                    }
                    return newMessages;
                });
            }
        } catch (e) {
            setError('Errore durante la generazione dell\'analisi.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chatSessionRef.current) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const result = await chatSessionRef.current.sendMessageStream({ message: currentInput });
            setMessages(prev => [...prev, { role: 'model', text: '' }]);

            for await (const chunk of result as any) {
                const chunkText = chunk.text || '';
                 if (chunk.usageMetadata?.totalTokenCount) {
                    window.gpxApp?.addTokens(chunk.usageMetadata.totalTokenCount);
                }
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'model') {
                        newMessages[newMessages.length - 1] = { 
                            ...lastMessage, 
                            text: lastMessage.text + chunkText 
                        };
                    }
                    return newMessages;
                });
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', text: 'Spiacente, si è verificato un errore.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const historyCount = Math.min(allHistory.length - 1, 10);

    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-2 border-t border-slate-700 pt-4 flex items-center">
                <SparklesIcon />
                Analisi AI Coach
            </h3>
            
            {messages.length === 0 && !isLoading ? (
                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl space-y-5">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                             <p className="text-sm text-slate-300 font-semibold">Configura Report</p>
                             {historyCount > 0 && (
                                <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30">
                                    Include storico ({historyCount} corse)
                                </span>
                             )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            {(['synthetic', 'short', 'normal', 'meticulous'] as ReportStyle[]).map(style => (
                                <button
                                    key={style}
                                    onClick={() => setReportStyle(style)}
                                    className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                                        reportStyle === style 
                                            ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-900/20' 
                                            : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500 hover:bg-slate-600'
                                    }`}
                                >
                                    {style === 'synthetic' ? 'Sintetico' : style === 'short' ? 'Breve' : style === 'normal' ? 'Normale' : 'Meticoloso'}
                                </button>
                            ))}
                        </div>

                        <label className="flex items-center space-x-3 cursor-pointer group p-2 hover:bg-slate-700/30 rounded-lg transition-colors">
                            <div className="relative">
                                <input 
                                    type="checkbox" 
                                    className="sr-only" 
                                    checked={includePlan} 
                                    onChange={() => setIncludePlan(!includePlan)} 
                                />
                                <div className={`w-10 h-5 rounded-full shadow-inner transition-colors ${includePlan ? 'bg-cyan-600' : 'bg-slate-700'}`}></div>
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${includePlan ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Suggerisci programma allenamento</span>
                        </label>
                    </div>

                    <button
                        onClick={handleStartAnalysis}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center border border-white/10"
                    >
                        <SparklesIcon /> Analizza Progressi & Corsa
                    </button>
                    
                    <p className="text-[10px] text-slate-500 text-center italic">
                        L'AI valuterà la tua forma attuale basandosi sui tuoi obiettivi di {userProfile.goal || 'salute'}.
                    </p>
                </div>
            ) : (
                <div className="bg-slate-700/50 p-2 rounded-lg h-[450px] flex flex-col border border-slate-600/30 shadow-inner">
                    <div className="flex-grow p-2 overflow-y-auto space-y-4 custom-scrollbar">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-cyan-600 rounded-br-lg shadow-md' : 'bg-slate-800 border border-slate-700 rounded-bl-lg shadow-lg'}`}>
                                    <FormattedAnalysis text={msg.text} />
                                </div>
                            </div>
                        ))}
                         {isLoading && (messages.length === 0 || messages[messages.length - 1].role === 'user') && (
                            <div className="flex justify-start">
                                 <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 shadow-md">
                                    <div className="flex space-x-1.5">
                                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    {error && <p className="text-red-400 text-center text-sm p-2 bg-red-900/20 rounded mb-2 border border-red-500/30">{error}</p>}
                    
                    <form onSubmit={handleSend} className="p-2 border-t border-slate-600/50 flex-shrink-0">
                        <div className="flex items-center bg-slate-800 rounded-lg pr-1 border border-slate-700 focus-within:border-cyan-500/50 transition-colors shadow-sm">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Chiedi al coach (es: 'Com'è la mia progressione?')"
                                className="w-full bg-transparent p-2.5 focus:outline-none text-sm placeholder-slate-500"
                                disabled={isLoading}
                            />
                            <button type="submit" disabled={isLoading || !input.trim()} className="p-2 text-cyan-400 hover:text-cyan-300 disabled:text-slate-600 transition-colors">
                                <SendIcon />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default GeminiTrackAnalysisPanel;
