



import React from 'react';
// Import AiSegment to be used in the props interface.
import { TrackStats, Split, PauseSegment, AiSegment } from '../types';

interface StatsPanelProps {
    stats: TrackStats;
    // Allow AiSegment in selectedSegment to match the state in the parent component.
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
    <div className={`flex flex-col ${className}`}>
        <span className="text-sm text-slate-400">{title}</span>
        <span className="text-2xl font-semibold text-white">{value}</span>
        {subvalue && <span className="text-xs text-slate-500">{subvalue}</span>}
    </div>
);

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, selectedSegment, onSegmentSelect }) => {

    return (
        <div className="text-white space-y-6">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                <StatCard title="Distanza" value={`${stats.totalDistance.toFixed(2)}`} subvalue="kilometers" />
                <StatCard title="Tempo in movimento" value={formatDuration(stats.movingDuration)} subvalue={`Totale ${formatDuration(stats.totalDuration)}`} />
                <StatCard title="Ritmo medio" value={formatPace(stats.movingAvgPace)} subvalue={`Complessivo ${formatPace(stats.avgPace)} /km`} />
                <StatCard title="Dislivello" value={`${Math.round(stats.elevationGain)} m`} subvalue={`${Math.round(stats.elevationLoss)} m persi`} />
                {stats.avgHr && <StatCard title="Frequenza cardiaca" value={`${Math.round(stats.avgHr)} bpm`} subvalue={`Min: ${stats.minHr} / Max: ${stats.maxHr}`} />}
                <StatCard title="Velocità massima" value={`${stats.maxSpeed.toFixed(1)}`} subvalue="km/h" />
            </div>

            {/* Splits Table */}
            {stats.splits.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-slate-200 mb-2 border-t border-slate-700 pt-4">Parziali (1km)</h3>
                    <div className="space-y-1">
                        <div className="grid grid-cols-5 gap-2 text-xs text-slate-400 font-semibold px-2">
                            <span>Km</span>
                            <span className="text-right">Ritmo</span>
                            <span className="text-right">Tempo</span>
                            <span className="text-right">Disl.</span>
                            <span className="text-right">FC</span>
                        </div>
                         <div className="max-h-60 overflow-y-auto pr-1">
                            {stats.splits.map(split => {
                                const isSelected = selectedSegment && 'splitNumber' in selectedSegment && selectedSegment.splitNumber === split.splitNumber;
                                return (
                                    <div 
                                        key={split.splitNumber}
                                        onClick={() => onSegmentSelect(split)}
                                        className={`grid grid-cols-5 gap-2 text-sm p-2 rounded-md cursor-pointer transition-colors ${
                                            isSelected 
                                                ? 'bg-sky-500/30' 
                                                : 'hover:bg-slate-700'
                                        } ${!isSelected && split.isFastest ? 'bg-green-500/20' : ''} ${!isSelected && split.isSlowest ? 'bg-red-500/20' : ''}`}
                                    >
                                        <div className="font-bold text-slate-300">{split.splitNumber}</div>
                                        <div className="text-right font-mono">{formatPace(split.pace)}</div>
                                        <div className="text-right font-mono text-slate-400">{formatDuration(split.duration)}</div>
                                        <div className="text-right font-mono text-slate-400">+{Math.round(split.elevationGain)}m</div>
                                        <div className="text-right font-mono text-slate-400">{split.avgHr ? Math.round(split.avgHr) : '--'}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Pauses */}
            {stats.pauses.length > 0 && (
                 <div>
                    <h3 className="text-lg font-semibold text-slate-200 mb-2 border-t border-slate-700 pt-4">Pause ({stats.pauses.length})</h3>
                     <div className="space-y-1 text-sm">
                        {stats.pauses.map((pause, index) => {
                             const isSelected = selectedSegment && 'startPoint' in selectedSegment && selectedSegment.startPoint.time.getTime() === pause.startPoint.time.getTime();
                             return (
                                 <div 
                                    key={index}
                                    onClick={() => onSegmentSelect(pause)}
                                    className={`flex justify-between items-center p-2 rounded-md cursor-pointer transition-colors ${
                                        isSelected
                                            ? 'bg-sky-500/30'
                                            : 'bg-slate-700/50 hover:bg-slate-700'
                                    }`}
                                 >
                                     <span className="text-slate-300">Pausa a {pause.startPoint.cummulativeDistance.toFixed(2)} km</span>
                                     <span className="font-mono">{formatDuration(pause.duration * 1000)}</span>
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