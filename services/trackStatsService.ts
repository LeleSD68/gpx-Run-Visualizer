
import { Track, TrackPoint, PauseSegment, TrackStats, Split } from '../types';
import { findPauses } from './trackEditorUtils';

const formatPace = (pace: number) => {
    if (!isFinite(pace) || pace <= 0) {
        return '--:--';
    }
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const calculateSplits = (track: Track, splitDistance: number = 1.0): Split[] => {
    if (track.points.length < 2) return [];

    const splits: Omit<Split, 'isFastest' | 'isSlowest'>[] = [];
    let lastSplitPoint: TrackPoint = track.points[0];

    for (let currentDist = splitDistance; currentDist < track.distance; currentDist += splitDistance) {
        const splitEndPoint = findPointAtDistance(track, currentDist);
        if (splitEndPoint) {
            const splitPoints = track.points.filter(p => p.cummulativeDistance > lastSplitPoint.cummulativeDistance && p.cummulativeDistance <= splitEndPoint.cummulativeDistance);
            
            const pointsForSplit = [lastSplitPoint, ...splitPoints];
            if (pointsForSplit[pointsForSplit.length-1].cummulativeDistance < splitEndPoint.cummulativeDistance) {
                pointsForSplit.push(splitEndPoint);
            }

            const duration = splitEndPoint.time.getTime() - lastSplitPoint.time.getTime();
            const distance = splitEndPoint.cummulativeDistance - lastSplitPoint.cummulativeDistance;

            let elevationGain = 0;
            let elevationLoss = 0;
            const hrs: number[] = [];

            for (let i = 1; i < pointsForSplit.length; i++) {
                const eleDiff = pointsForSplit[i].ele - pointsForSplit[i - 1].ele;
                if (eleDiff > 0) elevationGain += eleDiff;
                else elevationLoss -= eleDiff;

                if (pointsForSplit[i].hr) hrs.push(pointsForSplit[i].hr!);
            }
            
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

    // Handle final partial split
    const lastPoint = track.points[track.points.length - 1];
    const finalDistance = lastPoint.cummulativeDistance - lastSplitPoint.cummulativeDistance;
    if (finalDistance > 0.05) { // Only add if it's a meaningful segment
        const finalDuration = lastPoint.time.getTime() - lastSplitPoint.time.getTime();
        const pointsForSplit = track.points.filter(p => p.cummulativeDistance > lastSplitPoint.cummulativeDistance);
        
        let elevationGain = 0;
        let elevationLoss = 0;
        const hrs: number[] = [];

        for (let i = 1; i < pointsForSplit.length; i++) {
            const eleDiff = pointsForSplit[i].ele - pointsForSplit[i - 1].ele;
            if (eleDiff > 0) elevationGain += eleDiff;
            else elevationLoss -= eleDiff;
             if (pointsForSplit[i].hr) hrs.push(pointsForSplit[i].hr!);
        }

        splits.push({
            splitNumber: splits.length + 1,
            distance: finalDistance,
            duration: finalDuration,
            pace: finalDistance > 0 ? (finalDuration / 1000 / 60) / finalDistance : 0,
            elevationGain,
            elevationLoss,
            avgHr: hrs.length > 0 ? hrs.reduce((a, b) => a + b, 0) / hrs.length : null,
        });
    }

    if (splits.length === 0) return [];
    
    // Mark fastest/slowest splits
    const validSplits = splits.filter(s => s.distance > splitDistance * 0.9);
    if (validSplits.length > 1) {
        let fastestPace = Infinity, slowestPace = 0;
        let fastestIdx = -1, slowestIdx = -1;
        
        validSplits.forEach((split, index) => {
            if (split.pace < fastestPace) {
                fastestPace = split.pace;
                fastestIdx = splits.indexOf(split);
            }
            if (split.pace > slowestPace) {
                slowestPace = split.pace;
                slowestIdx = splits.indexOf(split);
            }
        });

        return splits.map((s, i) => ({
            ...s,
            isFastest: i === fastestIdx,
            isSlowest: i === slowestIdx,
        }));
    }

    return splits.map(s => ({...s, isFastest: false, isSlowest: false}));
};


const findPointAtDistance = (track: Track, targetDistance: number): TrackPoint | null => {
    // This is a simplified version of getTrackPointAtDistance from editor utils
    for (let i = 0; i < track.points.length - 1; i++) {
        const p1 = track.points[i];
        const p2 = track.points[i + 1];

        if (p1.cummulativeDistance <= targetDistance && p2.cummulativeDistance >= targetDistance) {
            const segmentDist = p2.cummulativeDistance - p1.cummulativeDistance;
            if (segmentDist === 0) return p1;

            const ratio = (targetDistance - p1.cummulativeDistance) / segmentDist;
            return {
                lat: p1.lat + (p2.lat - p1.lat) * ratio,
                lon: p1.lon + (p2.lon - p1.lon) * ratio,
                ele: p1.ele + (p2.ele - p1.ele) * ratio,
                time: new Date(p1.time.getTime() + (p2.time.getTime() - p1.time.getTime()) * ratio),
                cummulativeDistance: targetDistance,
                hr: p1.hr && p2.hr ? p1.hr + (p2.hr - p1.hr) * ratio : p1.hr
            };
        }
    }
    return null;
};


export const calculateTrackStats = (track: Track): TrackStats => {
    if (track.points.length < 2) {
        // Return a zeroed-out stats object for tracks with insufficient data
        return {
            totalDistance: 0, totalDuration: 0, movingDuration: 0,
            elevationGain: 0, elevationLoss: 0, avgPace: 0, movingAvgPace: 0,
            maxSpeed: 0, avgSpeed: 0, avgHr: null, maxHr: null, minHr: null, splits: [], pauses: []
        };
    }
    
    const pauses = findPauses(track);
    const totalPauseDuration = pauses.reduce((sum, p) => sum + p.duration, 0) * 1000;
    const movingDuration = track.duration - totalPauseDuration;

    let elevationGain = 0;
    let elevationLoss = 0;
    let maxSpeed = 0;
    const heartRates: number[] = [];

    for (let i = 1; i < track.points.length; i++) {
        const p1 = track.points[i - 1];
        const p2 = track.points[i];

        // Elevation
        const eleDiff = p2.ele - p1.ele;
        if (eleDiff > 0) {
            elevationGain += eleDiff;
        } else {
            elevationLoss -= eleDiff;
        }

        // Speed
        const dist = p2.cummulativeDistance - p1.cummulativeDistance;
        const time = (p2.time.getTime() - p1.time.getTime()) / 1000; // in seconds
        if (time > 0) {
            const speedKmh = (dist / time) * 3600;
            if (speedKmh > maxSpeed) {
                maxSpeed = speedKmh;
            }
        }
        
        // Heart Rate
        if (p2.hr) {
            heartRates.push(p2.hr);
        }
    }

    const avgPace = track.distance > 0 ? (track.duration / 1000 / 60) / track.distance : 0;
    const movingAvgPace = track.distance > 0 && movingDuration > 0 ? (movingDuration / 1000 / 60) / track.distance : 0;
    const avgSpeed = track.distance > 0 && movingDuration > 0 ? track.distance / (movingDuration / 3600000) : 0;

    const validHeartRates = heartRates.filter(hr => hr > 0);
    const avgHr = validHeartRates.length > 0 ? validHeartRates.reduce((a, b) => a + b, 0) / validHeartRates.length : null;
    const maxHr = validHeartRates.length > 0 ? Math.max(...validHeartRates) : null;
    const minHr = validHeartRates.length > 0 ? Math.min(...validHeartRates) : null;
    
    const splits = calculateSplits(track);

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
        maxHr,
        minHr,
        splits,
        pauses,
    };
};
