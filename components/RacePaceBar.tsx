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
        <div className="bg-slate-800/80 backdrop-blur-sm p-3 shadow-md w-64 flex-shrink-0 h-full">
            <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider text-center">Classifica</h3>
            <div className="space-y-1">
                {rankedRacers.map((racer, index) => {
                    let gapDisplayText: string;
                    if (index === 0) {
                        gapDisplayText = 'Leader';
                    } else if (racer.gap !== undefined) {
                        const gapMeters = racer.gap;
                         if (gapMeters < 1000) {
                            gapDisplayText = `-${gapMeters.toFixed(0)}m`;
                        } else {
                            gapDisplayText = `-${(gapMeters / 1000).toFixed(2)}km`;
                        }
                    } else {
                        gapDisplayText = '--';
                    }
                    
                    return (
                        <div key={racer.id} className={`grid grid-cols-10 items-center gap-2 text-sm transition-all duration-200 p-1.5 rounded-md ${racer.rank === 1 ? 'bg-slate-700/50' : ''}`}>
                            <div className="col-span-1 text-center">
                                <span className={`font-bold text-base ${racer.rank === 1 ? 'text-amber-400' : 'text-slate-400'}`}>
                                    {racer.rank}
                                </span>
                            </div>
                            <div className="col-span-6 flex items-center truncate">
                                <div className="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: racer.color }}></div>
                                <span className="truncate font-medium text-slate-300" title={racer.name}>
                                    {racer.name}
                                </span>
                            </div>
                            <div className="col-span-3 text-right font-mono text-slate-400 text-xs">
                                {gapDisplayText}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RaceLeaderboard;
