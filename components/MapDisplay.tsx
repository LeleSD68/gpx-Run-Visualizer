import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Track, RaceRunner, MapDisplayProps, TrackPoint, PauseSegment, TrackStats, Split, AiSegment } from '../types';
import { calculateTrackStats } from '../services/trackStatsService';
import { getTrackPointAtDistance, getPointsInDistanceRange } from '../services/trackEditorUtils';
import { getTrackSegmentColors } from '../services/colorService';
import TrackPreview from './TrackPreview';
import AnimationControls from './AnimationControls';

declare const L: any; // Use Leaflet from CDN

const FitBoundsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M2.5 3.5A1 1 0 0 1 3.5 2.5h2.25a.75.75 0 0 0 0-1.5H3.5A2.5 2.5 0 0 0 1 3.5v2.25a.75.75 0 0 0 1.5 0V3.5ZM17.5 3.5V5.75a.75.75 0 0 0 1.5 0V3.5A2.5 2.5 0 0 0 16.5 1h-2.25a.75.75 0 0 0 0 1.5H16.5A1 1 0 0 1 17.5 3.5ZM2.5 16.5A1 1 0 0 1 3.5 17.5h2.25a.75.75 0 0 0 0 1.5H3.5A2.5 2.5 0 0 0 1 16.5v-2.25a.75.75 0 0 0 1.5 0V16.5ZM16.5 19a2.5 2.5 0 0 0 2.5-2.5v-2.25a.75.75 0 0 0-1.5 0V16.5a1 1 0 0 1-1 1h-2.25a.75.75 0 0 0 0 1.5H16.5Z" />
    </svg>
);

interface AnimationStats {
    time: string;
    pace: string;
    elevation: number;
    hr: number | null;
}

const StatsDisplay: React.FC<{ stats: AnimationStats }> = ({ stats }) => (
    <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg shadow-lg text-white grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 z-[1000]">
        <div>
            <div className="text-xs text-slate-400">Time</div>
            <div className="text-xl font-bold font-mono">{stats.time}</div>
        </div>
        <div>
            <div className="text-xs text-slate-400">Avg. Pace (/km)</div>
            <div className="text-xl font-bold font-mono">{stats.pace}</div>
        </div>
        <div>
            <div className="text-xs text-slate-400">Elevation</div>
            <div className="text-xl font-bold font-mono">{stats.elevation} m</div>
        </div>
        {stats.hr !== null && (
             <div>
                <div className="text-xs text-slate-400">Heart Rate</div>
                <div className="text-xl font-bold font-mono">{stats.hr} bpm</div>
            </div>
        )}
    </div>
);


const formatPaceFromSpeed = (speedKmh: number): string => {
    if (speedKmh < 0.1) {
        return '--:-- /km';
    }
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
    if (!isFinite(pace) || pace <= 0) {
        return '--:-- /km';
    }
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
};

const formatSplitDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};


