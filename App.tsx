import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import MapDisplay from './components/MapDisplay';
import LiveCommentary from './components/LiveCommentary';
import { Track, RaceRunner, RaceResult, TrackStats, UserProfile, Toast, Split, TrackPoint, PlannedWorkout, ActivityType, Commentary, MonthlyStats } from './types';
import { groupTracks } from './services/trackUtils';
import TrackEditor from './components/TrackEditor';
import RaceSummary from './components/RaceSummary';
import Changelog from './components/Changelog';
import UserProfileModal from './components/UserProfileModal';
import TrackDetailView from './components/TrackDetailView';
import Chatbot from './components/Chatbot';
import ToastContainer from './components/ToastContainer';
import AnimationSummary from './components/AnimationSummary';
import GuideModal from './components/GuideModal';
import InitialChoiceModal from './components/InitialChoiceModal';
import HomeModal from './components/HomeModal';
import Tooltip from './components/Tooltip';
import DiaryView from './components/DiaryView'; 
import TrackPreview from './components/TrackPreview';
import ResizablePanel from './components/ResizablePanel';
import RatingStars from './components/RatingStars';
import AiReviewModal from './components/AiReviewModal';
import { calculateTrackStats } from './services/trackStatsService';
import { parseGpx } from './services/gpxService';
import { parseTcx } from './services/tcxService';
import { saveTracksToDB, loadTracksFromDB, loadProfileFromDB, saveProfileToDB, exportAllData, importAllData, BackupData, loadPlannedWorkoutsFromDB, savePlannedWorkoutsToDB } from './services/dbService';
import { generateSmartTitle } from './services/titleGenerator';
import { GoogleGenAI, Type } from '@google/genai';
import { getTrackPointAtDistance } from './services/trackEditorUtils';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'
];

