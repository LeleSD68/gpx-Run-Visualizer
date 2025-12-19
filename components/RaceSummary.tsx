
import React, { useState, useEffect } from 'react';
import { RaceResult, TrackStats, UserProfile, Track } from '../types';
import StatsPanel from './StatsPanel';
import GeminiTrackAnalysisPanel from './GeminiTrackAnalysisPanel';

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
    const colors = {
        1: 'text-amber-400',
        2: 'text-slate-400',
        3: 'text-amber-600'
    };
    const colorClass = colors[rank] || 'text-slate-500';

    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${colorClass}`}>
            <path fillRule="evenodd" d="M5.166 2.073A8.25 8.25 0 0 1 12 1.5a8.25 8.25 0 0 1 6.834 5.573 9.75 9.75 0 0 1-13.668 0ZM12 3a6.75 6.75 0 0 0-6.138 9.914 8.213 8.213 0 0 1 3.51-2.03.75.75 0 0 1 .552 1.343 6.713 6.713 0 0 0-2.126 3.033c.041.01.082.02.124.03a.75.75 0 0 1 .537 1.305 8.25 8.25 0 0 1-3.13-1.635 6.75 6.75 0 0 0 12.443 0 8.25 8.25 0 0 1-3.13 1.635.75.75 0 0 1 .537-1.305c.042-.01.083-.02.124-.03a6.713 6.713 0 0 0-2.126-3.033.75.75 0 0 1 .552-1.343 8.213 8.213 0 0 1 3.51 2.03A6.75 6.75 0 0 0 12 3Zm-2.653 9.493a.75.75 0 0 1 0-1.06l1.849-1.849a.75.75 0 1 1 1.06 1.06L10.404 12l1.85 1.849a.75.75 0 1 1-1.06 1.06l-1.85-1.849ZM15.904 12l-1.849-1.849a.75.75 0 0 1 1.06-1.06l1.849 1.849a.75.75 0 0 1 0 1.06l-1.849 1.849a.75.75 0 0 1-1.06-1.06L15.904 12Z" clipRule="evenodd" />
            <path d="M12 21a.75.75 0 0 1-.75-.75v-2.118a.75.75 0 0 1 1.5 0V20.25A.75.75 0 0 1 12 21Z" />
            <path d="M9.75 22.5a.75.75 0 0 1-.75-.75v-2.118a.75.75 0 0 1 1.5 0V21.75A.75.75 0 0 1 9.75 22.5Z" />
            <path d="M14.25 22.5a.75.75 0 0 1-.75-.75v-2.118a.75.75 0 0 1 1.5 0V21.75A.75.75 0 0 1 14.25 22.5Z" />
        </svg>
    );
};

const ChevronIcon = ({ isExpanded }: { isExpanded: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
);


const RaceSummary: React.FC<RaceSummaryProps> = ({ results, racerStats, onClose, userProfile, tracks }) => {
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="race-summary-title"
        className="bg-slate-800 text-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in"
      >
        <div className="p-6 border-b border-slate-700">
          <h2 id="race-summary-title" className="text-2xl font-bold text-cyan-400">Race Results</h2>
        </div>
        <div className="p-6 overflow-y-auto">
          <ol className="space-y-3">
            {results.map(result => {
              const isExpanded = expandedTrackId === result.trackId;
              const stats = racerStats?.get(result.trackId);
              const track = tracks.find(t => t.id === result.trackId);
              return (
              <li key={result.trackId} className="bg-slate-700 rounded-lg flex flex-col transition-all duration-300">
                <div 
                  className="flex items-center space-x-4 p-4 cursor-pointer hover:bg-slate-600/50"
                  onClick={() => setExpandedTrackId(isExpanded ? null : result.trackId)}
                >
                  <div className="flex flex-col items-center justify-center w-12 text-center">
                      <span className="text-3xl font-bold" style={{ color: [ '#FFD700', '#C0C0C0', '#CD7F32'][result.rank-1] || '#94a3b8' }}>{result.rank}</span>
                      {result.rank <=3 && <TrophyIcon rank={result.rank} />}
                  </div>
                  <div className="flex-grow">
                      <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded-full" style={{backgroundColor: result.color}}></div>
                          <p className="font-semibold text-lg truncate" title={result.name}>{result.name}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 mt-2 text-sm text-slate-300">
                          <div>
                              <span className="text-slate-400">Time: </span>
                              <span className="font-mono">{formatDuration(result.finishTime)}</span>
                          </div>
                          <div>
                              <span className="text-slate-400">Speed: </span>
                              <span className="font-mono">{result.avgSpeed.toFixed(2)} km/h</span>
                          </div>
                          <div>
                              <span className="text-slate-400">Dist: </span>
                              <span className="font-mono">{result.distance.toFixed(2)} km</span>
                          </div>
                      </div>
                  </div>
                   <div className="flex-shrink-0">
                        <ChevronIcon isExpanded={isExpanded} />
                    </div>
                </div>
                
                <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                        {stats && track && (
                             <div className="p-4 border-t border-slate-600/50 bg-slate-900/40 space-y-4">
                               <StatsPanel stats={stats} selectedSegment={null} onSegmentSelect={() => {}} />
                               <GeminiTrackAnalysisPanel stats={stats} userProfile={userProfile} track={track} />
                             </div>
                        )}
                    </div>
                </div>
              </li>
            )})}
          </ol>
        </div>
        <div className="p-6 border-t border-slate-700 mt-auto">
            <button
                onClick={onClose}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-md transition-colors"
            >
                Close & Reset
            </button>
        </div>
      </div>
       <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
            animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default RaceSummary;
