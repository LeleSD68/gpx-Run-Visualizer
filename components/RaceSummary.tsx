
import React, { useState, useEffect, useCallback } from 'react';
import { RaceResult, TrackStats, UserProfile, Track, AiPersonality } from '../types';
import StatsPanel from './StatsPanel';
import GeminiTrackAnalysisPanel from './GeminiTrackAnalysisPanel';
import { GoogleGenAI } from '@google/genai';
import FormattedAnalysis from './FormattedAnalysis';

const personalityPrompts: Record<AiPersonality, string> = {
    'pro_balanced': "Sei un analista sportivo professionista ed equilibrato. Commenta questa gara virtuale valutando le prestazioni atletiche con oggettività. Indica chi ha gestito meglio lo sforzo in modo tecnico e pacato.",
    'strict': "Sei un analista tecnico di atletica leggera, severo e rigoroso. Commenta questa gara virtuale valutando chi ha meritato davvero e chi ha ceduto. Non fare sconti.",
    'motivator': "Sei un commentatore sportivo motivatore. Commenta la sfida celebrando la competizione, l'impegno di tutti e spingendo ognuno a migliorare ancora.",
    'enthusiast': "Sei un telecronista entusiasta! Trasmetti l'adrenalina della sfida virtuale, celebra i sorpassi e la grinta dei partecipanti in modo epico.",
    'analytic': "Sei un esperto di data science applicata allo sport. Analizza la gara confrontando i vettori di velocità, la costanza del ritmo e l'efficienza nel dislivello."
};

interface RaceSummaryProps {
  results: RaceResult[];
  racerStats: Map<string, TrackStats> | null;
  onClose: () => void;
  userProfile: UserProfile;
  tracks: Track[];
}

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

const TrophyIcon = ({ rank }: { rank: number }) => {
    const colors = { 1: 'text-amber-400', 2: 'text-slate-400', 3: 'text-amber-600' };
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${colors[rank as keyof typeof colors] || 'text-slate-500'}`}><path fillRule="evenodd" d="M5.166 2.073A8.25 8.25 0 0 1 12 1.5a8.25 8.25 0 0 1 6.834 5.573 9.75 9.75 0 0 1-13.668 0ZM12 3a6.75 6.75 0 0 0-6.138 9.914 8.213 8.213 0 0 1 3.51-2.03.75.75 0 0 1 .552 1.343 6.713 6.713 0 0 0-2.126 3.033c.041.01.082.02.124.03a.75.75 0 0 1 .537 1.305 8.25 8.25 0 0 1-3.13-1.635 6.75 6.75 0 0 0 12.443 0 8.25 8.25 0 0 1-3.13 1.635.75.75 0 0 1 .537-1.305c.042-.01.083-.02.124-.03a6.713 6.713 0 0 0-2.126-3.033.75.75 0 0 1 .552-1.343 8.213 8.213 0 0 1 3.51 2.03A6.75 6.75 0 0 0 12 3Z" clipRule="evenodd" /></svg>;
};

const RaceSummary: React.FC<RaceSummaryProps> = ({ results, racerStats, onClose, userProfile, tracks }) => {
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);
  const [comparativeAnalysis, setComparativeAnalysis] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleComparativeAnalysis = useCallback(async () => {
    if (results.length < 2 || !racerStats) return;
    setIsAiLoading(true);
    const personality = userProfile.aiPersonality || 'pro_balanced';
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const prompt = `${personalityPrompts[personality]} Commenta questa gara virtuale tra ${results.length} corse diverse.
      Dati gara:
      ${results.map(r => {
          const s = racerStats.get(r.trackId);
          return `- ${r.name} (Rank ${r.rank}): Tempo ${formatDuration(r.finishTime)}, Ritmo ${((r.finishTime/60000)/r.distance).toFixed(2)}/km, Dislivello +${Math.round(s?.elevationGain || 0)}m.`;
      }).join('\n')}
      Identifica chi ha avuto la gestione energetica migliore, chi ha sofferto di più le salite e fai un podio tecnico motivando le scelte. Rispondi in italiano con markdown.`;

      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setComparativeAnalysis(response.text || '');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  }, [results, racerStats, userProfile.aiPersonality]);

  useEffect(() => { handleComparativeAnalysis(); }, [handleComparativeAnalysis]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4">
      <div className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in overflow-hidden">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900">
          <h2 className="text-2xl font-bold text-cyan-400 uppercase tracking-tighter">Resoconto Sfida</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-6 custom-scrollbar space-y-8">
          <section className="bg-slate-900/50 border border-purple-500/30 rounded-xl p-5 shadow-lg">
             <h3 className="text-purple-400 font-bold flex items-center mb-4 uppercase text-sm tracking-widest">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2"><path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" /></svg>
               Analisi Coach AI ({userProfile.aiPersonality || 'pro_balanced'})
             </h3>
             {isAiLoading ? (
                 <div className="flex flex-col items-center py-6 text-slate-500"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-3"></div><p className="text-xs">Analisi comparativa in corso...</p></div>
             ) : (
                 <div className="prose prose-invert prose-sm max-w-none">
                    <FormattedAnalysis text={comparativeAnalysis} />
                 </div>
             )}
          </section>

          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-1">Classifica Finale</h3>
            <ol className="space-y-3">
                {results.map(result => {
                const isExpanded = expandedTrackId === result.trackId;
                const stats = racerStats?.get(result.trackId);
                const track = tracks.find(t => t.id === result.trackId);
                return (
                <li key={result.trackId} className={`bg-slate-700/40 rounded-lg border transition-all ${isExpanded ? 'border-cyan-500/50' : 'border-slate-600/30'}`}>
                    <div className="flex items-center space-x-4 p-4 cursor-pointer" onClick={() => setExpandedTrackId(isExpanded ? null : result.trackId)}>
                        <div className="flex flex-col items-center justify-center w-12 text-center">
                            <span className="text-3xl font-bold" style={{ color: ['#FFD700', '#C0C0C0', '#CD7F32'][result.rank-1] || '#94a3b8' }}>{result.rank}</span>
                            {result.rank <=3 && <TrophyIcon rank={result.rank} />}
                        </div>
                        <div className="flex-grow">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full" style={{backgroundColor: result.color}}></div>
                                <p className="font-bold text-lg truncate">{result.name}</p>
                            </div>
                            <div className="flex space-x-4 mt-1 text-xs font-mono text-slate-400">
                                <span>{formatDuration(result.finishTime)}</span>
                                <span>{result.avgSpeed.toFixed(1)} km/h</span>
                            </div>
                        </div>
                    </div>
                    {isExpanded && stats && track && (
                        <div className="p-4 border-t border-slate-600/50 bg-slate-900/30">
                            <StatsPanel stats={stats} selectedSegment={null} onSegmentSelect={() => {}} />
                            <GeminiTrackAnalysisPanel stats={stats} userProfile={userProfile} track={track} />
                        </div>
                    )}
                </li>
                )})}
            </ol>
          </section>
        </div>
        <div className="p-6 border-t border-slate-700 bg-slate-900/80">
            <button onClick={onClose} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg">Chiudi Riepilogo</button>
        </div>
      </div>
    </div>
  );
};

export default RaceSummary;