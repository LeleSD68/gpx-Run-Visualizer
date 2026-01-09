
import { Track, TrackPoint } from '../types';

export type GradientMetric = 'none' | 'elevation' | 'pace' | 'speed' | 'hr' | 'hr_zones';

export interface ColoredSegment {
    p1: TrackPoint;
    p2: TrackPoint;
    color: string;
    value?: number; // Added to support legend interactivity
}

// This function calculates a color for each segment of a track based on a metric.
export const getTrackSegmentColors = (track: Track, metric: GradientMetric, defaultColor: string = '#06b6d4'): ColoredSegment[] => {
    // If no metric is selected or the track is too short, return segments with the default color.
    if (metric === 'none' || track.points.length < 2) {
        const segments: ColoredSegment[] = [];
        for (let i = 1; i < track.points.length; i++) {
            segments.push({
                p1: track.points[i - 1],
                p2: track.points[i],
                color: defaultColor,
            });
        }
        return segments;
    }

    // Special case for HR Zones, which is not a gradient.
    if (metric === 'hr_zones') {
        const hrValues = track.points.map(p => p.hr ?? null);
        const validHrs = hrValues.filter((v): v is number => v !== null && v > 0);
        if (validHrs.length < 2) {
            return getTrackSegmentColors(track, 'none', defaultColor);
        }
        const maxHr = validHrs.reduce((max, v) => Math.max(max, v), 0);

        const getColorForZone = (hr: number | null): string => {
            if (hr === null) return '#94a3b8'; // Slate-400 for no data
            const ratio = maxHr > 0 ? hr / maxHr : 0;
            if (ratio < 0.60) return '#3b82f6'; // Zone 1: Blue-500
            if (ratio < 0.70) return '#22c55e'; // Zone 2: Green-500
            if (ratio < 0.80) return '#eab308'; // Zone 3: Yellow-500
            if (ratio < 0.90) return '#f97316'; // Zone 4: Orange-500
            return '#ef4444'; // Zone 5: Red-500
        };

        const coloredSegments: ColoredSegment[] = [];
        for (let i = 1; i < track.points.length; i++) {
            const p1 = track.points[i - 1];
            const p2 = track.points[i];
            const avgHr = (p1.hr ?? p2.hr ?? null) !== null ? ((p1.hr ?? p2.hr!) + (p2.hr ?? p1.hr!)) / 2 : null;
            // Store the zone index or raw value if needed, here we treat avgHr as value
            coloredSegments.push({ p1, p2, color: getColorForZone(avgHr), value: avgHr ?? undefined });
        }
        return coloredSegments;
    }
    
    let values: (number | null)[] = [];
    let colorFn: (ratio: number) => string;

    // Calculate the metric value for each point.
    switch (metric) {
        case 'elevation':
            values = track.points.map(p => p.ele);
            colorFn = ratio => `hsl(${(1 - ratio) * 120}, 90%, 50%)`; // Green (low) to Red (high)
            break;
        case 'speed':
            values = track.points.map((p, i) => {
                if (i === 0) return null;
                const p1 = track.points[i - 1];
                const dist = p.cummulativeDistance - p1.cummulativeDistance;
                const time = (p.time.getTime() - p1.time.getTime()) / 3600000; // hours
                return time > 0 ? Math.min(50, dist / time) : null; // Cap speed at 50 km/h
            });
            colorFn = ratio => `hsl(${ratio * 120}, 90%, 50%)`; // Red (slow) to Green (fast)
            break;
        case 'pace':
            values = track.points.map((p, i) => {
                if (i === 0) return null;
                const p1 = track.points[i - 1];
                const dist = p.cummulativeDistance - p1.cummulativeDistance;
                const time = (p.time.getTime() - p1.time.getTime()) / 60000; // minutes
                return dist > 0.001 ? Math.min(20, time / dist) : null; // Cap pace at 20 min/km
            });
            colorFn = ratio => `hsl(${(1 - ratio) * 120}, 90%, 50%)`; // Green (fast) to Red (slow)
            break;
        case 'hr':
            values = track.points.map(p => p.hr ?? null);
            colorFn = ratio => `hsl(${240 - ratio * 240}, 90%, 50%)`; // Blue (low) to Red (high)
            break;
    }

    const validValues = values.filter((v): v is number => v !== null && isFinite(v));
    if (validValues.length < 2) {
        return getTrackSegmentColors(track, 'none', defaultColor); // Fallback to default if no valid data
    }

    const minVal = validValues.reduce((min, v) => Math.min(min, v), Infinity);
    const maxVal = validValues.reduce((max, v) => Math.max(max, v), -Infinity);
    const range = maxVal - minVal;

    // Create a colored segment for each pair of points.
    const coloredSegments: ColoredSegment[] = [];
    for (let i = 1; i < track.points.length; i++) {
        const p1 = track.points[i - 1];
        const p2 = track.points[i];
        
        // Use the average value of the segment's start and end points for coloring.
        const value1 = values[i-1];
        const value2 = values[i];
        const avgValue = value1 !== null && value2 !== null ? (value1 + value2) / 2 : (value1 ?? value2);
        
        let color = defaultColor;

        if (avgValue !== null) {
            const ratio = range > 0 ? (avgValue - minVal) / range : 0.5;
            color = colorFn(Math.max(0, Math.min(1, ratio))); // Clamp ratio to [0, 1]
        }
        
        coloredSegments.push({ p1, p2, color, value: avgValue ?? undefined });
    }
    
    return coloredSegments;
};
