
import { Track, TrackPoint, PauseSegment } from '../types';

// Haversine formula from gpxService, duplicated for modularity
const haversineDistance = (p1: {lat: number, lon: number}, p2: {lat: number, lon: number}): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
  const dLon = (p2.lon - p1.lon) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * (Math.PI / 180)) *
      Math.cos(p2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Recalculates cumulative distance and total distance/duration for a track's points
const recalculateTrackMetrics = (points: TrackPoint[]): { points: TrackPoint[], distance: number, duration: number } => {
    if (points.length < 2) {
        return { points, distance: 0, duration: 0 };
    }
    
    let totalDistance = 0;
    const pointsWithDistance: TrackPoint[] = points.map((p, index) => {
        if (index > 0) {
            totalDistance += haversineDistance(points[index-1], p);
        }
        return { ...p, cummulativeDistance: totalDistance };
    });
    
    const totalDuration = points[points.length - 1].time.getTime() - points[0].time.getTime();

    return { points: pointsWithDistance, distance: totalDistance, duration: totalDuration };
}

export const getTrackPointAtDistance = (track: Track, targetDistance: number): TrackPoint | null => {
    if (track.points.length < 2 || targetDistance < 0 || targetDistance > track.distance) {
        return null;
    }

    if (targetDistance <= 0) return track.points[0];
    if (targetDistance >= track.distance) return track.points[track.points.length - 1];
    
    for (let i = 0; i < track.points.length - 1; i++) {
        const p1 = track.points[i];
        const p2 = track.points[i + 1];

        if (p1.cummulativeDistance <= targetDistance && p2.cummulativeDistance >= targetDistance) {
            const segmentDistance = p2.cummulativeDistance - p1.cummulativeDistance;
            if (segmentDistance === 0) return p1;
            
            const distanceIntoSegment = targetDistance - p1.cummulativeDistance;
            const ratio = distanceIntoSegment / segmentDistance;

            const lat = p1.lat + (p2.lat - p1.lat) * ratio;
            const lon = p1.lon + (p2.lon - p1.lon) * ratio;
            const ele = p1.ele + (p2.ele - p1.ele) * ratio;
            const time = new Date(p1.time.getTime() + (p2.time.getTime() - p1.time.getTime()) * ratio);
            const hr = (p1.hr !== undefined && p2.hr !== undefined) 
                ? p1.hr + (p2.hr - p1.hr) * ratio 
                : (p1.hr ?? p2.hr ?? undefined);
            
            return { lat, lon, ele, time, cummulativeDistance: targetDistance, hr };
        }
    }
    return null;
};

export const getPointsInDistanceRange = (track: Track, startDistance: number, endDistance: number): TrackPoint[] => {
    const pointsInRange: TrackPoint[] = [];

    const startPoint = getTrackPointAtDistance(track, startDistance);
    if (startPoint) pointsInRange.push(startPoint);
    
    track.points.forEach(p => {
        if (p.cummulativeDistance > startDistance && p.cummulativeDistance < endDistance) {
            pointsInRange.push(p);
        }
    });

    const endPoint = getTrackPointAtDistance(track, endDistance);
    if (endPoint) pointsInRange.push(endPoint);

    return pointsInRange;
};

export const calculateSegmentStats = (track: Track, startDistance: number, endDistance: number) => {
    const points = getPointsInDistanceRange(track, startDistance, endDistance);
    if (points.length < 2) {
        return { distance: 0, duration: 0, elevationGain: 0, pace: 0 };
    }

    const distance = endDistance - startDistance;
    const duration = points[points.length - 1].time.getTime() - points[0].time.getTime();
    
    let elevationGain = 0;
    for (let i = 1; i < points.length; i++) {
        const eleDiff = points[i].ele - points[i-1].ele;
        if (eleDiff > 0) {
            elevationGain += eleDiff;
        }
    }

    const pace = distance > 0 ? (duration / 1000 / 60) / distance : 0;
    
    return { distance, duration, elevationGain, pace };
};


export const mergeTracks = (tracks: Track[]): Track => {
    // Sort tracks by their start time to merge them in a logical order
    const sortedTracks = [...tracks].sort((a, b) => 
        (a.points[0]?.time.getTime() || 0) - (b.points[0]?.time.getTime() || 0)
    );

    const newPoints: TrackPoint[] = [];
    let timeOffset = 0;
    
    sortedTracks.forEach((track, trackIndex) => {
        if (track.points.length === 0) return;

        if (trackIndex > 0) {
            const prevTrack = sortedTracks[trackIndex - 1];
            const lastPointOfPrevTrack = prevTrack.points[prevTrack.points.length - 1];
            const firstPointOfCurrentTrack = track.points[0];
            
            // Adjust time to be continuous
            timeOffset = lastPointOfPrevTrack.time.getTime() - firstPointOfCurrentTrack.time.getTime() + 1000; // Add 1s gap
        }

        track.points.forEach(p => {
             newPoints.push({
                ...p,
                time: new Date(p.time.getTime() + timeOffset)
            });
        });
    });
    
    const { points, distance, duration } = recalculateTrackMetrics(newPoints);

    const mergedName = sortedTracks.map(t => t.name).join(' + ');

    return {
        id: `merged-${new Date().getTime()}`,
        name: mergedName,
        color: '#0ea5e9', // A distinct color for edited tracks
        points,
        distance,
        duration,
    };
};

export const cutTrackSection = (track: Track, startDistance: number, endDistance: number): Track => {
    if (startDistance >= endDistance || !track.points.length) {
        return track;
    }
    
    // Find the interpolated points at the cut boundaries.
    const cutStartPoint = getTrackPointAtDistance(track, startDistance);
    const cutEndPoint = getTrackPointAtDistance(track, endDistance);

    // This should not happen if selection is valid.
    if (!cutStartPoint || !cutEndPoint) {
        return track;
    }

    const durationToRemove = cutEndPoint.time.getTime() - cutStartPoint.time.getTime();

    // Segment before the cut
    const pointsBefore = track.points.filter(p => p.cummulativeDistance < startDistance);
    // Add the interpolated start point to ensure a clean cut, unless the cut is at the very beginning
    if (startDistance > 0) {
        pointsBefore.push(cutStartPoint);
    }
    
    // Segment after the cut
    const pointsAfter = track.points
        .filter(p => p.cummulativeDistance > endDistance)
        .map(p => ({ // Adjust time for all points after the cut
            ...p,
            time: new Date(p.time.getTime() - durationToRemove),
        }));
        
    // Add the interpolated end point to start the 'after' segment, unless the cut goes to the very end
    if (endDistance < track.distance) {
        const adjustedCutEndPoint = {
            ...cutEndPoint,
            time: new Date(cutEndPoint.time.getTime() - durationToRemove)
        };
        pointsAfter.unshift(adjustedCutEndPoint);
    }
    
    const combinedPoints = [...pointsBefore, ...pointsAfter];
    
    // If we deleted everything, return an empty track
    if (combinedPoints.length === 0) {
         return { ...track, name: `${track.name} (edited)`, points: [], distance: 0, duration: 0 };
    }

    // Recalculate all metrics from scratch
    const { points, distance, duration } = recalculateTrackMetrics(combinedPoints);
    return { ...track, name: `${track.name} (edited)`, points, distance, duration };
};

export const trimTrackToSelection = (track: Track, startDistance: number, endDistance: number): Track => {
    const newPoints: TrackPoint[] = [];
    let foundStart = false;

    // Find the closest point before the start distance to ensure the line starts correctly
    let startIdx = track.points.findIndex(p => p.cummulativeDistance >= startDistance);
    if (startIdx > 0) startIdx--;
    else startIdx = 0;

    for (let i = startIdx; i < track.points.length; i++) {
        const p = track.points[i];
        if (p.cummulativeDistance >= startDistance && p.cummulativeDistance <= endDistance) {
            if (!foundStart) {
                // This is the first point in our new track. Reset its time and distance.
                foundStart = true;
            }
            newPoints.push({ ...p });
        }
         if (p.cummulativeDistance > endDistance) {
            // Add the first point after the selection to ensure the line ends correctly, then stop.
            newPoints.push({ ...p });
            break;
        }
    }
    
    if (newPoints.length < 2) return { ...track, points: [], distance: 0, duration: 0 };
    
    // Reset time and distance to start from zero for the new trimmed track
    const firstPointTime = newPoints[0].time.getTime();
    const firstPointDistance = newPoints[0].cummulativeDistance;
    
    const finalPoints = newPoints.map(p => ({
        ...p,
        time: new Date(p.time.getTime() - firstPointTime),
        cummulativeDistance: p.cummulativeDistance - firstPointDistance
    }));
    
    // We need to do a full recalculation as the original cumulative distances are now just relative offsets
    const { points, distance, duration } = recalculateTrackMetrics(finalPoints);

    return { ...track, points, distance, duration };
};

export const findPauses = (track: Track, minDurationSec: number = 10, maxSpeedKmh: number = 1): PauseSegment[] => {
    if (track.points.length < 2) return [];

    const pauseSegments: PauseSegment[] = [];
    let potentialPauseStart: TrackPoint | null = null;

    for (let i = 1; i < track.points.length; i++) {
        const p1 = track.points[i - 1];
        const p2 = track.points[i];
        
        const distance = p2.cummulativeDistance - p1.cummulativeDistance;
        const timeDiffSec = (p2.time.getTime() - p1.time.getTime()) / 1000;

        let speedKmh = Infinity;
        if (timeDiffSec > 0.1) {
            speedKmh = (distance / timeDiffSec) * 3600;
        }

        if (speedKmh < maxSpeedKmh) {
            if (!potentialPauseStart) {
                potentialPauseStart = p1;
            }
        } else {
            if (potentialPauseStart) {
                const pauseEndPoint = p1;
                const pauseDurationSec = (pauseEndPoint.time.getTime() - potentialPauseStart.time.getTime()) / 1000;
                if (pauseDurationSec >= minDurationSec) {
                    pauseSegments.push({
                        startPoint: potentialPauseStart,
                        endPoint: pauseEndPoint,
                        duration: pauseDurationSec
                    });
                }
                potentialPauseStart = null;
            }
        }
    }

    // Check for a pause at the very end of the track
    if (potentialPauseStart) {
        const lastPoint = track.points[track.points.length - 1];
        const pauseDurationSec = (lastPoint.time.getTime() - potentialPauseStart.time.getTime()) / 1000;
        if (pauseDurationSec >= minDurationSec) {
            pauseSegments.push({
                startPoint: potentialPauseStart,
                endPoint: lastPoint,
                duration: pauseDurationSec
            });
        }
    }

    return pauseSegments;
};

const SPEED_THRESHOLD_KMH = 50; // Anything over 50km/h is almost certainly a GPS error.

export const smoothTrackData = (track: Track): { newTrack: Track, correctedCount: number } => {
    if (track.points.length < 3) {
        // Not enough points to identify neighbors
        return { newTrack: track, correctedCount: 0 };
    }

    const originalPoints = track.points;
    const outlierIndices = new Set<number>();

    // 1. Identify outliers by checking speed between consecutive points
    for (let i = 1; i < originalPoints.length; i++) {
        const p1 = originalPoints[i - 1];
        const p2 = originalPoints[i];
        
        const distance = haversineDistance(p1, p2); // in km
        const timeDiffHours = (p2.time.getTime() - p1.time.getTime()) / 3600000;

        if (timeDiffHours > 1e-6) { // Avoid division by zero
            const speedKmh = distance / timeDiffHours;
            if (speedKmh > SPEED_THRESHOLD_KMH) {
                // The error is likely in the position of p2, as the segment (p1, p2) is impossibly long.
                outlierIndices.add(i);
            }
        }
    }

    if (outlierIndices.size === 0) {
        return { newTrack: track, correctedCount: 0 };
    }

    // 2. Create a new array of points, correcting outliers.
    const correctedPoints = originalPoints.map((p, i) => {
        if (!outlierIndices.has(i)) {
            return p; // Not an outlier, keep it.
        }

        // This point is an outlier. Find the nearest valid preceding and succeeding points.
        let prevPoint: TrackPoint | null = null;
        for (let j = i - 1; j >= 0; j--) {
            if (!outlierIndices.has(j)) {
                prevPoint = originalPoints[j];
                break;
            }
        }

        let nextPoint: TrackPoint | null = null;
        for (let j = i + 1; j < originalPoints.length; j++) {
            if (!outlierIndices.has(j)) {
                nextPoint = originalPoints[j];
                break;
            }
        }

        if (prevPoint && nextPoint) {
            // We have both neighbors, average their positions.
            const avgLat = (prevPoint.lat + nextPoint.lat) / 2;
            const avgLon = (prevPoint.lon + nextPoint.lon) / 2;
            const avgEle = (prevPoint.ele + nextPoint.ele) / 2;
            // Keep the original time, as that's likely correct. Only the position is wrong.
            return { ...p, lat: avgLat, lon: avgLon, ele: avgEle };
        } else if (prevPoint) {
            // Outlier is at/near the end, only a preceding point is available. Use its position.
            return { ...p, lat: prevPoint.lat, lon: prevPoint.lon, ele: prevPoint.ele };
        } else if (nextPoint) {
            // Outlier is at/near the beginning, only a succeeding point is available. Use its position.
            return { ...p, lat: nextPoint.lat, lon: nextPoint.lon, ele: nextPoint.ele };
        } else {
            // No valid neighbors found (e.g., all points are outliers), can't correct. Return original.
            return p;
        }
    });

    // 3. Recalculate all metrics based on the new point data.
    const { points, distance, duration } = recalculateTrackMetrics(correctedPoints);
    const newTrack: Track = { ...track, points, distance, duration };
    
    return { newTrack, correctedCount: outlierIndices.size };
};
