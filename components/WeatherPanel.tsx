
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
import { Track, Weather } from '../types';

// Icons
const ThermometerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 text-slate-400">
        <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.422a3.75 3.75 0 1 1-1.5 0V3.75A.75.75 0 0 1 10 3Zm0 12.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
    </svg>
);

const WindIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 text-slate-400">
        <path d="M3 5a.75.75 0 0 1 .75.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 3 5.75Zm4.5 0a.75.75 0 0 1 .75.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75Zm7.5.75a.75.75 0 0 0 0-1.5h1.5a.75.75 0 0 0 0 1.5h-1.5ZM3 10a.75.75 0 0 1 .75.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 3 10.75Zm10.5 0a.75.75 0 0 1 .75.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75ZM3 15a.75.75 0 0 1 .75.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 3 15.75Zm4.5 0a.75.75 0 0 1 .75.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
);

const HumidityIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 text-slate-400">
        <path fillRule="evenodd" d="M6.368 2.21a.75.75 0 0 1 .634.257l2.5 3.5a.75.75 0 0 1-.968 1.134L8 6.643V12.25a.75.75 0 0 1-1.5 0V6.643l-.534.457a.75.75 0 1 1-.968-1.134l2.5-3.5a.75.75 0 0 1 .866-.213Zm7.632 8.04a.75.75 0 0 1-.634-.257l-2.5-3.5a.75.75 0 0 1 .968-1.134L12 9.357V3.75a.75.75 0 0 1 1.5 0v5.607l.534-.457a.75.75 0 1 1 .968 1.134l-2.5 3.5a.75.75 0 0 1-.866.213Z" clipRule="evenodd" />
    </svg>
);

// START: Retry Logic Helpers
const isRetryableError = (e: any): boolean => {
    const message = e.message || '';
    if (message.includes('{') && message.includes('}')) {
        try {
            const parsed = JSON.parse(message);
            const status = parsed?.error?.status || '';
            const code = parsed?.error?.code;
            if (code === 503 || status === 'UNAVAILABLE') return true;
        } catch (parseError) {
            // Ignore
        }
    }
    const status = e?.status || e?.error?.status || '';
    const code = e?.code || e?.error?.code;
    if (code === 503 || status === 'UNAVAILABLE' || status.toLowerCase() === 'unavailable') return true;

    const fullErrorString = (JSON.stringify(e) || '').toLowerCase();
    return fullErrorString.includes('overloaded') || fullErrorString.includes('unavailable');
};

async function retryWithBackoff<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let attempt = 0;
  let lastError: any;
  while (attempt < maxRetries) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      attempt++;
      if (attempt >= maxRetries || !isRetryableError(error)) {
        throw error;
      }
      const jitter = Math.random() * initialDelay * 0.5;
      const delay = (initialDelay * Math.pow(2, attempt - 1)) + jitter;
      console.warn(`API call failed. Retrying in ${Math.round(delay)}ms...`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
// END: Retry Logic Helpers


const WeatherPanel: React.FC<{ track: Track }> = ({ track }) => {
    const [weather, setWeather] = useState<Weather | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchWeather = useCallback(async () => {
        if (!track || track.points.length === 0) return;

        setIsLoading(true);
        setError('');
        setWeather(null);

        const startPoint = track.points[0];
        const date = startPoint.time.toLocaleDateString();

        const prompt = `Agisci come un'API meteorologica. Per la località con latitudine ${startPoint.lat} e longitudine ${startPoint.lon} nella data ${date}, fornisci le condizioni meteorologiche tipiche. Rispondi SOLO con un oggetto JSON.`;

        try {
            // FIX: Initialize GenAI with named parameter for apiKey
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // FIX: Use gemini-3-flash-preview as per guidelines
            const apiCall = () => ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    temperature: { type: Type.NUMBER, description: "Temperatura in Celsius" },
                    windSpeed: { type: Type.NUMBER, description: "Velocità del vento in km/h" },
                    humidity: { type: Type.NUMBER, description: "Umidità in percentuale" },
                    condition: { type: Type.STRING, description: "Una breve descrizione delle condizioni meteorologiche, es. 'Soleggiato', 'Nuvoloso'" },
                  },
                },
              },
            });

            const response: GenerateContentResponse = await retryWithBackoff(apiCall);
            window.gpxApp?.addTokens(response.usageMetadata?.totalTokenCount ?? 0);
            
            // FIX: Access .text property directly
            const jsonStr = (response.text || '').trim();
            const weatherData = JSON.parse(jsonStr);
            setWeather(weatherData);

        } catch (e) {
            setError('Could not fetch weather data after several attempts.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [track]);

    useEffect(() => {
        fetchWeather();
    }, [fetchWeather]);

    return (
        <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-2 border-t border-slate-700 pt-4">Weather Conditions</h3>
            
            {isLoading && (
                <div className="flex items-center justify-center text-slate-400 py-4">
                    <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                    Fetching weather...
                </div>
            )}

            {error && <p className="text-sm text-red-400 text-center bg-red-500/10 p-2 rounded-md">{error}</p>}
            
            {weather && (
                <div className="bg-slate-700/50 p-3 rounded-lg space-y-2">
                    <div className="flex items-center text-lg">
                        <span className="font-bold text-2xl text-white">{weather.temperature.toFixed(0)}°C</span>
                        <span className="ml-2 text-slate-300">{weather.condition}</span>
                    </div>
                    <div className="text-sm text-slate-300 grid grid-cols-2 gap-2">
                        <div className="flex items-center">
                            <WindIcon />
                            <span>{weather.windSpeed.toFixed(0)} km/h Wind</span>
                        </div>
                        <div className="flex items-center">
                            <HumidityIcon />
                            <span>{weather.humidity.toFixed(0)}% Humidity</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeatherPanel;
