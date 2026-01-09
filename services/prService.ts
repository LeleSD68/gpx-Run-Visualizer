
import { Track, TrackPoint, PersonalRecord } from '../types';

export const PR_DISTANCES = [
    { name: '1km', meters: 1000 },
    { name: '5km', meters: 5000 },
    { name: '10km', meters: 10000 },
    { name: 'Mezza Maratona', meters: 21097.5 },
    { name: 'Maratona', meters: 42195 },
];

const PR_STORAGE_KEY = 'gpx-user-prs';

/**
 * Finds the fastest time for a specific distance within a set of track points.
 * Uses a sliding window (two-pointer) approach for efficiency.
 * @param points - Array of track points.
 * @param targetDistanceKm - The distance to find the best time for, in kilometers.
 * @returns The best time in milliseconds, or null if the track is shorter than the target distance.
 */
function findBestTimeForDistance(points: TrackPoint[], targetDistanceKm: number): number | null {
    if (points.length < 2 || points[points.length - 1].cummulativeDistance < targetDistanceKm) {
        return null;
    }

    let bestTime = Infinity;
    let end = 0;

    for (let start = 0; start < points.length; start++) {
        const p_start = points[start];

        while (end < points.length && (points[end].cummulativeDistance - p_start.cummulativeDistance < targetDistanceKm)) {
            end++;
        }
        if (end >= points.length) {
            break; // Window has gone past the end of the track
        }

        const p_end = points[end];
        const p_end_prev = points[end - 1];

        // We have a window from start to end that is >= targetDistanceKm
        const windowDistance = p_end.cummulativeDistance - p_start.cummulativeDistance;
        const overshootDistance = windowDistance - targetDistanceKm;
        
        const lastSegmentDistance = p_end.cummulativeDistance - p_end_prev.cummulativeDistance;
        
        let interpolatedEndTime;
        if (lastSegmentDistance > 1e-6) { // Avoid division by zero
            // How much of the last segment we need to "give back"
            const ratio = (lastSegmentDistance - overshootDistance) / lastSegmentDistance;
            interpolatedEndTime = p_end_prev.time.getTime() + (p_end.time.getTime() - p_end_prev.time.getTime()) * ratio;
        } else {
            interpolatedEndTime = p_end.time.getTime();
        }
        
        const duration = interpolatedEndTime - p_start.time.getTime();
        if (duration < bestTime) {
            bestTime = duration;
        }
    }

    return bestTime === Infinity ? null : bestTime;
}

/**
 * Scans a track for personal records across a predefined list of distances.
 * @param track - The track to analyze.
 * @returns An array of records found within this track.
 */
export const findPersonalRecordsForTrack = (track: Track): Omit<PersonalRecord, 'trackId' | 'trackName' | 'date'>[] => {
    const records = [];
    for (const pr of PR_DISTANCES) {
        const distanceKm = pr.meters / 1000;
        if (track.distance >= distanceKm) {
            const time = findBestTimeForDistance(track.points, distanceKm);
            if (time) {
                records.push({ distance: pr.meters, time });
            }
        }
    }
    return records;
};

/**
 * Retrieves all stored personal records from localStorage.
 * @returns An object mapping distance (in meters) to the PR for that distance.
 */
export const getStoredPRs = (): Record<string, PersonalRecord> => {
    try {
        const stored = localStorage.getItem(PR_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error("Failed to read PRs from localStorage", error);
        return {};
    }
};

/**
 * Updates the stored PRs with new records from a track, if they are better.
 * @param track - The track that was just analyzed.
 * @param newRecords - The records found in that track.
 * @returns An object containing only the records found in this track, marked if they are a new all-time PR.
 */
export const updateStoredPRs = (track: Track, newRecords: Omit<PersonalRecord, 'trackId' | 'trackName' | 'date'>[]) => {
    const storedPRs = getStoredPRs();
    let newRecordsCount = 0;
    
    const resultsForThisTrack: Record<string, { pr: PersonalRecord; isNew: boolean; previousBest?: number }> = {};
    
    newRecords.forEach(record => {
        const existingPR = storedPRs[record.distance];
        
        const prData: PersonalRecord = {
            ...record,
            trackId: track.id,
            trackName: track.name,
            date: track.points[0]?.time.toISOString() || new Date().toISOString()
        };

        if (!existingPR || record.time < existingPR.time) {
            // New PR!
            resultsForThisTrack[record.distance] = {
                pr: prData,
                isNew: true,
                previousBest: existingPR?.time,
            };
            storedPRs[record.distance] = prData;
            newRecordsCount++;
        } else {
             resultsForThisTrack[record.distance] = {
                pr: prData,
                isNew: false,
                previousBest: existingPR.time // Return current PR time for comparison
            };
        }
    });

    if (newRecordsCount > 0) {
        try {
            localStorage.setItem(PR_STORAGE_KEY, JSON.stringify(storedPRs));
        } catch (error) {
            console.error("Failed to save PRs to localStorage", error);
        }
    }
    
    return { updated: resultsForThisTrack, newRecordsCount };
};