type ListViewMode = 'full' | 'compact' | 'minimal';
type ExplorerSort = 'date' | 'distance' | 'name';
type ExplorerGroup = 'none' | 'activity' | 'month';

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
  const [visibleTrackIds, setVisibleTrackIds] = useState<Set<string>>(new Set());
  const [raceSelectionIds, setRaceSelectionIds] = useState<Set<string>>(new Set());
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [listViewMode, setListViewMode] = useState<ListViewMode>('compact');
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [isAiRating, setIsAiRating] = useState(false);
  const [reviewTrackId, setReviewTrackId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const monthlyStats = useMemo((): MonthlyStats => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthTracks = tracks.filter(t => {
      const d = t.points[0].time;
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    if (monthTracks.length === 0) return { totalDistance: 0, totalDuration: 0, activityCount: 0, avgPace: 0 };

    const totalDistance = monthTracks.reduce((s, t) => s + t.distance, 0);
    const totalDuration = monthTracks.reduce((s, t) => s + t.duration, 0);
    const activityCount = monthTracks.length;
    const avgPace = totalDistance > 0 ? (totalDuration / 1000 / 60) / totalDistance : 0;

    return { totalDistance, totalDuration, activityCount, avgPace };
  }, [tracks]);

  const [explorerCols, setExplorerCols] = useState(3);
  const [explorerSort, setExplorerSort] = useState<ExplorerSort>('date');
  const [explorerGroup, setExplorerGroup] = useState<ExplorerGroup>('none');

  const [simulationState, setSimulationState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  const [simulationTime, setSimulationTime] = useState(0);
  const [simulationSpeed, setSimulationSpeed] = useState(20); 
  const [raceRunners, setRaceRunners] = useState<RaceRunner[] | null>(null);
  const [raceResults, setRaceResults] = useState<RaceResult[]>([]);
  const [racerStats, setRacerStats] = useState<Map<string, TrackStats> | null>(null);
  const [liveCommentary, setLiveCommentary] = useState<Commentary[]>([]);
  const [isCommentaryLoading, setIsCommentaryLoading] = useState(false);
  const lastCommentarySimTime = useRef<number>(-30000); 
  
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const [animationTrackId, setAnimationTrackId] = useState<string | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0); 
  const [animationPace, setAnimationPace] = useState(0);
  const currentDistRef = useRef<number>(0);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(10); 
  const [showSummaryMode, setShowSummaryMode] = useState(false);
  const [fastestSplitForAnimation, setFastestSplitForAnimation] = useState<Split | null>(null);
  const [animationHighlight, setAnimationHighlight] = useState<Split | null>(null);
  const [fitBoundsCounter, setFitBoundsCounter] = useState(0);
  const [selectedSplit, setSelectedSplit] = useState<Split | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<any>({ show: false, title: '', message: '', onConfirm: () => {} });
  const [tracksToEdit, setTracksToEdit] = useState<Track[]>([]);
  const [detailTrackId, setDetailTrackId] = useState<string | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showHome, setShowHome] = useState(false);
  const [showDiary, setShowDiary] = useState(false); 
  const [showExplorer, setShowExplorer] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [raceProgress, setRaceProgress] = useState<Map<string, number>>(new Map());
  const [sortOrder, setSortOrder] = useState('date');
  const [raceRanks, setRaceRanks] = useState<Map<string, number>>(new Map());
  const [runnerSpeeds, setRunnerSpeeds] = useState<Map<string, number>>(new Map());
  const [runnerDistances, setRunnerDistances] = useState<Map<string, number>>(new Map());
  const [runnerGapsToLeader, setRunnerGapsToLeader] = useState<Map<string, number>>(new Map());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const addToast = useCallback((message: string, type: Toast['type']) => {
      setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);

  const loadAllFromDB = useCallback(async () => {
    try {
      const revivedTracks = await loadTracksFromDB();
      const revivedPlanned = await loadPlannedWorkoutsFromDB();
      let revivedProfile = await loadProfileFromDB();
      let safeTracks = revivedTracks || [];
      setTracks(safeTracks);
      setPlannedWorkouts(revivedPlanned || []);
      setVisibleTrackIds(new Set(safeTracks.map(t => t.id)));
      if (revivedProfile) setUserProfile(revivedProfile);
      
      // La schermata Home deve essere la prima cosa all'avvio
      setShowHome(true);

      if (safeTracks.length === 0) { 
        setIsOnboarding(true); 
      }
    } catch (e) { addToast("Errore caricamento dati.", "error"); } 
    finally { setIsDbInitialized(true); }
  }, [addToast]);

  useEffect(() => { loadAllFromDB(); }, [loadAllFromDB]);
  useEffect(() => { if (isDbInitialized) { saveTracksToDB(tracks).catch(console.error); savePlannedWorkoutsToDB(plannedWorkouts).catch(console.error); } }, [tracks, plannedWorkouts, isDbInitialized]);

  const sortedExplorerTracks = useMemo(() => {
    const list = [...tracks];
    list.sort((a, b) => {
      if (explorerSort === 'date') return b.points[0].time.getTime() - a.points[0].time.getTime();
      if (explorerSort === 'distance') return b.distance - a.distance;
      if (explorerSort === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
    return list;
  }, [tracks, explorerSort]);

  const groupedExplorerTracks = useMemo(() => {
    if (explorerGroup === 'none') return { "Tutte le attività": sortedExplorerTracks };
    const groups: Record<string, Track[]> = {};
    sortedExplorerTracks.forEach(t => {
      let key = "Altro";
      if (explorerGroup === 'activity') key = t.activityType || "Altro";
      if (explorerGroup === 'month') key = t.points[0].time.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [sortedExplorerTracks, explorerGroup]);

  const handleExportBackup = async () => {
    try {
      addToast("Preparazione backup...", "info");
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url; a.download = `gpx_viz_backup_${date}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      addToast("Backup scaricato correttamente.", "success");
    } catch (e) { addToast("Errore durante l'esportazione.", "error"); }
  };

  const handleImportBackup = async (file: File) => {
      const processImport = async () => {
          try {
            const text = await file.text();
            const data = JSON.parse(text) as BackupData;
            await importAllData(data); await loadAllFromDB();
            addToast("Backup ripristinato con successo.", "success");
            setShowHome(false);
          } catch (err) { addToast("Errore durante il ripristino dei dati.", "error"); }
      };
      if (tracks.length > 0) {
          setConfirmDialog({
              show: true, title: 'Sovrascrivere i dati?', message: 'L\'importazione del backup sovrascriverà tutte le corse e le analisi correnti.',
              onConfirm: async () => { await processImport(); setConfirmDialog(p => ({...p, show: false})); }
          });
      } else await processImport();
  };

  const handleRegenerateTitles = () => {
      if (tracks.length === 0) return;
      setConfirmDialog({
          show: true, title: 'Rigenerare tutti i nomi?', message: 'Questo processo analizzerà tutte le tue tracce e assegnerà nuovi titoli intelligenti.',
          onConfirm: () => {
              const updatedTracks = tracks.map(track => {
                  const smartData = generateSmartTitle(track.points, track.distance, track.name);
                  return { ...track, name: smartData.title, activityType: smartData.activityType, folder: smartData.folder ? smartData.folder : track.folder };
              });
              setTracks(updatedTracks); addToast(`Titoli rigenerati per ${tracks.length} attività.`, "success"); setConfirmDialog(p => ({...p, show: false}));
          }
      });
  };

  const handleAiBulkRate = async () => {
    const unrated = tracks.filter(t => t.rating === undefined);
    if (unrated.length === 0) { addToast("Tutte le corse hanno già una valutazione AI.", "info"); return; }
    setIsAiRating(true);
    addToast(`Analisi di ${unrated.length} corse in corso...`, "info");
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const userGoals = userProfile.goals?.join(", ") || "Salute";
        const userAge = userProfile.age || "N/D";
        const runsData = unrated.map(t => {
            const s = calculateTrackStats(t);
            return { id: t.id, dist: t.distance.toFixed(2), pace: (s.movingAvgPace).toFixed(2), elev: Math.round(s.elevationGain), hr: s.avgHr ? Math.round(s.avgHr) : "N/D" };
        });
        const prompt = `Sei un esperto coach di corsa. Valuta oggettivamente le seguenti sessioni di allenamento con un punteggio da 1 a 5 stelle (intero). Per ogni corsa fornisci anche una brevissima motivazione (massimo 10-12 parole) che sia CHIARA, COMPLETA e CONCISA. Atleta di ${userAge} anni, obiettivi: ${userGoals}. Analizza questi dati: ${JSON.stringify(runsData)}. Rispondi esclusivamente con un array JSON di oggetti {id, rating, reason}.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT, 
                        properties: { 
                            id: { type: Type.STRING }, 
                            rating: { type: Type.NUMBER },
                            reason: { type: Type.STRING } 
                        }, 
                        required: ["id", "rating", "reason"] 
                    } 
                }
            }
        });
        const ratings: {id: string, rating: number, reason: string}[] = JSON.parse(response.text || '[]');
        const updatedTracks = tracks.map(t => {
            const found = ratings.find(r => r.id === t.id);
            if (found) return { ...t, rating: Math.max(1, Math.min(5, found.rating)), ratingReason: found.reason };
            return t;
        });
        setTracks(updatedTracks); addToast(`Valutazione completata per ${ratings.length} attività!`, "success");
    } catch (e) { console.error(e); addToast("Errore durante la valutazione AI.", "error"); } 
    finally { setIsAiRating(false); }
  };

  const updateSingleAnimation = useCallback((time: number) => {
    if (!isAnimationPlaying || !animationTrackId) return;
    if (lastFrameTimeRef.current === 0) { lastFrameTimeRef.current = time; animationRef.current = requestAnimationFrame(updateSingleAnimation); return; }
    const deltaTime = time - lastFrameTimeRef.current; lastFrameTimeRef.current = time;
    const track = tracks.find(t => t.id === animationTrackId);
    if (!track) return;
    const kmPerMs = (animationSpeed * 5) / 3600000; 
    let newDist = currentDistRef.current + (kmPerMs * deltaTime);
    if (newDist >= track.distance) { newDist = track.distance; setIsAnimationPlaying(false); setShowSummaryMode(true); setFitBoundsCounter(c => c + 1); }
    if (newDist > 0.1) {
        const pCurrent = getTrackPointAtDistance(track, newDist);
        const pPrev = getTrackPointAtDistance(track, Math.max(0, newDist - 0.1));
        if (pCurrent && pPrev) {
            const dDist = pCurrent.cummulativeDistance - pPrev.cummulativeDistance;
            const timeMin = (pCurrent.time.getTime() - pPrev.time.getTime()) / 60000;
            if (dDist > 0) setAnimationPace(timeMin / dDist);
        }
    } else setAnimationPace(0);
    currentDistRef.current = newDist; setAnimationProgress(newDist); animationRef.current = requestAnimationFrame(updateSingleAnimation);
  }, [isAnimationPlaying, animationTrackId, animationSpeed, tracks]);

  useEffect(() => {
    if (isAnimationPlaying) { lastFrameTimeRef.current = performance.now(); animationRef.current = requestAnimationFrame(updateSingleAnimation); }
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isAnimationPlaying, updateSingleAnimation]);

  const startSingleAnimation = (trackId: string) => {
    setSimulationState('idle'); setAnimationTrackId(trackId); currentDistRef.current = 0; setAnimationProgress(0); setAnimationPace(0); setIsAnimationPlaying(true); 
    setVisibleTrackIds(new Set([trackId])); setShowSummaryMode(false); setIsMobileSidebarOpen(false); lastFrameTimeRef.current = 0;
    const track = tracks.find(t => t.id === trackId);
    if (track) {
        const stats = calculateTrackStats(track);
        setFastestSplitForAnimation(stats.splits.find(s => s.isFastest) || null);
        setFitBoundsCounter(c => c + 1);
    }
    setDetailTrackId(null);
  };

  const closeAnimationAndReturn = () => {
    setAnimationTrackId(null); setIsAnimationPlaying(false); setShowSummaryMode(false); setIsMobileSidebarOpen(true); 
    setVisibleTrackIds(new Set(tracks.map(t => t.id)));
  };

  const generateLiveCommentary = useCallback(async (simTime: number, runners: RaceRunner[], ranks: Map<string, number>, gaps: Map<string, number>, speeds: Map<string, number>) => {
    if (isCommentaryLoading) return;
    setIsCommentaryLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const activeTracks = tracks.filter(t => raceSelectionIds.has(t.id));
      const leaderId = [...ranks.entries()].find(([id, r]) => r === 1)?.[0];
      const leader = activeTracks.find(t => t.id === leaderId);
      const prompt = `Sei un telecronista sportivo live. Dai un aggiornamento flash di 15-20 parole sulla gara. Leader: ${leader?.name || 'Sconosciuto'}. Sii energico e breve. Solo testo in italiano.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setLiveCommentary(prev => [...prev, { time: simTime, text: response.text || '' }]);
    } catch (e) { console.error(e); } 
    finally { setIsCommentaryLoading(false); }
  }, [tracks, raceSelectionIds, isCommentaryLoading]);

  const updateRace = useCallback((time: number) => {
      if (simulationState !== 'running' || !raceRunners) return;
      if (lastFrameTimeRef.current === 0) { lastFrameTimeRef.current = time; animationRef.current = requestAnimationFrame(updateRace); return; }
      const deltaTime = time - lastFrameTimeRef.current; lastFrameTimeRef.current = time;
      const timeIncrement = deltaTime * simulationSpeed; const newSimulationTime = simulationTime + timeIncrement;
      setSimulationTime(newSimulationTime);
      const activeRunners = tracks.filter(t => raceSelectionIds.has(t.id));
      const newRunners: RaceRunner[] = []; const currentDistances = new Map<string, number>(); const currentSpeeds = new Map<string, number>();
      let finishedCount = 0; const justFinished: RaceResult[] = [];
      activeRunners.forEach(track => {
          const alreadyFinished = raceResults.find(r => r.trackId === track.id);
          if (alreadyFinished) { finishedCount++; currentDistances.set(track.id, track.distance); return; }
          if (newSimulationTime >= track.duration) {
              justFinished.push({ rank: raceResults.length + justFinished.length + 1, trackId: track.id, name: track.name, color: track.color, finishTime: track.duration, avgSpeed: (track.distance / (track.duration / 3600000)), distance: track.distance });
              finishedCount++; currentDistances.set(track.id, track.distance); return;
          }
          const trackStartTime = track.points[0].time.getTime(); const currentRealTime = trackStartTime + newSimulationTime;
          let currentPoint = track.points[0]; let speed = 0; let distanceCovered = 0;
          for (let i = 0; i < track.points.length - 1; i++) {
              if (track.points[i+1].time.getTime() >= currentRealTime) {
                  const p1 = track.points[i]; const p2 = track.points[i+1]; const segmentDuration = p2.time.getTime() - p1.time.getTime();
                  if (segmentDuration > 0) {
                      const ratio = (currentRealTime - p1.time.getTime()) / segmentDuration;
                      currentPoint = { lat: p1.lat + (p2.lat - p1.lat) * ratio, lon: p1.lon + (p2.lon - p1.lon) * ratio, ele: p1.ele + (p2.ele - p1.ele) * ratio, time: new Date(currentRealTime), cummulativeDistance: p1.cummulativeDistance + (p2.cummulativeDistance - p1.cummulativeDistance) * ratio, hr: p1.hr, cad: p1.cad };
                      speed = (p2.cummulativeDistance - p1.cummulativeDistance) / (segmentDuration / 3600000);
                  } else { currentPoint = p2; speed = 0; }
                  distanceCovered = currentPoint.cummulativeDistance; break;
              }
          }
          let rollingPace = 0;
          if (distanceCovered > 0.01) {
             const targetDist = Math.max(0, distanceCovered - 0.2); let point200mBack = track.points[0];
             for (let i = track.points.length - 1; i >= 0; i--) { if (track.points[i].cummulativeDistance <= targetDist) { point200mBack = track.points[i]; break; } }
             const distDiff = distanceCovered - point200mBack.cummulativeDistance; const timeDiffMin = (currentPoint.time.getTime() - point200mBack.time.getTime()) / 60000;
             if (distDiff > 0.001 && timeDiffMin > 0) rollingPace = timeDiffMin / distDiff;
          }
          newRunners.push({ trackId: track.id, position: currentPoint, color: track.color, pace: rollingPace });
          currentDistances.set(track.id, distanceCovered); currentSpeeds.set(track.id, speed);
          setRaceProgress(prev => new Map(prev).set(track.id, distanceCovered / track.distance));
      });
      if (justFinished.length > 0) {
          justFinished.sort((a, b) => a.finishTime - b.finishTime);
          const startRank = raceResults.length + 1; justFinished.forEach((r, i) => r.rank = startRank + i);
          setRaceResults(prev => [...prev, ...justFinished]);
      }
      setRaceRunners(newRunners); setRunnerSpeeds(currentSpeeds); setRunnerDistances(currentDistances);
      const activeIds = activeRunners.map(t => t.id);
      const sortedByDist = activeIds.sort((a, b) => (currentDistances.get(b) || 0) - (currentDistances.get(a) || 0));
      const newRanks = new Map<string, number>(); const newGaps = new Map<string, number>();
      const leaderDist = currentDistances.get(sortedByDist[0]) || 0;
      sortedByDist.forEach((id, index) => {
          const res = raceResults.find(r => r.trackId === id);
          newRanks.set(id, res ? res.rank : raceResults.length + index + 1);
          if (index === 0) newGaps.set(id, 0); else newGaps.set(id, (leaderDist - (currentDistances.get(id) || 0)) * 1000);
      });
      setRaceRanks(newRanks); setRunnerGapsToLeader(newGaps);
      if (newSimulationTime - lastCommentarySimTime.current >= 30000) { lastCommentarySimTime.current = newSimulationTime; generateLiveCommentary(newSimulationTime, newRunners, newRanks, newGaps, currentSpeeds); }
      if (finishedCount === activeRunners.length) { setSimulationState('finished'); if (animationRef.current) cancelAnimationFrame(animationRef.current); }
      else animationRef.current = requestAnimationFrame(updateRace);
  }, [simulationState, simulationTime, simulationSpeed, raceRunners, raceSelectionIds, tracks, raceResults, isCommentaryLoading, generateLiveCommentary]);

  useEffect(() => { if (simulationState === 'running') animationRef.current = requestAnimationFrame(updateRace); return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }; }, [simulationState, updateRace]);

  const startRace = () => {
    if (raceSelectionIds.size < 2) return;
    setAnimationTrackId(null); setSimulationTime(0); setRaceResults([]); lastFrameTimeRef.current = 0; lastCommentarySimTime.current = -30000; setLiveCommentary([]);
    setVisibleTrackIds(new Set(raceSelectionIds));
    const selectedTracks = tracks.filter(t => raceSelectionIds.has(t.id));
    const statsMap = new Map<string, TrackStats>();
    selectedTracks.forEach(t => statsMap.set(t.id, calculateTrackStats(t)));
    // FIX: Changed track.color to t.color because 'track' is not defined in this scope.
    setRacerStats(statsMap); setRaceRunners(selectedTracks.map(t => ({ trackId: t.id, position: t.points[0], color: t.color, pace: 0 })));
    setSimulationState('running'); setFitBoundsCounter(c => c + 1); setIsMobileSidebarOpen(false);
  };

  const handleFileUpload = async (files: File[] | null) => {
    if (!files || files.length === 0) return;
    const newTracks: Track[] = [];
    const existingFingerprints = new Set(tracks.map(t => `${t.points.length}-${t.duration}-${t.distance.toFixed(5)}`));
    for (const file of files) {
        try {
            const fileContent = await file.text(); const ext = file.name.split('.').pop()?.toLowerCase();
            let parsed = null; if (ext === 'gpx') parsed = parseGpx(fileContent, file.name); else if (ext === 'tcx') parsed = parseTcx(fileContent, file.name);
            if (parsed) {
                const fingerprint = `${parsed.points.length}-${parsed.duration}-${parsed.distance.toFixed(5)}`;
                if (!existingFingerprints.has(fingerprint)) {
                    const smartData = generateSmartTitle(parsed.points, parsed.distance, parsed.name);
                    newTracks.push({ id: `${file.name}-${Date.now()}-${Math.random()}`, name: smartData.title, points: parsed.points, color: COLORS[(tracks.length + newTracks.length) % COLORS.length], distance: parsed.distance, duration: parsed.duration, activityType: smartData.activityType, folder: smartData.folder });
                    existingFingerprints.add(fingerprint);
                }
            }
        } catch (e) { console.error(e); }
    }
    if (newTracks.length > 0) {
        const updated = groupTracks([...tracks, ...newTracks]);
        setTracks(updated); setVisibleTrackIds(new Set(updated.map(t => t.id)));
        addToast(`Caricate ${newTracks.length} attività.`, 'success');
    }
  };

  const handleUpdateTrackMetadata = (id: string, metadata: Partial<Track>) => setTracks(prev => prev.map(t => t.id === id ? { ...t, ...metadata } : t));
  const handleBulkDelete = () => {
    if (raceSelectionIds.size === 0) return;
    setConfirmDialog({
        show: true, title: 'Elimina Tracciati', message: `Vuoi eliminare ${raceSelectionIds.size} tracciati?`,
        onConfirm: () => { setTracks(prev => prev.filter(t => !raceSelectionIds.has(t.id))); setRaceSelectionIds(new Set()); addToast("Tracciati eliminati.", "success"); setConfirmDialog(p => ({...p, show: false})); }
    });
  };

  const handleEditorExit = (updatedTrack?: Track) => {
    if (updatedTrack) {
        if (tracksToEdit.length > 1) { setTracks(prev => [...prev, updatedTrack]); addToast("Sessioni unite salvate come nuova attività.", "success"); }
        else setTracks(prev => prev.map(t => t.id === tracksToEdit[0].id ? updatedTrack : t));
    }
    setTracksToEdit([]); setIsMobileSidebarOpen(true);
  };

  const handleShowGroup = (trackIds: string[]) => { setVisibleTrackIds(new Set(trackIds)); setFitBoundsCounter(c => c + 1); };
  const handleToggleRaceSelection = (id: string) => {
      setRaceSelectionIds(prev => {
          const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id);
          if (next.size > 0) setVisibleTrackIds(new Set(next)); else setVisibleTrackIds(new Set(tracks.map(t => t.id)));
          return next;
      });
  };
  const handleMapPointClick = (point: TrackPoint) => { const track = tracks.find(t => t.points.some(p => p.time.getTime() === point.time.getTime())); if (track) handleToggleRaceSelection(track.id); };
  const handleAddPlannedWorkout = (workout: PlannedWorkout) => { setPlannedWorkouts(prev => [...prev, workout]); addToast("Allenamento aggiunto al diario.", "success"); };
  const handleDeletePlannedWorkout = (id: string) => { setPlannedWorkouts(prev => prev.filter(w => w.id !== id)); addToast("Promemoria rimosso.", "info"); };

  if (tracksToEdit.length > 0) return (<div className="bg-slate-900 text-white min-h-screen"><ToastContainer toasts={toasts} setToasts={setToasts} /><TrackEditor initialTracks={tracksToEdit} onExit={handleEditorExit} addToast={addToast} /></div>);
  if (showDiary) return (<div className="bg-slate-900 text-white min-h-screen"><ToastContainer toasts={toasts} setToasts={setToasts} /><DiaryView tracks={tracks} plannedWorkouts={plannedWorkouts} userProfile={userProfile} onClose={() => setShowDiary(false)} onSelectTrack={(trackId) => { setDetailTrackId(trackId); setShowDiary(false); }} onDeletePlannedWorkout={handleDeletePlannedWorkout} onAddPlannedWorkout={handleAddPlannedWorkout} /></div>);
  if (detailTrackId) {
      const track = tracks.find(t => t.id === detailTrackId);
      if (track) return (
          <div className="bg-slate-900 text-white min-h-screen">
            <ToastContainer toasts={toasts} setToasts={setToasts} />
            <TrackDetailView track={track} userProfile={userProfile} onExit={() => setDetailTrackId(null)} allHistory={tracks} onUpdateTrackMetadata={handleUpdateTrackMetadata} onAddPlannedWorkout={handleAddPlannedWorkout} onStartAnimation={startSingleAnimation} onOpenReview={(id) => setReviewTrackId(id)} />
            {reviewTrackId && (
                <AiReviewModal 
                    track={tracks.find(t => t.id === reviewTrackId)!} 
                    userProfile={userProfile} 
                    onClose={() => setReviewTrackId(null)} 
                />
            )}
          </div>
      );
  }

  const currentAnimatedTrack = animationTrackId ? tracks.find(t => t.id === animationTrackId) : null;
  const animationTrackStats = currentAnimatedTrack ? calculateTrackStats(currentAnimatedTrack) : null;

  const sidebarContent = (
    <Sidebar monthlyStats={monthlyStats} tracks={tracks} onFileUpload={handleFileUpload} visibleTrackIds={visibleTrackIds} onToggleVisibility={(id) => setVisibleTrackIds(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; })} raceSelectionIds={raceSelectionIds} onToggleRaceSelection={handleToggleRaceSelection} onDeselectAll={() => { setRaceSelectionIds(new Set()); setVisibleTrackIds(new Set(tracks.map(t => t.id))); }} onSelectAll={() => { const allIds = new Set(tracks.map(t => t.id)); setRaceSelectionIds(allIds); setVisibleTrackIds(allIds); }} onStartRace={startRace} onGoToEditor={() => { const selected = tracks.filter(t => raceSelectionIds.has(t.id)); if (selected.length > 0) { setTracksToEdit(selected); setIsMobileSidebarOpen(false); } else if (tracks.length > 0) { setTracksToEdit([tracks[0]]); setIsMobileSidebarOpen(false); } }} onStartVeo={() => { const selected = tracks.find(t => raceSelectionIds.has(t.id)); if (selected) startSingleAnimation(selected.id); else if (tracks.length > 0) startSingleAnimation(tracks[0].id); }} onPauseRace={() => setSimulationState('paused')} onResumeRace={() => { setSimulationState('running'); lastFrameTimeRef.current = performance.now(); }} onResetRace={() => { setSimulationState('idle'); setSimulationTime(0); setRaceResults([]); setRaceRunners(null); setIsMobileSidebarOpen(true); }} simulationState={simulationState} simulationTime={simulationTime} onTrackHoverStart={(id) => setHoveredTrackId(id)} onTrackHoverEnd={() => setHoveredTrackId(null)} hoveredTrackId={hoveredTrackId} raceProgress={raceProgress} simulationSpeed={simulationSpeed} onSpeedChange={setSimulationSpeed} lapTimes={new Map()} sortOrder={sortOrder} onSortChange={setSortOrder} onDeleteTrack={(id) => setTracks(prev => prev.filter(t => t.id !== id))} onDeleteSelected={handleBulkDelete} onViewDetails={(id) => setDetailTrackId(id)} onStartAnimation={startSingleAnimation} raceRanks={raceRanks} runnerSpeeds={runnerSpeeds} runnerDistances={runnerDistances} runnerGapsToLeader={runnerGapsToLeader} collapsedGroups={collapsedGroups} onToggleGroup={(id) => setCollapsedGroups(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; })} onToggleSidebarMobile={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} onOpenChangelog={() => setShowChangelog(true)} onOpenProfile={() => setShowProfile(true)} onOpenGuide={() => setShowGuide(true)} onOpenDiary={() => setShowDiary(true)} tokenCount={0} onExportBackup={handleExportBackup} onImportBackup={handleImportBackup} onCloseMobile={() => setIsMobileSidebarOpen(false)} onUpdateTrackMetadata={handleUpdateTrackMetadata} onShowGroup={handleShowGroup} onRegenerateTitles={handleRegenerateTitles} onToggleExplorer={() => setShowExplorer(!showExplorer)} showExplorer={showExplorer} listViewMode={listViewMode} onListViewModeChange={setListViewMode} onAiBulkRate={handleAiBulkRate} isAiRating={isAiRating} onOpenReview={(id) => setReviewTrackId(id)} />
  );

  const mapContent = (
    <div className="h-full w-full relative group">
        <MapDisplay tracks={tracks} visibleTrackIds={visibleTrackIds} raceRunners={raceRunners} hoveredTrackId={hoveredTrackId} runnerSpeeds={runnerSpeeds} animationTrack={currentAnimatedTrack} animationProgress={animationProgress} animationPace={animationPace} onExitAnimation={closeAnimationAndReturn} isAnimationPlaying={isAnimationPlaying} onToggleAnimationPlay={() => setIsAnimationPlaying(!isAnimationPlaying)} onAnimationProgressChange={p => { currentDistRef.current = p; setAnimationProgress(p); }} animationSpeed={animationSpeed} onAnimationSpeedChange={setAnimationSpeed} showSummaryMode={showSummaryMode} fastestSplitForAnimation={fastestSplitForAnimation} animationHighlight={selectedSplit || animationHighlight} fitBoundsCounter={fitBoundsCounter} onPointClick={handleMapPointClick} onTrackHover={(id) => setHoveredTrackId(id)} />
        {!showSummaryMode && !animationTrackId && (
            <div className="absolute bottom-6 right-6 z-[1000] pointer-events-auto flex flex-col items-end gap-3">
                 <Tooltip text="Menu Hub" subtext="Torna alla navigazione principale." position="left">
                    <button onClick={() => setShowHome(true)} className="flex items-center justify-center w-12 h-12 rounded-full shadow-2xl active:scale-95 transition-all bg-slate-800 border border-slate-700 text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" /></svg>
                    </button>
                </Tooltip>
                <Tooltip text="Coach AI" subtext="Analisi globale dello storico." position="left">
                    <button onClick={() => setShowChatbot(!showChatbot)} className={`flex items-center gap-2 px-5 py-3 rounded-full shadow-2xl active:scale-95 transition-all font-bold uppercase tracking-wider text-xs border border-cyan-400/30 ${showChatbot ? 'bg-cyan-700 text-white border-cyan-400' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-6"><path d="M10.89 2.11a.75.75 0 0 0-1.78 0l-1.5 3.22-3.53.51a.75.75 0 0 0-.42 1.28l2.55 2.49-.6 3.52a.75.75 0 0 0 1.09.79l3.16-1.66 3.16 1.66a.75.75 0 0 0 1.09-.79l-.6-3.52 2.55-2.49a.75.75 0 0 0-.42-1.28l-3.53-.51-1.5-3.22Z" /></svg>
                        <span>Coach AI</span>
                    </button>
                </Tooltip>
            </div>
        )}
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans relative">
      <ToastContainer toasts={toasts} setToasts={setToasts} />
      <main className="flex-grow flex flex-col sm:flex-row h-full relative overflow-hidden">
        <div className="hidden sm:flex h-full w-full">
            <ResizablePanel direction="vertical" initialSize={320} minSize={250} className={showSummaryMode ? 'hidden' : ''}>
                {sidebarContent}
                <div className="h-full flex flex-row-reverse min-w-0 flex-grow bg-slate-900">
                    {showChatbot ? (
                        <ResizablePanel direction="vertical" initialSize={400} minSize={300} minSizeSecondary={400}>
                            <div className="h-full w-full border-l border-slate-700 animate-fade-in-right shadow-2xl overflow-hidden">
                                <Chatbot tracksToAnalyze={tracks} userProfile={userProfile} onClose={() => setShowChatbot(false)} onAddPlannedWorkout={handleAddPlannedWorkout} isSidebar />
                            </div>
                            <div className="h-full w-full relative">{mapContent}</div>
                        </ResizablePanel>
                    ) : (
                        <div className="h-full w-full relative">{mapContent}</div>
                    )}
                </div>
            </ResizablePanel>
        </div>
        <div className="sm:hidden flex flex-col h-full w-full relative">
            {isMobileSidebarOpen && !showSummaryMode ? (
                <div className="h-full w-full overflow-hidden">
                    <ResizablePanel direction="horizontal" initialSizeRatio={0.66} minSize={200} minSizeSecondary={150}>
                        <div className="h-full w-full">{sidebarContent}</div>
                        <div className="h-full w-full relative">{mapContent}</div>
                    </ResizablePanel>
                </div>
            ) : (
                <div className="h-full w-full relative">
                    {mapContent}
                    {!isMobileSidebarOpen && simulationState === 'idle' && !animationTrackId && (
                        <button onClick={() => { setIsMobileSidebarOpen(true); setFitBoundsCounter(c => c + 1); }} className="absolute top-2 left-2 z-[1001] bg-slate-800 p-3 rounded-lg shadow-xl border border-slate-700 text-cyan-400 active:bg-slate-700 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                        </button>
                    )}
                </div>
            )}
        </div>
        <div className="absolute inset-0 pointer-events-none z-[4000]">
            {showExplorer && (
                  <div className="absolute inset-0 z-[4000] flex items-center justify-center pointer-events-none p-2 sm:p-6">
                      <div className="bg-slate-900/98 backdrop-blur-xl w-full max-w-7xl h-full rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-fade-in pointer-events-auto">
                          <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 border-b border-slate-800 bg-slate-800/80 gap-4">
                              <div className="flex items-center gap-4">
                                <div><h2 className="text-xl sm:text-2xl font-black text-cyan-400 uppercase tracking-tighter">Esplora Attività</h2><p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">{tracks.length} tracce totali</p></div>
                                <div className="h-10 w-px bg-slate-700 hidden sm:block"></div>
                                <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-700">
                                    {[1, 2, 3, 4, 5, 6].map(num => (<button key={num} onClick={() => setExplorerCols(num)} className={`w-8 h-8 rounded flex items-center justify-center text-xs font-black transition-all ${explorerCols === num ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-200'}`}>{num}</button>))}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 w-full sm:auto">
                                  <select value={explorerSort} onChange={e => setExplorerSort(e.target.value as ExplorerSort)} className="bg-slate-900 border border-slate-700 text-white text-[10px] font-bold uppercase px-3 py-2 rounded-lg outline-none focus:border-cyan-500"><option value="date">Ordina: Data</option><option value="distance">Ordina: Distanza</option><option value="name">Ordina: Nome</option></select>
                                  <select value={explorerGroup} onChange={e => setExplorerGroup(e.target.value as ExplorerGroup)} className="bg-slate-900 border border-slate-700 text-white text-[10px] font-bold uppercase px-3 py-2 rounded-lg outline-none focus:border-cyan-500"><option value="none">Raggruppa: Nessuno</option><option value="activity">Raggruppa: Tipo</option><option value="month">Raggruppa: Mese</option></select>
                                  <button onClick={() => setShowExplorer(false)} className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white px-3 py-2 rounded-lg transition-all text-xs font-black ml-auto">&times; CHIUDI</button>
                              </div>
                          </header>
                          <div className="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-slate-950/20">
                              {(Object.entries(groupedExplorerTracks) as [string, Track[]][]).map(([groupName, groupTracks]) => (
                                  <div key={groupName} className="mb-10 last:mb-0">
                                      {explorerGroup !== 'none' && (<h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-3"><span className="text-cyan-400">{groupName}</span><div className="h-px bg-slate-800 flex-grow"></div><span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-400">{groupTracks.length}</span></h3>)}
                                      <div className="grid gap-4 sm:gap-6" style={{ gridTemplateColumns: `repeat(${explorerCols}, minmax(0, 1fr))` }}>
                                          {groupTracks.map(track => (
                                              <div key={track.id} onClick={() => { setDetailTrackId(track.id); setShowExplorer(false); }} className={`bg-slate-800/80 border border-slate-700 rounded-xl hover:border-cyan-500 hover:bg-slate-700 hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)] transition-all cursor-pointer group flex flex-col ${explorerCols === 1 ? 'flex-row items-center gap-6 p-4' : 'p-3 sm:p-4'}`}>
                                                  <div className={`bg-slate-950 rounded-lg overflow-hidden relative shrink-0 ${explorerCols === 1 ? 'w-48 aspect-video' : 'w-full aspect-[16/10] mb-4'}`}><TrackPreview points={track.points} color={track.color} className="w-full h-full object-contain p-4 opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" /><div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-[10px] font-black font-mono text-cyan-400 border border-cyan-900/50">{track.distance.toFixed(2)} km</div></div>
                                                  <div className="flex-grow min-w-0">
                                                      <h3 className={`font-black text-slate-50 truncate group-hover:text-cyan-400 transition-colors uppercase tracking-tight ${explorerCols > 4 ? 'text-[10px]' : 'text-sm'}`}>{track.name}</h3>
                                                      <div className="my-1">
                                                          <RatingStars 
                                                            rating={track.rating} 
                                                            reason={track.ratingReason} 
                                                            size={explorerCols > 4 ? "xs" : "sm"} 
                                                            onDetailClick={(e) => { e.stopPropagation(); setReviewTrackId(track.id); }}
                                                          />
                                                      </div>
                                                      <div className={`flex justify-between items-center mt-2 text-slate-500 font-bold uppercase tracking-wider ${explorerCols > 4 ? 'text-[8px]' : 'text-[10px]'}`}><div className="flex items-center gap-1.5"><span>{new Date(track.points[0].time).toLocaleDateString()}</span></div><span className="text-cyan-800 bg-cyan-400/5 px-2 py-0.5 rounded border border-cyan-900/30">{track.activityType || 'Corsa'}</span></div>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                                  ))}
                          </div>
                      </div>
                  </div>
              )}
              {simulationState === 'running' && (<LiveCommentary messages={liveCommentary} isLoading={isCommentaryLoading} />)}
              {showSummaryMode && animationTrackStats && (<AnimationSummary trackStats={animationTrackStats} userProfile={userProfile} onClose={closeAnimationAndReturn} />)}
        </div>
        {showChatbot && (
            <div className="fixed inset-0 z-[5000] bg-slate-900 sm:bg-black/60 sm:flex sm:items-center sm:justify-center sm:p-4">
                <div className="w-full h-full sm:w-auto sm:h-auto sm:max-w-xl sm:max-h-[85vh] animate-fade-in-up">
                    <Chatbot tracksToAnalyze={tracks} userProfile={userProfile} onClose={() => setShowChatbot(false)} onAddPlannedWorkout={handleAddPlannedWorkout} isStandalone />
                </div>
            </div>
        )}
        {simulationState === 'finished' && raceResults.length > 0 && (<div className="absolute inset-0 z-[5000]"><RaceSummary results={raceResults} racerStats={racerStats} onClose={() => { setSimulationState('idle'); setRaceResults([]); setIsMobileSidebarOpen(true); }} userProfile={userProfile} tracks={tracks} /></div>)}
        {reviewTrackId && !detailTrackId && (
            <AiReviewModal 
                track={tracks.find(t => t.id === reviewTrackId)!} 
                userProfile={userProfile} 
                onClose={() => setReviewTrackId(null)} 
            />
        )}
      </main>

      {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
      {showProfile && (<UserProfileModal onClose={() => setShowProfile(false)} onSave={p => { setUserProfile(p); saveProfileToDB(p); }} currentProfile={userProfile} isWelcomeMode={isOnboarding} tracks={tracks} />)}
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
      {isOnboarding && <InitialChoiceModal onImportBackup={handleImportBackup} onStartNew={() => setIsOnboarding(false)} onClose={() => setIsOnboarding(false)} />}
      
      {showHome && (
          <HomeModal 
            trackCount={tracks.length}
            onOpenDiary={() => { setShowDiary(true); setShowHome(false); }}
            onOpenExplorer={() => { setShowExplorer(true); setShowHome(false); }}
            onOpenHelp={() => { setShowGuide(true); setShowHome(false); }}
            onImportBackup={handleImportBackup}
            onClose={() => setShowHome(false)}
          />
      )}

      {confirmDialog.show && (<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[7000] p-4"><div className="bg-slate-800 p-6 rounded-xl border border-slate-600 max-w-sm w-full shadow-2xl"><h3 className="text-xl font-bold mb-2 text-white">{confirmDialog.title}</h3><p className="text-slate-200 mb-6 font-medium">{confirmDialog.message}</p><div className="flex space-x-3"><button onClick={() => setConfirmDialog(p => ({...p, show: false}))} className="flex-1 bg-slate-700 hover:bg-slate-600 p-2 rounded text-white font-bold">Annulla</button><button onClick={confirmDialog.onConfirm} className="flex-1 bg-red-600 hover:bg-red-500 p-2 rounded text-white font-bold">Conferma</button></div></div></div>)}
      <style>{`
        @keyframes fade-in-right { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in-right { animation: fade-in-right 0.3s ease-out forwards; }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;