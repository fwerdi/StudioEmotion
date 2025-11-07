import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Participant, EmotionState, EmotionRecord } from '../types';
import { analyzeEmotionFromImage } from '../services/geminiService';
import EmotionGraph from './EmotionGraph';

// Add faceapi to the window object for TypeScript
declare const faceapi: any;

// SVG Icons for Controls
const MuteIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>);
const UnmuteIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" clipRule="evenodd" /><path d="M16.5 10a5.985 5.985 0 00-1.757-4.243 1 1 0 00-1.414 1.414A3.987 3.987 0 0115 10c0 1.105-.448 2.105-1.172 2.828a1 1 0 001.414 1.414A5.985 5.985 0 0016.5 10z" /></svg>);
const RemoveIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>);
const SpotlightIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2H5z" /><path d="M5 12a2 2 0 00-2 2v.5a.5.5 0 00.5.5h13a.5.5 0 00.5-.5V14a2 2 0 00-2-2H5z" /></svg>);

interface ParticipantViewProps {
    participant: Participant;
    stream: MediaStream | null;
    isAnalysisActive: boolean;
    staggerIndex: number;
    isHostView: boolean;
    isSpotlighted: boolean;
    onToggleMute: () => void;
    onRemove: () => void;
    onToggleSpotlight: () => void;
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

const validEmotionsForHistory: EmotionState[] = ['Engaged', 'Confused', 'Neutral', 'Bored', 'Happy'];

const ParticipantView: React.FC<ParticipantViewProps> = ({ participant, stream, isAnalysisActive, staggerIndex, isHostView, isSpotlighted, onToggleMute, onRemove, onToggleSpotlight }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const [emotion, setEmotion] = useState<EmotionState>('Idle');
    const [emotionHistory, setEmotionHistory] = useState<EmotionRecord[]>([]);
    const [showControls, setShowControls] = useState(false);
    const animationFrameId = useRef<number | null>(null);
    const analysisErrorCount = useRef(0);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const runAnalysis = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || participant.isHost) {
            return;
        }

        try {
            const video = videoRef.current;
            if (video.readyState < video.HAVE_CURRENT_DATA || video.videoWidth === 0) {
                console.warn("Video not ready for analysis, skipping frame.");
                return;
            }

            setEmotion('Analyzing...');
            const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());

            if (!detection) {
                setEmotion('Neutral');
                return;
            }
            
            const canvas = canvasRef.current;
            const { box } = detection;
            canvas.width = box.width;
            canvas.height = box.height;

            const context = canvas.getContext('2d');
            if (!context) throw new Error("Failed to get canvas 2D context.");
            
            context.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const base64Data = dataUrl.split(',')[1];
            
            if (!base64Data) throw new Error("Failed to create base64 data from canvas.");

            const result = await analyzeEmotionFromImage(base64Data);
            setEmotion(result);
            analysisErrorCount.current = 0;

