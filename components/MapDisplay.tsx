import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Track, RaceRunner, MapDisplayProps, TrackPoint, PauseSegment, TrackStats, Split, AiSegment } from '../types';
import { calculateTrackStats } from '../services/trackStatsService';
import { getTrackPointAtDistance, getPointsInDistanceRange } from '../services/trackEditorUtils';
import { getTrackSegmentColors, ColoredSegment, GradientMetric } from '../services/colorService';
import AnimationControls from './AnimationControls';
import Tooltip from './Tooltip';

declare const L: any; 

const FitBoundsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M2.5 3.5A1 1 0 0 1 3.5 2.5h2.25a.75.75 0 0 0 0-1.5H3.5A2.5 2.5 0 0 0 1 3.5v2.25a.75.75 0 0 0 1.5 0V3.5ZM17.5 3.5V5.75a.75.75 0 0 0 1.5 0V3.5A2.5 2.5 0 0 0 16.5 1h-2.25a.75.75 0 0 0 0 1.5H16.5A1 1 0 0 1 17.5 3.5ZM2.5 16.5A1 1 0 0 1 3.5 17.5h2.25a.75.75 0 0 0 0-1.5H3.5A2.5 2.5 0 0 0 1 16.5v-2.25a.75.75 0 0 0-1.5 0V16.5a1 1 0 0 1-1 1h-2.25a.75.75 0 0 0 0 1.5H16.5Z" />
    </svg>
);

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM15.657 4.343a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM5.404 14.596a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM4.25 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 .75 10ZM15.657 15.657a.75.75 0 0 1-1.06 0l-1.061-1.06a.75.75 1 1 1.06-1.061l1.061 1.06a.75.75 0 0 1 0 1.061ZM5.404 5.404a.75.75 0 0 1-1.06 0L3.283 4.343a.75.75 1 1 1.06-1.06l1.061 1.061a.75.75 0 0 1 0 1.06ZM10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M7.455 2.67A6.25 6.25 0 0 1 15.33 10.544 6.252 6.252 0 0 0 7.454 2.67ZM10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" clipRule="evenodd" />
    </svg>
);

const ZoomInIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
);

const ZoomOutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M4.25 10a.75.75 0 0 1 .75-.75h10a.75.75 0 0 1 0 1.5H5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
    </svg>
);

interface AnimationStats {
    time: string;
    pace: string;
    elevation: number;
    hr: number | null;
    distance: number;
}

const StatsDisplay: React.FC<{ stats: AnimationStats, splits: Split[], currentDistance: number, visibleMetrics: Set<string> }> = ({ stats, splits, currentDistance, visibleMetrics }) => {
    const showHr = visibleMetrics.has('hr') && stats.hr !== null;
    const showTime = visibleMetrics.has('time');
    const showPace = visibleMetrics.has('pace');
    const showElevation = visibleMetrics.has('elevation');
    const activeMetricsCount = 1 + (showTime ? 1 : 0) + (showPace ? 1 : 0) + (showElevation ? 1 : 0) + (showHr ? 1 : 0);

    return (
        <div className="absolute top-0 left-0 right-0 sm:top-4 sm:left-4 sm:right-auto bg-slate-800/95 sm:bg-slate-800/90 backdrop-blur-md p-3 sm:p-4 rounded-b-xl sm:rounded-xl shadow-2xl text-white z-[1000] border-b sm:border border-slate-600 w-full sm:w-auto sm:max-w-lg transition-all duration-300">
            <div className="grid gap-x-4 gap-y-2" style={{ gridTemplateColumns: `repeat(${activeMetricsCount}, minmax(0, 1fr))` }}>
                <div>
                    <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold">Distanza</div>
                    <div className="text-base sm:text-xl font-bold font-mono">{stats.distance.toFixed(2)} <span className="text-[10px] sm:text-sm text-slate-500">km</span></div>
                </div>
                {showTime && (
                    <div>
                        <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold">Tempo</div>
                        <div className="text-base sm:text-xl font-bold font-mono">{stats.time}</div>
                    </div>
                )}
                {showPace && (
                    <div>
                        <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold">Ritmo</div>
                        <div className="text-base sm:text-xl font-bold font-mono">{stats.pace}</div>
                    </div>
                )}
                {showElevation && (
                    <div>
                        <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold">Elev.</div>
                        <div className="text-base sm:text-xl font-bold font-mono">{stats.elevation} m</div>
                    </div>
                )}
                {showHr && (
                     <div>
                        <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold">FC</div>
                        <div className="text-base sm:text-xl font-bold font-mono text-red-400">{Math.round(stats.hr!)} <span className="text-[10px] sm:text-sm text-slate-500">bpm</span></div>
                    </div>
                )}
            </div>
        </div>
    );
};

