



import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
import { Track, TrackStats, AiSegment } from '../types';
import { calculateSegmentStats } from '../services/trackEditorUtils';

interface GeminiSegmentsPanelProps {
    track: Track;
    stats: TrackStats;
    onSegmentSelect: (segment: AiSegment | null) => void;
    selectedSegment: AiSegment | null;
}

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

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2">
        <path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" />
    </svg>
);

// START: Retry Logic Helpers
const isRetryableError = (error: any): boolean => {
    const errorMessage = (error?.message || '').toLowerCase();
    return errorMessage.includes('overloaded') || errorMessage.includes('unavailable') || (error?.status === 'UNAVAILABLE');
};

async function retryWithBackoff<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await apiCall();
    } catch (error: any) {
      attempt++;
      if (attempt >= maxRetries || !isRetryableError(error)) {
        throw error;
      }
      const jitter = Math.random() * initialDelay * 0.5;
      const delay = (initialDelay * Math.pow(2, attempt - 1)) + jitter;
      console.warn(`API call failed. Retrying in ${Math.round(delay)}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries reached. The API is still unavailable.");
}
// END: Retry Logic Helpers


const GeminiSegmentsPanel: React.FC<GeminiSegmentsPanelProps> = ({ track, stats, onSegmentSelect, selectedSegment }) => {
    const [segments, setSegments] = useState<AiSegment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [wasAnalyzed, setWasAnalyzed] = useState(false);

    const handleAnalyze = useCallback(async () => {
        setIsLoading(true);
        setError('');
        setSegments([]);
        setWasAnalyzed(true);

        const prompt = `Sei un esperto allenatore di corsa che analizza una traccia GPX. Identifica 3-5 segmenti interessanti dai dati della corsa forniti. Per ogni segmento, fornisci un titolo, una breve analisi e le distanze di inizio e fine in chilometri. I segmenti dovrebbero evidenziare le massime prestazioni, sfide significative o schemi degni di nota. Esempi includono "Chilometro più veloce", "Salita più dura", "Sforzo in negative split", "Andatura costante", "Spinta finale". Usa i dati della traccia forniti per rendere la tua analisi approfondita. Rispondi SOLO con un oggetto JSON che aderisca allo schema fornito.

Riepilogo dati traccia:
- Distanza totale: ${track.distance.toFixed(2)} km
- Tempo totale: ${formatDuration(track.duration * 1000)}
- Dislivello positivo: ${Math.round(stats.elevationGain)} m
- Numero di punti: ${track.points.length}
- Esempio di dati dei punti (distanza in km, altitudine in m, frequenza cardiaca in bpm):
${track.points.filter((_, i) => i % Math.max(1, Math.floor(track.points.length / 20)) === 0).map(p => `  - dist: ${p.cummulativeDistance.toFixed(2)}, ele: ${p.ele.toFixed(1)}, hr: ${p.hr ?? 'N/A'}`).join('\n')}
`;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            const apiCall = () => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING, description: "Un titolo breve e accattivante per il segmento (es. '🚀 Chilometro più veloce')." },
                                description: { type: Type.STRING, description: "Una breve e acuta analisi di questo segmento (1-2 frasi)." },
                                startDistance: { type: Type.NUMBER, description: "La distanza di inizio del segmento in chilometri." },
                                endDistance: { type: Type.NUMBER, description: "La distanza di fine del segmento in chilometri." },
                            },
                            required: ['title', 'description', 'startDistance', 'endDistance'],
                            propertyOrdering: ["title", "description", "startDistance", "endDistance"]
                        }
                    },
                },
            });
            
            const response = await retryWithBackoff(apiCall) as GenerateContentResponse;
            
            const jsonStr = response.text.trim();
            const rawSegments = JSON.parse(jsonStr);

            const processedSegments: AiSegment[] = rawSegments.map((s: any) => {
                const segmentStats = calculateSegmentStats(track, s.startDistance, s.endDistance);
                return {
                    type: 'ai',
                    title: s.title,
                    description: s.description,
                    startDistance: s.startDistance,
                    endDistance: s.endDistance,
                    ...segmentStats
                };
            }).filter((s: AiSegment) => s.distance > 0); // Filter out any empty segments

            setSegments(processedSegments);
        } catch (e) {
            setError('Impossibile analizzare i segmenti dopo diversi tentativi. Riprova più tardi.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [track, stats]);

    const handleSegmentClick = (segment: AiSegment) => {
        // If the clicked segment is already selected, deselect it. Otherwise, select it.
        if (selectedSegment && selectedSegment.title === segment.title && selectedSegment.startDistance === segment.startDistance) {
            onSegmentSelect(null);
        } else {
            onSegmentSelect(segment);
        }
    };

    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-2 border-t border-slate-700 pt-4">Segmenti Chiave (AI)</h3>
            
            {!wasAnalyzed && (
                 <button 
                    onClick={handleAnalyze} 
                    disabled={isLoading}
                    className="w-full flex items-center justify-center bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
                 >
                    <SparklesIcon />
                    Trova i miei segmenti migliori
                 </button>
            )}

            {isLoading && (
                <div className="flex items-center justify-center text-slate-400 py-4">
                    <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                    Analisi in corso...
                </div>
            )}

            {error && <p className="text-sm text-red-400 text-center bg-red-500/10 p-2 rounded-md">{error}</p>}
            
            {segments.length > 0 && (
                <div className="space-y-3 mt-3">
                    {segments.map((segment, index) => {
                        const isSelected = selectedSegment?.startDistance === segment.startDistance && selectedSegment?.endDistance === segment.endDistance;
                        return (
                            <div 
                                key={index} 
                                onClick={() => handleSegmentClick(segment)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${isSelected ? 'bg-sky-500/20 border-sky-500' : 'bg-slate-700/50 border-slate-600 hover:border-sky-600'}`}
                            >
                                <h4 className="font-bold text-slate-100">{segment.title}</h4>
                                <p className="text-xs text-slate-400 mt-1">{segment.description}</p>
                                <div className="mt-2 pt-2 border-t border-slate-600/50 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs font-mono">
                                    <div><span className="text-slate-500">Dist:</span> {segment.distance.toFixed(2)}km</div>
                                    <div><span className="text-slate-500">Pace:</span> {formatPace(segment.pace)}</div>
                                    <div><span className="text-slate-500">Time:</span> {formatDuration(segment.duration)}</div>
                                    <div><span className="text-slate-500">Gain:</span> +{segment.elevationGain.toFixed(0)}m</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default GeminiSegmentsPanel;