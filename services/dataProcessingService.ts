import { TrackPoint } from '../types';

/**
 * Smoothes the elevation data of a track using a moving average filter.
 * This helps to reduce noise from GPS data which can lead to inflated elevation gain/loss calculations.
 * @param points - The array of track points to process.
 * @param windowSize - The number of points to include in the moving average window. Must be an odd number.
 * @returns A new array of track points with smoothed elevation data.
 */
export const smoothElevation = (
  points: Omit<TrackPoint, 'cummulativeDistance'>[],
  windowSize: number = 11 // A larger window provides more smoothing
): Omit<TrackPoint, 'cummulativeDistance'>[] => {
  if (points.length < windowSize) {
    return points; // Not enough data to smooth
  }

  const smoothedPoints = points.map((point, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(points.length, index + Math.floor(windowSize / 2) + 1);
    const window = points.slice(start, end);
    
    const sum = window.reduce((acc, p) => acc + p.ele, 0);
    const averageEle = sum / window.length;
    
    return { ...point, ele: averageEle };
  });

  return smoothedPoints;
};
