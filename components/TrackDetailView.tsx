
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
import { getTrackSegmentColors, ColoredSegment } from '../services/colorService';


interface TrackDetailViewProps {
    track: Track;
    userProfile: UserProfile;
    onExit: () => void;
    onOpenChat: () => void;
}

const metricLabels: Record<YAxisMetric, string> = {
    pace: 'Ritmo',
    elevation: 'Altitudine',
    speed: 'Velocità',
    hr: 'FC',
};

const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-14.304 0c-1.978-.292-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.678 3.348-3.97ZM6.75 8.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H7.5Z" clipRule="evenodd" />
    </svg>
);

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


const TrackDetailView: React.FC<TrackDetailViewProps> = ({ track, userProfile, onExit, onOpenChat }) => {
    const [yAxisMetrics, setYAxisMetrics] = useState<YAxisMetric[]>(['pace']);
    const [hoveredPoint, setHoveredPoint] = useState<TrackPoint | null>(null);
    const [showPauses, setShowPauses] = useState(false);
    const [selectedSegment, setSelectedSegment] = useState<Split | PauseSegment | AiSegment | null>(null);
    const [mapGradientMetric, setMapGradientMetric] = useState<'none' | 'elevation' | 'pace' | 'speed' | 'hr' | 'hr_zones'>('none');
    const [gradientSegments, setGradientSegments] = useState<ColoredSegment[]>([]);
    const [hoveredMetricValue, setHoveredMetricValue] = useState<number | null>(null);

    useEffect(() => {
        if (track) {
            const segments = getTrackSegmentColors(track, mapGradientMetric);
            setGradientSegments(segments);
        }
    }, [track, mapGradientMetric]);

    const stats = useMemo(() => calculateTrackStats(track), [track]);

    const hasHrData = useMemo(() => {
        return track.points.some(p => p.hr !== undefined && p.hr > 0) ?? false;
    }, [track]);
    
    useEffect(() => {
        if (hoveredPoint && track && mapGradientMetric !== 'none' && mapGradientMetric !== 'hr_zones') {
            let value: number | null = null;
            if (mapGradientMetric === 'elevation') {
                value = hoveredPoint.ele;
            } else if (mapGradientMetric === 'hr') {
                value = hoveredPoint.hr ?? null;
            } else if (mapGradientMetric === 'speed' || mapGradientMetric === 'pace') {
                const pointIndex = track.points.findIndex(p => p.time.getTime() === hoveredPoint.time.getTime());
                if (pointIndex > 0) {
                    const p1 = track.points[pointIndex - 1];
                    const p2 = hoveredPoint;
                    const dist = p2.cummulativeDistance - p1.cummulativeDistance;
                    const timeHours = (p2.time.getTime() - p1.time.getTime()) / 3600000;
                     if (timeHours > 1e-6) {
                        const speed = dist / timeHours;
                        if (mapGradientMetric === 'speed') value = speed;
                        else if (speed > 0.1) value = 60 / speed; // pace
                    } else {
                        value = mapGradientMetric === 'pace' ? 99 : 0;
                    }
                }
            }
            setHoveredMetricValue(value);
        } else {
            setHoveredMetricValue(null);
        }
    }, [hoveredPoint, track, mapGradientMetric]);

    const handleHoverChange = useCallback((point: TrackPoint | null) => {
        setHoveredPoint(point);
    }, []);
    
    const toggleYAxisMetric = useCallback((metric: YAxisMetric) => {
        setYAxisMetrics(prev => {
            const newMetrics = new Set(prev);
            if (newMetrics.has(metric)) {
                if (newMetrics.size > 1) { // Can't deselect the last one
                    newMetrics.delete(metric);
                }
            } else {
                newMetrics.add(metric);
            }
            return Array.from(newMetrics);
        });
    }, []);

    const handleSegmentSelect = useCallback((segment: Split | PauseSegment | AiSegment | null) => {
        if (!segment) {
            setSelectedSegment(null);
            return;
        }
        
        if (selectedSegment) {
             if ('splitNumber' in segment && 'splitNumber' in selectedSegment && segment.splitNumber === selectedSegment.splitNumber) {
                setSelectedSegment(null); return;
            }
            if ('startPoint' in segment && 'startPoint' in selectedSegment && segment.startPoint.time.getTime() === selectedSegment.startPoint.time.getTime()) {
                setSelectedSegment(null); return;
            }
            if ('type' in segment && segment.type === 'ai' && 'type' in selectedSegment && selectedSegment.type === 'ai' && segment.startDistance === selectedSegment.startDistance) {
                setSelectedSegment(null); return;
            }
        }
        
        setSelectedSegment(segment);
    }, [selectedSegment]);

    const selectionPoints = useMemo(() => {
        if (!selectedSegment || !stats) return null;

        if ('splitNumber' in selectedSegment) { // It's a Split
            let startDistance = 0;
            for (let i = 0; i < selectedSegment.splitNumber - 1; i++) {
                if (stats.splits[i]) {
                    startDistance += stats.splits[i].distance;
                }
            }
            const endDistance = startDistance + selectedSegment.distance;
            return getPointsInDistanceRange(track, startDistance, endDistance);
        }
        
        if ('startPoint' in selectedSegment) { // It's a PauseSegment
            return getPointsInDistanceRange(track, selectedSegment.startPoint.cummulativeDistance, selectedSegment.endPoint.cummulativeDistance);
        }
        
        if ('type' in selectedSegment && selectedSegment.type === 'ai') { // It's an AiSegment
            return getPointsInDistanceRange(track, selectedSegment.startDistance, selectedSegment.endDistance);
        }

        return null;
    }, [selectedSegment, track, stats]);

    const highlightedChartRange = useMemo(() => {
        if (!selectedSegment || !stats) return null;

        if ('splitNumber' in selectedSegment) { // It's a Split
            let startDistance = 0;
            for (let i = 0; i < selectedSegment.splitNumber - 1; i++) {
                if (stats.splits[i]) {
                    startDistance += stats.splits[i].distance;
                }
            }
            const endDistance = startDistance + selectedSegment.distance;
            return { startDistance, endDistance };
        }
        
        if ('startPoint' in selectedSegment) { // It's a PauseSegment
            return { startDistance: selectedSegment.startPoint.cummulativeDistance, endDistance: selectedSegment.endPoint.cummulativeDistance };
        }
        
        if ('type' in selectedSegment && selectedSegment.type === 'ai') { // It's an AiSegment
            return { startDistance: selectedSegment.startDistance, endDistance: selectedSegment.endDistance };
        }

        return null;
    }, [selectedSegment, stats]);
    
    const aiSegmentForMap = useMemo(() => {
        if(selectedSegment && 'type' in selectedSegment && selectedSegment.type === 'ai') {
            return selectedSegment;
        }
        return null;
    }, [selectedSegment]);

    const visibleTrackIds = useMemo(() => new Set([track.id]), [track]);
    
    return (
        <div className="flex flex-col h-screen w-screen font-sans bg-slate-900 text-white">
             <header className="flex items-center justify-between p-3 bg-slate-800 border-b border-slate-700 flex-shrink-0 z-10">
                <button
                    onClick={onExit}
                    className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    &larr; Back to Visualizer
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-bold text-sky-400">Activity Details</h1>
                    <p className="text-sm text-slate-400 truncate max-w-md" title={track.name}>{track.name}</p>
                </div>
                 <div className="flex items-center space-x-2">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <GradientIcon />
                        </div>
                        <select
                            value={mapGradientMetric}
                            onChange={(e) => setMapGradientMetric(e.target.value as any)}
                            className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 pl-9 pr-4 rounded-md transition-colors appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="none">Default</option>
                            <option value="elevation">Elevation</option>
                            <option value="pace">Pace</option>
                            <option value="speed">Speed</option>
                            <option value="hr" disabled={!hasHrData}>Heart Rate (Gradient)</option>
                            <option value="hr_zones" disabled={!hasHrData}>Heart Rate (Zones)</option>
                        </select>
                    </div>
                 </div>
            </header>

            <main className="flex flex-grow overflow-hidden">
                <ResizablePanel direction="vertical" initialSize={450} minSize={300}>
                    <div className="w-full h-full overflow-y-auto p-4 bg-slate-800">
                        <StatsPanel 
                            stats={stats} 
                            selectedSegment={selectedSegment}
                            onSegmentSelect={handleSegmentSelect}
                        />
                         {hasHrData && <HeartRateZonePanel track={track} userProfile={userProfile} />}
                        <PersonalRecordsPanel track={track} />
                        <WeatherPanel track={track} />
                        <GeminiTrackAnalysisPanel stats={stats} userProfile={userProfile} track={track} />
                        <GeminiSegmentsPanel track={track} stats={stats} onSegmentSelect={handleSegmentSelect} selectedSegment={aiSegmentForMap} />
                    </div>
                    <div className="flex-grow flex flex-col h-full">
                        <div className="flex flex-col-reverse flex-grow overflow-hidden h-full">
                            <ResizablePanel direction="horizontal" initialSize={192} minSize={120}>
                                <div className="bg-slate-800 p-4 relative h-full overflow-hidden">
                                    <div className="absolute top-2 left-12 z-10 flex items-center bg-slate-700/50 p-1 rounded-md">
                                        <div className="flex space-x-1">
                                            {(['pace', 'elevation', 'speed', 'hr'] as const).map(metric => {
                                                const isDisabled = metric === 'hr' && !hasHrData;
                                                const isActive = yAxisMetrics.includes(metric);
                                                return (
                                                    <button
                                                        key={metric}
                                                        onClick={() => toggleYAxisMetric(metric)}
                                                        disabled={isDisabled}
                                                        className={`px-3 py-1 text-xs rounded-md transition-colors font-semibold ${
                                                            isActive
                                                                ? 'bg-sky-500 text-white'
                                                                : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                                                        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        title={isDisabled ? 'Dati frequenza cardiaca non disponibili' : `Mostra ${metricLabels[metric]}`}
                                                    >
                                                        {metricLabels[metric]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="border-l border-slate-600 h-5 mx-2"></div>
                                        <button
                                            onClick={() => setShowPauses(p => !p)}
                                            className={`flex items-center px-3 py-1 text-xs rounded-md transition-colors font-semibold ${
                                                showPauses
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-slate-600 hover:bg-slate-500 text-slate-300'
                                            }`}
                                            title="Mostra/nascondi pause"
                                        >
                                            <ClockIcon />
                                            Pause
                                        </button>
                                    </div>
                                    <TimelineChart 
                                        track={track} 
                                        onSelectionChange={() => {}} // No selection editing in this view
                                        yAxisMetrics={yAxisMetrics}
                                        onChartHover={handleHoverChange}
                                        hoveredPoint={hoveredPoint}
                                        pauseSegments={stats.pauses}
                                        showPauses={showPauses}
                                        highlightedRange={highlightedChartRange}
                                        gradientSegments={gradientSegments}
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
                                        onExitAnimation={() => {}}
                                        fastestSplitForAnimation={null}
                                        animationHighlight={null}
                                        hoveredLegendValue={hoveredMetricValue}
                                        aiSegmentHighlight={aiSegmentForMap}
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
