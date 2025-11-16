import type { Track } from '../types';

// Haversine formula to calculate distance between two lat/lon points in kilometers
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
  return R * c;
};

const START_END_TOLERANCE_KM = 0.1; // 100 meters
const INTERMEDIATE_POINT_TOLERANCE_KM = 0.2; // 200 meters for shape comparison
const DISTANCE_TOLERANCE_PERCENT = 0.02; // 2%

// Helper function to get coordinates at a specific distance along a track
const getPointAtDistance = (track: Track, targetDistance: number): { lat: number, lon: number } | null => {
    if (track.points.length < 2 || targetDistance < 0 || targetDistance > track.distance) {
        return null;
    }

    if (targetDistance === 0) {
        return { lat: track.points[0].lat, lon: track.points[0].lon };
    }

    // Find the segment where the target distance falls
    for (let i = 0; i < track.points.length - 1; i++) {
        const p1 = track.points[i];
        const p2 = track.points[i + 1];

        if (p1.cummulativeDistance <= targetDistance && p2.cummulativeDistance >= targetDistance) {
            const segmentDistance = p2.cummulativeDistance - p1.cummulativeDistance;
            if (segmentDistance === 0) {
                return { lat: p1.lat, lon: p1.lon };
            }
            
            const distanceIntoSegment = targetDistance - p1.cummulativeDistance;
            const ratio = distanceIntoSegment / segmentDistance;

            const lat = p1.lat + (p2.lat - p1.lat) * ratio;
            const lon = p1.lon + (p2.lon - p1.lon) * ratio;
            return { lat, lon };
        }
    }
    
    // Fallback for floating point inaccuracies near the end
    const lastPoint = track.points[track.points.length - 1];
    return { lat: lastPoint.lat, lon: lastPoint.lon };
};


const areTracksSimilar = (trackA: Track, trackB: Track): boolean => {
    if (trackA.points.length < 2 || trackB.points.length < 2) {
        return false;
    }

    // 1. Check total distance similarity (early exit)
    const distanceDiff = Math.abs(trackA.distance - trackB.distance);
    const avgDistance = (trackA.distance + trackB.distance) / 2;
    if (avgDistance > 0 && (distanceDiff / avgDistance) > DISTANCE_TOLERANCE_PERCENT) {
        return false;
    }

    // 2. Check start and end points
    const startA = trackA.points[0];
    const startB = trackB.points[0];
    if (haversineDistance(startA, startB) > START_END_TOLERANCE_KM) {
        return false;
    }

    const endA = trackA.points[trackA.points.length - 1];
    const endB = trackB.points[trackB.points.length - 1];
    if (haversineDistance(endA, endB) > START_END_TOLERANCE_KM) {
        return false;
    }
    
    // 3. Check intermediate points for overall shape similarity
    const checkpoints = [0.25, 0.5, 0.75]; // Check at 25%, 50%, 75% of the track
    for (const ratio of checkpoints) {
        const distA = trackA.distance * ratio;
        const distB = trackB.distance * ratio;

        const pointA = getPointAtDistance(trackA, distA);
        const pointB = getPointAtDistance(trackB, distB);

        if (!pointA || !pointB) {
            return false; // Failed to find a point, indicates a problem
        }

        if (haversineDistance(pointA, pointB) > INTERMEDIATE_POINT_TOLERANCE_KM) {
            return false; // The shapes diverge too much in the middle
        }
    }

    return true;
}


export const groupTracks = (tracks: Track[]): Track[] => {
    const trackCopies = tracks.map(t => ({ ...t, groupId: undefined as (string | undefined) }));
    
    for (let i = 0; i < trackCopies.length; i++) {
        const trackA = trackCopies[i];
        if (trackA.groupId) continue; // Already in a group

        // This track starts a new group. Use its own ID as the group ID.
        trackA.groupId = trackA.id; 

        for (let j = i + 1; j < trackCopies.length; j++) {
            const trackB = trackCopies[j];
            if (!trackB.groupId && areTracksSimilar(trackA, trackB)) {
                trackB.groupId = trackA.groupId;
            }
        }
    }

    // Now, let's prune groups with only one member.
    const groupCounts = new Map<string, number>();
    trackCopies.forEach(track => {
        if (track.groupId) {
            groupCounts.set(track.groupId, (groupCounts.get(track.groupId) || 0) + 1);
        }
    });

    return trackCopies.map(track => {
        if (track.groupId && groupCounts.get(track.groupId)! <= 1) {
            // It's a group of 1, so remove the groupId property.
            const { groupId, ...rest } = track;
            return rest;
        }
        return track;
    });
};