
// This worker handles parsing GPX and TCX files in the background
// to prevent the main UI thread from freezing.

// --- Type Definitions (simplified for worker context) ---
interface TrackPoint {
  lat: number;
  lon: number;
  ele: number;
  time: Date;
  cummulativeDistance: number;
  hr?: number;
}

// --- Dependencies (copied from services to be self-contained) ---

const smoothElevation = (points: Omit<TrackPoint, 'cummulativeDistance'>[], windowSize: number = 11) => {
  if (points.length < windowSize) return points;
  return points.map((point, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(points.length, index + Math.floor(windowSize / 2) + 1);
    const window = points.slice(start, end);
    const sum = window.reduce((acc, p) => acc + p.ele, 0);
    return { ...point, ele: sum / window.length };
  });
};

const haversineDistance = (p1: {lat: number, lon: number}, p2: {lat: number, lon: number}): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
  const dLon = (p2.lon - p1.lon) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(p1.lat * (Math.PI / 180)) * Math.cos(p2.lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// --- Parsers (copied from services) ---

const parseGpx = (gpxString: string, fileName: string) => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxString, "text/xml");
    const errorNode = xmlDoc.querySelector("parsererror");
    if (errorNode) return null;

    const name = xmlDoc.querySelector("name")?.textContent || fileName.replace(/\.gpx$/i, '');
    const points: Omit<TrackPoint, 'cummulativeDistance'>[] = [];
    const trackpoints = xmlDoc.querySelectorAll("trkpt");
    if (trackpoints.length === 0) return null;

    trackpoints.forEach(pt => {
      const lat = pt.getAttribute("lat");
      const lon = pt.getAttribute("lon");
      const ele = pt.querySelector("ele")?.textContent;
      const time = pt.querySelector("time")?.textContent;
      const hr = pt.querySelector("hr")?.textContent;

      if (lat && lon && time) {
        const pointData: Omit<TrackPoint, 'cummulativeDistance'> = {
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          ele: ele ? parseFloat(ele) : 0,
          time: new Date(time),
        };
        if (hr) pointData.hr = parseInt(hr, 10);
        points.push(pointData);
      }
    });
    
    if (points.length < 2) return null;
    points.sort((a, b) => a.time.getTime() - b.time.getTime());
    
    const smoothedPoints = smoothElevation(points);
    let totalDistance = 0;
    const pointsWithDistance: TrackPoint[] = [];
    smoothedPoints.forEach((p, index) => {
      if (index > 0) totalDistance += haversineDistance(smoothedPoints[index-1], p);
      pointsWithDistance.push({ ...p, cummulativeDistance: totalDistance });
    });

    const totalDuration = pointsWithDistance[pointsWithDistance.length - 1].time.getTime() - pointsWithDistance[0].time.getTime();
    return { name, points: pointsWithDistance, distance: totalDistance, duration: totalDuration };
  } catch (e) { return null; }
};

const parseTcx = (tcxString: string, fileName: string) => {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(tcxString, "text/xml");
        const errorNode = xmlDoc.querySelector("parsererror");
        if (errorNode) return null;

        const name = fileName.replace(/\.tcx$/i, '');
        const points: Omit<TrackPoint, 'cummulativeDistance'>[] = [];
        const trackpoints = xmlDoc.querySelectorAll("Trackpoint");
        if (trackpoints.length === 0) return null;

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
                if (hrNode?.textContent) pointData.hr = parseInt(hrNode.textContent, 10);
                points.push(pointData);
            }
        });
    
        if (points.length < 2) return null;
        points.sort((a, b) => a.time.getTime() - b.time.getTime());
    
        const smoothedPoints = smoothElevation(points);
        let totalDistance = 0;
        const pointsWithDistance: TrackPoint[] = [];
        smoothedPoints.forEach((p, index) => {
            if (index > 0) totalDistance += haversineDistance(smoothedPoints[index - 1], p);
            pointsWithDistance.push({ ...p, cummulativeDistance: totalDistance });
        });

        const totalDuration = pointsWithDistance[pointsWithDistance.length - 1].time.getTime() - pointsWithDistance[0].time.getTime();
        return { name, points: pointsWithDistance, distance: totalDistance, duration: totalDuration };
    } catch (e) { return null; }
};

// --- Worker Event Listener ---
self.onmessage = (event) => {
    const { fileContent, fileName } = event.data;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    let parsedData = null;
    if (fileExtension === 'gpx') {
        parsedData = parseGpx(fileContent, fileName);
    } else if (fileExtension === 'tcx') {
        parsedData = parseTcx(fileContent, fileName);
    }
    
    // Post the result back to the main thread
    self.postMessage({
        parsedData,
        fileName,
    });
};
