
import React, { useState, useEffect } from 'react';
import { Track, PersonalRecord } from '../types';
import { findPersonalRecordsForTrack, updateStoredPRs, PR_DISTANCES } from '../services/prService';

interface PRResult extends PersonalRecord {
    isNew: boolean;
    previousBest?: number;
}

const formatPRTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let timeString = '';
    if (hours > 0) timeString += `${hours}:`;
    timeString += `${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
    return timeString;
};

const formatPRDistance = (meters: number): string => {
    const found = PR_DISTANCES.find(d => d.meters === meters);
    return found ? found.name : `${(meters / 1000).toFixed(2)} km`;
};

const TrophyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-amber-400 mr-2">
      <path fillRule="evenodd" d="M11.644 1.342a.875.875 0 0 1 .634 1.365l-1.32 2.292a.875.875 0 0 1-1.48-.854l1.32-2.292a.875.875 0 0 1 .787-.511Zm-7.288 0a.875.875 0 0 1 .787.511l1.32 2.292a.875.875 0 0 1-1.48.854L4.294 2.707a.875.875 0 0 1 .693-1.365ZM14.125 6a.875.875 0 0 1 .875.875v.236a.875.875 0 0 1-1.75 0v-.236a.875.875 0 0 1 .875-.875ZM1.875 6a.875.875 0 0 1 .875.875v.236a.875.875 0 0 1-1.75 0v-.236A.875.875 0 0 1 1.875 6ZM8 1.875a.875.875 0 0 1 .875.875v1.5a.875.875 0 0 1-1.75 0v-1.5A.875.875 0 0 1 8 1.875ZM3.185 8.137a.875.875 0 0 1 1.157-.592l.304.145a2.5 2.5 0 0 0 2.308 0l.92-.439a4.25 4.25 0 0 1 4.252 0l.92.439a2.5 2.5 0 0 0 2.308 0l.304-.145a.875.875 0 0 1 .565 1.745l-.304.145a4.25 4.25 0 0 1-3.922 0l-.92-.439a2.5 2.5 0 0 0-2.308 0l-.92.439a4.25 4.25 0 0 1-3.922 0l-.304-.145a.875.875 0 0 1-.592-1.157ZM8 10.125a2.625 2.625 0 1 0 0 5.25 2.625 2.625 0 0 0 0-5.25Z" clipRule="evenodd" />
    </svg>
);


const PersonalRecordsPanel: React.FC<{ track: Track }> = ({ track }) => {
    const [records, setRecords] = useState<PRResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const findAndSetRecords = () => {
            setIsLoading(true);
            setTimeout(() => {
                const recordsInTrack = findPersonalRecordsForTrack(track);
                const { updated } = updateStoredPRs(track, recordsInTrack);
                
                const results: PRResult[] = Object.values(updated).map(r => ({
                    ...r.pr,
                    isNew: r.isNew,
                    previousBest: r.previousBest,
                }));
                
                // Sort by distance (shorter first)
                results.sort((a, b) => a.distance - b.distance);
                
                setRecords(results);
                setIsLoading(false);
            }, 50); 
        };
        
        findAndSetRecords();
    }, [track]);

    if (isLoading) {
         return (
             <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-2 border-t border-slate-700 pt-4">Prestazioni & Record</h3>
                <div className="flex items-center justify-center text-slate-400 py-4">
                    <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                    Analisi tempi...
                </div>
            </div>
        );
    }
    
    if (records.length === 0) {
        return null;
    }

    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-2 border-t border-slate-700 pt-4">Prestazioni & Record</h3>
             <div className="space-y-2">
                {records.map(pr => {
                    const delta = pr.previousBest ? pr.time - pr.previousBest : 0;
                    const deltaStr = delta > 0 ? `+${formatPRTime(delta)}` : `-${formatPRTime(Math.abs(delta))}`;
                    const percentDiff = pr.previousBest ? ((delta / pr.previousBest) * 100).toFixed(1) : '0.0';

                    return (
                    <div 
                        key={pr.distance} 
                        className={`p-3 rounded-lg transition-all duration-300 border ${pr.isNew ? 'bg-amber-500/10 border-amber-500/50 shadow-lg' : 'bg-slate-700/30 border-slate-600/30'}`}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center">
                                {pr.isNew && <TrophyIcon />}
                                <span className={`font-bold ${pr.isNew ? 'text-amber-400' : 'text-slate-300'}`}>{formatPRDistance(pr.distance)}</span>
                            </div>
                            <span className={`font-mono font-bold ${pr.isNew ? 'text-white' : 'text-slate-200'}`}>{formatPRTime(pr.time)}</span>
                        </div>
                        
                        {pr.isNew && pr.previousBest && (
                             <div className="flex justify-between items-center text-xs text-amber-300/80">
                                <span>Nuovo Record Personale!</span>
                                <span>Migliorato di {formatPRTime(pr.previousBest - pr.time)}</span>
                            </div>
                        )}

                        {!pr.isNew && pr.previousBest && (
                            <div className="flex justify-between items-center text-xs text-slate-500 font-mono mt-1">
                                <span className="text-slate-400">PR: {formatPRTime(pr.previousBest)}</span>
                                <span className={delta > 0 ? 'text-orange-400' : 'text-green-400'}>
                                    Gap: {deltaStr} ({delta > 0 ? '+' : ''}{percentDiff}%)
                                </span>
                            </div>
                        )}
                        {!pr.isNew && !pr.previousBest && (
                             <div className="text-xs text-slate-500 text-right mt-1 italic">Prima volta su questa distanza</div>
                        )}
                    </div>
                )})}
            </div>
        </div>
    );
};

export default PersonalRecordsPanel;
