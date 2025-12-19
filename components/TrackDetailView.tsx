
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Track, TrackPoint, Split, PauseSegment, AiSegment, UserProfile } from '../types';
import MapDisplay from './MapDisplay';
import TimelineChart, { YAxisMetric } from './TimelineChart';
import StatsPanel from './StatsPanel';
import WeatherPanel from './WeatherPanel';
import GeminiTrackAnalysisPanel from './GeminiTrackAnalysisPanel';
import GeminiSegmentsPanel from './GeminiSegmentsPanel';
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
}

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

const GradientIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 mr-1.5">
        <path d="M2 8a6 6 0 1 1 12 0A6 6 0 0 1 2 8Zm6 5a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
        <path d="M8 3a5 5 0 1 0 0 10V3Z" />
    </svg>
);


const TrackDetailView: React.FC<TrackDetailViewProps> = ({ track, userProfile, onExit, allHistory = [] }) => {
    const [yAxisMetrics, setYAxisMetrics] = useState<YAxisMetric[]>(['pace']);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [showPauses, setShowPauses] = useState(false);
    const [selectedSegment, setSelectedSegment] = useState<Split | PauseSegment | AiSegment | null>(null);
    const [mapGradientMetric, setMapGradientMetric] = useState<'none' | 'elevation' | 'pace' | 'speed' | 'hr' | 'hr_zones'>('none');
    const [hoveredMetricValue, setHoveredMetricValue] = useState<number | null>(null);
    
    const [smoothingWindow, setSmoothingWindow] = useState(30);

    const stats = useMemo(() => calculateTrackStats(track, smoothingWindow), [track, smoothingWindow]);

    const displayTrack = useMemo(() => {
        if (smoothingWindow <= 1) return track;
        return {
            ...track,
            points: smoothTrackPoints(track.points, smoothingWindow)
        };
    }, [track, smoothingWindow]);

    const hasHrData = useMemo(() => {
        return track.points.some(p => p.hr !== undefined && p.hr > 0);
    }, [track]);
    
    useEffect(() => {
        if (hoveredPoint && displayTrack && mapGradientMetric !== 'none' && mapGradientMetric !== 'hr_zones') {
            let value: number | null = null;
            if (mapGradientMetric === 'elevation') {
                value = hoveredPoint.ele;
            } else if (mapGradientMetric === 'hr') {
                value = hoveredPoint.hr ?? null;
            } else if (mapGradientMetric === 'speed' || mapGradientMetric === 'pace') {
                const pointIndex = track.points.findIndex(p => p.time.getTime() === hoveredPoint.time.getTime());
                if (pointIndex > 0) {
                    const { speed, pace } = calculateSmoothedMetrics(track.points, pointIndex, smoothingWindow);
                    if (mapGradientMetric === 'speed') value = speed;
                    else value = pace;
                }
            }
            setHoveredMetricValue(value);
        } else {
            setHoveredMetricValue(null);
        }
    }, [hoveredPoint, track, mapGradientMetric, smoothingWindow]);

    const handleHoverChange = useCallback((point: TrackPoint | null) => {
        setHoveredPoint(point);
    }, []);
    
    const toggleYAxisMetric = useCallback((metric: YAxisMetric) => {
        setYAxisMetrics(prev => {
            const newMetrics = new Set(prev);
            if (newMetrics.has(metric)) {
                if (newMetrics.size > 1) newMetrics.delete(metric);
            } else {
                newMetrics.add(metric);
            }
            return Array.from(newMetrics);
        });
    }, []);

    const handleSegmentSelect = useCallback((segment: Split | PauseSegment | AiSegment | null) => {
        setSelectedSegment(segment);
    }, []);

    const selectionPoints = useMemo(() => {
        if (!selectedSegment) return null;
        if ('splitNumber' in selectedSegment) {
            let startDist = (selectedSegment.splitNumber - 1);
            return getPointsInDistanceRange(displayTrack, startDist, startDist + selectedSegment.distance);
        }
        if ('startPoint' in selectedSegment) {
            return getPointsInDistanceRange(displayTrack, selectedSegment.startPoint.cummulativeDistance, selectedSegment.endPoint.cummulativeDistance);
        }
        if ('type' in selectedSegment && selectedSegment.type === 'ai') {
            return getPointsInDistanceRange(displayTrack, selectedSegment.startDistance, selectedSegment.endDistance);
        }
        return null;
    }, [selectedSegment, displayTrack]);

    const highlightedChartRange = useMemo(() => {
        if (!selectedSegment) return null;
        if ('splitNumber' in selectedSegment) {
            let startDist = (selectedSegment.splitNumber - 1);
            return { startDistance: startDist, endDistance: startDist + selectedSegment.distance };
        }
        if ('startPoint' in selectedSegment) {
            return { startDistance: selectedSegment.startPoint.cummulativeDistance, endDistance: selectedSegment.endPoint.cummulativeDistance };
        }
        if ('type' in selectedSegment && selectedSegment.type === 'ai') {
            return { startDistance: selectedSegment.startDistance, endDistance: selectedSegment.endDistance };
        }
        return null;
    }, [selectedSegment]);

    const visibleTrackIds = useMemo(() => new Set([track.id]), [track]);
    
    return (
        <div className="flex flex-col h-full w-full font-sans text-white">
             <header className="flex items-center justify-between p-3 bg-slate-800 border-b border-slate-700 flex-shrink-0 z-10">
                <button
                    onClick={onExit}
                    className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    &larr; Indietro
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-bold text-sky-400">Dettagli Attività</h1>
                    <p className="text-sm text-slate-400 truncate max-w-md">{track.name}</p>
                </div>
                 <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Smoothing Media: {smoothingWindow}s</span>
                        <input 
                            type="range" min="1" max="120" step="1" 
                            value={smoothingWindow} 
                            onChange={(e) => setSmoothingWindow(parseInt(e.target.value))}
                            className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                            <GradientIcon />
                        </div>
                        <select
                            value={mapGradientMetric}
                            onChange={(e) => setMapGradientMetric(e.target.value as any)}
                            className="bg-slate-700 border border-slate-600 text-white text-sm py-2 pl-9 pr-4 rounded-md focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
                        >
                            <option value="none">Mappa: Default</option>
                            <option value="elevation">Mappa: Elevazione</option>
                            <option value="pace">Mappa: Ritmo</option>
                            <option value="speed">Mappa: Velocità</option>
                            {hasHrData && <option value="hr">Mappa: FC (Gradiente)</option>}
                            {hasHrData && <option value="hr_zones">Mappa: FC (Zone)</option>}
                        </select>
                    </div>
                 </div>
            </header>

            <main className="flex flex-grow overflow-hidden">
                <ResizablePanel direction="vertical" initialSize={450} minSize={300}>
                    <div className="w-full h-full overflow-y-auto p-4 bg-slate-800 custom-scrollbar">
                        <StatsPanel 
                            stats={stats} 
                            selectedSegment={selectedSegment}
                            onSegmentSelect={handleSegmentSelect}
                        />
                        {hasHrData && <HeartRateZonePanel track={displayTrack} userProfile={userProfile} />}
                        <PersonalRecordsPanel track={displayTrack} />
                        <WeatherPanel track={track} />
                        <GeminiTrackAnalysisPanel stats={stats} userProfile={userProfile} track={displayTrack} allHistory={allHistory} />
                        <GeminiSegmentsPanel track={displayTrack} stats={stats} onSegmentSelect={handleSegmentSelect} selectedSegment={selectedSegment as AiSegment} />
                    </div>
                    <div className="flex-grow flex flex-col h-full">
                        <div className="flex flex-col-reverse flex-grow overflow-hidden h-full">
                            <ResizablePanel direction="horizontal" initialSize={192} minSize={120}>
                                <div className="bg-slate-800 p-4 relative h-full overflow-hidden border-t border-slate-700">
                                    <div className="absolute top-2 left-12 z-10 flex items-center bg-slate-700/80 backdrop-blur-sm p-1 rounded-md border border-slate-600">
                                        <div className="flex space-x-1">
                                            {(['pace', 'elevation', 'speed', 'hr'] as const).map(metric => {
                                                const isDisabled = metric === 'hr' && !hasHrData;
                                                const isActive = yAxisMetrics.includes(metric);
                                                return (
                                                    <button
                                                        key={metric}
                                                        onClick={() => toggleYAxisMetric(metric)}
                                                        disabled={isDisabled}
                                                        className={`px-3 py-1 text-xs rounded transition-colors font-semibold ${
                                                            isActive
                                                                ? 'bg-sky-500 text-white'
                                                                : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                                                        } ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                    >
                                                        {metricLabels[metric]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="border-l border-slate-600 h-4 mx-2"></div>
                                        <button
                                            onClick={() => setShowPauses(p => !p)}
                                            className={`flex items-center px-3 py-1 text-xs rounded transition-colors font-semibold ${
                                                showPauses ? 'bg-amber-500 text-white' : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                                            }`}
                                        >
                                            <ClockIcon /> Pause
                                        </button>
                                    </div>
                                    <TimelineChart 
                                        track={displayTrack} 
                                        onSelectionChange={() => {}}
                                        yAxisMetrics={yAxisMetrics}
                                        onChartHover={handleHoverChange}
                                        hoveredPoint={hoveredPoint}
                                        pauseSegments={stats.pauses}
                                        showPauses={showPauses}
                                        highlightedRange={highlightedChartRange}
                                        smoothingWindow={smoothingWindow}
                                    />
                                </div>
                                <div className="h-full relative">
                                    <MapDisplay
                                        tracks={[track]}
                                        visibleTrackIds={visibleTrackIds}
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
                            </ResizablePanel>
                        </div>
                    </div>
                </ResizablePanel>
            </main>
        </div>
    );
};

export default TrackDetailView;