const formatPaceFromSpeed = (speedKmh: number): string => {
    if (speedKmh < 0.1) return '--:-- /km';
    const paceInMinutes = 60 / speedKmh;
    const minutes = Math.floor(paceInMinutes);
    const seconds = Math.round((paceInMinutes - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
};

const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const isValidLatLng = (lat: any, lng: any) => typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);

const MapDisplay: React.FC<MapDisplayProps> = ({ 
    tracks, visibleTrackIds, raceRunners, hoveredTrackId, runnerSpeeds, 
    selectionPoints, hoveredPoint, hoveredData, pauseSegments, showPauses, onMapHover, onTrackHover,
    onPauseClick, mapGradientMetric = 'none', coloredPauseSegments, animationTrack, 
    animationProgress = 0, animationPace = 0, onExitAnimation, fastestSplitForAnimation, animationHighlight,
    isAnimationPlaying, onToggleAnimationPlay, onAnimationProgressChange,
    animationSpeed, onAnimationSpeedChange, fitBoundsCounter = 0,
    selectedPoint, onPointClick, hoveredLegendValue, aiSegmentHighlight,
    showSummaryMode
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const polylinesRef = useRef<Map<string, any>>(new Map());
  const raceFaintPolylinesRef = useRef<Map<string, any>>(new Map());
  const raceRunnerMarkersRef = useRef<Map<string, any>>(new Map());
  const kmMarkersLayerGroupRef = useRef<any>(null);
  const hoverMarkerRef = useRef<any>(null);
  const animationMarkerRef = useRef<any>(null);
  const aiSegmentPolylineRef = useRef<any>(null);
  const selectionPolylineRef = useRef<any>(null);
  
  const [isAutoFitEnabled, setIsAutoFitEnabled] = useState(true);
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark');
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(new Set(['time', 'pace', 'elevation', 'hr']));
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const passedKmsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const animationTrackStats = useMemo(() => animationTrack ? calculateTrackStats(animationTrack) : null, [animationTrack]);

  const animationStats = useMemo((): AnimationStats => {
    if (!animationTrack) return { time: '00:00:00', pace: '--:-- /km', elevation: 0, hr: null, distance: 0 };
    const point = getTrackPointAtDistance(animationTrack, animationProgress);
    if (!point) return { time: '00:00:00', pace: '--:-- /km', elevation: 0, hr: null, distance: animationProgress };
    const elapsedMs = point.time.getTime() - animationTrack.points[0].time.getTime();
    return { time: formatDuration(elapsedMs), pace: animationPace > 0 ? `${formatPace(animationPace)} /km` : '--:-- /km', elevation: Math.round(point.ele), hr: point.hr || null, distance: animationProgress };
  }, [animationTrack, animationProgress, animationPace]);

  const handleToggleMetric = useCallback((metric: string) => {
      setVisibleMetrics(prev => {
          const next = new Set(prev);
          if (next.has(metric)) next.delete(metric);
          else next.add(metric);
          return next;
      });
  }, []);

  // Bounds Fitting
  const fitMapToBounds = useCallback(() => {
      const map = mapRef.current;
      if (!map) return;
      let bounds: any = null;
      if (animationTrack) {
        const allPoints = animationTrack.points.filter(p => isValidLatLng(p.lat, p.lon)).map(p => [p.lat, p.lon]);
        if (allPoints.length > 0) bounds = L.latLngBounds(allPoints);
      } else if (aiSegmentHighlight && tracks[0]) {
          const points = getPointsInDistanceRange(tracks[0], aiSegmentHighlight.startDistance, aiSegmentHighlight.endDistance).filter(p => isValidLatLng(p.lat, p.lon));
          if (points.length > 1) bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
      } else if (selectionPoints && selectionPoints.length > 1) {
          bounds = L.latLngBounds(selectionPoints.filter(p => isValidLatLng(p.lat, p.lon)).map(p => [p.lat, p.lon]));
      } else {
          const visibleTracks = tracks.filter(t => visibleTrackIds.has(t.id));
          if (visibleTracks.length > 0) {
              const allPoints = visibleTracks.flatMap(t => t.points.filter(p => isValidLatLng(p.lat, p.lon)).map(p => [p.lat, p.lon]));
              if (allPoints.length > 0) bounds = L.latLngBounds(allPoints);
          }
      }
      if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
  }, [selectionPoints, tracks, visibleTrackIds, animationTrack, aiSegmentHighlight]);

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, { preferCanvas: true, zoomControl: false }).setView([45.60, 12.88], 13);
      const tileUrl = mapTheme === 'light' ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      tileLayerRef.current = L.tileLayer(tileUrl, { attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 20 }).addTo(mapRef.current);
      mapRef.current.on('dragstart zoomstart', () => setIsAutoFitEnabled(false));
      kmMarkersLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);
      const resizeObserver = new ResizeObserver(() => { if (mapRef.current) { mapRef.current.invalidateSize(); if (isAutoFitEnabled) fitMapToBounds(); } });
      resizeObserver.observe(mapContainerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [fitMapToBounds, isAutoFitEnabled]);

  // Update Theme
  useEffect(() => {
      if (mapRef.current && tileLayerRef.current) {
          const tileUrl = mapTheme === 'light' ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
          tileLayerRef.current.setUrl(tileUrl);
      }
  }, [mapTheme]);

  // RENDER TRACKS & ANIMATION
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    polylinesRef.current.forEach(layer => map.removeLayer(layer));
    polylinesRef.current.clear();
    raceFaintPolylinesRef.current.forEach(layer => map.removeLayer(layer));
    raceFaintPolylinesRef.current.clear();
    if (!animationTrack) kmMarkersLayerGroupRef.current?.clearLayers();

    // SPECIAL HANDLING FOR SINGLE TRACK ANIMATION (REPLAY)
    if (animationTrack) {
        // Draw faint base polyline
        const faintLayer = L.polyline(animationTrack.points.map(p => [p.lat, p.lon]), {
            color: animationTrack.color,
            weight: 2,
            opacity: 0.15,
            interactive: false
        }).addTo(map);
        raceFaintPolylinesRef.current.set('base', faintLayer);

        // Draw colored progress path
        const passedPoints = animationTrack.points.filter(p => p.cummulativeDistance <= animationProgress);
        const currentInterp = getTrackPointAtDistance(animationTrack, animationProgress);
        if (currentInterp) passedPoints.push(currentInterp);

        if (passedPoints.length > 1) {
            const progressLayer = L.polyline(passedPoints.map(p => [p.lat, p.lon]), {
                color: animationTrack.color,
                weight: 5,
                opacity: 0.9,
                lineJoin: 'round'
            }).addTo(map);
            polylinesRef.current.set('progress', progressLayer);
        }

        // Centering Map during animation (Always follow cursor if in replay mode)
        if (currentInterp && !showSummaryMode) {
            map.setView([currentInterp.lat, currentInterp.lon], map.getZoom(), { animate: false });
        }

        // Draw Runner Cursor
        if (currentInterp) {
            if (animationMarkerRef.current) map.removeLayer(animationMarkerRef.current);
            const icon = L.divIcon({
                className: 'race-cursor-icon',
                html: `<div class="relative flex flex-col items-center"><div class="cursor-dot animate-pulse shadow-lg" style="background-color: ${animationTrack.color}; width: 20px; height: 20px; border: 3px solid white;"></div><div class="pace-label font-black" style="background-color: ${animationTrack.color};">${animationPace > 0 ? formatPace(animationPace) : '--:--'}</div></div>`,
                iconSize: [60, 40],
                iconAnchor: [30, 20]
            });
            animationMarkerRef.current = L.marker([currentInterp.lat, currentInterp.lon], { icon, zIndexOffset: 2000 }).addTo(map);
        }

        // Handle KM Popups
        const currentKm = Math.floor(animationProgress);
        if (currentKm >= 1 && !passedKmsRef.current.has(currentKm)) {
            passedKmsRef.current.add(currentKm);
            const kmPoint = getTrackPointAtDistance(animationTrack, currentKm);
            if (kmPoint && animationTrackStats) {
                const split = animationTrackStats.splits.find(s => s.splitNumber === currentKm);
                const icon = L.divIcon({
                    className: 'km-marker border-cyan-400 border-2 shadow-cyan-500/50 shadow-md',
                    html: `<span>${currentKm}</span>`,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                });
                const marker = L.marker([kmPoint.lat, kmPoint.lon], { icon }).addTo(kmMarkersLayerGroupRef.current);
                if (split) {
                    marker.bindPopup(`
                        <div class="p-1 font-sans">
                            <div class="text-[10px] font-black text-cyan-400 uppercase tracking-tighter mb-0.5">Km ${currentKm}</div>
                            <div class="text-sm font-black text-white leading-tight">${formatPace(split.pace)}/km</div>
                            <div class="text-[9px] text-slate-400 font-bold mt-1">Tempo: ${formatDuration(split.duration)}</div>
                            <div class="text-[9px] text-slate-500">Alt: +${Math.round(split.elevationGain)}m</div>
                        </div>
                    `, { closeButton: false, offset: [0, -10], className: 'km-info-popup' }).openPopup();
                }
            }
        }
        
        // Reset KM refs if progress resets
        if (animationProgress < 0.1) passedKmsRef.current.clear();

    } else {
        // STANDARD RENDER FOR MULTIPLE TRACKS OR GARA
        if (animationMarkerRef.current) { map.removeLayer(animationMarkerRef.current); animationMarkerRef.current = null; }
        passedKmsRef.current.clear();

        tracks.forEach(track => {
            if (!visibleTrackIds.has(track.id)) return;
            const isHovered = hoveredTrackId === track.id;
            
            if (raceRunners && raceRunners.length > 0) {
                const runner = raceRunners.find(r => r.trackId === track.id);
                if (!runner) return;
                const faintLayer = L.polyline(track.points.map(p => [p.lat, p.lon]), {
                    color: track.color, weight: 2, opacity: 0.15, interactive: false
                }).addTo(map);
                raceFaintPolylinesRef.current.set(track.id, faintLayer);
                const currentDist = runner.position.cummulativeDistance;
                const passedPoints = track.points.filter(p => p.cummulativeDistance <= currentDist);
                if (passedPoints.length > 1) {
                    passedPoints.push(runner.position);
                    const passedLayer = L.polyline(passedPoints.map(p => [p.lat, p.lon]), {
                        color: track.color, weight: 4, opacity: 0.8, lineJoin: 'round'
                    }).addTo(map);
                    polylinesRef.current.set(track.id, passedLayer);
                }
            } 
            else {
                const opacity = isHovered ? 1 : 0.6;
                const weight = isHovered ? 5 : 3;
                let layer;
                if (mapGradientMetric !== 'none') {
                    const coloredSegments = getTrackSegmentColors(track, mapGradientMetric as GradientMetric, track.color);
                    layer = L.featureGroup(coloredSegments.map(seg => L.polyline([[seg.p1.lat, seg.p1.lon], [seg.p2.lat, seg.p2.lon]], { color: seg.color, weight: weight + 1, opacity: opacity, lineJoin: 'round' })));
                } else {
                    layer = L.polyline(track.points.map(p => [p.lat, p.lon]), { color: track.color, weight: weight, opacity: opacity, lineJoin: 'round' });
                }
                layer.on('mouseover', () => onTrackHover?.(track.id));
                layer.on('mouseout', () => onTrackHover?.(null));
                layer.addTo(map);
                polylinesRef.current.set(track.id, layer);
            }
            if (!raceRunners && (visibleTrackIds.size === 1 || isHovered)) {
                for (let km = 1; km < track.distance; km++) {
                    const pt = getTrackPointAtDistance(track, km);
                    if (pt) {
                        const icon = L.divIcon({ className: 'km-marker', html: `<span>${km}</span>`, iconSize: [20, 20], iconAnchor: [10, 10] });
                        L.marker([pt.lat, pt.lon], { icon, interactive: false }).addTo(kmMarkersLayerGroupRef.current);
                    }
                }
            }
        });
    }

    if (selectionPolylineRef.current) map.removeLayer(selectionPolylineRef.current);
    if (selectionPoints && selectionPoints.length > 1) {
        selectionPolylineRef.current = L.polyline(selectionPoints.map(p => [p.lat, p.lon]), { color: '#fde047', weight: 8, opacity: 0.8, lineCap: 'round', dashArray: '1, 10' }).addTo(map);
    }
    if (aiSegmentPolylineRef.current) map.removeLayer(aiSegmentPolylineRef.current);
    if (aiSegmentHighlight && tracks.length > 0) {
        const pts = getPointsInDistanceRange(tracks[0], aiSegmentHighlight.startDistance, aiSegmentHighlight.endDistance);
        if (pts.length > 1) {
            aiSegmentPolylineRef.current = L.polyline(pts.map(p => [p.lat, p.lon]), { color: '#22d3ee', weight: 10, opacity: 0.9, lineCap: 'round' }).addTo(map);
        }
    }
  }, [tracks, visibleTrackIds, hoveredTrackId, mapGradientMetric, selectionPoints, aiSegmentHighlight, onTrackHover, raceRunners, animationTrack, animationProgress, animationPace, isAnimationPlaying, showSummaryMode, animationTrackStats]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    raceRunnerMarkersRef.current.forEach(m => map.removeLayer(m));
    raceRunnerMarkersRef.current.clear();
    if (raceRunners && raceRunners.length > 0) {
        raceRunners.forEach(runner => {
            const icon = L.divIcon({ className: 'race-cursor-icon', html: `<div class="relative flex flex-col items-center"><div class="cursor-dot" style="background-color: ${runner.color};"></div><div class="pace-label" style="background-color: ${runner.color};">${formatPace(runner.pace)}</div></div>`, iconSize: [60, 40], iconAnchor: [30, 20] });
            const marker = L.marker([runner.position.lat, runner.position.lon], { icon, zIndexOffset: 1000 }).addTo(map);
            raceRunnerMarkersRef.current.set(runner.trackId, marker);
        });
    }
  }, [raceRunners, tracks]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hoveredPoint) {
        if (hoverMarkerRef.current) { map?.removeLayer(hoverMarkerRef.current); hoverMarkerRef.current = null; }
        return;
    }
    if (hoverMarkerRef.current) map.removeLayer(hoverMarkerRef.current);

    if (hoveredData) {
        const items = Object.entries(hoveredData).map(([k, v]) => `<div><span class="text-[8px] uppercase font-black opacity-60">${k}:</span> <span class="font-black text-[10px]">${v}</span></div>`).join('');
        const icon = L.divIcon({
            className: 'hover-info-cursor',
            html: `
                <div class="relative flex flex-col items-center">
                    <div class="w-4 h-4 bg-cyan-500 border-2 border-white rounded-full shadow-lg"></div>
                    <div class="absolute bottom-full mb-2 bg-slate-900/95 text-white p-2 rounded-lg border border-cyan-500/50 shadow-2xl whitespace-nowrap min-w-[100px] flex flex-col gap-0.5 z-[2000] pointer-events-none">
                        <div class="text-[9px] font-black text-cyan-400 border-b border-slate-700 pb-1 mb-1 uppercase tracking-tighter">KM ${hoveredPoint.cummulativeDistance.toFixed(2)}</div>
                        ${items}
                    </div>
                </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        hoverMarkerRef.current = L.marker([hoveredPoint.lat, hoveredPoint.lon], { icon, zIndexOffset: 3000 }).addTo(map);
    } else {
        hoverMarkerRef.current = L.circleMarker([hoveredPoint.lat, hoveredPoint.lon], { radius: 7, color: '#fff', fillColor: '#0ea5e9', fillOpacity: 1, weight: 3 }).addTo(map);
    }
  }, [hoveredPoint, hoveredData]);

  useEffect(() => { if (isAutoFitEnabled && !raceRunners && !animationTrack) fitMapToBounds(); }, [isAutoFitEnabled, fitMapToBounds, raceRunners, animationTrack, visibleTrackIds]);
  useEffect(() => { if (fitBoundsCounter > 0) fitMapToBounds(); }, [fitBoundsCounter, fitMapToBounds]);

  return (
    <div className="relative h-full w-full bg-slate-900">
      <div ref={mapContainerRef} className="h-full w-full" />
       {!animationTrack && (
            <div className="absolute top-2 left-2 right-2 z-[1000] pointer-events-none flex items-center justify-between">
                <div className="flex items-center gap-1 pointer-events-auto">
                    <div className="w-12 h-12 flex-shrink-0 sm:hidden"></div>
                    <Tooltip text="Inquadra" position="bottom"><button onClick={() => { setIsAutoFitEnabled(true); fitMapToBounds(); }} className={`p-3 rounded-lg shadow-xl transition-all border border-slate-700 active:scale-95 ${isAutoFitEnabled ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'}`}><FitBoundsIcon /></button></Tooltip>
                    <Tooltip text="Tema" position="bottom"><button onClick={() => setMapTheme(prev => prev === 'dark' ? 'light' : 'dark')} className="p-3 rounded-lg shadow-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-95">{mapTheme === 'dark' ? <SunIcon /> : <MoonIcon />}</button></Tooltip>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-slate-800/90 backdrop-blur-md rounded-lg border border-slate-700 shadow-xl pointer-events-auto overflow-hidden">
                    <button onClick={() => mapRef.current?.zoomOut()} className="p-3 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border-r border-slate-700 active:bg-slate-600"><ZoomOutIcon /></button>
                    <button onClick={() => mapRef.current?.zoomIn()} className="p-3 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors active:bg-slate-600"><ZoomInIcon /></button>
                </div>
                <div className="w-12 h-12 hidden sm:block"></div>
            </div>
       )}
        {animationTrack && !showSummaryMode && (
            <>
                <StatsDisplay stats={animationStats} splits={animationTrackStats?.splits || []} currentDistance={animationProgress} visibleMetrics={visibleMetrics} />
                <AnimationControls isPlaying={isAnimationPlaying!} onTogglePlay={onToggleAnimationPlay!} progress={animationProgress} totalDistance={animationTrack.distance} onProgressChange={onAnimationProgressChange!} speed={animationSpeed!} onSpeedChange={onAnimationSpeedChange!} onExit={onExitAnimation!} visibleMetrics={visibleMetrics} onToggleMetric={handleToggleMetric} />
            </>
        )}
      <style>{`
        .km-marker { background: rgba(30, 41, 59, 0.9); color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 1px solid #475569; pointer-events: none; }
        .race-cursor-icon { display: flex; align-items: center; justify-content: center; }
        .cursor-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
        .pace-label { position: absolute; top: -28px; left: 50%; transform: translateX(-50%); color: white; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; white-space: nowrap; box-shadow: 0 4px 6px rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.4); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .leaflet-popup-content-wrapper { background: rgba(15, 23, 42, 0.95) !important; color: white !important; border: 1px solid #334155; border-radius: 8px !important; }
        .leaflet-popup-tip { background: rgba(15, 23, 42, 0.95) !important; }
        .km-info-popup .leaflet-popup-content { margin: 8px 12px !important; }
        .hover-info-cursor { display: flex; align-items: center; justify-content: center; overflow: visible !important; }
      `}</style>
    </div>
  );
};

export default MapDisplay;