import { Track, TrackPoint } from '../types';

const toISOStringWithMilliseconds = (date: Date) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const y = date.getUTCFullYear();
    const m = pad(date.getUTCMonth() + 1);
    const d = pad(date.getUTCDate());
    const h = pad(date.getUTCHours());
    const min = pad(date.getUTCMinutes());
    const s = pad(date.getUTCSeconds());
    const ms = date.getUTCMilliseconds().toString().padStart(3, '0');
    return `${y}-${m}-${d}T${h}:${min}:${s}.${ms}Z`;
};

const generateGpxContent = (track: Track): string => {
    const trackPointsXml = track.points.map(p => 
        `
        <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}">
            <ele>${p.ele.toFixed(2)}</ele>
            <time>${toISOStringWithMilliseconds(p.time)}</time>
        </trkpt>`
    ).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPX Race Visualizer"
    xmlns="http://www.topografix.com/GPX/1/1"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
    <metadata>
        <name>${track.name}</name>
        <time>${toISOStringWithMilliseconds(track.points[0]?.time || new Date())}</time>
    </metadata>
    <trk>
        <name>${track.name}</name>
        <trkseg>${trackPointsXml}
        </trkseg>
    </trk>
</gpx>`;
};


export const exportToGpx = (track: Track): void => {
    const gpxString = generateGpxContent(track);
    const blob = new Blob([gpxString], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${track.name.replace(/[^a-z0-9]/gi, '_')}_edited.gpx`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
