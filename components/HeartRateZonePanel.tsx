
import React, { useMemo } from 'react';
import { Track, UserProfile } from '../types';

interface HeartRateZonePanelProps {
    track: Track;
    userProfile: UserProfile;
}

const formatDuration = (ms: number) => {
    if (isNaN(ms) || ms < 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const result = `${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return result;
};


interface ZoneInfo {
    name: string;
    range: string;
    duration: number;
    percent: number;
    color: string;
}

export const getHeartRateZoneInfo = (track: Track, userProfile: UserProfile): { zones: ZoneInfo[], maxHrUsed: number } => {
    const maxHrFromTrack = Math.max(...track.points.map(p => p.hr || 0));
    const maxHrFromProfile = userProfile.maxHr || (userProfile.age ? 220 - userProfile.age : null);
    const maxHrUsed = maxHrFromProfile || maxHrFromTrack;

    if (maxHrUsed === 0) return { zones: [], maxHrUsed: 0 };

    const zones = [
        { name: 'Z1 Molto leggero', threshold: 0.6, color: '#3b82f6' },
        { name: 'Z2 Leggero', threshold: 0.7, color: '#22c55e' },
        { name: 'Z3 Moderato', threshold: 0.8, color: '#eab308' },
        { name: 'Z4 Difficile', threshold: 0.9, color: '#f97316' },
        { name: 'Z5 Massimo', threshold: 1.0, color: '#ef4444' },
    ];

    const zoneDurations = Array(5).fill(0);
    let totalHrDuration = 0;

    for (let i = 1; i < track.points.length; i++) {
        const p1 = track.points[i - 1];
        const p2 = track.points[i];
        if (p1.hr && p2.hr) {
            const avgHr = (p1.hr + p2.hr) / 2;
            const ratio = avgHr / maxHrUsed;
            const duration = p2.time.getTime() - p1.time.getTime();
            totalHrDuration += duration;

            if (ratio < zones[0].threshold) zoneDurations[0] += duration;
            else if (ratio < zones[1].threshold) zoneDurations[1] += duration;
            else if (ratio < zones[2].threshold) zoneDurations[2] += duration;
            else if (ratio < zones[3].threshold) zoneDurations[3] += duration;
            else zoneDurations[4] += duration;
        }
    }

    let lastThreshold = 0;
    const zoneDetails: ZoneInfo[] = zones.map((zone, i) => {
        const lowerBound = Math.round(lastThreshold * maxHrUsed);
        const upperBound = Math.round(zone.threshold * maxHrUsed);
        lastThreshold = zone.threshold;
        return {
            ...zone,
            range: `${lowerBound}-${upperBound} bpm`,
            duration: zoneDurations[i],
            percent: totalHrDuration > 0 ? (zoneDurations[i] / totalHrDuration) * 100 : 0,
        };
    });
    
    return { zones: zoneDetails, maxHrUsed };
};


const HeartRateZonePanel: React.FC<HeartRateZonePanelProps> = ({ track, userProfile }) => {
    const { zones, maxHrUsed } = useMemo(() => getHeartRateZoneInfo(track, userProfile), [track, userProfile]);

    if (zones.length === 0) {
        return null; // Don't render if no HR data or max HR can be determined
    }

    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-2 border-t border-slate-700 pt-4">Zone di Frequenza Cardiaca</h3>
            <p className="text-xs text-slate-500 mb-3">Calcolato utilizzando una FC massima di {maxHrUsed} bpm.</p>
            <div className="space-y-2">
                {zones.map(zone => (
                    <div key={zone.name} className="grid grid-cols-10 gap-x-3 items-center text-sm">
                        <div className="col-span-3">
                            <p className="text-slate-300 truncate font-semibold">{zone.name}</p>
                            <p className="text-xs text-slate-400">{zone.range}</p>
                        </div>
                        <div className="col-span-5">
                             <div className="w-full bg-slate-700 rounded-full h-4">
                                <div 
                                    className="h-4 rounded-full" 
                                    style={{ width: `${zone.percent}%`, backgroundColor: zone.color }}
                                    title={`${zone.percent.toFixed(1)}%`}
                                ></div>
                            </div>
                        </div>
                        <div className="col-span-2 text-right">
                             <p className="font-mono text-slate-200">{formatDuration(zone.duration)}</p>
                             <p className="text-xs text-slate-400">{zone.percent.toFixed(1)}%</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HeartRateZonePanel;
