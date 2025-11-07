
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Participant, EmotionState } from '../types';
import { analyzeEmotionFromImage } from '../services/geminiService';

interface ParticipantViewProps {
    participant: Participant;
    stream: MediaStream | null;
    isAnalysisActive: boolean;
}

const emotionStyles: Record<EmotionState, { color: string; emoji: string }> = {
    'Idle': { color: 'bg-gray-500', emoji: '⚪' },
    'Analyzing...': { color: 'bg-blue-500 animate-pulse', emoji: '🤔' },
    'Engaged': { color: 'bg-green-500', emoji: '✅' },
    'Happy': { color: 'bg-yellow-400', emoji: '😊' },
    'Neutral': { color: 'bg-gray-400', emoji: '😐' },
    'Confused': { color: 'bg-orange-500', emoji: '❓' },
    'Bored': { color: 'bg-indigo-500', emoji: '😴' },
    'Error': { color: 'bg-red-600', emoji: '❌' },
};

const ParticipantView: React.FC<ParticipantViewProps> = ({ participant, stream, isAnalysisActive }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [emotion, setEmotion] = useState<EmotionState>('Idle');
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const runAnalysis = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || participant.isHost) {
            return;
        }

        setEmotion('Analyzing...');
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const base64Data = dataUrl.split(',')[1];
            
            if (base64Data) {
                const result = await analyzeEmotionFromImage(base64Data);
                setEmotion(result);
            }
        }
    }, [participant.isHost]);

    useEffect(() => {
        if (isAnalysisActive && !participant.isHost) {
            // Run analysis immediately, then start interval
            runAnalysis();
            intervalRef.current = window.setInterval(runAnalysis, 7000); // Analyze every 7 seconds
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setEmotion('Idle');
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isAnalysisActive, participant.isHost, runAnalysis]);

    const { color, emoji } = emotionStyles[emotion] || emotionStyles['Idle'];
    
    return (
        <div className="relative bg-gray-800 rounded-lg overflow-hidden shadow-lg aspect-video flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded-md">
                {participant.name}
            </div>

            {participant.isHost && (
                <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    HOST
                </div>
            )}
            
            {!participant.isHost && (
                 <div className="absolute top-2 left-2 flex items-center space-x-2 bg-black/50 p-2 rounded-full text-white text-sm transition-all duration-300">
                    <span className={`w-3 h-3 rounded-full ${color}`}></span>
                    <span>{emotion}</span>
                </div>
            )}
        </div>
    );
};

export default ParticipantView;
