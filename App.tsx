


import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import MapDisplay from './components/MapDisplay';
import RaceSummary from './components/RaceSummary';
import RaceLeaderboard from './components/RacePaceBar';
import TrackEditor from './components/TrackEditor';
import TrackDetailView from './components/TrackDetailView';
import ResizablePanel from './components/ResizablePanel';
import AnimationSummary from './components/AnimationSummary';
import Changelog from './components/Changelog';
import UserProfileModal from './components/UserProfileModal';
import Chatbot from './components/Chatbot';
import ToastContainer from './components/ToastContainer';
import WelcomeModal from './components/WelcomeModal';
import { parseGpx } from './services/gpxService';
import { groupTracks } from './services/trackUtils';
import { calculateTrackStats } from './services/trackStatsService';
import { SAMPLE_GPX_DATA } from './services/sampleTrackData';
import type { Track, RaceRunner, TrackPoint, RaceResult, TrackStats, ChatMessage, Split, UserProfile, Toast } from './types';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { getTrackPointAtDistance } from './services/trackEditorUtils';

// Define the missing COLORS constant for new track colors.
const COLORS = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', 
    '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78',
    '#98df8a', '#ff9896', '#c5b0d5', '#c49c94', '#f7b6d2', '#c7c7c7',
    '#dbdb8d', '#9edae5'
];

interface RaceLineChartProps {
    racers: Track[];
    history: Map<string, { time: number; distance: number }[]>;
    maxDistance: number;
    simulationTime: number;
    ranks: Map<string, number>;
}