const MapDisplay: React.FC<MapDisplayProps> = ({ 
    tracks, visibleTrackIds, raceRunners, hoveredTrackId, runnerSpeeds, 
    selectionPoints, hoveredPoint, pauseSegments, showPauses, onMapHover, 
    onPauseClick, mapGradientMetric, coloredPauseSegments, animationTrack, 
    animationProgress = 0, onExitAnimation, fastestSplitForAnimation, animationHighlight,
    animationKmHighlight, isAnimationPlaying, onToggleAnimationPlay, onAnimationProgressChange,
    animationSpeed, onAnimationSpeedChange, fitBoundsCounter = 0,
    selectedPoint, onPointClick, hoveredLegendValue, aiSegmentHighlight
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polylinesRef = useRef<Map<string, any>>(new Map());
  const raceMarkersRef = useRef<Map<string, any>>(new Map());
  const selectionPolylineRef = useRef<any>(null);
  const hoverMarkerRef = useRef<any>(null);
  const pauseMarkersLayerRef = useRef<any>(null);
  const pausePolylinesLayerRef = useRef<any>(null);
  const elevationLayerRef = useRef<any>(null);
  const legendControlRef = useRef<any>(null);
  const hiddenPolylineIdRef = useRef<string | null>(null);
  const [hoveredTrack, setHoveredTrack] = useState<Track | null>(null);
  const [hoveredTrackStats, setHoveredTrackStats] = useState<TrackStats | null>(null);
  const animationMarkerRef = useRef<any>(null);
  const animationProgressPolylineRef = useRef<any>(null);
  const kmMarkersLayerRef = useRef<any>(null);
  const [isAutoFitEnabled, setIsAutoFitEnabled] = useState(true);
  const selectedPointPopupRef = useRef<any>(null);
  const legendMarkerRef = useRef<HTMLDivElement | null>(null);
  const [legendRange, setLegendRange] = useState<{ min: number, max: number } | null>(null);
  const aiSegmentPolylineRef = useRef<any>(null);


  useEffect(() => {
    if (hoveredTrackId) {
        const track = tracks.find(t => t.id === hoveredTrackId);
        if (track && track.points.length > 0) {
            setHoveredTrack(track);
            setHoveredTrackStats(calculateTrackStats(track));
        } else {
            setHoveredTrack(null);
            setHoveredTrackStats(null);
        }
    } else {
        setHoveredTrack(null);
        setHoveredTrackStats(null);
    }
  }, [hoveredTrackId, tracks]);


  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      // Initialize map with a fallback location
      mapRef.current = L.map(mapContainerRef.current).setView([45.60, 12.88], 13);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapRef.current);

      // Disable auto-fit on manual interaction
      mapRef.current.on('dragstart zoomstart', () => {
          setIsAutoFitEnabled(false);
      });
    }
  }, []);

  // Effect for drawing/updating polylines
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // During animation, hide race markers and all standard track polylines.
    // The animation is drawn in a separate effect.
    if (animationTrack) {
        raceMarkersRef.current.forEach(marker => map.removeLayer(marker));
        raceMarkersRef.current.clear();
        polylinesRef.current.forEach(polyline => map.removeLayer(polyline));
        polylinesRef.current.clear();
        return; // Prevent drawing any standard polylines.
    }

    const visibleTracks = tracks.filter(t => visibleTrackIds.has(t.id));
    
    // Remove old polylines
    polylinesRef.current.forEach((polyline, id) => {
      if (!visibleTrackIds.has(id)) {
        map.removeLayer(polyline);
        polylinesRef.current.delete(id);
      }
    });

    // Add new polylines
    visibleTracks.forEach(track => {
      if (!polylinesRef.current.has(track.id)) {
        const latlngs = track.points.map(p => [p.lat, p.lon]);
        const polyline = L.polyline(latlngs, { color: track.color, weight: 3, opacity: 0.7 }).addTo(map);
        
        // Add hover listeners if the callback is provided (i.e., in editor view)
        if (onMapHover) {
            polyline.on('mousemove', (e: any) => {
                let closestPoint: TrackPoint | null = null;
                let minDistance = Infinity;

                // Find the closest point on the track to the mouse cursor
                track.points.forEach(p => {
                    const dist = map.distance(e.latlng, L.latLng(p.lat, p.lon));
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestPoint = p;
                    }
                });
                
                if (closestPoint) {
                    onMapHover(closestPoint);
                }
            });

            polyline.on('mouseout', () => {
                onMapHover(null);
            });
        }
        
        if (onPointClick) {
            polyline.on('click', (e: any) => {
                let closestPoint: TrackPoint | null = null;
                let minDistance = Infinity;

                track.points.forEach(p => {
                    const dist = map.distance(e.latlng, L.latLng(p.lat, p.lon));
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestPoint = p;
                    }
                });
                
                if (closestPoint) {
                    onPointClick(closestPoint);
                }
            });
        }

        polylinesRef.current.set(track.id, polyline);
      }
    });
  }, [tracks, visibleTrackIds, onMapHover, onPointClick, animationTrack]);

  const visibleTrackIdsKey = useMemo(() => {
      return [...visibleTrackIds].sort().join(',');
  }, [visibleTrackIds]);

  const fitMapToBounds = useCallback(() => {
      const map = mapRef.current;
      if (!map) return;

      let bounds: any = null;
      
      const currentAnimationTrack = animationTrack;
      
      if (currentAnimationTrack) {
        const allPoints = currentAnimationTrack.points.map(p => [p.lat, p.lon]);
         if (allPoints.length > 0) {
            bounds = L.latLngBounds(allPoints);
         }
      } else if (aiSegmentHighlight) {
          const track = tracks[0]; // Assuming detail view has only one track
          if (track) {
              const points = getPointsInDistanceRange(track, aiSegmentHighlight.startDistance, aiSegmentHighlight.endDistance);
              if (points.length > 1) {
                  bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
              }
          }
      } else if (selectionPoints && selectionPoints.length > 1) {
          const latlngs = selectionPoints.map(p => [p.lat, p.lon]);
          bounds = L.latLngBounds(latlngs);
      } else {
          const visibleTracks = tracks.filter(t => visibleTrackIds.has(t.id));
          if (visibleTracks.length > 0) {
              const allPoints = visibleTracks.flatMap(t => t.points.map(p => [p.lat, p.lon]));
              if (allPoints.length > 0) {
                  bounds = L.latLngBounds(allPoints);
              }
          } else if (tracks.length > 0) {
              // Fallback: if no tracks are visible, fit all loaded tracks
              const allPoints = tracks.flatMap(t => t.points.map(p => [p.lat, p.lon]));
              if (allPoints.length > 0) {
                  bounds = L.latLngBounds(allPoints);
              }
          }
      }

      if (bounds && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] });
      }
  }, [selectionPoints, tracks, visibleTrackIds, animationTrack, aiSegmentHighlight]);

  // Effect for auto-fitting map bounds
  useEffect(() => {
    if (isAutoFitEnabled && !raceRunners && !animationTrack) {
      fitMapToBounds();
    }
  }, [isAutoFitEnabled, fitMapToBounds, raceRunners, animationTrack, visibleTrackIdsKey]);

  // Effect to programmatically trigger fitMapToBounds
  useEffect(() => {
      if (fitBoundsCounter > 0) {
          fitMapToBounds();
      }
  }, [fitBoundsCounter, fitMapToBounds]);

  const handleToggleAutoFit = useCallback(() => {
    const willBeEnabled = !isAutoFitEnabled;
    setIsAutoFitEnabled(willBeEnabled);
    if (willBeEnabled) {
        fitMapToBounds();
    }
  }, [isAutoFitEnabled, fitMapToBounds]);


  // Effect for highlighting hovered track
  useEffect(() => {
    polylinesRef.current.forEach((polyline, id) => {
      if (id === hoveredTrackId) {
        polyline.setStyle({ weight: 6, opacity: 1.0 });
        polyline.bringToFront();
      } else {
        polyline.setStyle({ weight: 3, opacity: 0.7 });
      }
    });
  }, [hoveredTrackId]);

    // Effect for highlighting AI selected track segment
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        if (aiSegmentPolylineRef.current) {
            map.removeLayer(aiSegmentPolylineRef.current);
            aiSegmentPolylineRef.current = null;
        }

        if (aiSegmentHighlight && tracks.length > 0) {
            const track = tracks.find(t => visibleTrackIds.has(t.id));
            if (!track) return;

            const points = getPointsInDistanceRange(track, aiSegmentHighlight.startDistance, aiSegmentHighlight.endDistance);
            if (points.length > 1) {
                const latlngs = points.map(p => [p.lat, p.lon]);
                aiSegmentPolylineRef.current = L.polyline(latlngs, {
                    color: '#67e8f9', // A bright cyan
                    weight: 7,
                    opacity: 0.9
                }).addTo(map);
                aiSegmentPolylineRef.current.bringToFront();
                map.fitBounds(aiSegmentPolylineRef.current.getBounds(), { padding: [50, 50] });
            }
        }
    }, [aiSegmentHighlight, tracks, visibleTrackIds]);

  // Effect for highlighting selected track segment in editor
  useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      // Remove existing selection layer
      if (selectionPolylineRef.current) {
          map.removeLayer(selectionPolylineRef.current);
          selectionPolylineRef.current = null;
      }

      if (selectionPoints && selectionPoints.length > 1) {
          const latlngs = selectionPoints.map(p => [p.lat, p.lon]);
          selectionPolylineRef.current = L.polyline(latlngs, {
              color: '#fde047', // A bright yellow
              weight: 7,
              opacity: 0.9
          }).addTo(map);
          selectionPolylineRef.current.bringToFront();
      }
  }, [selectionPoints]);


  useEffect(() => {
    const map = mapRef.current;
    if (!map || animationTrack) return; // Don't show race markers during single animation

    if (!raceRunners) {
        raceMarkersRef.current.forEach(marker => map.removeLayer(marker));
        raceMarkersRef.current.clear();
        return;
    }
    
    const activeRunnerIds = new Set();
    raceRunners.forEach(r => activeRunnerIds.add(r.trackId));

    // Remove markers for finished/inactive runners
    raceMarkersRef.current.forEach((marker, id) => {
        if(!activeRunnerIds.has(id)){
            map.removeLayer(marker);
            raceMarkersRef.current.delete(id);
        }
    });

    raceRunners.forEach(runner => {
      const { trackId, position, color } = runner;
      const speed = runnerSpeeds.get(trackId) ?? 0;
      const paceLabel = formatPaceFromSpeed(speed);

      const iconHtml = `<div style="background-color: ${color};" class="w-4 h-4 rounded-full border-2 border-white shadow-lg"></div>`;
      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-runner-icon',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      if (raceMarkersRef.current.has(trackId)) {
        const marker = raceMarkersRef.current.get(trackId);
        marker.setLatLng([position.lat, position.lon]);
        marker.setTooltipContent(paceLabel);
      } else {
        const marker = L.marker([position.lat, position.lon], { icon: customIcon }).addTo(map);
        marker.bindTooltip(paceLabel, { permanent: true, direction: 'top', offset: [0, -8], className: 'pace-tooltip' });
        raceMarkersRef.current.set(trackId, marker);
      }
    });

  }, [raceRunners, runnerSpeeds, animationTrack]);

    const animationStats = useMemo(() => {
        if (!animationTrack) return { time: '00:00:00', pace: '--:--', elevation: 0, hr: null };
        const currentPoint = getTrackPointAtDistance(animationTrack, animationProgress);
        if (!currentPoint) return { time: '00:00:00', pace: '--:--', elevation: 0, hr: null };
        
        const elapsedTime = currentPoint.time.getTime() - animationTrack.points[0].time.getTime();
        
        let averagePaceValue = 0;
        if (animationProgress > 0 && elapsedTime > 0) {
            averagePaceValue = (elapsedTime / 60000) / animationProgress;
        }
        
        return {
            time: formatDuration(elapsedTime),
            pace: formatPace(averagePaceValue),
            elevation: Math.round(currentPoint.ele),
            hr: currentPoint.hr ? Math.round(currentPoint.hr) : null,
        };
    }, [animationTrack, animationProgress]);

    // Effect for single track animation
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const cleanup = () => {
            if (animationMarkerRef.current) {
                map.removeLayer(animationMarkerRef.current);
                animationMarkerRef.current = null;
            }
            if (animationProgressPolylineRef.current) {
                map.removeLayer(animationProgressPolylineRef.current);
                animationProgressPolylineRef.current = null;
            }
        };

        if (animationTrack) {
            const currentPoint = getTrackPointAtDistance(animationTrack, animationProgress);
            if (currentPoint) {
                const latlng = [currentPoint.lat, currentPoint.lon];
                if (animationMarkerRef.current) {
                    animationMarkerRef.current.setLatLng(latlng);
                } else {
                    const iconHtml = `<div style="background-color: ${animationTrack.color};" class="w-5 h-5 rounded-full border-2 border-white shadow-lg animate-pulse"></div>`;
                    const customIcon = L.divIcon({
                        html: iconHtml,
                        className: 'custom-runner-icon',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    animationMarkerRef.current = L.marker(latlng, { icon: customIcon, zIndexOffset: 1000 }).addTo(map);
                }
                
                // Only pan the map if animation is playing
                if (isAnimationPlaying) {
                    map.panTo(latlng, { animate: true, duration: 0.5, easeLinearity: 1 });
                }
            }

            // Progress polyline logic
            const coveredPoints = getPointsInDistanceRange(animationTrack, 0, animationProgress);
            if (coveredPoints && coveredPoints.length >= 2) {
                const latlngs = coveredPoints.map(p => [p.lat, p.lon]);
                if (animationProgressPolylineRef.current) {
                    animationProgressPolylineRef.current.setLatLngs(latlngs);
                } else {
                    animationProgressPolylineRef.current = L.polyline(latlngs, {
                        color: animationTrack.color,
                        weight: 5
                    }).addTo(map);
                }
            } else {
                // Clear the line if there are not enough points (e.g., at the very start)
                if (animationProgressPolylineRef.current) {
                    animationProgressPolylineRef.current.setLatLngs([]);
                }
            }

        } else {
            cleanup();
        }
        
        return cleanup;
    }, [animationTrack, animationProgress, isAnimationPlaying]);

    // Effect for kilometer markers during animation
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const cleanup = () => {
            if (kmMarkersLayerRef.current) {
                map.removeLayer(kmMarkersLayerRef.current);
                kmMarkersLayerRef.current = null;
            }
        };
        
        if (animationTrack) {
            cleanup();

            const markers = [];
            for (let km = 1; km < animationTrack.distance; km++) {
                if (animationProgress >= km) {
                    const point = getTrackPointAtDistance(animationTrack, km);
                    if (point) {
                        const isFastest = fastestSplitForAnimation?.splitNumber === km;
                        const iconHtml = `
                            <div class="km-marker ${isFastest ? 'fastest' : ''}">
                                ${km}
                            </div>
                        `;
                        const kmIcon = L.divIcon({
                            html: iconHtml,
                            className: 'custom-km-marker-icon',
                            iconSize: [24, 24],
                            iconAnchor: [12, 24]
                        });

                        const marker = L.marker([point.lat, point.lon], { icon: kmIcon });
                        markers.push(marker);
                    }
                }
            }
            if (markers.length > 0) {
                kmMarkersLayerRef.current = L.layerGroup(markers).addTo(map);
            }
        } else {
            cleanup();
        }

        return cleanup;

    }, [animationTrack, fastestSplitForAnimation, animationProgress]);

  // Effect for hovered point on editor chart
  useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      if (hoveredPoint) {
          const latlng = [hoveredPoint.lat, hoveredPoint.lon];
          if (hoverMarkerRef.current) {
              hoverMarkerRef.current.setLatLng(latlng);
          } else {
              hoverMarkerRef.current = L.circleMarker(latlng, {
                  radius: 8,
                  color: '#fde047',
                  fillColor: '#facc15',
                  fillOpacity: 0.8,
                  weight: 2,
              }).addTo(map);
          }
          hoverMarkerRef.current.bringToFront();
      } else {
          if (hoverMarkerRef.current) {
              map.removeLayer(hoverMarkerRef.current);
              hoverMarkerRef.current = null;
          }
      }
  }, [hoveredPoint]);

    // Effect for selected point popup in editor
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !onPointClick) return;

        const cleanupPopup = () => {
            if (selectedPointPopupRef.current) {
                map.removeLayer(selectedPointPopupRef.current);
                selectedPointPopupRef.current = null;
            }
        };

        cleanupPopup();

        if (selectedPoint) {
            const track = tracks.find(t => visibleTrackIds.has(t.id));
            if (!track) return;
            
            const calculatePointMetrics = (point: TrackPoint, track: Track) => {
                const index = track.points.findIndex(p => p.time.getTime() === point.time.getTime());
                if (index < 1) return { speed: 0, pace: '--:--' };
                
                const p1 = track.points[index - 1];
                const p2 = track.points[index];
                
                const dist = p2.cummulativeDistance - p1.cummulativeDistance;
                const time = (p2.time.getTime() - p1.time.getTime()) / 3600000;
                
                if (time > 0 && dist >= 0) {
                    const speed = dist / time;
                    if (speed < 0.1) return { speed: 0, pace: '--:--' };

                    const paceVal = 60 / speed;
                    const minutes = Math.floor(paceVal);
                    const seconds = Math.round((paceVal - minutes) * 60);
                    const paceStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    return { speed, pace: paceStr };
                }
                return { speed: 0, pace: '--:--' };
            };

            const metrics = calculatePointMetrics(selectedPoint, track);

            const popupContent = `
                <div class="text-sm text-slate-200">
                    <h4 class="font-bold text-base text-white border-b border-slate-600 mb-2 pb-1">Point Details</h4>
                    <div class="grid grid-cols-2 gap-x-3 gap-y-1 font-mono">
                        <span class="text-slate-400">Time:</span> <span>${selectedPoint.time.toLocaleTimeString()}</span>
                        <span class="text-slate-400">Pace:</span> <span>${metrics.pace} /km</span>
                        <span class="text-slate-400">Speed:</span> <span>${metrics.speed.toFixed(1)} km/h</span>
                        <span class="text-slate-400">Elevation:</span> <span>${selectedPoint.ele.toFixed(1)} m</span>
                        <span class="text-slate-400">Distance:</span> <span>${selectedPoint.cummulativeDistance.toFixed(2)} km</span>
                        ${selectedPoint.hr ? `<span class="text-slate-400">Heart Rate:</span> <span>${selectedPoint.hr} bpm</span>` : ''}
                    </div>
                </div>
            `;
            
            const popup = L.popup({
                closeButton: true,
                autoClose: false,
                closeOnClick: false,
                className: 'gpx-details-popup'
            })
            .setLatLng([selectedPoint.lat, selectedPoint.lon])
            .setContent(popupContent)
            .openOn(map);

            popup.on('remove', () => {
                onPointClick(null);
            });

            selectedPointPopupRef.current = popup;
        }
    }, [selectedPoint, onPointClick, tracks, visibleTrackIds]);

  // Effect for pause markers
  useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      // Clear existing layer
      if (pauseMarkersLayerRef.current) {
          map.removeLayer(pauseMarkersLayerRef.current);
          pauseMarkersLayerRef.current = null;
      }

      if (showPauses && pauseSegments && pauseSegments.length > 0) {
          const pauseIcon = L.divIcon({
              html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-amber-400 drop-shadow-lg ${onPauseClick ? 'cursor-pointer' : ''}">
                       <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clip-rule="evenodd" />
                     </svg>`,
              className: 'custom-pause-icon',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
          });

          const markers = pauseSegments.map(segment => {
            const marker = L.marker([segment.startPoint.lat, segment.startPoint.lon], { icon: pauseIcon });
            if (onPauseClick) {
                marker.on('click', () => {
                    onPauseClick(segment);
                });
            }
            return marker;
          });
          pauseMarkersLayerRef.current = L.layerGroup(markers).addTo(map);
      }
  }, [showPauses, pauseSegments, onPauseClick]);
  
    // Effect for coloring pause segments
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear existing layer
        if (pausePolylinesLayerRef.current) {
            map.removeLayer(pausePolylinesLayerRef.current);
            pausePolylinesLayerRef.current = null;
        }

        if (coloredPauseSegments && coloredPauseSegments.length > 0 && tracks.length > 0) {
            const track = tracks.find(t => visibleTrackIds.has(t.id));
            if (!track) return;
            
            const getPointsForSegment = (track: Track, segment: PauseSegment): TrackPoint[] => {
                const points: TrackPoint[] = [];
                points.push(segment.startPoint);
                for(const p of track.points) {
                    if (p.cummulativeDistance > segment.startPoint.cummulativeDistance && p.cummulativeDistance < segment.endPoint.cummulativeDistance) {
                        points.push(p);
                    }
                }
                points.push(segment.endPoint);
                return points;
            }

            const pauseLines = coloredPauseSegments.map(segment => {
                const pointsForSegment = getPointsForSegment(track, segment);
                const latlngs = pointsForSegment.map(p => [p.lat, p.lon]);
                return L.polyline(latlngs, {
                    color: '#71717a', // zinc-500 for a neutral gray
                    weight: 5,
                    opacity: 0.9
                });
            });

            if (pauseLines.length > 0) {
                pausePolylinesLayerRef.current = L.featureGroup(pauseLines).addTo(map);
                pausePolylinesLayerRef.current.bringToFront();
            }
        }
    }, [coloredPauseSegments, tracks, visibleTrackIds]);

    // Effect for Gradient Profile
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const cleanup = () => {
            if (elevationLayerRef.current) {
                map.removeLayer(elevationLayerRef.current);
                elevationLayerRef.current = null;
            }
            if (legendControlRef.current) {
                map.removeControl(legendControlRef.current);
                legendControlRef.current = null;
                legendMarkerRef.current = null;
            }
            setLegendRange(null);
            if (hiddenPolylineIdRef.current) {
                const polyline = polylinesRef.current.get(hiddenPolylineIdRef.current);
                if (polyline) {
                    polyline.setStyle({ opacity: 0.7 });
                }
                hiddenPolylineIdRef.current = null;
            }
        };

        if (mapGradientMetric && mapGradientMetric !== 'none' && visibleTrackIds.size > 0) {
            cleanup();

            let trackId = '';
            for (const id of visibleTrackIds) {
                trackId = id;
                break;
            }
            if (!trackId) return;

            const track = tracks.find(t => t.id === trackId);
            if (!track || track.points.length < 2) return;

            // This logic for the legend is intentionally duplicated from colorService
            // to keep the service decoupled from UI concerns like formatting.
            let values: (number | null)[] = [];
            let legendTitle = '', legendGradientCss = '';
            let valueFormatter: (val: number) => string = val => val.toString();
            let useZoneLegend = false;

            switch (mapGradientMetric) {
                case 'elevation':
                    legendTitle = 'Elevation';
                    values = track.points.map(p => p.ele);
                    valueFormatter = val => `${Math.round(val)} m`;
                    legendGradientCss = `linear-gradient(to top, hsl(120, 90%, 50%), hsl(60, 90%, 50%), hsl(0, 90%, 50%))`;
                    break;
                case 'speed':
                    legendTitle = 'Speed';
                    values = track.points.map((p, i) => {
                        if (i === 0) return null;
                        const p1 = track.points[i-1];
                        const dist = p.cummulativeDistance - p1.cummulativeDistance;
                        const time = (p.time.getTime() - p1.time.getTime()) / 3600000;
                        return time > 0 ? Math.min(50, dist / time) : null;
                    });
                    valueFormatter = val => `${val.toFixed(1)} km/h`;
                    legendGradientCss = `linear-gradient(to top, hsl(0, 90%, 50%), hsl(60, 90%, 50%), hsl(120, 90%, 50%))`;
                    break;
                case 'pace':
                    legendTitle = 'Pace';
                    values = track.points.map((p, i) => {
                        if (i === 0) return null;
                        const p1 = track.points[i-1];
                        const dist = p.cummulativeDistance - p1.cummulativeDistance;
                        const time = (p.time.getTime() - p1.time.getTime()) / 60000;
                        return dist > 0.001 ? Math.min(20, time / dist) : null;
                    });
                    valueFormatter = pace => {
                        const minutes = Math.floor(pace);
                        const seconds = Math.round((pace - minutes) * 60);
                        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    };
                    legendGradientCss = `linear-gradient(to top, hsl(120, 90%, 50%), hsl(60, 90%, 50%), hsl(0, 90%, 50%))`;
                    break;
                case 'hr':
                    legendTitle = 'Heart Rate (Gradient)';
                    values = track.points.map(p => p.hr ?? null);
                    valueFormatter = val => `${Math.round(val)} bpm`;
                    legendGradientCss = `linear-gradient(to top, hsl(240, 90%, 50%), hsl(120, 90%, 50%), hsl(0, 90%, 50%))`;
                    break;
                case 'hr_zones':
                    legendTitle = 'Heart Rate Zones';
                    values = track.points.map(p => p.hr ?? null);
                    useZoneLegend = true;
                    break;
            }
            
            const validValues = values.filter((v): v is number => v !== null && isFinite(v));
            if (validValues.length < 2) {
                cleanup();
                return;
            }

            const minVal = Math.min(...validValues);
            const maxVal = Math.max(...validValues);
            setLegendRange({ min: minVal, max: maxVal });
            
            const coloredSegments = getTrackSegmentColors(track, mapGradientMetric);
            
            if (coloredSegments.length > 0) {
                const segments = coloredSegments.map(segment => {
                    return L.polyline([[segment.p1.lat, segment.p1.lon], [segment.p2.lat, segment.p2.lon]], {
                        color: segment.color,
                        weight: 5,
                        opacity: 0.85
                    });
                });

                elevationLayerRef.current = L.layerGroup(segments).addTo(map);

                const originalPolyline = polylinesRef.current.get(track.id);
                if (originalPolyline) {
                    originalPolyline.setStyle({ opacity: 0 });
                    hiddenPolylineIdRef.current = track.id;
                }
                
                const legend = new (L.Control as any)({position: 'bottomright'});
                legend.onAdd = function() {
                    const div = L.DomUtil.create('div', 'info legend bg-slate-800/80 p-2 rounded-md border border-slate-600 text-white text-xs relative');
                    let legendHtml = '';
                    if (useZoneLegend) {
                         const hrValuesForZones = track.points.map(p => p.hr ?? null);
                         const validHrs = hrValuesForZones.filter((v): v is number => v !== null && v > 0);
                         const maxHr = Math.max(0, ...validHrs);
                         legendHtml = `
                            <h4 class="font-bold mb-1">${legendTitle}</h4>
                            <div class="space-y-1 text-xs">
                                <div class="flex items-center"><div class="w-3 h-3 rounded-sm mr-2" style="background-color: #ef4444;"></div> &gt;${Math.round(maxHr * 0.9)} bpm (Z5)</div>
                                <div class="flex items-center"><div class="w-3 h-3 rounded-sm mr-2" style="background-color: #f97316;"></div> ${Math.round(maxHr * 0.8)}-${Math.round(maxHr * 0.9)} bpm (Z4)</div>
                                <div class="flex items-center"><div class="w-3 h-3 rounded-sm mr-2" style="background-color: #eab308;"></div> ${Math.round(maxHr * 0.7)}-${Math.round(maxHr * 0.8)} bpm (Z3)</div>
                                <div class="flex items-center"><div class="w-3 h-3 rounded-sm mr-2" style="background-color: #22c55e;"></div> ${Math.round(maxHr * 0.6)}-${Math.round(maxHr * 0.7)} bpm (Z2)</div>
                                <div class="flex items-center"><div class="w-3 h-3 rounded-sm mr-2" style="background-color: #3b82f6;"></div> &lt;${Math.round(maxHr * 0.6)} bpm (Z1)</div>
                            </div>
                         `;
                    } else {
                        legendHtml = `
                            <h4 class="font-bold mb-1">${legendTitle}</h4>
                            <div class="flex items-center">
                                <div class="legend-gradient" style="height: 100px; width: 15px; background: ${legendGradientCss}; border-radius: 3px;"></div>
                                <div class="ml-1 flex flex-col justify-between h-[100px]">
                                    <span>${valueFormatter(maxVal)}</span>
                                    <span>${valueFormatter(minVal)}</span>
                                </div>
                            </div>
                        `;
                    }
                    div.innerHTML = legendHtml;
                    const marker = L.DomUtil.create('div', 'legend-marker', div);
                    legendMarkerRef.current = marker;
                    return div;
                };
                legend.onRemove = () => {
                    legendMarkerRef.current = null;
                };
                legend.addTo(map);
                legendControlRef.current = legend;
            }

        } else {
            cleanup();
        }

        return cleanup;

    }, [mapGradientMetric, tracks, visibleTrackIds]);
    
    // Effect for updating the legend marker position
    useEffect(() => {
        if (legendMarkerRef.current && hoveredLegendValue !== null && legendRange) {
            const { min, max } = legendRange;
            const range = max - min;
            if (range > 0) {
                // Pace is inverted (lower is "higher" performance), so we flip the ratio
                const isPace = mapGradientMetric === 'pace';
                const valueForRatio = isPace ? max - hoveredLegendValue + min : hoveredLegendValue;

                const ratio = (valueForRatio - min) / range;
                // top is 0% at max value, 100% at min value
                const topPercent = (1 - ratio) * 100;
                
                legendMarkerRef.current.style.top = `${Math.max(0, Math.min(100, topPercent))}%`;
                legendMarkerRef.current.style.display = 'block';
            }
        } else if (legendMarkerRef.current) {
            legendMarkerRef.current.style.display = 'none';
        }
    }, [hoveredLegendValue, legendRange, mapGradientMetric]);


  return (
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full" />
      
       {/* Auto-fit Button */}
       {!animationTrack && (
            <button
                onClick={handleToggleAutoFit}
                title={isAutoFitEnabled ? "Disable Auto-Fit" : "Enable Auto-Fit"}
                className={`absolute top-16 left-2.5 z-[1000] p-2 rounded-md shadow-lg transition-colors duration-200 border border-slate-600
                    ${isAutoFitEnabled
                        ? 'bg-sky-500 text-white hover:bg-sky-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
            >
                <FitBoundsIcon />
            </button>
       )}

        {animationTrack && (
            <>
                <StatsDisplay stats={animationStats} />
                <AnimationControls
                    isPlaying={isAnimationPlaying!}
                    onTogglePlay={onToggleAnimationPlay!}
                    progress={animationProgress}
                    totalDistance={animationTrack.distance}
                    onProgressChange={onAnimationProgressChange!}
                    speed={animationSpeed!}
                    onSpeedChange={onAnimationSpeedChange!}
                    onExit={onExitAnimation!}
                />
            </>
        )}


      {/* Hover Info Panel */}
      <div 
          className={`absolute top-4 right-4 bg-slate-800/80 backdrop-blur-sm p-4 rounded-lg shadow-lg w-72 transition-all duration-300 ease-in-out z-[1000] ${hoveredTrack && hoveredTrackStats ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}
      >
          {hoveredTrack && hoveredTrackStats && (
              <div>
                  <div className="flex items-start space-x-3">
                      <TrackPreview 
                          points={hoveredTrack.points} 
                          color={hoveredTrack.color} 
                          className="w-20 h-14 bg-slate-900 rounded flex-shrink-0 border border-slate-600"
                      />
                      <div className="flex-grow overflow-hidden">
                           <h3 className="font-bold text-lg text-white truncate" title={hoveredTrack.name}>
                              {hoveredTrack.name}
                          </h3>
                          <p className="text-xs text-slate-400">
                              {new Date(hoveredTrack.points[0]?.time).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                      </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                          <p className="text-slate-400">Distanza</p>
                          <p className="text-xl font-semibold">{hoveredTrackStats.totalDistance.toFixed(2)} km</p>
                      </div>
                       <div>
                          <p className="text-slate-400">Ritmo medio</p>
                          <p className="text-xl font-semibold font-mono">{formatPace(hoveredTrackStats.movingAvgPace)}</p>
                      </div>
                      <div>
                          <p className="text-slate-400">Tempo</p>
                          <p className="text-xl font-semibold font-mono">{formatDuration(hoveredTrackStats.movingDuration)}</p>
                      </div>
                       <div>
                          <p className="text-slate-400">Dislivello</p>
                          <p className="text-xl font-semibold">{Math.round(hoveredTrackStats.elevationGain)} m</p>
                      </div>
                  </div>
              </div>
          )}
      </div>
      
      {animationHighlight && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md p-4 rounded-xl shadow-2xl border-2 border-amber-400 text-center z-[2000] animate-fade-in-pop w-full max-w-sm">
              <div className="text-amber-400 font-bold text-xl mb-1">⚡️ Kilometro più veloce! ⚡️</div>
              <div className="text-white">
                  <span className="font-semibold">Km {animationHighlight.splitNumber}</span>
              </div>
              <div className="flex justify-center space-x-6 mt-3 text-white">
                  <div>
                      <div className="text-slate-400 text-xs">Ritmo</div>
                      <div className="text-2xl font-bold font-mono">{formatPace(animationHighlight.pace)}</div>
                  </div>
                  <div>
                      <div className="text-slate-400 text-xs">Tempo</div>
                      <div className="text-2xl font-bold font-mono">{formatSplitDuration(animationHighlight.duration)}</div>
                  </div>
              </div>
          </div>
      )}

      {animationKmHighlight && (
          <div className="absolute bottom-24 right-4 bg-slate-900/80 backdrop-blur-md p-3 rounded-lg shadow-xl border border-slate-600 text-center z-[1500] animate-fade-in-pop w-64">
              <div className="text-slate-300 font-bold text-lg mb-1">
                  Km {animationKmHighlight.splitNumber} Completato
              </div>
              <div className="flex justify-around mt-2 text-white text-sm">
                  <div>
                      <div className="text-slate-400 text-xs">Ritmo</div>
                      <div className="text-lg font-bold font-mono">{formatPace(animationKmHighlight.pace)}</div>
                  </div>
                  <div>
                      <div className="text-slate-400 text-xs">Tempo</div>
                      <div className="text-lg font-bold font-mono">{formatSplitDuration(animationKmHighlight.duration)}</div>
                  </div>
                  <div>
                      <div className="text-slate-400 text-xs">Disl.</div>
                      <div className="text-lg font-bold font-mono">+{Math.round(animationKmHighlight.elevationGain)}m</div>
                  </div>
              </div>
          </div>
      )}

      <style>{`
        .pace-tooltip {
          background-color: rgba(17, 24, 39, 0.8);
          border-color: rgba(55, 65, 81, 0.9);
          color: #d1d5db;
          font-family: monospace;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 4px;
          box-shadow: none;
        }
        .custom-pause-icon {
            background: transparent !important;
            border: none !important;
        }
        .custom-km-marker-icon {
            background: transparent !important;
            border: none !important;
        }
        .km-marker {
            background-color: rgba(30, 41, 59, 0.8);
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            border: 1px solid #475569;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .km-marker.fastest {
            background-color: #f59e0b;
            color: #1e293b;
            border-color: #fde047;
            font-size: 14px;
        }
        .gpx-details-popup .leaflet-popup-content-wrapper {
            background-color: rgba(30, 41, 59, 0.9);
            color: #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            border: 1px solid #475569;
        }
        .gpx-details-popup .leaflet-popup-content {
            margin: 12px;
            font-family: sans-serif;
        }
        .gpx-details-popup .leaflet-popup-tip {
            background-color: rgba(30, 41, 59, 0.9);
        }
        .gpx-details-popup a.leaflet-popup-close-button {
            color: #94a3b8;
        }
        .gpx-details-popup a.leaflet-popup-close-button:hover {
            color: #e2e8f0;
        }
        .legend-marker {
            position: absolute;
            left: 17px; /* Position it just outside the gradient bar */
            width: 0;
            height: 0;
            border-top: 6px solid transparent;
            border-bottom: 6px solid transparent;
            border-left: 8px solid #fde047; /* yellow triangle */
            transform: translateY(-50%);
            transition: top 0.1s ease;
            display: none;
            pointer-events: none;
        }
        @keyframes fade-in-pop {
            from { opacity: 0; transform: translate(-50%, -100%); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in-pop {
            animation: fade-in-pop 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default MapDisplay;