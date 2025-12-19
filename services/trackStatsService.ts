
import { Track, TrackPoint, PauseSegment, TrackStats, Split } from '../types';
import { findPauses } from './trackEditorUtils';
import { calculateElevationStats, smoothTrackPoints, calculateSmoothedMetrics } from './dataProcessingService';

const calculateSplits = (points: TrackPoint[], totalDistance: number, smoothingWindow: number, splitDistance: number = 1.0): Split[] => {
    if (points.length < 2) return [];

    const splits: Omit<Split, 'isFastest' | 'isSlowest'>[] = [];
    let lastSplitPoint: TrackPoint = points[0];

    for (let currentDist = splitDistance; currentDist < totalDistance; currentDist += splitDistance) {
        const splitEndPoint = points.find(p => p.cummulativeDistance >= currentDist);
        if (splitEndPoint) {
            const pointsInSplit = points.filter(p => p.cummulativeDistance >= lastSplitPoint.cummulativeDistance && p.cummulativeDistance <= splitEndPoint.cummulativeDistance);
            
            const duration = splitEndPoint.time.getTime() - lastSplitPoint.time.getTime();
            const distance = splitEndPoint.cummulativeDistance - lastSplitPoint.cummulativeDistance;

            const { elevationGain, elevationLoss } = calculateElevationStats(pointsInSplit);
            
            const hrs = pointsInSplit.map(p => p.hr).filter((h): h is number => !!h);
            
            splits.push({
                splitNumber: splits.length + 1,
                distance: distance,
                duration: duration,
                pace: distance > 0 ? (duration / 1000 / 60) / distance : 0,
                elevationGain,
                elevationLoss,
                avgHr: hrs.length > 0 ? hrs.reduce((a, b) => a + b, 0) / hrs.length : null,
            });

            lastSplitPoint = splitEndPoint;
        }
    }

    // Ultimo km parziale
    const lastPoint = points[points.length - 1];
    const finalDistance = lastPoint.cummulativeDistance - lastSplitPoint.cummulativeDistance;
    if (finalDistance > 0.05) {
        const pointsInSplit = points.filter(p => p.cummulativeDistance >= lastSplitPoint.cummulativeDistance);
        const duration = lastPoint.time.getTime() - lastSplitPoint.time.getTime();
        const { elevationGain, elevationLoss } = calculateElevationStats(pointsInSplit);
        const hrs = pointsInSplit.map(p => p.hr).filter((h): h is number => !!h);

        splits.push({
            splitNumber: splits.length + 1,
            distance: finalDistance,
            duration: duration,
            pace: finalDistance > 0 ? (duration / 1000 / 60) / finalDistance : 0,
            elevationGain,
            elevationLoss,
            avgHr: hrs.length > 0 ? hrs.reduce((a, b) => a + b, 0) / hrs.length : null,
        });
    }

    if (splits.length === 0) return [];
    
    const validSplits = splits.filter(s => s.distance > splitDistance * 0.5);
    let fastestPace = Math.min(...validSplits.map(s => s.pace));
    let slowestPace = Math.max(...validSplits.map(s => s.pace));

    return splits.map(s => ({
        ...s,
        isFastest: s.pace === fastestPace && s.distance > splitDistance * 0.5,
        isSlowest: s.pace === slowestPace && s.distance > splitDistance * 0.5,
    }));
};

export const calculateTrackStats = (track: Track, smoothingWindow: number = 0): TrackStats => {
    if (track.points.length < 2) {
        return {
            totalDistance: 0, totalDuration: 0, movingDuration: 0,
            elevationGain: 0, elevationLoss: 0, avgPace: 0, movingAvgPace: 0,
            maxSpeed: 0, avgSpeed: 0, avgHr: null, maxHr: null, minHr: null, splits: [], pauses: []
        };
    }
    
    // 1. Applichiamo lo smoothing alle coordinate/altitudine/HR
    const pointsToProcess = smoothingWindow > 0 
        ? smoothTrackPoints(track.points, smoothingWindow)
        : track.points;

    // 2. Troviamo le pause
    const pauses = findPauses({ ...track, points: pointsToProcess });
    const totalPauseDuration = pauses.reduce((sum, p) => sum + p.duration, 0) * 1000;
    const movingDuration = track.duration - totalPauseDuration;

    // 3. Dislivello (calcolato sui punti smoothed)
    const { elevationGain, elevationLoss } = calculateElevationStats(pointsToProcess);

    let maxSpeed = 0;
    const heartRates: number[] = [];

    // 4. Velocità massima ricalcolata con smoothing
    for (let i = 1; i < pointsToProcess.length; i++) {
        const { speed } = calculateSmoothedMetrics(pointsToProcess, i, smoothingWindow);
        if (speed > maxSpeed && speed < 60) { // Cap a 60kmh per filtrare errori estremi
            maxSpeed = speed;
        }
        if (pointsToProcess[i].hr) heartRates.push(pointsToProcess[i].hr!);
    }

    const avgPace = track.distance > 0 ? (track.duration / 1000 / 60) / track.distance : 0;
    const movingAvgPace = track.distance > 0 && movingDuration > 0 ? (movingDuration / 1000 / 60) / track.distance : 0;
    const avgSpeed = track.distance > 0 && movingDuration > 0 ? track.distance / (movingDuration / 3600000) : 0;

    const validHeartRates = heartRates.filter(hr => hr > 0);
    const avgHr = validHeartRates.length > 0 ? validHeartRates.reduce((a, b) => a + b, 0) / validHeartRates.length : null;
    
    const splits = calculateSplits(pointsToProcess, track.distance, smoothingWindow);

    return {
        totalDistance: track.distance,
        totalDuration: track.duration,
        movingDuration,
        elevationGain,
        elevationLoss,
        avgPace,
        movingAvgPace,
        maxSpeed,
        avgSpeed,
        avgHr,
        maxHr: validHeartRates.length > 0 ? Math.max(...validHeartRates) : null,
        minHr: validHeartRates.length > 0 ? Math.min(...validHeartRates) : null,
        splits,
        pauses,
    };
};
