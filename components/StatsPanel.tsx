
import React from 'react';
import { TrackStats, Split, PauseSegment, AiSegment } from '../types';

interface StatsPanelProps {
    stats: TrackStats;
    selectedSegment: Split | PauseSegment | AiSegment | null;
    onSegmentSelect: (segment: Split | PauseSegment | AiSegment | null) => void;
}

const formatDuration = (ms: number, showMs = false) => {
  if (isNaN(ms) || ms < 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const result = `${hours > 0 ? hours+':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  if (showMs) {
      const milliseconds = Math.floor(ms % 1000);
      return `${result}.${milliseconds.toString().padStart(3, '0')}`
  }
  return result;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const StatCard: React.FC<{ title: string; value: string | React.ReactNode; subvalue?: string; className?: string }> = ({ title, value, subvalue, className }) => (
    <div className={`flex flex-col bg-slate-700/50 p-2 sm:p-3 rounded-lg border border-slate-600 shadow-md ${className}`}>
        <span className="text-[8px] sm:text-[10px] text-cyan-400 uppercase tracking-widest font-black mb-0.5">{title}</span>
        <span className="text-sm sm:text-2xl font-bold text-white font-mono truncate leading-none">{value}</span>
        {subvalue && <span className="text-[7px] sm:text-[10px] text-slate-100 font-bold mt-0.5 opacity-90 truncate">{subvalue}</span>}
    </div>
);

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, selectedSegment, onSegmentSelect }) => {
    const { minPace, maxPace, paceRange } = React.useMemo(() => {
        const fullSplits = stats.splits.filter(s => s.distance > 0.5 && s.pace > 0);
        if (fullSplits.length < 2) return { minPace: 0, maxPace: 0, paceRange: 0 };
        const paces = fullSplits.map(s => s.pace);
        const minPace = Math.min(...paces);
        const maxPace = Math.max(...paces);
        const paceRange = maxPace - minPace;
        return { minPace, maxPace, paceRange };
    }, [stats.splits]);

    return (
        <div className="text-white space-y-3 sm:space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3">
                <StatCard title="Distanza" value={`${stats.totalDistance.toFixed(2)} km`} />
                <StatCard title="Tempo" value={formatDuration(stats.movingDuration)} subvalue={`Tot. ${formatDuration(stats.totalDuration)}`} />
                <StatCard title="Ritmo Medio" value={formatPace(stats.movingAvgPace)} subvalue={`Smooth ${formatPace(stats.avgPace)}`} />
                <StatCard title="Dislivello" value={`+${Math.round(stats.elevationGain)} m`} subvalue={`Perso: -${Math.round(stats.elevationLoss)} m`} />
                {stats.avgHr && <StatCard title="Battito" value={`${Math.round(stats.avgHr)} bpm`} subvalue={`Min: ${stats.minHr} / Max: ${stats.maxHr}`} />}
                <StatCard title="Vel. Max" value={`${stats.maxSpeed.toFixed(1)}`} subvalue="km/h" />
            </div>

            {stats.splits.length > 0 && (
                <div className="bg-slate-900/30 rounded-xl p-2 sm:p-4 border border-slate-700 overflow-hidden">
                    <h3 className="text-[9px] sm:text-xs font-black text-cyan-400 uppercase tracking-widest mb-2 sm:mb-4 flex items-center">
                        <span className="w-6 sm:w-10 h-0.5 bg-cyan-900 mr-2 sm:mr-3 rounded-full"></span> Analisi Parziali
                    </h3>
                    <div className="space-y-1">
                        <div className="grid grid-cols-[25px_1fr_50px_40px_35px] sm:grid-cols-[35px_1fr_65px_55px_45px] gap-x-1 sm:gap-x-2 text-[7px] sm:text-[9px] text-slate-300 font-black uppercase px-1 sm:px-2 mb-1 tracking-tighter">
                            <div className="text-center">Km</div>
                            <span>Ritmo</span>
                            <span className="text-right">Tempo</span>
                            <span className="text-right">Disl.</span>
                            <span className="text-right">FC</span>
                        </div>
                         <div className="space-y-0.5 sm:space-y-1 max-h-48 sm:max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                            {stats.splits.map(split => {
                                const isSelected = selectedSegment && 'splitNumber' in selectedSegment && selectedSegment.splitNumber === split.splitNumber;
                                let barWidthPercent = 0;
                                if (paceRange > 0 && split.pace > 0) {
                                  const normalizedPace = (maxPace - split.pace) / paceRange;
                                  barWidthPercent = Math.max(10, normalizedPace * 100);
                                } else if (stats.splits.some(s => s.pace > 0)) barWidthPercent = 50;

                                return (
                                    <div 
                                        key={split.splitNumber}
                                        onClick={() => onSegmentSelect(split)}
                                        className={`grid grid-cols-[25px_1fr_50px_40px_35px] sm:grid-cols-[35px_1fr_65px_55px_45px] gap-x-1 sm:gap-x-2 items-center text-[9px] sm:text-xs px-1 sm:px-2 py-1 sm:py-2 rounded cursor-pointer transition-all border ${
                                            isSelected ? 'bg-cyan-500/30 border-cyan-400 shadow-md' : 'bg-slate-700/60 border-transparent hover:bg-slate-700 shadow-sm'
                                        }`}
                                    >
                                        <div className={`text-center font-black ${split.isFastest ? 'text-green-400' : 'text-slate-100'}`}>{split.splitNumber}</div>
                                        <div className="flex items-center gap-1 sm:gap-2">
                                            <div className="flex-grow bg-slate-900 rounded-full h-1 sm:h-2 overflow-hidden border border-slate-700/50">
                                                <div className={`h-full transition-all duration-700 ${split.isFastest ? 'bg-green-400' : split.isSlowest ? 'bg-red-400' : 'bg-cyan-500'}`} style={{ width: `${barWidthPercent}%` }}></div>
                                            </div>
                                            <div className={`font-mono text-[8px] sm:text-[11px] font-bold w-8 sm:w-10 text-right ${split.isFastest ? 'text-green-400' : 'text-white'}`}>{formatPace(split.pace)}</div>
                                        </div>
                                        <div className={`text-right font-mono font-black text-white ${split.isFastest ? 'text-green-400' : ''}`}>{formatDuration(split.duration)}</div>
                                        <div className="text-right font-mono font-bold text-slate-100">+{Math.round(split.elevationGain)}m</div>
                                        <div className="text-right font-mono font-bold text-slate-100">{split.avgHr ? Math.round(split.avgHr) : '--'}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatsPanel;