const RaceLineChart: React.FC<RaceLineChartProps> = ({ racers, history, maxDistance, simulationTime, ranks }) => {
    const PADDING = { top: 20, right: 120, bottom: 40, left: 50 };
    const SVG_WIDTH = 800;
    const SVG_HEIGHT = 400;

    const chartWidth = SVG_WIDTH - PADDING.left - PADDING.right;
    const chartHeight = SVG_HEIGHT - PADDING.top - PADDING.bottom;
    
    // Dynamic Y-axis scaling. Add 10% buffer, with a minimum of 500m.
    const yAxisTop = useMemo(() => Math.max(maxDistance * 1.1, 0.5), [maxDistance]);

    const timeScale = useMemo(() => {
        const maxTime = Math.max(simulationTime, 1);
        return (time: number) => (time / maxTime) * chartWidth;
    }, [simulationTime, chartWidth]);

    const distanceScale = useMemo(() => {
        return (distance: number) => chartHeight - (distance / yAxisTop) * chartHeight;
    }, [yAxisTop, chartHeight]);

    const timeAxisLabels = useMemo(() => {
        const maxTime = simulationTime;
        if (maxTime <= 0) return [];
        const numLabels = 5;
        const interval = maxTime / numLabels;
        const labels = [];
        for (let i = 0; i <= numLabels; i++) {
            const time = i * interval;
            const minutes = Math.floor(time / 60000);
            const seconds = Math.floor((time % 60000) / 1000);
            labels.push({
                value: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
                x: timeScale(time) + PADDING.left,
            });
        }
        return labels;
    }, [simulationTime, timeScale]);
    
    const distanceAxisLabels = useMemo(() => {
        if (yAxisTop <= 0) return [];
        const numLabels = 5;
        const interval = yAxisTop / numLabels;
        const labels = [];
        for (let i = 0; i <= numLabels; i++) {
            const dist = i * interval;
            labels.push({
                value: `${dist.toFixed(1)} km`,
                y: distanceScale(dist) + PADDING.top
            });
        }
        return labels;
    }, [yAxisTop, distanceScale]);

    return (
        <div className="flex-grow p-4 bg-slate-900/50 h-full">
            <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-full">
                {/* Axes */}
                <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={SVG_HEIGHT - PADDING.bottom} stroke="#475569" strokeWidth="1" />
                <line x1={PADDING.left} y1={SVG_HEIGHT - PADDING.bottom} x2={SVG_WIDTH - PADDING.right} y2={SVG_HEIGHT - PADDING.bottom} stroke="#475569" strokeWidth="1" />

                {/* Y Axis Labels (Distance) */}
                {distanceAxisLabels.map(label => (
                    <g key={label.value}>
                         <text x={PADDING.left - 8} y={label.y} textAnchor="end" dominantBaseline="middle" fill="#94a3b8" fontSize="12">{label.value}</text>
                         <line x1={PADDING.left} y1={label.y} x2={chartWidth + PADDING.left} y2={label.y} stroke="#334155" strokeWidth="0.5" strokeDasharray="2,2" />
                    </g>
                ))}
                 <text transform={`translate(15, ${SVG_HEIGHT/2}) rotate(-90)`} textAnchor="middle" fill="#cbd5e1" fontSize="14">Distanza</text>

                {/* X Axis Labels (Time) */}
                {timeAxisLabels.map(label => (
                    <g key={label.value}>
                        <text x={label.x} y={SVG_HEIGHT - PADDING.bottom + 15} textAnchor="middle" fill="#94a3b8" fontSize="12">{label.value}</text>
                    </g>
                ))}
                 <text x={SVG_WIDTH/2} y={SVG_HEIGHT - 5} textAnchor="middle" fill="#cbd5e1" fontSize="14">Tempo</text>
                
                {/* Lines */}
                <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
                    {racers.map(racer => {
                        const points = history.get(racer.id) ?? [];
                        if (points.length < 2) return null;

                        const pathData = points
                            .map(p => `${timeScale(p.time)},${distanceScale(p.distance)}`)
                            .join(' ');
                        
                        return <polyline key={racer.id} points={pathData} fill="none" stroke={racer.color} strokeWidth="2.5" />;
                    })}
                </g>
                
                {/* Runner Labels */}
                 <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
                    {simulationTime > 1000 && racers.map(racer => {
                        const historyPoints = history.get(racer.id);
                        if (!historyPoints || historyPoints.length === 0) return null;
                        const lastPoint = historyPoints[historyPoints.length - 1];
                        if (!lastPoint) return null;

                        const rank = ranks.get(racer.id);
                        const x = timeScale(lastPoint.time);
                        const y = distanceScale(lastPoint.distance);
                        
                        // Don't render if outside chart area
                        if (x > chartWidth + 5) return null;

                        return (
                            <g key={racer.id} transform={`translate(${x}, ${y})`} >
                                <text
                                    x={8}
                                    y={0}
                                    dominantBaseline="middle"
                                    fill="#e2e8f0"
                                    fontSize="12"
                                    fontWeight="bold"
                                    paintOrder="stroke"
                                    stroke="#1e293b"
                                    strokeWidth="3px"
                                    strokeLinecap="round"
                                >
                                    {rank}. {racer.name}
                                </text>
                            </g>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
};

const PurpleFlagIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-purple-400">
        <path fillRule="evenodd" d="M3 3a1 1 0 0 0-1 1v12a1 1 0 1 0 2 0V4a1 1 0 0 0-1-1Zm5 1.75A.75.75 0 0 1 8.75 4h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 8 4.75Z" clipRule="evenodd" />
    </svg>
);

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [visibleTrackIds, setVisibleTrackIds] = useState<Set<string>>(new Set());
  const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());
  const [simulationState, setSimulationState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [simulationTime, setSimulationTime] = useState<number>(0);
  const [raceRunners, setRaceRunners] = useState<RaceRunner[] | null>(null);
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const [raceProgress, setRaceProgress] = useState<Map<string, number>>(new Map());
  const [runnerSpeeds, setRunnerSpeeds] = useState<Map<string, number>>(new Map());
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1.0);
  const [lapTimes, setLapTimes] = useState<Map<string, number[]>>(new Map());
  const [sortOrder, setSortOrder] = useState<'date' | 'distance' | 'name' | 'speed' | 'group'>('date');
  const [raceResults, setRaceResults] = useState<RaceResult[] | null>(null);
  const [raceStats, setRaceStats] = useState<Map<string, TrackStats> | null>(null);
  const [maxRaceDistance, setMaxRaceDistance] = useState<number>(0);
  const [preRaceVisibleTrackIds, setPreRaceVisibleTrackIds] = useState<Set<string> | null>(null);
  const [raceRanks, setRaceRanks] = useState<Map<string, number>>(new Map());
  const [runnerGaps, setRunnerGaps] = useState<Map<string, number>>(new Map());
  const [raceHistoryData, setRaceHistoryData] = useState<Map<string, { time: number; distance: number }[]>>(new Map());
  const [fastestLaps, setFastestLaps] = useState<{ lap: number; name: string; color: string }[]>([]);
  const [lastShownFastestLap, setLastShownFastestLap] = useState<{ lap: number; name: string; color: string } | null>(null);
  const [dynamicMaxDistance, setDynamicMaxDistance] = useState<number>(0);
  const [runnerDistances, setRunnerDistances] = useState<Map<string, number>>(new Map());
  const [runnerGapsToLeader, setRunnerGapsToLeader] = useState<Map<string, number>>(new Map());
  const [view, setView] = useState<'visualizer' | 'editor' | 'detail' | 'animation'>('visualizer');
  const [tracksToEdit, setTracksToEdit] = useState<Track[]>([]);
  const [trackForDetail, setTrackForDetail] = useState<Track | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const parsingWorkerRef = useRef<Worker | null>(null);

  // Animation State
  const [animationTrack, setAnimationTrack] = useState<Track | null>(null);
  const [animationTime, setAnimationTime] = useState(0); // ms
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(50); // Multiplier for real time
  const [animationHighlight, setAnimationHighlight] = useState<Split | null>(null);
  const [animationKmHighlight, setAnimationKmHighlight] = useState<Split | null>(null);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [fitBoundsCounter, setFitBoundsCounter] = useState(0);


  const raceAnimationRef = useRef<number | null>(null);
  const simulationStartTimeRef = useRef<number>(0);
  const timeAtPauseRef = useRef<number>(0);
  const runnerLapProgressRef = useRef<Map<string, number>>(new Map());
  const finishTimesRef = useRef<Map<string, number>>(new Map());
  const simulationSpeedRef = useRef<number>(simulationSpeed);
  const lapStartDistancesRef = useRef<Map<string, number>>(new Map());
  const lastLapCheckTimeRef = useRef<number>(0);
  const historySampleTimeRef = useRef<number>(0);
  
  // Animation Refs
  const animationFrameRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number>(0);
  const animationTimeAtPauseRef = useRef<number>(0);
  const animationSpeedRef = useRef(animationSpeed);
  const animationTimeRef = useRef(animationTime);
  const lastCompletedKmRef = useRef<number>(0);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const newToast: Toast = { id: Date.now(), message, type };
    setToasts(prevToasts => [...prevToasts, newToast]);
  }, []);

  // Load data from localStorage on initial render
  useEffect(() => {
    // Onboarding check
    const welcomeSeen = localStorage.getItem('gpx-welcome-seen');
    if (!welcomeSeen) {
        setIsWelcomeModalOpen(true);
    }
    
    let loadedTracks = false;
    try {
      const storedTracks = localStorage.getItem('gpx-tracks');
      if (storedTracks) {
        const parsedTracks = JSON.parse(storedTracks).map((track: any) => ({
          ...track,
          points: track.points.map((p: any) => ({
            ...p,
            time: new Date(p.time), // Re-hydrate Date objects
          })),
        }));
        if (parsedTracks.length > 0) {
            setTracks(parsedTracks);
            setVisibleTrackIds(new Set(parsedTracks.map((t: Track) => t.id)));
            loadedTracks = true;
        }
      }

      const storedProfile = localStorage.getItem('gpx-user-profile');
      if (storedProfile) {
        setUserProfile(JSON.parse(storedProfile));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
    
    // Load sample track if no tracks exist and user is new
    if (!loadedTracks && !welcomeSeen) {
        const parsedData = parseGpx(SAMPLE_GPX_DATA, "Colosseum Run.gpx");
        if (parsedData) {
            const sampleTrack: Track = {
                id: `sample-${new Date().getTime()}`,
                name: parsedData.name,
                points: parsedData.points,
                color: COLORS[0],
                distance: parsedData.distance,
                duration: parsedData.duration,
            };
            setTracks([sampleTrack]);
            setVisibleTrackIds(new Set([sampleTrack.id]));
        }
    }
  }, []);

  // Save tracks to localStorage whenever they change
  useEffect(() => {
    try {
      if (tracks.length > 0) {
        // Create a copy of the tracks with more aggressively reduced precision to save space.
        const storableTracks = tracks.map(track => ({
          ...track,
          distance: parseFloat(track.distance.toFixed(3)),
          points: track.points.map(p => ({
            ...p,
            lat: parseFloat(p.lat.toFixed(5)),
            lon: parseFloat(p.lon.toFixed(5)),
            ele: parseFloat(p.ele.toFixed(1)),
            cummulativeDistance: parseFloat(p.cummulativeDistance.toFixed(3)),
          }))
        }));
        localStorage.setItem('gpx-tracks', JSON.stringify(storableTracks));
      } else {
        localStorage.removeItem('gpx-tracks');
      }
    } catch (error) {
      console.error("Failed to save tracks to localStorage", error);
      if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)) {
          addToast("Storage full. Delete some tracks to save new ones.", "error");
      }
    }
  }, [tracks, addToast]);

  const handleSaveProfile = useCallback((profile: UserProfile) => {
      setUserProfile(profile);
      try {
          localStorage.setItem('gpx-user-profile', JSON.stringify(profile));
           addToast("Profile saved successfully!", "success");
      } catch (error) {
          console.error("Failed to save profile to localStorage", error);
           addToast("Could not save profile.", "error");
      }
  }, [addToast]);

  useEffect(() => {
    simulationSpeedRef.current = simulationSpeed;
  }, [simulationSpeed]);

  useEffect(() => {
      animationSpeedRef.current = animationSpeed;
  }, [animationSpeed]);
  
  useEffect(() => {
      animationTimeRef.current = animationTime;
  }, [animationTime]);

  useEffect(() => {
    if (fastestLaps.length > 0) {
        const latestFastestLap = fastestLaps[fastestLaps.length - 1];
        if (lastShownFastestLap?.lap !== latestFastestLap.lap) {
            setLastShownFastestLap(latestFastestLap);
            const timer = setTimeout(() => {
                setLastShownFastestLap(null);
            }, 7000); // Show for 7 seconds
            return () => clearTimeout(timer);
        }
    }
  }, [fastestLaps, lastShownFastestLap]);

  useEffect(() => {
    // Initialize the parsing worker
    parsingWorkerRef.current = new Worker('./services/parsing.worker.ts');
    
    let processedFiles = 0;
    const newTracks: Track[] = [];

    parsingWorkerRef.current.onmessage = (event) => {
      processedFiles++;
      const { parsedData, fileName, error } = event.data;
      if (parsedData) {
        newTracks.push(parsedData);
      } else {
        addToast(`Failed to parse "${fileName}". ${error}`, 'error');
      }
    };
    
    parsingWorkerRef.current.onerror = (event) => {
        addToast(`An unexpected error occurred during file parsing.`, 'error');
        console.error("Worker error:", event);
    };

    return () => {
      parsingWorkerRef.current?.terminate();
    };
  }, [addToast]);


  const handleFileUpload = useCallback(async (files: File[] | null) => {
    if (!files || files.length === 0 || !parsingWorkerRef.current) return;

    addToast(`Processing ${files.length} file(s)...`, 'info');

    const getTrackFingerprint = (trackData: { points: { length: number }, duration: number, distance: number }) => {
        return `${trackData.points.length}-${trackData.duration}-${trackData.distance.toFixed(5)}`;
    };
    const existingTrackFingerprints = new Set(tracks.map(getTrackFingerprint));

    const newTracks: Track[] = [];
    const pendingFiles = files.length;
    let processedFiles = 0;
    let skippedCount = 0;

    parsingWorkerRef.current.onmessage = (event) => {
        processedFiles++;
        const { parsedData, fileName } = event.data;
        if (parsedData) {
            const newTrackFingerprint = getTrackFingerprint(parsedData);
            if (existingTrackFingerprints.has(newTrackFingerprint)) {
                skippedCount++;
            } else {
                const newTrack: Omit<Track, 'groupId'> = {
                    id: `${fileName}-${new Date().getTime()}`,
                    name: parsedData.name,
                    points: parsedData.points,
                    color: COLORS[(tracks.length + newTracks.length) % COLORS.length],
                    distance: parsedData.distance,
                    duration: parsedData.duration,
                };
                newTracks.push(newTrack as Track);
            }
        } else {
            addToast(`Failed to parse "${fileName}".`, 'error');
        }

        if (processedFiles === pendingFiles) {
            if (newTracks.length > 0) {
                setTracks(prev => groupTracks([...prev, ...newTracks]));
                setVisibleTrackIds(prev => {
                    const newSet = new Set(prev);
                    newTracks.forEach(t => newSet.add(t.id));
                    return newSet;
                });
                addToast(`${newTracks.length} track(s) loaded successfully.`, 'success');
            }
            if (skippedCount > 0) {
                addToast(`${skippedCount} file(s) were skipped as duplicates.`, 'info');
            }
        }
    };

    for (const file of files) {
        const fileContent = await file.text();
        parsingWorkerRef.current.postMessage({
            fileContent,
            fileName: file.name,
        });
    }

  }, [tracks, addToast]);

  const handleDeleteTrack = useCallback((trackIdToDelete: string) => {
    setTracks(prevTracks => {
      const remainingTracks = prevTracks.filter(track => track.id !== trackIdToDelete);
      return groupTracks(remainingTracks);
    });
    
    // Use the Set constructor with the previous state for safer updates.
    setVisibleTrackIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(trackIdToDelete);
      return newSet;
    });

    // Use the Set constructor with the previous state for safer updates.
    setRaceSelectionIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(trackIdToDelete);
      return newSet;
    });
  }, []);

  const toggleVisibility = useCallback((trackId: string) => {
    // Use the Set constructor with the previous state for safer updates.
    setVisibleTrackIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  }, []);

  const toggleRaceSelection = useCallback((trackId: string) => {
    // Use the Set constructor with the previous state for safer updates.
    setRaceSelectionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  }, []);
  
  const handleDeselectAll = useCallback(() => {
    setRaceSelectionIds(new Set());
  }, []);

  const getRunnerStateAtTime = (track: Track, elapsedTimeMs: number): { position: { lat: number, lon: number }, progress: number, currentSpeed: number } | null => {
        if (!track.points || track.points.length < 2) return null;

        const startTime = track.points[0].time.getTime();

        if (elapsedTimeMs >= track.duration) {
            return null; // Runner has finished
        }

        const targetTime = startTime + elapsedTimeMs;

        let p1: TrackPoint | null = null;
        let p2: TrackPoint | null = null;

        for (let i = 0; i < track.points.length - 1; i++) {
            if (track.points[i].time.getTime() <= targetTime && track.points[i + 1].time.getTime() >= targetTime) {
                p1 = track.points[i];
                p2 = track.points[i+1];
                break;
            }
        }
        
        if (!p1 || !p2) {
             return { position: { lat: track.points[0].lat, lon: track.points[0].lon }, progress: 0, currentSpeed: 0 };
        }
        
        const segmentDuration = p2.time.getTime() - p1.time.getTime();
        const segmentDistance = p2.cummulativeDistance - p1.cummulativeDistance;
        let currentSpeed = 0; // km/h
        if (segmentDuration > 0) {
            currentSpeed = (segmentDistance / segmentDuration) * 3600000;
        }

        if(segmentDuration === 0) {
            return {
                position: { lat: p1.lat, lon: p1.lon },
                progress: track.distance > 0 ? p1.cummulativeDistance / track.distance : 0,
                currentSpeed: 0,
            };
        }

        const timeIntoSegment = targetTime - p1.time.getTime();
        const progressInSegment = timeIntoSegment / segmentDuration;

        const lat = p1.lat + (p2.lat - p1.lat) * progressInSegment;
        const lon = p1.lon + (p2.lon - p1.lon) * progressInSegment;

        const distanceCoveredInSegment = segmentDistance * progressInSegment;
        const totalDistanceCovered = p1.cummulativeDistance + distanceCoveredInSegment;
        const totalProgress = track.distance > 0 ? totalDistanceCovered / track.distance : 0;

        return { 
            position: { lat, lon },
            progress: totalProgress,
            currentSpeed: currentSpeed
        };
    };

  const runSimulation = useCallback((timestamp: number) => {
        if (simulationStartTimeRef.current === 0) {
            simulationStartTimeRef.current = timestamp;
        }

        const elapsedSinceSegmentStart = timestamp - simulationStartTimeRef.current;
        const effectiveTime = timeAtPauseRef.current + (elapsedSinceSegmentStart * simulationSpeedRef.current);

        setSimulationTime(effectiveTime);
        
        const racingTracks = tracks.filter(t => raceSelectionIds.has(t.id));
        const runnersUpdate: RaceRunner[] = [];
        const newProgress = new Map<string, number>();
        const newSpeeds = new Map<string, number>();
        const currentRunnerDistances: { trackId: string, distance: number, name: string, color: string }[] = [];

        racingTracks.forEach(track => {
            const runnerState = getRunnerStateAtTime(track, effectiveTime);
            if (runnerState) {
                runnersUpdate.push({ trackId: track.id, position: runnerState.position, color: track.color });
                newProgress.set(track.id, runnerState.progress);
                newSpeeds.set(track.id, runnerState.currentSpeed);
                const totalDistanceCovered = runnerState.progress * track.distance;
                currentRunnerDistances.push({ trackId: track.id, distance: totalDistanceCovered, name: track.name, color: track.color });
            } else {
                if (!finishTimesRef.current.has(track.id)) { finishTimesRef.current.set(track.id, effectiveTime); }
                newProgress.set(track.id, 1);
                newSpeeds.set(track.id, 0);
                currentRunnerDistances.push({ trackId: track.id, distance: track.distance, name: track.name, color: track.color });
            }
        });
        
        // --- DYNAMIC Y-AXIS ---
        const distances = currentRunnerDistances.map(r => r.distance);
        const currentLeaderDistance = distances.reduce((max, d) => Math.max(max, d), 0);
        setDynamicMaxDistance(currentLeaderDistance);

        // --- HISTORY SAMPLING ---
        const HISTORY_SAMPLE_RATE = 500; // ms of simulation time
        if(effectiveTime > historySampleTimeRef.current + HISTORY_SAMPLE_RATE) {
          setRaceHistoryData(prev => {
            const newHistory = new Map(prev);
            currentRunnerDistances.forEach(runner => {
              const runnerHistory = newHistory.get(runner.trackId) ?? [];
              newHistory.set(runner.trackId, [...runnerHistory, { time: effectiveTime, distance: runner.distance }]);
            });
            return newHistory;
          });
          historySampleTimeRef.current = effectiveTime;
        }

        // --- RANKS, GAPS, and DISTANCES ---
        currentRunnerDistances.sort((a, b) => b.distance - a.distance);
        const newRanks = new Map<string, number>();
        const newGaps = new Map<string, number>();
        const newGapsToLeader = new Map<string, number>();
        const newRunnerDistancesMap = new Map<string, number>();
        const leader = currentRunnerDistances[0];

        currentRunnerDistances.forEach((runner, index) => {
            newRanks.set(runner.trackId, index + 1);
            newRunnerDistancesMap.set(runner.trackId, runner.distance);
            if (index > 0) {
              const runnerAhead = currentRunnerDistances[index - 1];
              const gapInKm = runnerAhead.distance - runner.distance;
              newGaps.set(runner.trackId, gapInKm * 1000); // Store gap in meters

              if(leader) {
                const gapToLeaderInKm = leader.distance - runner.distance;
                newGapsToLeader.set(runner.trackId, gapToLeaderInKm * 1000); // meters
              }
            }
        });
        setRaceRanks(newRanks);
        setRunnerGaps(newGaps);
        setRunnerGapsToLeader(newGapsToLeader);
        setRunnerDistances(newRunnerDistancesMap);

        
        // --- FASTEST LAP ---
        const LAP_DURATION = 5 * 60 * 1000; // 5 minutes
        if (effectiveTime >= lastLapCheckTimeRef.current + LAP_DURATION) {
            const lapNumber = Math.floor(lastLapCheckTimeRef.current / LAP_DURATION) + 1;
            const lapEndTime = lapNumber * LAP_DURATION;
            let bestRunnerForLap: Track | null = null;
            let maxLapDistance = -1;

            racingTracks.forEach(track => {
                const stateAtLapEnd = getRunnerStateAtTime(track, lapEndTime);
                const distanceAtLapEnd = stateAtLapEnd ? stateAtLapEnd.progress * track.distance : track.distance;
                const distanceAtLapStart = lapStartDistancesRef.current.get(track.id) || 0;
                const lapDistance = distanceAtLapEnd - distanceAtLapStart;

                if (lapDistance > maxLapDistance) {
                    maxLapDistance = lapDistance;
                    bestRunnerForLap = track;
                }
                lapStartDistancesRef.current.set(track.id, distanceAtLapEnd);
            });

            if (bestRunnerForLap) {
                setFastestLaps(prev => [...prev, { lap: lapNumber, name: bestRunnerForLap!.name, color: bestRunnerForLap!.color }]);
            }
            lastLapCheckTimeRef.current = lapEndTime;
        }

        if (runnersUpdate.length > 0) {
            setRaceProgress(newProgress);
            setRunnerSpeeds(newSpeeds);
            setRaceRunners(runnersUpdate);
            raceAnimationRef.current = requestAnimationFrame(runSimulation);
        } else { // Race finished
            setRaceProgress(newProgress);
            setRunnerSpeeds(newSpeeds);
            setRaceRunners(null);
            setRaceRanks(new Map());
            setRunnerGaps(new Map());
            setRunnerGapsToLeader(new Map());
            setRunnerDistances(new Map());


            const finalResults: Omit<RaceResult, 'rank'>[] = racingTracks.map(track => {
              const finishTime = finishTimesRef.current.get(track.id) ?? track.duration;
              const avgSpeed = track.distance > 0 ? track.distance / (finishTime / 3600000) : 0;
              return { trackId: track.id, name: track.name, color: track.color, finishTime, avgSpeed, distance: track.distance };
            });

            finalResults.sort((a, b) => a.finishTime - b.finishTime);
            const rankedResults: RaceResult[] = finalResults.map((result, index) => ({ ...result, rank: index + 1 }));
            
            setRaceResults(rankedResults);

            const finalStats = new Map<string, TrackStats>();
            racingTracks.forEach(track => {
                finalStats.set(track.id, calculateTrackStats(track));
            });
            setRaceStats(finalStats);

            setSimulationState('idle');
            if (raceAnimationRef.current) {
                cancelAnimationFrame(raceAnimationRef.current);
                raceAnimationRef.current = null;
            }
        }
    }, [tracks, raceSelectionIds]);


  const startRace = useCallback(() => {
    if (raceSelectionIds.size < 2 || simulationState === 'running') return;
    
    // --- DUPLICATE TRACK CHECK ---
    const racingTracks = tracks.filter(t => raceSelectionIds.has(t.id));
    const getTrackFingerprint = (track: Track) => `${track.points.length}-${track.duration}-${track.distance.toFixed(4)}`;
    
    const fingerprints = new Map<string, string[]>(); // Map<fingerprint, trackName[]>
    
    for (const track of racingTracks) {
        const fp = getTrackFingerprint(track);
        if (!fingerprints.has(fp)) {
            fingerprints.set(fp, []);
        }
        fingerprints.get(fp)!.push(track.name);
    }

    const duplicates = [];
    for (const group of fingerprints.values()) {
        if (group.length > 1) {
            duplicates.push(group);
        }
    }

    if (duplicates.length > 0) {
        const message = duplicates.map(group => `- ${group.join(', ')}`).join('\n');
        addToast(`Cannot start race with identical tracks:\n${message}\n\nPlease deselect duplicates.`, "error");
        return;
    }

    const preRaceSet = new Set(visibleTrackIds);
    setPreRaceVisibleTrackIds(preRaceSet);
    
    const raceSet = new Set(raceSelectionIds);
    setVisibleTrackIds(raceSet);

    const maxDist = Math.max(0, ...racingTracks.map(t => t.distance));
    setMaxRaceDistance(maxDist);
    setDynamicMaxDistance(0.5); // Initial Y-axis scale of 500m

    const initialRunners = racingTracks.map(track => ({
        trackId: track.id,
        position: {lat: track.points[0].lat, lon: track.points[0].lon },
        color: track.color,
    }));
    
    const newProgress = new Map<string, number>();
    raceSelectionIds.forEach(id => newProgress.set(id, 0));
    setRaceProgress(newProgress);

    setRunnerSpeeds(new Map());
    setRaceRunners(initialRunners);
    
    const newRanks = new Map<string, number>();
    let rankIndex = 0;
    raceSelectionIds.forEach(id => {
      newRanks.set(id, rankIndex + 1);
      rankIndex++;
    });
    setRaceRanks(newRanks);
    
    setRunnerGaps(new Map());
    setRunnerGapsToLeader(new Map());
    setRunnerDistances(new Map());
    setLapTimes(new Map());
    setRaceResults(null);
    setRaceStats(null);
    setFastestLaps([]);
    setLastShownFastestLap(null);
    
    const initialHistory = new Map<string, { time: number; distance: number }[]>();
    racingTracks.forEach(t => initialHistory.set(t.id, [{ time: 0, distance: 0 }]));
    setRaceHistoryData(initialHistory);

    lapStartDistancesRef.current.clear();
    racingTracks.forEach(t => lapStartDistancesRef.current.set(t.id, 0));
    lastLapCheckTimeRef.current = 0;
    historySampleTimeRef.current = 0;
    finishTimesRef.current.clear();

    setSimulationState('running');
    simulationStartTimeRef.current = 0;
    timeAtPauseRef.current = 0;
    setSimulationTime(0);
    raceAnimationRef.current = requestAnimationFrame(runSimulation);
  }, [raceSelectionIds, simulationState, tracks, runSimulation, visibleTrackIds, addToast]);

  const pauseRace = useCallback(() => {
    if (simulationState !== 'running') return;
    setSimulationState('paused');
    if (raceAnimationRef.current) {
        cancelAnimationFrame(raceAnimationRef.current);
    }
    timeAtPauseRef.current = simulationTime;
    simulationStartTimeRef.current = 0;
  }, [simulationState, simulationTime]);
  
  const resumeRace = useCallback(() => {
    if (simulationState !== 'paused') return;
    setSimulationState('running');
    simulationStartTimeRef.current = 0;
    raceAnimationRef.current = requestAnimationFrame(runSimulation);
  }, [simulationState, runSimulation]);
  
  const resetRace = useCallback(() => {
    if (raceAnimationRef.current) {
        cancelAnimationFrame(raceAnimationRef.current);
    }

    if (preRaceVisibleTrackIds) {
      setVisibleTrackIds(preRaceVisibleTrackIds);
      setPreRaceVisibleTrackIds(null);
    }

    setSimulationState('idle');
    setSimulationTime(0);
    setRaceRunners(null);
    setRaceProgress(new Map());
    setRunnerSpeeds(new Map());
    setLapTimes(new Map());
    setRaceResults(null);
    setRaceStats(null);
    setRaceRanks(new Map());
    setRunnerGaps(new Map());
    setRunnerGapsToLeader(new Map());
    setRunnerDistances(new Map());
    setRaceHistoryData(new Map());
    setFastestLaps([]);
    setLastShownFastestLap(null);
    setMaxRaceDistance(0);
    setDynamicMaxDistance(0);
  }, [preRaceVisibleTrackIds]);
  
  const handleTrackHoverStart = useCallback((trackId: string) => {
    setHoveredTrackId(trackId);
  }, []);

  const handleTrackHoverEnd = useCallback(() => {
    setHoveredTrackId(null);
  }, []);
  
  const handleSpeedChange = useCallback((speed: number) => {
    setSimulationSpeed(speed);
  }, []);

  const handleSortChange = useCallback((order: string) => {
    setSortOrder(order as 'date' | 'distance' | 'name' | 'speed' | 'group');
  }, []);

  const handleGoToEditor = useCallback(() => {
    if (raceSelectionIds.size >= 1) {
        const selectedTracks = tracks.filter(t => raceSelectionIds.has(t.id));
        setTracksToEdit(selectedTracks);
        setView('editor');
    }
  }, [tracks, raceSelectionIds]);
  
  const handleExitEditor = useCallback((updatedTrack?: Track) => {
      if (updatedTrack) {
          setTracks(prev => {
              const newTracks = prev.map(t => t.id === updatedTrack.id ? updatedTrack : t);
              return groupTracks(newTracks);
          });
          addToast("Track saved successfully!", "success");
      }
      setTracksToEdit([]);
      setView('visualizer');
  }, [addToast]);

  const handleViewDetails = useCallback((trackId: string) => {
    const selectedTrack = tracks.find(t => t.id === trackId);
    if (selectedTrack) {
        setTrackForDetail(selectedTrack);
        setView('detail');
    }
  }, [tracks]);

  const handleExitDetailView = useCallback(() => {
      setTrackForDetail(null);
      setView('visualizer');
  }, []);

  const handleStartAnimation = useCallback((trackId: string) => {
    const trackToAnimate = tracks.find(t => t.id === trackId);
    if (trackToAnimate) {
        setAnimationTrack(trackToAnimate);
        setAnimationTime(0);
        setIsAnimationPlaying(true);
        setPreRaceVisibleTrackIds(new Set(visibleTrackIds));
        setVisibleTrackIds(new Set([trackId]));
        lastCompletedKmRef.current = 0;
        setAnimationKmHighlight(null);
        setView('animation');
    }
  }, [tracks, visibleTrackIds]);

  const handleExitAnimation = useCallback(() => {
      setIsAnimationPlaying(false);
      setAnimationTrack(null);
      if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
      }
      if (preRaceVisibleTrackIds) {
          setVisibleTrackIds(preRaceVisibleTrackIds);
      }
      setAnimationFinished(false);
      setAnimationKmHighlight(null);
      lastCompletedKmRef.current = 0;
      setView('visualizer');
  }, [preRaceVisibleTrackIds]);

    const handleToggleAnimationPlay = useCallback(() => {
        setIsAnimationPlaying(p => !p);
    }, []);

    const handleAnimationProgressChange = useCallback((progress: number) => {
        if (!animationTrack) return;
        const point = getTrackPointAtDistance(animationTrack, progress);
        if (point) {
            const elapsedTime = point.time.getTime() - animationTrack.points[0].time.getTime();
            setAnimationTime(elapsedTime);
        }
    }, [animationTrack]);

    const handleAnimationSpeedChange = useCallback((speed: number) => {
        setAnimationSpeed(speed);
    }, []);

    const animationProgress = useMemo(() => {
        if (!animationTrack) return 0;
        const point = getTrackPointAtDistance(animationTrack, animationTrack.distance);
        if(!point) return 0;
        
        const targetTime = animationTrack.points[0].time.getTime() + animationTime;

        let p1: TrackPoint | null = null;
        let p2: TrackPoint | null = null;

        for (let i = 0; i < animationTrack.points.length - 1; i++) {
            if (animationTrack.points[i].time.getTime() <= targetTime && animationTrack.points[i + 1].time.getTime() >= targetTime) {
                p1 = animationTrack.points[i];
                p2 = animationTrack.points[i+1];
                break;
            }
        }
        if (!p1 || !p2) {
             if (targetTime >= animationTrack.points[animationTrack.points.length - 1].time.getTime()) {
                setAnimationFinished(true);
                return animationTrack.distance;
             }
             return 0;
        }

        const segmentDuration = p2.time.getTime() - p1.time.getTime();
        if (segmentDuration === 0) return p1.cummulativeDistance;
        
        const timeIntoSegment = targetTime - p1.time.getTime();
        const progressInSegment = timeIntoSegment / segmentDuration;
        
        const segmentDistance = p2.cummulativeDistance - p1.cummulativeDistance;
        return p1.cummulativeDistance + (segmentDistance * progressInSegment);
    }, [animationTrack, animationTime]);
    
    const animationTrackStats = useMemo(() => {
        if (animationTrack) return calculateTrackStats(animationTrack);
        return null;
    }, [animationTrack]);

    const fastestSplitForAnimation = useMemo(() => {
        if (!animationTrackStats) return null;
        return animationTrackStats.splits.find(s => s.isFastest) ?? null;
    }, [animationTrackStats]);
    
    // Animation Loop
    useEffect(() => {
        if (isAnimationPlaying && animationTrack) {
            let lastTimestamp: number | null = null;
            const animate = (timestamp: number) => {
                if (lastTimestamp === null) lastTimestamp = timestamp;
                const delta = (timestamp - lastTimestamp) * animationSpeedRef.current;
                
                setAnimationTime(prev => {
                    const newTime = prev + delta;
                    if (newTime >= animationTrack.duration) {
                        setIsAnimationPlaying(false);
                         setAnimationFinished(true);
                        return animationTrack.duration;
                    }
                    return newTime;
                });
                lastTimestamp = timestamp;
                animationFrameRef.current = requestAnimationFrame(animate);
            }
            animationFrameRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
    }, [isAnimationPlaying, animationTrack]);
    
    // Highlight fastest split during animation
    useEffect(() => {
        if (isAnimationPlaying && animationTrack && fastestSplitForAnimation) {
            const splitStartDistance = fastestSplitForAnimation.splitNumber - 1;
            if (animationProgress >= splitStartDistance && animationProgress < splitStartDistance + 0.1) {
                if (!animationHighlight || animationHighlight.splitNumber !== fastestSplitForAnimation.splitNumber) {
                     setAnimationHighlight(fastestSplitForAnimation);
                     setTimeout(() => setAnimationHighlight(null), 5000);
                }
            }
        }
    }, [isAnimationPlaying, animationTrack, animationProgress, fastestSplitForAnimation, animationHighlight]);

    // Highlight per-kilometer split data
    useEffect(() => {
        if (isAnimationPlaying && animationTrackStats) {
            const currentKm = Math.floor(animationProgress);
            // Check if we have crossed a new integer kilometer mark
            if (currentKm > lastCompletedKmRef.current) {
                const splitData = animationTrackStats.splits.find(s => s.splitNumber === currentKm);
                if (splitData) {
                    // Avoid showing the generic highlight if the "fastest split" highlight is already active for this km
                    if (!animationHighlight || animationHighlight.splitNumber !== splitData.splitNumber) {
                        setAnimationKmHighlight(splitData);
                        // The notification will be displayed for 5 seconds
                        const timer = setTimeout(() => setAnimationKmHighlight(null), 5000);
                    }
                }
                lastCompletedKmRef.current = currentKm;
            }
        }
    }, [animationProgress, isAnimationPlaying, animationTrackStats, animationHighlight]);

    const sortedTracks = useMemo(() => {
        const tracksToSort = [...tracks];
        switch (sortOrder) {
            case 'date':
                return tracksToSort.sort((a, b) => (b.points[0]?.time.getTime() || 0) - (a.points[0]?.time.getTime() || 0));
            case 'distance':
                return tracksToSort.sort((a, b) => b.distance - a.distance);
            case 'name':
                return tracksToSort.sort((a, b) => a.name.localeCompare(b.name));
            case 'speed':
                return tracksToSort.sort((a, b) => {
                    const speedA = a.distance / (a.duration / 3600000);
                    const speedB = b.distance / (b.duration / 3600000);
                    return speedB - speedA;
                });
            case 'group':
                return tracksToSort.sort((a, b) => {
                    if (a.groupId && b.groupId) {
                        // If both are in groups, sort by group ID first, then by date within the group
                        if (a.groupId < b.groupId) return -1;
                        if (a.groupId > b.groupId) return 1;
                        return (b.points[0]?.time.getTime() || 0) - (a.points[0]?.time.getTime() || 0);
                    }
                    if (a.groupId) return -1; // Grouped tracks come first
                    if (b.groupId) return 1;
                    return (b.points[0]?.time.getTime() || 0) - (a.points[0]?.time.getTime() || 0); // Default fallback sort for non-grouped
                });
            default:
                return tracksToSort;
        }
    }, [tracks, sortOrder]);
    
    const handleToggleGroup = useCallback((groupId: string) => {
        setCollapsedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) newSet.delete(groupId);
            else newSet.add(groupId);
            return newSet;
        });
    }, []);

  const activeTracksForChat = useMemo(() => {
      switch (view) {
          case 'visualizer':
              if (raceSelectionIds.size > 0) {
                  return tracks.filter(t => raceSelectionIds.has(t.id));
              }
              return tracks; // All tracks if no selection
          case 'editor':
              return tracksToEdit;
          case 'detail':
              return trackForDetail ? [trackForDetail] : [];
          default:
              return [];
      }
  }, [view, tracks, raceSelectionIds, tracksToEdit, trackForDetail]);

  const handleWelcomeClose = useCallback(() => {
      setIsWelcomeModalOpen(false);
      localStorage.setItem('gpx-welcome-seen', 'true');
  }, []);

  return (
    <div className="h-screen w-screen font-sans relative overflow-hidden">
      <ToastContainer toasts={toasts} setToasts={setToasts} />
      {isWelcomeModalOpen && <WelcomeModal onClose={handleWelcomeClose} />}

      {view === 'visualizer' && (
        <ResizablePanel direction="vertical" initialSize={450} minSize={300}>
          <Sidebar
            tracks={sortedTracks}
            onFileUpload={handleFileUpload}
            visibleTrackIds={visibleTrackIds}
            onToggleVisibility={toggleVisibility}
            raceSelectionIds={raceSelectionIds}
            onToggleRaceSelection={toggleRaceSelection}
            onDeselectAll={handleDeselectAll}
            onStartRace={startRace}
            onGoToEditor={handleGoToEditor}
            onPauseRace={pauseRace}
            onResumeRace={resumeRace}
            onResetRace={resetRace}
            simulationState={simulationState}
            simulationTime={simulationTime}
            onTrackHoverStart={handleTrackHoverStart}
            onTrackHoverEnd={handleTrackHoverEnd}
            raceProgress={raceProgress}
            simulationSpeed={simulationSpeed}
            onSpeedChange={handleSpeedChange}
            lapTimes={lapTimes}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            onDeleteTrack={handleDeleteTrack}
            onViewDetails={handleViewDetails}
            onStartAnimation={handleStartAnimation}
            raceRanks={raceRanks}
            runnerSpeeds={runnerSpeeds}
            runnerDistances={runnerDistances}
            runnerGapsToLeader={runnerGapsToLeader}
            collapsedGroups={collapsedGroups}
            onToggleGroup={handleToggleGroup}
            onOpenChangelog={() => setIsChangelogOpen(true)}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onOpenChat={() => setIsChatOpen(true)}
          />
          <main className="flex-grow bg-slate-900 relative">
              <div className="h-full w-full flex">
                  <MapDisplay
                      tracks={tracks}
                      visibleTrackIds={visibleTrackIds}
                      raceRunners={raceRunners}
                      hoveredTrackId={hoveredTrackId}
                      runnerSpeeds={runnerSpeeds}
                      fitBoundsCounter={fitBoundsCounter}
                  />
                  {(simulationState === 'running' || simulationState === 'paused') && (
                      <div className="absolute right-0 top-0 bottom-0 flex flex-col items-end p-4 pointer-events-none">
                          <div className="flex-grow w-[800px] max-w-[80vw] h-[400px] max-h-[40vh] pointer-events-auto">
                              <RaceLineChart 
                                  racers={tracks.filter(t => raceSelectionIds.has(t.id))}
                                  history={raceHistoryData}
                                  maxDistance={dynamicMaxDistance}
                                  simulationTime={simulationTime}
                                  ranks={raceRanks}
                              />
                          </div>
                          <div className="mt-4 pointer-events-auto">
                              <RaceLeaderboard 
                                  racers={tracks.filter(t => raceSelectionIds.has(t.id))}
                                  ranks={raceRanks}
                                  gaps={runnerGaps}
                              />
                          </div>
                      </div>
                  )}
                  {lastShownFastestLap && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-purple-600/90 text-white p-3 rounded-lg shadow-lg flex items-center animate-fade-in-down z-10">
                          <PurpleFlagIcon />
                          <span className="ml-2 font-semibold">Giro Veloce (Giro {lastShownFastestLap.lap}):</span>
                          <span className="ml-2 font-bold" style={{ color: lastShownFastestLap.color }}>{lastShownFastestLap.name}</span>
                      </div>
                  )}
              </div>
          </main>
        </ResizablePanel>
      )}

      {view === 'animation' && animationTrack && (
        <MapDisplay
            tracks={tracks}
            visibleTrackIds={visibleTrackIds}
            raceRunners={null}
            hoveredTrackId={null}
            runnerSpeeds={new Map()}
            animationTrack={animationTrack}
            animationProgress={animationProgress}
            onExitAnimation={handleExitAnimation}
            fastestSplitForAnimation={fastestSplitForAnimation}
            animationHighlight={animationHighlight}
            animationKmHighlight={animationKmHighlight}
            isAnimationPlaying={isAnimationPlaying}
            onToggleAnimationPlay={handleToggleAnimationPlay}
            onAnimationProgressChange={handleAnimationProgressChange}
            animationSpeed={animationSpeed}
            onAnimationSpeedChange={handleAnimationSpeedChange}
            fitBoundsCounter={fitBoundsCounter}
        />
      )}

      {view === 'editor' && (
          <TrackEditor initialTracks={tracksToEdit} onExit={handleExitEditor} addToast={addToast} />
      )}
      {view === 'detail' && trackForDetail && (
          <TrackDetailView track={trackForDetail} userProfile={userProfile} onExit={handleExitDetailView} onOpenChat={() => setIsChatOpen(true)} />
      )}
      
      {/* Global Modals & Overlays */}
      <div className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 ${isChatOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsChatOpen(false)}></div>
      <div className={`fixed top-0 bottom-0 left-0 h-full w-full max-w-md bg-slate-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isChatOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {isChatOpen && <Chatbot onClose={() => setIsChatOpen(false)} tracksToAnalyze={activeTracksForChat} userProfile={userProfile} />}
      </div>
      
      {raceResults && <RaceSummary results={raceResults} racerStats={raceStats} onClose={resetRace} userProfile={userProfile} tracks={tracks} />}
      {animationFinished && animationTrackStats && (
        <AnimationSummary trackStats={animationTrackStats} userProfile={userProfile} onClose={handleExitAnimation} />
      )}
      {isChangelogOpen && <Changelog onClose={() => setIsChangelogOpen(false)} />}
      {isProfileModalOpen && <UserProfileModal onClose={() => setIsProfileModalOpen(false)} onSave={handleSaveProfile} currentProfile={userProfile}/>}
      
      <style>{`
        @keyframes fade-in-down {
            from { opacity: 0; transform: translate(-50%, -20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in-down {
            animation: fade-in-down 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;