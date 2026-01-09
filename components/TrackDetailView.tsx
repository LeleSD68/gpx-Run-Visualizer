
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Track, TrackPoint, Split, PauseSegment, AiSegment, UserProfile, TrackStats, PlannedWorkout } from '../types';
import MapDisplay from './MapDisplay';
import TimelineChart, { YAxisMetric } from './TimelineChart';
import StatsPanel from './StatsPanel';
import WeatherPanel from './WeatherPanel';
import GeminiTrackAnalysisPanel from './GeminiTrackAnalysisPanel';
import GeminiSegmentsPanel from './GeminiSegmentsPanel';
import AiTrainingCoachPanel from './AiTrainingCoachPanel';
import ResizablePanel from './ResizablePanel';
import HeartRateZonePanel from './HeartRateZonePanel';
import PersonalRecordsPanel from './PersonalRecordsPanel';
import { calculateTrackStats } from '../services/trackStatsService';
import { getPointsInDistanceRange } from '../services/trackEditorUtils';
import { smoothTrackPoints, calculateSmoothedMetrics } from '../services/dataProcessingService';

interface TrackDetailViewProps {
    track: Track;
    userProfile: UserProfile;
    onExit: () => void;
    allHistory?: Track[];
    onUpdateTrackMetadata?: (id: string, metadata: Partial<Track>) => void;
    onAddPlannedWorkout?: (workout: PlannedWorkout) => void;
}

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return isMobile;
};

const metricLabels: Record<YAxisMetric, string> = {
    pace: 'Ritmo',
    elevation: 'Altitudine',
    speed: 'Velocità',
    hr: 'FC',
};

const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 mr-1">
        <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm.75-10.25a.75.75 0 0 0-1.5 0v4.5c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75v-3.75Z" clipRule="evenodd" />
    </svg>
);

const NoteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2">
        <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.38 2H4.5Zm10 14.5h-9a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5H11v3.5A1.5 1.5 0 0 0 12.5 7H16v9a.5.5 0 0 1-.5.5ZM16 5.5l-3.5-3.5V5.5H16Z" clipRule="evenodd" />
    </svg>
);

const ShoeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2 text-cyan-400">
        <path d="M2.273 5.625A4.483 4.483 0 0 1 5.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 3H5.25a3 3 0 0 0-2.977 2.625ZM2.273 8.625A4.483 4.483 0 0 1 5.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 6H5.25a3 3 0 0 0-2.977 2.625ZM5.25 9a3 3 0 0 0-3 3v2.25a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3V12a3 3 0 0 0-3-3H5.25Z" />
    </svg>
);

