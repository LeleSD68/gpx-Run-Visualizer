
import { parseGpx } from './gpxService';
import { parseTcx } from './tcxService';
import { generateSmartTitle } from './titleGenerator';
import type { Track } from '../types';

// This is a simplified version of the main app's getTrackFingerprint.
const getTrackFingerprint = (trackData: { points: { length: number }, duration: number, distance: number }) => {
    return `${trackData.points.length}-${trackData.duration}-${trackData.distance.toFixed(5)}`;
};

self.onmessage = async (e: MessageEvent<{ files: File[], existingTrackFingerprints: Set<string>, colors: string[], tracksLength: number }>) => {
    const { files, existingTrackFingerprints, colors, tracksLength } = e.data;

    const parsingResults = {
        newTracks: [] as Track[],
        skippedCount: 0,
        failedCount: 0,
        errorMessages: [] as string[],
    };

    let newTracksCount = 0;

    for (const file of files) {
        try {
            const fileContent = await file.text();
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            let parsedData = null;

            if (fileExtension === 'gpx') {
                parsedData = parseGpx(fileContent, file.name);
            } else if (fileExtension === 'tcx') {
                parsedData = parseTcx(fileContent, file.name);
            }

            if (parsedData) {
                const newTrackFingerprint = getTrackFingerprint(parsedData);
                if (existingTrackFingerprints.has(newTrackFingerprint)) {
                    parsingResults.skippedCount++;
                } else {
                    // Generate a descriptive smart title using shared logic
                    const smartData = generateSmartTitle(parsedData.points, parsedData.distance, parsedData.name);

                    const newTrack: Track = {
                        id: `${file.name}-${new Date().getTime()}`,
                        name: smartData.title,
                        points: parsedData.points,
                        color: colors[(tracksLength + newTracksCount) % colors.length],
                        distance: parsedData.distance,
                        duration: parsedData.duration,
                        folder: smartData.folder,
                        activityType: smartData.activityType
                    };
                    parsingResults.newTracks.push(newTrack);
                    existingTrackFingerprints.add(newTrackFingerprint);
                    newTracksCount++;
                }
            } else {
                parsingResults.failedCount++;
                parsingResults.errorMessages.push(`Failed to parse: ${file.name}`);
            }
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            parsingResults.failedCount++;
            parsingResults.errorMessages.push(`Error processing ${file.name}: ${(error as Error).message}`);
        }
    }

    self.postMessage(parsingResults);
};
