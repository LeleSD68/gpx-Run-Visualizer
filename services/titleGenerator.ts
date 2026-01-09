
import { TrackPoint, ActivityType } from '../types';

// Helper function to calculate elevation gain roughly for naming purposes
export const calculateRoughElevationGain = (points: { ele: number }[]): number => {
    let gain = 0;
    for (let i = 1; i < points.length; i++) {
        const diff = points[i].ele - points[i - 1].ele;
        if (diff > 0) gain += diff;
    }
    return gain;
};

export interface SmartTitleResult {
    title: string;
    activityType: ActivityType;
    folder?: string;
}

export const generateSmartTitle = (points: TrackPoint[], distanceKm: number, originalName: string): SmartTitleResult => {
    if (points.length === 0) return { title: originalName, activityType: 'Altro' };

    const startTime = points[0].time instanceof Date ? points[0].time : new Date(points[0].time);
    const hour = startTime.getHours();
    const day = startTime.getDay(); // 0 = Sunday
    const elevationGain = calculateRoughElevationGain(points);
    const gainPerKm = distanceKm > 0 ? elevationGain / distanceKm : 0;

    // 1. Contesto Temporale
    let timeStr = "";
    if (hour >= 5 && hour < 10) timeStr = "Mattina";
    else if (hour >= 10 && hour < 12) timeStr = "Tarda Mattinata";
    else if (hour >= 12 && hour < 14) timeStr = "Pausa Pranzo";
    else if (hour >= 14 && hour < 17) timeStr = "Pomeriggio";
    else if (hour >= 17 && hour < 20) timeStr = "Sera";
    else if (hour >= 20 || hour < 5) timeStr = "Notturna";

    // 2. Terreno / Difficoltà
    let terrainStr = "";
    if (gainPerKm > 25) terrainStr = "Montagna"; 
    else if (gainPerKm > 12) terrainStr = "Collinare";
    else if (gainPerKm < 3 && distanceKm > 5) terrainStr = "Piano";

    // 3. Tipologia Corsa basata sulla distanza
    let typeStr = "Corsa";
    let activityType: ActivityType = 'Lento';
    let folder: string | undefined = undefined;

    if (distanceKm < 5) {
        typeStr = "Rigenerante";
        activityType = 'Lento';
    }
    else if (distanceKm >= 5 && distanceKm < 13) {
        typeStr = "Fondo Lento";
        activityType = 'Lento';
    }
    else if (distanceKm >= 13 && distanceKm < 18) {
        typeStr = "Medio";
        activityType = 'Lungo'; 
    }
    else if (distanceKm >= 18 && distanceKm < 28) {
        typeStr = "Lungo";
        activityType = 'Lungo';
        folder = "Lunghi";
    }
    else if (distanceKm >= 28) {
        typeStr = "Lunghissimo";
        activityType = 'Lungo';
        folder = "Lunghi";
    }

    // Casi Speciali: Distanze Gara
    if (Math.abs(distanceKm - 21.1) < 0.5) {
        typeStr = "Mezza Maratona";
        activityType = 'Gara';
        folder = "Gare";
    }
    if (Math.abs(distanceKm - 42.2) < 1.0) {
        typeStr = "Maratona";
        activityType = 'Gara';
        folder = "Gare";
    }

    // Caso Speciale: Lungo Domenicale
    if (day === 0 && distanceKm > 15) {
        return {
            title: `Lungo Domenicale ⛪ (${distanceKm.toFixed(1)}k)`,
            activityType: 'Lungo',
            folder: 'Lunghi'
        };
    }

    // Costruzione Titolo: [Tipo] [Terreno] ([Orario]) -> es. "Fondo Lento Collinare (Mattina)"
    const mainParts = [typeStr, terrainStr].filter(s => s).join(" ");
    const title = `${mainParts} (${timeStr})`;

    return { title, activityType, folder };
};
