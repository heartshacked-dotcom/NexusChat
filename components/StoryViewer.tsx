
import React, { useEffect, useState } from 'react';
import { Story, User } from '../types';

interface StoryViewerProps {
  stories: Story[];
  initialStoryId: string;
  users: User[];
  onClose: () => void;
  onReply: (storyId: string, text: string) => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ stories, initialStoryId, users, onClose, onReply }) => {
  const [currentIndex, setCurrentIndex] = useState(stories.findIndex(s => s.id === initialStoryId));
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState('');

  const currentStory = stories[currentIndex];
  const user = users.find(u => u.id === currentStory.userId);

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(prevIndex => prevIndex + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 1; // Approx 5 seconds per story
      });
    }, 50); // Update every 50ms

    return () => clearInterval(interval);
  }, [currentIndex, stories.length, onClose]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const sendReply = () => {
    if (replyText.trim()) {
      onReply(currentStory.id, replyText);
      setReplyText('');
      onClose();
    }
  };

  if (!currentStory || !user) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-fade-in">
      {/* Mobile/Full Screen Container */}
      <div className="relative w-full h-full md:w-[450px] md:h-[92vh] bg-gray-900 md:rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Background Blur Effect for "Text" stories */}
        {currentStory.type === 'image' && (
           <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-xl scale-125" style={{ backgroundImage: `url(${currentStory.content})` }}></div>
        )}

        {/* Top Progress Bars */}
        <div className="absolute top-4 left-3 right-3 flex space-x-1.5 z-30">
          {stories.map((story, idx) => (
            <div key={story.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-white transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                 style={{ 
                   width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                 }}
               ></div>
            </div>
          ))}
        </div>

        {/* Header (User Info) */}
        <div className="absolute top-8 left-4 z-30 flex items-center space-x-3 pointer-events-auto">
           <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-md" alt="" />
           <div className="text-white drop-shadow-md">
             <h4 className="font-bold text-sm tracking-wide">{user.name}</h4>
             <p className="text-[11px] opacity-90 font-medium">{currentStory.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
           </div>
        </div>

        {/* Right Controls (Close + Mock Features) */}
        <div className="absolute top-8 right-4 z-30 flex flex-col space-y-4">
            <button onClick={onClose} className="text-white drop-shadow-md p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full transition">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            {/* Mock Feature Buttons */}
            <div className="flex flex-col space-y-4 pt-4 opacity-0 md:opacity-100 transition-opacity">
                <button className="p-2 text-white hover:text-cyan-400 transition" title="Stickers">😊</button>
                <button className="p-2 text-white hover:text-pink-400 transition" title="Filters">✨</button>
                <button className="p-2 text-white hover:text-yellow-400 transition" title="Music">🎵</button>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
             {/* Tap Zones */}
             <div className="absolute inset-0 z-20 flex">
                 <div className="w-1/3 h-full" onClick={handlePrev}></div>
                 <div className="w-2/3 h-full" onClick={handleNext}></div>
             </div>

             {/* Media */}
             {currentStory.type === 'image' && (
               <img src={currentStory.content} className="w-full h-full object-cover animate-pop-in" alt="Story" />
             )}
             {currentStory.type === 'video' && (
               <video src={currentStory.content} autoPlay className="w-full h-full object-cover" />
             )}
             {currentStory.type === 'text' && (
               <div className="w-full h-full flex items-center justify-center p-8 text-center animate-fade-in relative" style={{ backgroundColor: currentStory.background || '#6366f1' }}>
                 {/* Decorative Pattern */}
                 <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                 <p className="text-white text-3xl md:text-4xl font-bold font-serif leading-tight drop-shadow-lg z-10">{currentStory.content}</p>
               </div>
             )}
        </div>

        {/* Bottom Reply Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 z-30 bg-gradient-to-t from-black/80 to-transparent pt-12 flex items-center space-x-3">
          <input 
            type="text" 
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendReply()}
            placeholder="Reply to story..." 
            className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-3 text-white placeholder-white/70 focus:outline-none focus:bg-black/40 focus:border-white/50 transition shadow-lg"
          />
          <button 
             onClick={sendReply}
             className="p-3 bg-white text-emerald-600 rounded-full shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
             disabled={!replyText.trim()}
          >
             <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
          <button className="p-3 text-2xl hover:scale-125 transition">❤️</button>
          <button className="p-3 text-2xl hover:scale-125 transition">😂</button>
        </div>
      </div>
    </div>
  );
};
