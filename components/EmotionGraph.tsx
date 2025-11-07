import React from 'react';
import { EmotionRecord } from '../types';

interface EmotionGraphProps {
    history: EmotionRecord[];
}

const emotionValueMap: Record<string, number> = {
    'Engaged': 5,
    'Happy': 4,
    'Neutral': 3,
    'Confused': 2,
    'Bored': 1,
};
const MAX_VALUE = 5;
const DURATION_MS = 60000;

const emotionColorMap: Record<string, string> = {
    'Engaged': '#22c55e',
    'Happy': '#facc15',
    'Neutral': '#a1a1aa',
    'Confused': '#f97316',
    'Bored': '#6366f1',
};

const EmotionGraph: React.FC<EmotionGraphProps> = ({ history }) => {
    const width = 120;
    const height = 30;

    if (history.length < 2) {
        return (
            <svg width={width} height={height} className="opacity-50">
                <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#6b7280" strokeWidth="1.5" strokeDasharray="3 3"/>
                <text x={width / 2} y={height / 2 + 4} fill="#9ca3af" textAnchor="middle" fontSize="10">Waiting for data...</text>
            </svg>
        );
    }

    const now = Date.now();
    const startTime = now - DURATION_MS;
    
    const points = history
        .map(record => {
            const value = emotionValueMap[record.emotion] ?? 0;
            // Ensure y is never NaN and is clamped within the viewbox
            const y = height - (value / MAX_VALUE) * height;
            const clampedY = Math.max(0, Math.min(height, y));
            const x = ((record.timestamp - startTime) / DURATION_MS) * width;
            return `${x.toFixed(2)},${clampedY.toFixed(2)}`;
        })
        .join(' ');

    const lastEmotion = history[history.length - 1].emotion;
    const strokeColor = emotionColorMap[lastEmotion] || '#9ca3af';

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label="Emotion trend graph over the last minute">
            <polyline
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    );
};

export default EmotionGraph;
