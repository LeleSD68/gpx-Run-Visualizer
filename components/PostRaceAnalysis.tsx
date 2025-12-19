
import React from 'react';
import { TrackStats, UserProfile, Track } from '../types';
import GeminiTrackAnalysisPanel from './GeminiTrackAnalysisPanel';

const formatDuration = (ms: number) => {
  if (isNaN(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

interface PostRaceStatsBarProps {
    stats: TrackStats;
    onToggleAi: () => void;
    isAiOpen: boolean;
    onExit: () => void;
}

export const PostRaceStatsBar: React.FC<PostRaceStatsBarProps> = ({ stats, onToggleAi, isAiOpen, onExit }) => {
    return (
        <div className="bg-slate-800 border-t border-slate-700 p-4 flex items-center justify-between shrink-0 z-50 relative shadow-lg">
            <div className="flex space-x-6 items-center">
                <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Distanza</div>
                    <div className="text-xl font-bold font-mono text-white">{stats.totalDistance.toFixed(2)} <span className="text-sm font-sans text-slate-500">km</span></div>
                </div>
                <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Tempo</div>
                    <div className="text-xl font-bold font-mono text-white">{formatDuration(stats.movingDuration)}</div>
                </div>
                <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Passo Medio</div>
                    <div className="text-xl font-bold font-mono text-white">{formatPace(stats.movingAvgPace)} <span className="text-sm font-sans text-slate-500">/km</span></div>
                </div>
                 <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Dislivello</div>
                    <div className="text-xl font-bold font-mono text-white">+{Math.round(stats.elevationGain)} <span className="text-sm font-sans text-slate-500">m</span></div>
                </div>
            </div>
            
            <div className="flex items-center space-x-3">
                <button 
                    onClick={onToggleAi}
                    className={`flex items-center px-4 py-2 rounded-full font-semibold transition-all border border-transparent ${
                        isAiOpen 
                            ? 'bg-cyan-600 text-white shadow-cyan-500/20 shadow-lg' 
                            : 'bg-slate-700 text-cyan-400 hover:bg-slate-600 border-slate-600'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2">
                        <path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" />
                    </svg>
                    {isAiOpen ? 'Chiudi Coach AI' : 'Chiedi al Coach AI'}
                </button>
                <button 
                    onClick={onExit}
                    className="flex items-center px-4 py-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                >
                    Esci
                </button>
            </div>
        </div>
    );
};

interface PostRaceAISidebarProps {
    stats: TrackStats;
    userProfile: UserProfile;
    track: Track;
}

export const PostRaceAISidebar: React.FC<PostRaceAISidebarProps> = ({ stats, userProfile, track }) => {
    return (
        <div className="h-full bg-slate-800 flex flex-col border-l border-slate-700">
            <div className="p-4 border-b border-slate-700">
                <h2 className="text-lg font-bold text-white flex items-center">
                    <span className="text-2xl mr-2">🤖</span> AI Performance Coach
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                    Analisi corsa: {stats.totalDistance.toFixed(2)}km in {formatDuration(stats.movingDuration)}
                </p>
            </div>
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                <GeminiTrackAnalysisPanel stats={stats} userProfile={userProfile} track={track} />
            </div>
        </div>
    );
};
