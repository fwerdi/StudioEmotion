import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Participant } from '../types';
import ParticipantView from './ParticipantView';

const MOCK_PARTICIPANTS: Participant[] = [
  { id: 'user-host', name: 'Dr. Anya Sharma (Host)', isHost: true },
  { id: 'user-1', name: 'Alex Johnson', isHost: false },
  { id: 'user-2', name: 'Ben Carter', isHost: false },
  { id: 'user-3', name: 'Chloe Davis', isHost: false },
  { id: 'user-4', name: 'David Lee', isHost: false },
];

const BrainIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.87 7.21a4.95 4.95 0 017.18 0M12 4.5v.01M16.95 7.21a4.95 4.95 0 010 7.07M4.87 16.79a4.95 4.95 0 010-7.07m12.08 0a4.95 4.95 0 017.18 0M9.5 9.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0zM12 21a9 9 0 100-18 9 9 0 000 18z" />
    </svg>
);


const VideoCall: React.FC = () => {
    const [isCallActive, setIsCallActive] = useState(false);
    const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    // FIX: Initialize useRef with null to resolve "Expected 1 arguments, but got 0" error.
    const cleanupStream = useRef<(() => void) | null>(null);

    const startCamera = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        return () => {
            if (cleanupStream.current) {
                cleanupStream.current();
            }
        };
    }, []);


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
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105"
                >
                    Join Call
                </button>
            </div>
        );
    }
    
    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {MOCK_PARTICIPANTS.map(participant => (
                    <ParticipantView
                        key={participant.id}
                        participant={participant}
                        stream={localStream}
                        isAnalysisActive={isAnalysisRunning}
                    />
                ))}
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