            if (validEmotionsForHistory.includes(result)) {
                setEmotionHistory(prev =>
                    [...prev, { emotion: result, timestamp: Date.now() }].filter(r => Date.now() - r.timestamp <= 60000)
                );
            }
        } catch (error) {
            console.error(`Analysis failed for ${participant.name}:`, error);
            analysisErrorCount.current += 1;
            
            if (analysisErrorCount.current >= 2) {
                setEmotion('Error');
            } else {
                setEmotion('Neutral');
            }
        }

    }, [participant.isHost, participant.name]);

    useEffect(() => {
        let timeoutId: number | null = null;
        const ANALYSIS_INTERVAL_MS = 5000; 
        const STAGGER_DELAY_MS = 1000;

        const analysisLoop = async () => {
            if (!isAnalysisActive || participant.isHost) return;
            await runAnalysis();
            timeoutId = window.setTimeout(analysisLoop, ANALYSIS_INTERVAL_MS);
        };

        if (isAnalysisActive && !participant.isHost) {
            analysisErrorCount.current = 0;
            const initialDelay = staggerIndex * STAGGER_DELAY_MS;
            timeoutId = window.setTimeout(analysisLoop, initialDelay);
        } else {
            setEmotion('Idle');
            setEmotionHistory([]);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isAnalysisActive, participant.isHost, runAnalysis, staggerIndex]);

    useEffect(() => {
        const video = videoRef.current;
        const overlayCanvas = overlayCanvasRef.current;

        const clearOverlay = () => {
             if (overlayCanvas) {
                const context = overlayCanvas.getContext('2d');
                if (context) context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            }
        };

        if (!isAnalysisActive || participant.isHost || !video || !overlayCanvas) {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
            clearOverlay();
            return;
        }

        const context = overlayCanvas.getContext('2d');
        if (!context) return;
        
        const trackFaceAndDrawBox = async () => {
            if (video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
                const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());
                
                if (overlayCanvas.width !== video.videoWidth || overlayCanvas.height !== video.videoHeight) {
                    overlayCanvas.width = video.videoWidth;
                    overlayCanvas.height = video.videoHeight;
                }
                
                context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                
                if (detection) {
                    const { box } = detection;
                    context.strokeStyle = '#22c55e';
                    context.lineWidth = 2;
                    context.beginPath();
                    const flippedX = overlayCanvas.width - (box.x + box.width);
                    context.rect(flippedX, box.y, box.width, box.height);
                    context.stroke();
                }
            }
            animationFrameId.current = requestAnimationFrame(trackFaceAndDrawBox);
        };
        
        trackFaceAndDrawBox();

        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            clearOverlay();
        };
    }, [isAnalysisActive, participant.isHost]);


    const { color } = emotionStyles[emotion] || emotionStyles['Idle'];
    
    const getEmotionTooltip = (): string => {
        switch (emotion) {
            case 'Error': return 'Analysis failed. Check lighting or face visibility.';
            case 'Analyzing...': return 'AI is analyzing the student\'s expression.';
            default: return `Current detected emotion: ${emotion}`;
        }
    };

    return (
        <div 
            className="relative bg-gray-800 rounded-lg overflow-hidden shadow-lg w-full h-full flex items-center justify-center"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
            <canvas ref={canvasRef} className="hidden" />
            <canvas ref={overlayCanvasRef} className="absolute top-0 left-0 w-full h-full" />
            
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded-md z-10">
                {participant.name}
            </div>

            {participant.isHost && (
                <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                    HOST
                </div>
            )}
            
            {participant.isMuted && (
                <div className="absolute bottom-2 right-2 bg-black/50 text-white p-1 rounded-full z-10" title="Muted">
                    <MuteIcon />
                </div>
            )}
            
            {!participant.isHost && isAnalysisActive && (
                 <div
                    className="absolute top-2 left-2 flex items-center space-x-3 bg-black/50 backdrop-blur-sm p-2 rounded-lg text-white text-sm transition-all duration-300 shadow-lg z-10"
                    title={getEmotionTooltip()}
                 >
                    <div className="flex items-center">
                       <span className={`flex-shrink-0 w-3 h-3 rounded-full ${color} mr-2`}></span>
                       <span className="w-20 truncate">{emotion}</span>
                    </div>
                    <EmotionGraph history={emotionHistory} />
                </div>
            )}

            {isHostView && !participant.isHost && showControls && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-black/60 p-2 rounded-lg z-20 transition-opacity duration-300">
                    <button onClick={onToggleMute} className="p-2 rounded-full hover:bg-gray-700" title={participant.isMuted ? "Unmute" : "Mute"}>
                        {participant.isMuted ? <UnmuteIcon /> : <MuteIcon />}
                    </button>
                     <button onClick={onToggleSpotlight} className="p-2 rounded-full hover:bg-gray-700" title={isSpotlighted ? "Remove Spotlight" : "Spotlight"}>
                        <SpotlightIcon />
                    </button>
                    <button onClick={onRemove} className="p-2 rounded-full hover:bg-red-700 text-red-400 hover:text-white" title="Remove Participant">
                        <RemoveIcon />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ParticipantView;