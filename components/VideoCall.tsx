import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Participant } from '../types';
import ParticipantView from './ParticipantView';

// Add faceapi to the window object for TypeScript
declare const faceapi: any;

const INITIAL_PARTICIPANTS: Participant[] = [
  { id: 'user-host', name: 'Dr. Anya Sharma (Host)', isHost: true, isMuted: false },
  { id: 'user-1', name: 'Alex Johnson', isHost: false, isMuted: false },
  { id: 'user-2', name: 'Ben Carter', isHost: false, isMuted: false },
  { id: 'user-3', name: 'Chloe Davis', isHost: false, isMuted: false },
  { id: 'user-4', name: 'David Lee', isHost: false, isMuted: false },
];

const BrainIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.87 7.21a4.95 4.95 0 017.18 0M12 4.5v.01M16.95 7.21a4.95 4.95 0 010 7.07M4.87 16.79a4.95 4.95 0 010-7.07m12.08 0a4.95 4.95 0 017.18 0M9.5 9.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0zM12 21a9 9 0 100-18 9 9 0 000 18z" />
    </svg>
);


const VideoCall: React.FC = () => {
    const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
    const [spotlightedId, setSpotlightedId] = useState<string | null>(null);
    const [isCallActive, setIsCallActive] = useState(false);
    const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const cleanupStream = useRef<(() => void) | null>(null);

    const host = participants.find(p => p.isHost);

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = 'https://raw.githack.com/justadudewhohacks/face-api.js/master/weights';
            try {
                await faceapi.nets.tinyFaceDetector.load(MODEL_URL);
                setModelsLoaded(true);
                console.log("Face detection models loaded successfully.");
            } catch (e) {
                console.error("Failed to load face detection models:", e);
                setError("Could not load AI models. Please refresh the page.");
            }
        };
        loadModels();
    }, []);

    const startCamera = useCallback(async () => {
        if (!modelsLoaded) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 }, audio: false });
            setLocalStream(stream);
            setIsCallActive(true);
            setError(null);
            cleanupStream.current = () => {
                stream.getTracks().forEach(track => track.stop());
            };
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access the camera. Please check permissions and try again.");
            setIsCallActive(false);
        }
    }, [modelsLoaded]);

    useEffect(() => {
        return () => {
            if (cleanupStream.current) {
                cleanupStream.current();
            }
        };
    }, []);

    const handleToggleMute = (participantId: string) => {
        setParticipants(prev =>
            prev.map(p => p.id === participantId ? { ...p, isMuted: !p.isMuted } : p)
        );
    };

    const handleRemoveParticipant = (participantId: string) => {
        setParticipants(prev => prev.filter(p => p.id !== participantId));
        if (spotlightedId === participantId) {
            setSpotlightedId(null);
        }
    };

    const handleToggleSpotlight = (participantId: string) => {
        setSpotlightedId(prev => (prev === participantId ? null : participantId));
    };

    const handleToggleAnalysis = () => {
        setIsAnalysisRunning(prev => !prev);
    };

    if (!isCallActive) {
        return (
            <div className="flex flex-col items-center justify-center bg-gray-800 rounded-lg p-12 shadow-2xl">
                <h2 className="text-2xl font-semibold mb-4">Join the Virtual Classroom</h2>
                <p className="text-gray-400 mb-6 max-w-md text-center">Enable your camera to join the session and experience real-time engagement analysis.</p>
                {error && <p className="text-red-400 mb-4">{error}</p>}
                <button
                    onClick={startCamera}
                    disabled={!modelsLoaded}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100"
                >
                    {modelsLoaded ? 'Join Call' : 'Loading AI Models...'}
                </button>
            </div>
        );
    }
    
    const spotlightedParticipant = participants.find(p => p.id === spotlightedId);
    const galleryParticipants = participants.filter(p => p.id !== spotlightedId);

    const renderParticipant = (participant: Participant, index: number) => (
         <ParticipantView
            key={participant.id}
            participant={participant}
            stream={localStream}
            isAnalysisActive={isAnalysisRunning}
            staggerIndex={index}
            isHostView={!!host}
            isSpotlighted={participant.id === spotlightedId}
            onToggleMute={() => handleToggleMute(participant.id)}
            onRemove={() => handleRemoveParticipant(participant.id)}
            onToggleSpotlight={() => handleToggleSpotlight(participant.id)}
        />
    )

    return (
        <div className="w-full h-full flex flex-col">
             <div className="flex-grow p-4">
                {spotlightedParticipant ? (
                    <div className="w-full h-full flex flex-col md:flex-row gap-4">
                        <div className="flex-grow md:w-3/4 h-full">
                            {renderParticipant(spotlightedParticipant, 0)}
                        </div>
                        <div className="flex flex-row md:flex-col gap-4 overflow-auto md:w-1/4 h-full md:h-auto">
                           {galleryParticipants.map((p, index) => (
                                <div key={p.id} className="w-1/3 md:w-full flex-shrink-0">
                                    {renderParticipant(p, index + 1)}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {participants.map(renderParticipant)}
                    </div>
                )}
            </div>
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-10">
                <button
                    onClick={handleToggleAnalysis}
                    className={`flex items-center justify-center font-semibold py-3 px-6 rounded-lg transition-colors duration-300 ${isAnalysisRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white shadow-lg`}
                >
                    <BrainIcon />
                    {isAnalysisRunning ? 'Stop Emotion Analysis' : 'Start Emotion Analysis'}
                </button>
            </div>
        </div>
    );
};

export default VideoCall;