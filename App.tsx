
import React from 'react';
import VideoCall from './components/VideoCall';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4">
      <header className="w-full max-w-7xl mx-auto text-center mb-6">
        <h1 className="text-4xl font-bold text-white">E-Learning Emotion Analyzer</h1>
        <p className="text-lg text-gray-400 mt-2">AI-powered student engagement monitoring for virtual classrooms.</p>
      </header>
      <main className="w-full flex-grow">
        <VideoCall />
      </main>
      <footer className="w-full text-center p-4 mt-6 text-gray-500 text-sm">
        <p>This is a proof-of-concept application. Video streams are not transmitted to other users.</p>
      </footer>
    </div>
  );
};

export default App;
