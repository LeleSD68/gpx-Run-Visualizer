
import { TrackPoint } from '../types';

/**
 * Applica uno smoothing ai punti del tracciato basato su una finestra temporale.
 * Calcola la media dei valori per ogni punto considerando i vicini entro +/- windowSeconds/2.
 */
export const smoothTrackPoints = (points: TrackPoint[], windowSeconds: number): TrackPoint[] => {
  if (windowSeconds <= 1 || points.length < 2) return points;

  const halfWindowMs = (windowSeconds / 2) * 1000;

  return points.map((p, i) => {
    const currentTime = p.time.getTime();
    const startTime = currentTime - halfWindowMs;
    const endTime = currentTime + halfWindowMs;

    let sumEle = 0;
    let sumHr = 0;
    let hrCount = 0;
    let count = 0;

    // Search window logic (optimized range)
    for (let j = Math.max(0, i - 100); j < Math.min(points.length, i + 100); j++) {
      const ptTime = points[j].time.getTime();
      if (ptTime >= startTime && ptTime <= endTime) {
        sumEle += points[j].ele;
        if (points[j].hr) {
          sumHr += points[j].hr!;
          hrCount++;
        }
        count++;
      }
    }

    if (count < 2) return p;

    return {
      ...p,
      ele: sumEle / count,
      hr: hrCount > 0 ? Math.round(sumHr / hrCount) : p.hr
    };
  });
};

/**
 * Calcola la velocità (km/h) e il ritmo (min/km) mediati su una finestra temporale.
 */
export const calculateSmoothedMetrics = (points: TrackPoint[], index: number, windowSeconds: number): { speed: number, pace: number } => {
    if (index === 0 || windowSeconds <= 1) {
        // Fallback calculation for index 0 or no smoothing
        if (index === 0) return { speed: 0, pace: 0 };
        const p1 = points[index - 1];
        const p2 = points[index];
        const d = p2.cummulativeDistance - p1.cummulativeDistance;
        const t = (p2.time.getTime() - p1.time.getTime()) / 3600000;
        const speed = t > 0 ? d / t : 0;
        return { speed, pace: speed > 0.1 ? 60 / speed : 0 };
    }

    const halfWindowMs = (windowSeconds / 2) * 1000;
    const currentTime = points[index].time.getTime();
    
    let startIdx = index;
    while (startIdx > 0 && points[startIdx].time.getTime() > currentTime - halfWindowMs) {
        startIdx--;
    }
    
    let endIdx = index;
    while (endIdx < points.length - 1 && points[endIdx].time.getTime() < currentTime + halfWindowMs) {
        endIdx++;
    }

    const dist = points[endIdx].cummulativeDistance - points[startIdx].cummulativeDistance;
    const timeHours = (points[endIdx].time.getTime() - points[startIdx].time.getTime()) / 3600000;

    if (timeHours > 0 && dist > 0) {
        const speed = dist / timeHours;
        return { speed, pace: speed > 0.1 ? 60 / speed : 0 };
    }

    return { speed: 0, pace: 0 };
};

/**
 * Smoothes the elevation data of a track using a moving average filter.
 */
export const smoothElevation = (
  points: Omit<TrackPoint, 'cummulativeDistance'>[],
  windowSize: number = 15
): Omit<TrackPoint, 'cummulativeDistance'>[] => {
  if (points.length < windowSize) {
    return points;
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

/**
 * Calculates elevation gain and loss using a Hysteresis Filter (Thresholding).
 */
export const calculateElevationStats = (points: { ele: number }[], threshold: number = 4.0) => {
    if (points.length < 2) return { elevationGain: 0, elevationLoss: 0 };

    let elevationGain = 0;
    let elevationLoss = 0;

    let valley = points[0].ele;
    let peak = points[0].ele;
    
    let isClimbing = points[1].ele >= points[0].ele;

    for (let i = 1; i < points.length; i++) {
        const ele = points[i].ele;

        if (isClimbing) {
            if (ele > peak) {
                peak = ele;
            } else if (peak - ele >= threshold) {
                const gain = peak - valley;
                if (gain > 0) elevationGain += gain;
                valley = ele;
                peak = ele;
                isClimbing = false;
            }
        } else {
            if (ele < valley) {
                valley = ele;
            } else if (ele - valley >= threshold) {
                const loss = peak - valley;
                if (loss > 0) elevationLoss += loss;
                peak = ele;
                valley = ele;
                isClimbing = true;
            }
        }
    }

    if (isClimbing) {
        const finalGain = peak - valley;
        if (finalGain > 0) elevationGain += finalGain;
    } else {
        const finalLoss = peak - valley;
        if (finalLoss > 0) elevationLoss += finalLoss;
    }

    return { elevationGain, elevationLoss };
};
