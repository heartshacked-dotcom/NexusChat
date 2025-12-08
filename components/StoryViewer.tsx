
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
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="relative w-full h-full md:w-[400px] md:h-[90vh] bg-gray-900 md:rounded-lg overflow-hidden shadow-2xl">
        {/* Progress Bars */}
        <div className="absolute top-4 left-2 right-2 flex space-x-1 z-20">
          {stories.map((story, idx) => (
            <div key={story.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-white transition-all duration-100 ease-linear"
                 style={{ 
                   width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                 }}
               ></div>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-4 z-20 flex items-center space-x-2">
           <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-white" alt="" />
           <div className="text-white drop-shadow-md">
             <h4 className="font-bold text-sm">{user.name}</h4>
             <p className="text-xs opacity-80">{currentStory.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
           </div>
        </div>

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-8 right-4 z-20 text-white drop-shadow-md p-2 hover:bg-white/10 rounded-full">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Content */}
        <div className="w-full h-full flex items-center justify-center bg-black" onClick={(e) => {
            const width = e.currentTarget.offsetWidth;
            const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
            if (x < width / 2) handlePrev();
            else handleNext();
        }}>
           {currentStory.type === 'image' && (
             <img src={currentStory.content} className="w-full h-full object-cover" alt="Story" />
           )}
           {currentStory.type === 'video' && (
             <video src={currentStory.content} autoPlay className="w-full h-full object-cover" />
           )}
           {currentStory.type === 'text' && (
             <div className="w-full h-full flex items-center justify-center p-8 text-center" style={{ backgroundColor: currentStory.background }}>
               <p className="text-white text-3xl font-bold font-serif">{currentStory.content}</p>
             </div>
           )}
        </div>

        {/* Reply Area */}
        <div className="absolute bottom-4 left-0 right-0 px-4 z-20 flex items-center space-x-2">
          <input 
            type="text" 
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendReply()}
            placeholder="Reply..." 
            className="flex-1 bg-black/40 backdrop-blur-sm border border-white/30 rounded-full px-4 py-3 text-white placeholder-white/70 focus:outline-none focus:bg-black/60 focus:border-white/60 transition"
          />
          <button 
             onClick={sendReply}
             className="p-3 bg-nexus-600 rounded-full text-white shadow-lg hover:bg-nexus-500 transition-transform transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
             disabled={!replyText.trim()}
          >
             <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};
