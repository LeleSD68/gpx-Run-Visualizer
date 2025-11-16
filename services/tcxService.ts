import { TrackPoint } from '../types';
import { smoothElevation } from './dataProcessingService';

// Haversine formula to calculate distance between two lat/lon points
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

export const parseTcx = (tcxString: string, fileName: string): { name: string; points: TrackPoint[]; distance: number; duration: number; } | null => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(tcxString, "text/xml");

    const errorNode = xmlDoc.querySelector("parsererror");
    if (errorNode) {
      // Don't log here, let the worker handle reporting errors
      return null;
    }

    const name = fileName.replace('.tcx', '');
    const points: Omit<TrackPoint, 'cummulativeDistance'>[] = [];
    const trackpoints = xmlDoc.querySelectorAll("Trackpoint");

    if (trackpoints.length === 0) {
        return null;
    }

    trackpoints.forEach(pt => {
      const time = pt.querySelector("Time")?.textContent;
      const latNode = pt.querySelector("LatitudeDegrees");
      const lonNode = pt.querySelector("LongitudeDegrees");
      const ele = pt.querySelector("AltitudeMeters")?.textContent;
      const hrNode = pt.querySelector("HeartRateBpm Value");
      
      if (time && latNode?.textContent && lonNode?.textContent) {
        const pointData: Omit<TrackPoint, 'cummulativeDistance'> = {
          lat: parseFloat(latNode.textContent),
          lon: parseFloat(lonNode.textContent),
          ele: ele ? parseFloat(ele) : 0,
          time: new Date(time),
        };
        if (hrNode?.textContent) {
            pointData.hr = parseInt(hrNode.textContent, 10);
        }
        points.push(pointData);
      }
    });
    
    if (points.length < 2) return null;

    points.sort((a, b) => a.time.getTime() - b.time.getTime());
    
    // Apply elevation smoothing to correct for GPS data noise, which causes inflated elevation gain.
    const smoothedPoints = smoothElevation(points);
    
    let totalDistance = 0;
    const pointsWithDistance: TrackPoint[] = [];
    smoothedPoints.forEach((p, index) => {
      if (index > 0) {
        totalDistance += haversineDistance(smoothedPoints[index-1], p);
      }
      pointsWithDistance.push({ ...p, cummulativeDistance: totalDistance });
    });


    const totalDuration = pointsWithDistance[pointsWithDistance.length - 1].time.getTime() - pointsWithDistance[0].time.getTime();

    return { name, points: pointsWithDistance, distance: totalDistance, duration: totalDuration };
  } catch (error) {
    // Let the worker handle reporting errors
    return null;
  }
};