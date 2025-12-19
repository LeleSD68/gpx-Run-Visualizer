
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MapDisplay from './components/MapDisplay';
import { Track, RaceRunner, RaceResult, TrackStats, UserProfile, Toast, Split, AiSegment } from './types';
import { groupTracks } from './services/trackUtils';
import TrackEditor from './components/TrackEditor';
import RaceSummary from './components/RaceSummary';
import WelcomeModal from './components/WelcomeModal';
import Changelog from './components/Changelog';
import UserProfileModal from './components/UserProfileModal';
import TrackDetailView from './components/TrackDetailView';
import Chatbot from './components/Chatbot';
import ToastContainer from './components/ToastContainer';
import VeoAnimationModal from './components/VeoAnimationModal';
import AnimationSummary from './components/AnimationSummary';
import { calculateTrackStats } from './services/trackStatsService';
import { parseGpx } from './services/gpxService';
import { parseTcx } from './services/tcxService';
import { saveTracksToDB, loadTracksFromDB } from './services/dbService';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'
];

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [visibleTrackIds, setVisibleTrackIds] = useState<Set<string>>(new Set());
  const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  
  // Race Simulation State
  const [simulationState, setSimulationState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  const [simulationTime, setSimulationTime] = useState(0);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [raceRunners, setRaceRunners] = useState<RaceRunner[] | null>(null);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  const [racerStats, setRacerStats] = useState<Map<string, TrackStats> | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Single Track Animation State
  const [animationTrackId, setAnimationTrackId] = useState<string | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0); // in km
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(10); // km/h (visual speed)
  const [showSummaryMode, setShowSummaryMode] = useState(false);
  const [fastestSplitForAnimation, setFastestSplitForAnimation] = useState<Split | null>(null);
  const [animationHighlight, setAnimationHighlight] = useState<Split | null>(null);
  const [fitBoundsCounter, setFitBoundsCounter] = useState(0);
  const [aiSegmentHighlight, setAiSegmentHighlight] = useState<AiSegment | null>(null);

  // Modals & Views
  const [trackToEdit, setTrackToEdit] = useState<Track | null>(null);
  const [detailTrackId, setDetailTrackId] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [tokenCount, setTokenCount] = useState(0);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showVeoModal, setShowVeoModal] = useState(false);
  const [veoTrack, setVeoTrack] = useState<Track | null>(null);
  
  // Sidebar State
  const [raceProgress, setRaceProgress] = useState<Map<string, number>>(new Map());
  const [lapTimes, setLapTimes] = useState<Map<string, number[]>>(new Map());
  const [sortOrder, setSortOrder] = useState('date');
  const [raceRanks, setRaceRanks] = useState<Map<string, number>>(new Map());
  const [runnerSpeeds, setRunnerSpeeds] = useState<Map<string, number>>(new Map());
  const [runnerDistances, setRunnerDistances] = useState<Map<string, number>>(new Map());
  const [runnerGapsToLeader, setRunnerGapsToLeader] = useState<Map<string, number>>(new Map());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const addToast = useCallback((message: string, type: Toast['type']) => {
      setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);

  // CARICAMENTO: Carica le tracce da IndexedDB all'avvio
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const revived = await loadTracksFromDB();
        if (revived && revived.length > 0) {
          setTracks(revived);
          setVisibleTrackIds(new Set(revived.map(t => t.id)));
        }
      } catch (e) {
        console.error("Database load failed", e);
        addToast("Impossibile caricare i dati locali.", "error");
      } finally {
        setIsDbInitialized(true);
      }
    };
    loadInitialData();
  }, [addToast]);

  // SALVATAGGIO: Salva le tracce ogni volta che cambiano
  useEffect(() => {
    if (isDbInitialized) {
      saveTracksToDB(tracks).catch(e => {
        console.error("Database save failed", e);
      });
    }
  }, [tracks, isDbInitialized]);

  // Espone il contatore token alla finestra
  useEffect(() => {
    window.gpxApp = {
        addTokens: (count: number) => {
            setTokenCount(prev => {
                const newValue = prev + count;
                localStorage.setItem('gpx_ai_tokens', newValue.toString());
                return newValue;
            });
        }
    };
  }, []);

  useEffect(() => {
      const hasVisited = localStorage.getItem('gpx_viz_visited');
      if (!hasVisited) {
          setShowWelcome(true);
          localStorage.setItem('gpx_viz_visited', 'true');
      }

      const storedProfile = localStorage.getItem('gpx_user_profile');
      if (storedProfile) {
          try {
              setUserProfile(JSON.parse(storedProfile));
          } catch (e) { console.error("Failed to parse profile", e); }
      }

      const storedTokens = localStorage.getItem('gpx_ai_tokens');
      if (storedTokens) {
          setTokenCount(parseInt(storedTokens, 10) || 0);
      }
  }, []);

  const handleFileUpload = async (files: File[] | null) => {
    if (!files || files.length === 0) return;

    const newTracks: Track[] = [];
    const existingFingerprints = new Set(tracks.map(t => `${t.points.length}-${t.duration}-${t.distance.toFixed(5)}`));

    for (const file of files) {
        try {
            const fileContent = await file.text();
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            let parsedData = null;

            if (fileExtension === 'gpx') parsedData = parseGpx(fileContent, file.name);
            else if (fileExtension === 'tcx') parsedData = parseTcx(fileContent, file.name);

            if (parsedData) {
                 const fingerprint = `${parsedData.points.length}-${parsedData.duration}-${parsedData.distance.toFixed(5)}`;
                if (!existingFingerprints.has(fingerprint)) {
                    const newTrack: Track = {
                        id: `${file.name}-${new Date().getTime()}-${Math.random()}`,
                        name: parsedData.name,
                        points: parsedData.points,
                        color: COLORS[(tracks.length + newTracks.length) % COLORS.length],
                        distance: parsedData.distance,
                        duration: parsedData.duration,
                    };
                    newTracks.push(newTrack);
                    existingFingerprints.add(fingerprint);
                }
            }
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
        }
    }

    if (newTracks.length > 0) {
        setTracks(prevTracks => groupTracks([...prevTracks, ...newTracks]));
        setVisibleTrackIds(prev => {
            const newSet = new Set(prev);
            newTracks.forEach(t => newSet.add(t.id));
            return newSet;
        });
        addToast(`Sincronizzate ${newTracks.length} nuove attività nel database.`, 'success');
    }
  };

  const handleToggleVisibility = (trackId: string) => {
    setVisibleTrackIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) newSet.delete(trackId); else newSet.add(trackId);
      return newSet;
    });
  };

  const handleToggleRaceSelection = (trackId: string) => {
    setRaceSelectionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) newSet.delete(trackId); else newSet.add(trackId);
      return newSet;
    });
  };

  const startRace = () => {
    if (raceSelectionIds.size < 2) return;
    setVisibleTrackIds(new Set(raceSelectionIds));
    const selectedTracks = tracks.filter(t => raceSelectionIds.has(t.id));
    const statsMap = new Map<string, TrackStats>();
    selectedTracks.forEach(t => statsMap.set(t.id, calculateTrackStats(t)));
    setRacerStats(statsMap);
    const runners: RaceRunner[] = selectedTracks.map(t => ({
      trackId: t.id,
      position: t.points[0],
      color: t.color
    }));
    setRaceRunners(runners);
    setSimulationState('running');
    setSimulationTime(0);
    setRaceResults([]);
    lastFrameTimeRef.current = performance.now();
    setFitBoundsCounter(c => c + 1);
  };

  const updateRace = useCallback((time: number) => {
      if (simulationState !== 'running' || !raceRunners) return;
      const deltaTime = time - lastFrameTimeRef.current;
      lastFrameTimeRef.current = time;
      const timeIncrement = deltaTime * simulationSpeed;
      const newSimulationTime = simulationTime + timeIncrement;
      setSimulationTime(newSimulationTime);
      const activeRunners = tracks.filter(t => raceSelectionIds.has(t.id));
      const newRunners: RaceRunner[] = [];
      const currentDistances = new Map<string, number>();
      const currentSpeeds = new Map<string, number>();
      let finishedCount = 0;
      const justFinished: RaceResult[] = [];
      activeRunners.forEach(track => {
          const alreadyFinished = raceResults.find(r => r.trackId === track.id);
          if (alreadyFinished) { finishedCount++; currentDistances.set(track.id, track.distance); return; }
          if (newSimulationTime >= track.duration) {
              justFinished.push({
                  rank: raceResults.length + justFinished.length + 1,
                  trackId: track.id,
                  name: track.name, color: track.color,
                  finishTime: track.duration,
                  avgSpeed: (track.distance / (track.duration / 3600000)),
                  distance: track.distance
              });
              finishedCount++; currentDistances.set(track.id, track.distance); return;
          }
          const trackStartTime = track.points[0].time.getTime();
          const currentRealTime = trackStartTime + newSimulationTime;
          let currentPoint = track.points[0];
          let speed = 0;
          let distanceCovered = 0;
          for (let i = 0; i < track.points.length - 1; i++) {
              if (track.points[i+1].time.getTime() >= currentRealTime) {
                  const p1 = track.points[i];
                  const p2 = track.points[i+1];
                  const segmentDuration = p2.time.getTime() - p1.time.getTime();
                  const ratio = (currentRealTime - p1.time.getTime()) / segmentDuration;
                  currentPoint = {
                      lat: p1.lat + (p2.lat - p1.lat) * ratio,
                      lon: p1.lon + (p2.lon - p1.lon) * ratio,
                      ele: p1.ele,
                      time: new Date(currentRealTime),
                      cummulativeDistance: p1.cummulativeDistance + (p2.cummulativeDistance - p1.cummulativeDistance) * ratio,
                      hr: p1.hr
                  };
                  const distDiff = p2.cummulativeDistance - p1.cummulativeDistance;
                  const timeDiffHours = segmentDuration / 3600000;
                  speed = timeDiffHours > 0 ? distDiff / timeDiffHours : 0;
                  distanceCovered = currentPoint.cummulativeDistance;
                  break;
              }
          }
          newRunners.push({ trackId: track.id, position: currentPoint, color: track.color });
          currentDistances.set(track.id, distanceCovered);
          currentSpeeds.set(track.id, speed);
          setRaceProgress(prev => new Map(prev).set(track.id, distanceCovered / track.distance));
      });
      if (justFinished.length > 0) {
          justFinished.sort((a, b) => a.finishTime - b.finishTime);
          const startRank = raceResults.length + 1;
          justFinished.forEach((r, i) => r.rank = startRank + i);
          setRaceResults(prev => [...prev, ...justFinished]);
      }
      setRaceRunners(newRunners);
      setRunnerSpeeds(currentSpeeds);
      setRunnerDistances(currentDistances);
      const activeIds = activeRunners.map(t => t.id);
      const sortedByDist = activeIds.sort((a, b) => (currentDistances.get(b) || 0) - (currentDistances.get(a) || 0));
      const newRanks = new Map<string, number>();
      const newGaps = new Map<string, number>();
      const leaderDist = currentDistances.get(sortedByDist[0]) || 0;
      sortedByDist.forEach((id, index) => {
          const finishedResult = raceResults.find(r => r.trackId === id);
          newRanks.set(id, finishedResult ? finishedResult.rank : raceResults.length + index + 1);
          if (index === 0) newGaps.set(id, 0); else newGaps.set(id, (leaderDist - (currentDistances.get(id) || 0)) * 1000);
      });
      setRaceRanks(newRanks);
      setRunnerGapsToLeader(newGaps);
      if (finishedCount === activeRunners.length) { setSimulationState('finished'); if (animationRef.current) cancelAnimationFrame(animationRef.current); }
      else { animationRef.current = requestAnimationFrame(updateRace); }
  }, [simulationState, simulationTime, simulationSpeed, raceRunners, raceSelectionIds, tracks, raceResults]);

  useEffect(() => {
      if (simulationState === 'running') animationRef.current = requestAnimationFrame(updateRace);
      return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [simulationState, updateRace]);

  const togglePause = () => {
      if (simulationState === 'running') setSimulationState('paused');
      else if (simulationState === 'paused') { setSimulationState('running'); lastFrameTimeRef.current = performance.now(); }
  };

  const resetRace = () => {
      setSimulationState('idle'); setSimulationTime(0); setRaceResults([]); setRaceRunners(null);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };
  
  const updateSingleAnimation = useCallback((time: number) => {
      if (!isAnimationPlaying || !animationTrackId) return;
      const deltaTime = time - lastFrameTimeRef.current;
      lastFrameTimeRef.current = time;
      const track = tracks.find(t => t.id === animationTrackId);
      if (!track) return;
      const kmPerMs = animationSpeed / 3600000;
      let newProgress = animationProgress + (kmPerMs * deltaTime);
      if (newProgress >= track.distance) { newProgress = track.distance; setIsAnimationPlaying(false); setShowSummaryMode(true); }
      setAnimationProgress(newProgress);
      if (fastestSplitForAnimation) {
          const currentKm = Math.floor(newProgress);
          if (currentKm === fastestSplitForAnimation.splitNumber - 1) setAnimationHighlight(fastestSplitForAnimation);
          else setAnimationHighlight(null);
      }
      animationRef.current = requestAnimationFrame(updateSingleAnimation);
  }, [isAnimationPlaying, animationTrackId, animationProgress, animationSpeed, tracks, fastestSplitForAnimation]);

  useEffect(() => {
      if (isAnimationPlaying) { lastFrameTimeRef.current = performance.now(); animationRef.current = requestAnimationFrame(updateSingleAnimation); }
      return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isAnimationPlaying, updateSingleAnimation]);

  const startSingleAnimation = (trackId: string) => {
      setAnimationTrackId(trackId); setAnimationProgress(0); setIsAnimationPlaying(true); setVisibleTrackIds(new Set([trackId])); setShowSummaryMode(false);
      const track = tracks.find(t => t.id === trackId);
      if (track) {
          const stats = calculateTrackStats(track);
          setFastestSplitForAnimation(stats.splits.find(s => s.isFastest) || null);
          setFitBoundsCounter(c => c + 1);
      }
  };

  const handleProfileSave = (profile: UserProfile) => {
      setUserProfile(profile);
      localStorage.setItem('gpx_user_profile', JSON.stringify(profile));
      addToast("Profilo e obiettivi aggiornati.", "success");
  };
  
  const sortTracks = (tracksToSort: Track[]) => {
      return [...tracksToSort].sort((a, b) => {
          if (sortOrder === 'date') return b.points[0].time.getTime() - a.points[0].time.getTime();
          if (sortOrder === 'distance') return b.distance - a.distance;
          if (sortOrder === 'name') return a.name.localeCompare(b.name);
          return 0;
      });
  };

  if (trackToEdit) {
      return (
          <>
            <ToastContainer toasts={toasts} setToasts={setToasts} />
            <TrackEditor 
                initialTracks={[trackToEdit]} 
                onExit={(updatedTrack) => {
                    if (updatedTrack) {
                        setTracks((prev: Track[]) => prev.map(t => t.id === trackToEdit.id ? updatedTrack : t));
                    }
                    setTrackToEdit(null);
                }}
                addToast={addToast}
            />
          </>
      );
  }

  if (detailTrackId) {
      const track = tracks.find(t => t.id === detailTrackId);
      if (track) {
          return (
              <>
                 <ToastContainer toasts={toasts} setToasts={setToasts} />
                 <TrackDetailView 
                    track={track} 
                    userProfile={userProfile} 
                    onExit={() => setDetailTrackId(null)} 
                    allHistory={tracks}
                 />
              </>
          );
      }
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      <ToastContainer toasts={toasts} setToasts={setToasts} />
      
      <div className={`flex-shrink-0 transition-all duration-300 ${simulationState === 'finished' ? 'w-0 overflow-hidden' : 'w-80 border-r border-slate-700'}`}>
          <Sidebar
            tracks={sortTracks(tracks)}
            onFileUpload={(files) => handleFileUpload(files)}
            visibleTrackIds={visibleTrackIds}
            onToggleVisibility={handleToggleVisibility}
            raceSelectionIds={raceSelectionIds}
            onToggleRaceSelection={handleToggleRaceSelection}
            onDeselectAll={() => setRaceSelectionIds(new Set())}
            onStartRace={startRace}
            onGoToEditor={() => { const selected = tracks.find(t => raceSelectionIds.has(t.id)); if (selected) setTrackToEdit(selected); }}
            onPauseRace={togglePause}
            onResumeRace={togglePause}
            onResetRace={resetRace}
            simulationState={simulationState}
            simulationTime={simulationTime}
            onTrackHoverStart={() => {}}
            onTrackHoverEnd={() => {}}
            raceProgress={raceProgress}
            simulationSpeed={simulationSpeed}
            onSpeedChange={setSimulationSpeed}
            lapTimes={lapTimes}
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
            onDeleteTrack={(id) => {
                setTracks((prev) => prev.filter(t => t.id !== id));
                setVisibleTrackIds(prev => { const s = new Set(prev); s.delete(id); return s; });
            }}
            onViewDetails={(id) => setDetailTrackId(id)}
            onStartAnimation={startSingleAnimation}
            raceRanks={raceRanks}
            runnerSpeeds={runnerSpeeds}
            runnerDistances={runnerDistances}
            runnerGapsToLeader={runnerGapsToLeader}
            collapsedGroups={collapsedGroups}
            onToggleGroup={(gid) => { setCollapsedGroups(prev => { const s = new Set(prev); if (s.has(gid)) s.delete(gid); else s.add(gid); return s; }); }}
            onOpenChangelog={() => setShowChangelog(true)}
            onOpenProfile={() => setShowProfile(true)}
            tokenCount={tokenCount}
          />
      </div>

      <div className="flex-grow relative flex flex-col min-w-0">
          <div className="flex-grow relative">
              <MapDisplay
                tracks={tracks}
                visibleTrackIds={visibleTrackIds}
                raceRunners={raceRunners}
                hoveredTrackId={null}
                runnerSpeeds={runnerSpeeds}
                animationTrack={animationTrackId ? tracks.find(t => t.id === animationTrackId) : null}
                animationProgress={animationProgress}
                onExitAnimation={() => setAnimationTrackId(null)}
                isAnimationPlaying={isAnimationPlaying}
                onToggleAnimationPlay={() => setIsAnimationPlaying(!isAnimationPlaying)}
                onAnimationProgressChange={setAnimationProgress}
                animationSpeed={animationSpeed}
                onAnimationSpeedChange={setAnimationSpeed}
                showSummaryMode={showSummaryMode}
                fastestSplitForAnimation={fastestSplitForAnimation}
                animationHighlight={animationHighlight}
                fitBoundsCounter={fitBoundsCounter}
                aiSegmentHighlight={aiSegmentHighlight}
              />
              
              <button
                  onClick={() => setShowChatbot(!showChatbot)}
                  className="absolute bottom-6 right-6 bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-full shadow-lg z-[1000] transition-transform hover:scale-105"
                  title="AI Assistant"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                      <path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" />
                  </svg>
              </button>

              {showChatbot && (
                  <div className="absolute bottom-20 right-6 w-96 h-[500px] bg-slate-800 rounded-lg shadow-2xl z-[1000] overflow-hidden border border-slate-700 flex flex-col">
                      <div className="flex justify-between items-center p-3 bg-slate-900 border-b border-slate-700">
                           <h3 className="font-bold text-cyan-400">Coach AI Personale</h3>
                           <button onClick={() => setShowChatbot(false)} className="text-slate-400 hover:text-white text-xl">&times;</button>
                      </div>
                      <div className="flex-grow overflow-hidden">
                        <Chatbot 
                            tracksToAnalyze={tracks}
                            userProfile={userProfile}
                        />
                      </div>
                  </div>
              )}
          </div>

          {simulationState === 'finished' && raceResults.length > 0 && (
             <div className="absolute inset-0 z-[1500]">
                <RaceSummary 
                    results={raceResults} racerStats={racerStats}
                    onClose={resetRace} userProfile={userProfile} tracks={tracks}
                />
             </div>
          )}

           {showSummaryMode && animationTrackId && (
              <AnimationSummary 
                trackStats={calculateTrackStats(tracks.find(t => t.id === animationTrackId)!)}
                userProfile={userProfile} onClose={() => setAnimationTrackId(null)}
              />
           )}
      </div>

      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
      {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
      {showProfile && <UserProfileModal onClose={() => setShowProfile(false)} onSave={handleProfileSave} currentProfile={userProfile} />}
      {showVeoModal && veoTrack && <VeoAnimationModal track={veoTrack} onClose={() => { setShowVeoModal(false); setVeoTrack(null); }} />}
    </div>
  );
};

export default App;
