import React, { useRef, useEffect } from 'react';
import { TrackPoint } from '../types';

interface TrackPreviewProps {
    points: TrackPoint[];
    color: string;
    className?: string;
}

const TrackPreview: React.FC<TrackPreviewProps> = ({ points, color, className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || points.length < 2) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const PADDING = 5;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        let minLat = points[0].lat, maxLat = points[0].lat;
        let minLon = points[0].lon, maxLon = points[0].lon;

        points.forEach(p => {
            if (p.lat < minLat) minLat = p.lat;
            if (p.lat > maxLat) maxLat = p.lat;
            if (p.lon < minLon) minLon = p.lon;
            if (p.lon > maxLon) maxLon = p.lon;
        });
        
        const trackHeight = maxLat - minLat;
        const trackWidth = maxLon - minLon;
        
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // If track is just a single point, we can't draw a path.
        if (trackWidth === 0 && trackHeight === 0) {
            return;
        }

        const drawableWidth = canvasWidth - PADDING * 2;
        const drawableHeight = canvasHeight - PADDING * 2;
        
        let scale;
        // To fill the available space while preserving aspect ratio, we find the
        // smaller of the horizontal or vertical scale factors.
        // This handles normal tracks and perfectly straight lines.
        if (trackHeight > 0 && trackWidth > 0) {
            scale = Math.min(drawableWidth / trackWidth, drawableHeight / trackHeight);
        } else if (trackWidth > 0) { // Horizontal line
            scale = drawableWidth / trackWidth;
        } else { // Vertical line (trackHeight > 0)
            scale = drawableHeight / trackHeight;
        }

        const scaledWidth = trackWidth * scale;
        const scaledHeight = trackHeight * scale;
        
        // Center the drawing on the canvas.
        const offsetX = (canvasWidth - scaledWidth) / 2;
        const offsetY = (canvasHeight - scaledHeight) / 2;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        
        points.forEach((p, index) => {
            const x = (p.lon - minLon) * scale + offsetX;
            const y = (maxLat - p.lat) * scale + offsetY; // Y is inverted in canvas
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();

    }, [points, color]);
    
    return <canvas ref={canvasRef} width="80" height="60" className={className}></canvas>;
};

export default TrackPreview;