
import React from 'react';
import { Track } from '../types';

interface RaceLeaderboardProps {
  racers: Track[];
  ranks: Map<string, number>;
  gaps: Map<string, number | undefined>; // Gap to runner ahead in meters
}

const RaceLeaderboard: React.FC<RaceLeaderboardProps> = ({ racers, ranks, gaps }) => {
    const rankedRacers = racers.map(racer => ({
        ...racer,
        rank: ranks.get(racer.id) ?? racers.length,
        gap: gaps.get(racer.id),
    })).sort((a, b) => a.rank - b.rank);

    if (racers.length === 0) {
        return null;
    }

    return (
        <div className="bg-slate-900/30 rounded-lg p-2 flex flex-col h-full overflow-hidden border border-slate-700/50">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Classifica Live</h3>
            <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1">
                {rankedRacers.map((racer, index) => {
                    let gapDisplayText: string;
                    if (index === 0) {
                        gapDisplayText = 'Leader';
                    } else if (racer.gap !== undefined) {
                        const gapMeters = racer.gap;
                         if (gapMeters < 1000) {
                            gapDisplayText = `+${gapMeters.toFixed(0)}m`;
                        } else {
                            gapDisplayText = `+${(gapMeters / 1000).toFixed(2)}km`;
                        }
                    } else {
                        gapDisplayText = '--';
                    }
                    
                    return (
                        <div key={racer.id} className={`flex items-center gap-3 p-2 rounded-md transition-all duration-300 ${racer.rank === 1 ? 'bg-amber-500/10 border border-amber-500/20 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]' : 'bg-slate-700/40 border border-transparent'}`}>
                            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-slate-800 text-xs font-bold shadow-inner">
                                <span className={racer.rank === 1 ? 'text-amber-400' : 'text-slate-400'}>
                                    {racer.rank}
                                </span>
                            </div>
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="truncate font-semibold text-sm text-slate-100" title={racer.name}>
                                        {racer.name}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: racer.color }}></div>
                                        <span className="text-[10px] text-slate-500">{racer.distance.toFixed(1)}km totali</span>
                                    </div>
                                    <span className={`font-mono text-[10px] font-bold ${index === 0 ? 'text-green-400' : 'text-slate-400'}`}>
                                        {gapDisplayText}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RaceLeaderboard;