const formatDuration = (ms: number) => {
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

const StatItem: React.FC<{ title: string; value: string | React.ReactNode; subvalue?: string; }> = ({ title, value, subvalue }) => (
    <div className="text-center px-2 sm:px-3 border-r border-slate-600 last:border-0 min-w-[70px]">
      <div className="text-[8px] sm:text-[10px] text-cyan-400 uppercase tracking-widest font-black mb-0.5">{title}</div>
      <div className="text-xs sm:text-base font-black font-mono text-white leading-tight">{value}</div>
      {subvalue && <div className="text-[7px] sm:text-[9px] text-slate-100 font-bold whitespace-nowrap">{subvalue}</div>}
    </div>
);

const SelectionStatsOverlay: React.FC<{ stats: TrackStats, onClose: () => void }> = ({ stats, onClose }) => (
    <div className="absolute top-2 left-2 right-2 z-[2000] bg-slate-800/98 backdrop-blur-md p-2 rounded-lg border border-cyan-500 shadow-2xl flex items-center gap-1 animate-fade-in-down max-w-full overflow-x-auto no-scrollbar">
      <StatItem title="Dist." value={`${stats.totalDistance.toFixed(2)}km`} />
      <StatItem title="Tempo" value={formatDuration(stats.movingDuration)} />
      <StatItem title="Ritmo" value={`${formatPace(stats.movingAvgPace)}/k`} />
      <StatItem title="Disl." value={`+${Math.round(stats.elevationGain)}m`} />
      <button onClick={onClose} className="ml-auto p-1 text-white bg-slate-700 hover:bg-red-600 rounded-full pointer-events-auto shadow-md transition-all shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
      </button>
    </div>
);

const TrackDetailView: React.FC<TrackDetailViewProps> = ({ track, userProfile, onExit, allHistory = [], onUpdateTrackMetadata, onAddPlannedWorkout }) => {
    const isMobile = useIsMobile();
    const [yAxisMetrics, setYAxisMetrics] = useState<YAxisMetric[]>(['pace']);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [showPauses, setShowPauses] = useState(false);
    const [selectedSegment, setSelectedSegment] = useState<Split | PauseSegment | AiSegment | null>(null);
    const [chartSelection, setChartSelection] = useState<{ startDistance: number; endDistance: number } | null>(null);
    const [mapGradientMetric, setMapGradientMetric] = useState<'none' | 'elevation' | 'pace' | 'speed' | 'hr' | 'hr_zones'>('none');
    const [hoveredMetricValue, setHoveredMetricValue] = useState<number | null>(null);
    const [notes, setNotes] = useState(track.notes || '');
    const [smoothingWindow, setSmoothingWindow] = useState(30);

    const stats = useMemo(() => calculateTrackStats(track, smoothingWindow), [track, smoothingWindow]);

    const displayTrack = useMemo(() => {
        if (smoothingWindow <= 1) return track;
        return { ...track, points: smoothTrackPoints(track.points, smoothingWindow) };
    }, [track, smoothingWindow]);

    const hasHrData = useMemo(() => track.points.some(p => p.hr !== undefined && p.hr > 0), [track]);
    
    const selectionStats = useMemo(() => {
        if (!chartSelection) return null;
        const points = getPointsInDistanceRange(displayTrack, chartSelection.startDistance, chartSelection.endDistance);
        if (points.length < 2) return null;
        const tempTrack: Track = { ...displayTrack, id: 'temp-selection', name: 'Selection', points: points, distance: chartSelection.endDistance - chartSelection.startDistance, duration: points[points.length - 1].time.getTime() - points[0].time.getTime() };
        return calculateTrackStats(tempTrack, 0);
    }, [chartSelection, displayTrack]);

    useEffect(() => {
        if (hoveredPoint && displayTrack && mapGradientMetric !== 'none' && mapGradientMetric !== 'hr_zones') {
            let value: number | null = null;
            if (mapGradientMetric === 'elevation') value = hoveredPoint.ele;
            else if (mapGradientMetric === 'hr') value = hoveredPoint.hr ?? null;
            else if (mapGradientMetric === 'speed' || mapGradientMetric === 'pace') {
                const pointIndex = track.points.findIndex(p => p.time.getTime() === hoveredPoint.time.getTime());
                if (pointIndex > 0) {
                    const { speed, pace } = calculateSmoothedMetrics(track.points, pointIndex, smoothingWindow);
                    if (mapGradientMetric === 'speed') value = speed;
                    else value = pace;
                }
            }
            setHoveredMetricValue(value);
        } else setHoveredMetricValue(null);
    }, [hoveredPoint, track, mapGradientMetric, smoothingWindow]);

    const handleHoverChange = useCallback((point: TrackPoint | null) => setHoveredPoint(point), []);
    
    const toggleYAxisMetric = useCallback((metric: YAxisMetric) => {
        setYAxisMetrics(prev => {
            const next = new Set(prev);
            if (next.has(metric)) { if (next.size > 1) next.delete(metric); }
            else next.add(metric);
            return Array.from(next);
        });
    }, []);

    const handleSegmentSelect = useCallback((segment: Split | PauseSegment | AiSegment | null) => {
        setSelectedSegment(segment);
        if (segment) setChartSelection(null);
    }, []);

    const handleChartSelection = useCallback((selection: { startDistance: number; endDistance: number } | null) => {
        setChartSelection(selection);
        if (selection) setSelectedSegment(null);
    }, []);

    const selectionPoints = useMemo(() => {
        if (chartSelection) return getPointsInDistanceRange(displayTrack, chartSelection.startDistance, chartSelection.endDistance);
        if (!selectedSegment) return null;
        if ('splitNumber' in selectedSegment) {
            let startDist = (selectedSegment.splitNumber - 1);
            return getPointsInDistanceRange(displayTrack, startDist, startDist + selectedSegment.distance);
        }
        if ('startPoint' in selectedSegment) return getPointsInDistanceRange(displayTrack, selectedSegment.startPoint.cummulativeDistance, selectedSegment.endPoint.cummulativeDistance);
        if ('type' in selectedSegment && selectedSegment.type === 'ai') return getPointsInDistanceRange(displayTrack, selectedSegment.startDistance, selectedSegment.endDistance);
        return null;
    }, [selectedSegment, chartSelection, displayTrack]);

    const highlightedChartRange = useMemo(() => {
        if (chartSelection) return chartSelection;
        if (!selectedSegment) return null;
        if ('splitNumber' in selectedSegment) {
            let startDist = (selectedSegment.splitNumber - 1);
            return { startDistance: startDist, endDistance: startDist + selectedSegment.distance };
        }
        if ('startPoint' in selectedSegment) return { startDistance: selectedSegment.startPoint.cummulativeDistance, endDistance: selectedSegment.endPoint.cummulativeDistance };
        if ('type' in selectedSegment && selectedSegment.type === 'ai') return { startDistance: selectedSegment.startDistance, endDistance: selectedSegment.endDistance };
        return null;
    }, [selectedSegment, chartSelection]);

    const handleNoteSave = () => onUpdateTrackMetadata?.(track.id, { notes });
    const handleShoeChange = (e: React.ChangeEvent<HTMLSelectElement>) => onUpdateTrackMetadata?.(track.id, { shoe: e.target.value });
    
    const statsContent = (
        <div className="space-y-6 p-3 sm:p-5">
            <StatsPanel stats={stats} selectedSegment={selectedSegment} onSegmentSelect={handleSegmentSelect} />
            <AiTrainingCoachPanel track={displayTrack} stats={stats} userProfile={userProfile} allHistory={allHistory} onAddPlannedWorkout={onAddPlannedWorkout} />

            <div className="border-t border-slate-700 pt-5">
                <label className="block text-sm font-black text-cyan-400 uppercase tracking-widest mb-3 flex items-center">
                    <ShoeIcon /> Scarpe Usate
                </label>
                <select value={track.shoe || ''} onChange={handleShoeChange} className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl p-3 text-sm text-white font-bold focus:border-cyan-500 appearance-none cursor-pointer shadow-inner">
                    <option value="">-- Seleziona Scarpe --</option>
                    {userProfile.shoes?.map((shoe, idx) => <option key={idx} value={shoe}>{shoe}</option>)}
                </select>
            </div>

            <div className="border-t border-slate-700 pt-5">
                <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest mb-3 flex items-center">
                    <NoteIcon /> Note Corsa
                </h3>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={handleNoteSave} placeholder="Com'è andata?" className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl p-4 text-sm text-white font-medium h-24 focus:border-cyan-500 resize-none shadow-inner" />
            </div>

            {hasHrData && <HeartRateZonePanel track={displayTrack} userProfile={userProfile} />}
            <PersonalRecordsPanel track={displayTrack} />
            <WeatherPanel track={track} />
            <GeminiTrackAnalysisPanel stats={stats} userProfile={userProfile} track={displayTrack} allHistory={allHistory} />
            <GeminiSegmentsPanel track={displayTrack} stats={stats} onSegmentSelect={handleSegmentSelect} selectedSegment={selectedSegment as AiSegment} />
        </div>
    );

    const chartControls = (
        <div className="w-full h-full flex items-center justify-between px-2 bg-slate-800/90 border-b border-slate-700">
            <div className="flex space-x-0.5">
                {(['pace', 'elevation', 'speed', 'hr'] as const).map(metric => {
                    const isDisabled = metric === 'hr' && !hasHrData;
                    const isActive = yAxisMetrics.includes(metric);
                    return (
                        <button key={metric} onClick={() => toggleYAxisMetric(metric)} disabled={isDisabled} className={`px-1.5 py-0.5 text-[7px] sm:text-[10px] uppercase tracking-widest rounded transition-all font-black border ${isActive ? 'bg-cyan-600 border-cyan-400 text-white shadow-md' : 'bg-slate-700 border-slate-600 text-slate-300'} ${isDisabled ? 'opacity-20 cursor-not-allowed' : ''}`}>
                            {metricLabels[metric]}
                        </button>
                    );
                })}
            </div>
            <button onClick={() => setShowPauses(p => !p)} className={`flex items-center px-1.5 py-0.5 text-[8px] sm:text-[10px] uppercase tracking-widest rounded transition-all font-black border ${showPauses ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>
                <ClockIcon /> Pause
            </button>
        </div>
    );

    const chartSection = (
        <div className="w-full h-full relative group bg-slate-900 overflow-hidden">
            <TimelineChart 
                track={displayTrack} 
                onSelectionChange={handleChartSelection}
                yAxisMetrics={yAxisMetrics}
                onChartHover={handleHoverChange}
                hoveredPoint={hoveredPoint}
                pauseSegments={stats.pauses}
                showPauses={showPauses}
                highlightedRange={highlightedChartRange}
                smoothingWindow={smoothingWindow}
            />
        </div>
    );

    const mapSection = (
        <div className="w-full h-full relative bg-slate-900">
             {selectionStats && <SelectionStatsOverlay stats={selectionStats} onClose={() => setChartSelection(null)} />}
             <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                 <select value={mapGradientMetric} onChange={(e) => setMapGradientMetric(e.target.value as any)} className="bg-slate-800/95 border border-slate-700 text-white text-[8px] font-black uppercase py-1 px-1.5 rounded focus:border-cyan-500 appearance-none cursor-pointer shadow-lg">
                    <option value="none">Mappa: Standard</option>
                    <option value="elevation">Mappa: Altitudine</option>
                    <option value="pace">Mappa: Ritmo</option>
                    <option value="speed">Mappa: Velocità</option>
                    {hasHrData && <option value="hr">Mappa: FC</option>}
                </select>
             </div>
             <MapDisplay
                tracks={[track]}
                visibleTrackIds={new Set([track.id])}
                raceRunners={null}
                hoveredTrackId={null}
                runnerSpeeds={new Map()}
                hoveredPoint={hoveredPoint}
                onMapHover={handleHoverChange}
                coloredPauseSegments={showPauses ? stats.pauses : undefined}
                selectionPoints={selectionPoints}
                mapGradientMetric={mapGradientMetric}
                animationTrack={null}
                animationProgress={0}
                hoveredLegendValue={hoveredMetricValue}
                aiSegmentHighlight={selectedSegment && 'type' in selectedSegment && selectedSegment.type === 'ai' ? selectedSegment : null}
            />
        </div>
    );

    return (
        <div className="flex flex-col h-full w-full font-sans text-white overflow-hidden bg-slate-900">
             <header className="flex items-center justify-between p-2 sm:p-3 bg-slate-800 border-b border-slate-700 flex-shrink-0 z-30 shadow-lg">
                <button onClick={onExit} className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-black py-1.5 px-3 sm:py-2 sm:px-5 rounded-lg transition-all shadow-sm text-[10px] sm:text-sm">&larr; {isMobile ? 'INDIETRO' : 'CHIUDI'}</button>
                <div className="text-center px-2 flex-grow min-w-0">
                    <h1 className="text-xs sm:text-xl font-black text-cyan-400 uppercase tracking-tighter truncate">Analisi Attività</h1>
                    {!isMobile && <p className="text-xs text-slate-100 font-bold truncate max-w-md mx-auto">{track.name}</p>}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3">
                   <div className="flex flex-col items-end">
                        <span className="text-[7px] text-slate-400 uppercase font-bold">SMOOTH {smoothingWindow}S</span>
                        <input type="range" min="1" max="120" value={smoothingWindow} onChange={(e) => setSmoothingWindow(parseInt(e.target.value))} className="w-12 sm:w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
                    </div>
                </div>
            </header>

            <main className="flex-grow overflow-hidden relative">
                {/* DESKTOP VIEW */}
                <div className="hidden sm:block h-full">
                    <ResizablePanel 
                        direction="vertical" 
                        initialSize={380} 
                        minSize={300}
                        className="h-full"
                    >
                        <div className="h-full overflow-y-auto bg-slate-800 custom-scrollbar">
                            {statsContent}
                        </div>
                        <div className="flex flex-col h-full bg-slate-900">
                            <div className="flex-grow relative border-b border-slate-800">
                                {mapSection}
                            </div>
                            <div className="h-[240px] flex-shrink-0 relative border-t border-slate-700 overflow-hidden flex flex-col">
                                <div className="h-10 flex-shrink-0">
                                    {chartControls}
                                </div>
                                <div className="flex-grow">
                                    {chartSection}
                                </div>
                            </div>
                        </div>
                    </ResizablePanel>
                </div>

                {/* MOBILE VIEW - RIDIMENSIONAMENTO VERTICALE TRIPLE-STACK */}
                <div className="sm:hidden h-full w-full bg-slate-900 flex flex-col">
                    <ResizablePanel 
                        direction="horizontal" 
                        initialSizeRatio={0.5} // 8/16 Stats
                        minSize={100}
                        minSizeSecondary={150}
                    >
                        {/* 1. SEZIONE STATS (8/16) - COLONNA SINGOLA */}
                        <div className="h-full w-full overflow-y-auto bg-slate-800 custom-scrollbar">
                            {statsContent}
                        </div>

                        {/* 2. & 3. SEZIONI GRAFICO E MAPPA (RESTANTI 8/16) */}
                        <ResizablePanel 
                            direction="horizontal" 
                            initialSizeRatio={0.375} // 3/16 del totale (3/8 della sezione rimanente)
                            minSize={80}
                            minSizeSecondary={100}
                        >
                            {/* 2. SEZIONE GRAFICO (1/16 controlli + 2/16 grafico) */}
                            <div className="h-full w-full flex flex-col bg-slate-900 overflow-hidden">
                                <div style={{ height: '33%' }} className="flex-shrink-0">
                                    {chartControls}
                                </div>
                                <div style={{ height: '67%' }} className="flex-grow">
                                    {chartSection}
                                </div>
                            </div>

                            {/* 3. SEZIONE MAPPA (5/16) */}
                            <div className="h-full w-full relative">
                                {mapSection}
                            </div>
                        </ResizablePanel>
                    </ResizablePanel>
                </div>
            </main>
        </div>
    );
};

export default TrackDetailView;
