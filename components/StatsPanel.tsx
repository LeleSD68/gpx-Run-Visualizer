
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
    if (!isFinite(pace) || pace <= 0) {
        return '--:--';
    }
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const StatCard: React.FC<{ title: string; value: string | React.ReactNode; subvalue?: string; className?: string }> = ({ title, value, subvalue, className }) => (
    <div className={`flex flex-col bg-slate-700/30 p-3 rounded-lg border border-slate-600/50 ${className}`}>
        <span className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">{title}</span>
        <span className="text-2xl font-semibold text-white font-mono">{value}</span>
        {subvalue && <span className="text-[10px] text-slate-500 mt-1">{subvalue}</span>}
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
        <div className="text-white space-y-6">
            <div className="grid grid-cols-2 gap-3">
                <StatCard title="Distanza" value={`${stats.totalDistance.toFixed(2)} km`} />
                <StatCard title="Tempo" value={formatDuration(stats.movingDuration)} subvalue={`Totale ${formatDuration(stats.totalDuration)}`} />
                <StatCard title="Ritmo Medio" value={formatPace(stats.movingAvgPace)} subvalue={`Smooth ${formatPace(stats.avgPace)} /km`} />
                <StatCard title="Dislivello" value={`+${Math.round(stats.elevationGain)} m`} subvalue={`Perso: -${Math.round(stats.elevationLoss)} m`} />
                {stats.avgHr && <StatCard title="Battito Medio" value={`${Math.round(stats.avgHr)} bpm`} subvalue={`Min: ${stats.minHr} / Max: ${stats.maxHr}`} />}
                <StatCard title="Vel. Max" value={`${stats.maxSpeed.toFixed(1)}`} subvalue="km/h" />
            </div>

            {stats.splits.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                        <span className="w-8 h-px bg-slate-600 mr-2"></span> Parziali
                    </h3>
                    <div className="space-y-1">
                        <div className="grid grid-cols-[30px_1fr_60px_50px_40px] gap-x-2 text-[10px] text-slate-500 font-bold uppercase px-2 mb-1">
                            <div className="text-center">Km</div>
                            <span>Ritmo</span>
                            <span className="text-right">Tempo</span>
                            <span className="text-right">Disl.</span>
                            <span className="text-right">FC</span>
                        </div>
                         <div className="space-y-1 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                            {stats.splits.map(split => {
                                const isSelected = selectedSegment && 'splitNumber' in selectedSegment && selectedSegment.splitNumber === split.splitNumber;
                                
                                let barWidthPercent = 0;
                                if (paceRange > 0 && split.pace > 0) {
                                  const normalizedPace = (maxPace - split.pace) / paceRange;
                                  barWidthPercent = Math.max(10, normalizedPace * 100);
                                } else if (stats.splits.some(s => s.pace > 0)) {
                                  barWidthPercent = 50;
                                }

                                return (
                                    <div 
                                        key={split.splitNumber}
                                        onClick={() => onSegmentSelect(split)}
                                        className={`grid grid-cols-[30px_1fr_60px_50px_40px] gap-x-2 items-center text-xs px-2 py-1.5 rounded cursor-pointer transition-all ${
                                            isSelected 
                                                ? 'bg-sky-500/40 border border-sky-400/50' 
                                                : 'bg-slate-700/40 border border-transparent hover:bg-slate-700/60'
                                        }`}
                                    >
                                        <div className="font-bold text-slate-400 text-center">{split.splitNumber}</div>
                                        
                                        <div className="flex items-center gap-2">
                                            <div className="flex-grow bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 ${split.isFastest ? 'bg-green-400' : split.isSlowest ? 'bg-red-400' : 'bg-cyan-500'}`}
                                                    style={{ width: `${barWidthPercent}%` }}
                                                ></div>
                                            </div>
                                            <div className="font-mono text-[10px] w-8">{formatPace(split.pace)}</div>
                                        </div>

                                        <div className="text-right font-mono text-slate-300">{formatDuration(split.duration)}</div>
                                        <div className="text-right font-mono text-slate-300">+{Math.round(split.elevationGain)}m</div>
                                        <div className="text-right font-mono text-slate-300">{split.avgHr ? Math.round(split.avgHr) : '--'}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            
            {stats.pauses.length > 0 && (
                 <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                        <span className="w-8 h-px bg-slate-600 mr-2"></span> Pause ({stats.pauses.length})
                    </h3>
                     <div className="space-y-1">
                        {stats.pauses.map((pause, index) => {
                             const isSelected = selectedSegment && 'startPoint' in selectedSegment && selectedSegment.startPoint.time.getTime() === pause.startPoint.time.getTime();
                             return (
                                 <div 
                                    key={index}
                                    onClick={() => onSegmentSelect(pause)}
                                    className={`flex justify-between items-center p-2 rounded text-xs border transition-all ${
                                        isSelected
                                            ? 'bg-amber-500/30 border-amber-400/50'
                                            : 'bg-slate-700/30 border-transparent hover:bg-slate-700/50'
                                    }`}
                                 >
                                     <span className="text-slate-300 font-semibold">Pausa a {pause.startPoint.cummulativeDistance.toFixed(2)} km</span>
                                     <span className="font-mono text-amber-400">{formatDuration(pause.duration * 1000)}</span>
                                 </div>
                             );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatsPanel;
