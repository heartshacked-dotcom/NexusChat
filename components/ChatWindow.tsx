
import React, { useState, useRef, useEffect } from 'react';
import { Chat, Message, MessageType, MessageStatus, User, CallType } from '../types';
import { generateSmartReplies } from '../services/geminiService';

interface ChatWindowProps {
  chat: Chat | null;
  currentUser: User;
  partnerTyping: boolean;
  wallpaper: string;
  onSendMessage: (text: string, type: MessageType, mediaUrl?: string, replyToId?: string, pollOptions?: string[]) => void;
  onBack: () => void;
  onStartCall: (type: CallType) => void;
  onReact: (messageId: string, emoji: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onDelete: (messageId: string) => void;
  onForward: (message: Message) => void;
  onStar: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onMute: () => void;
  onArchive: () => void;
  onBlock: (userId: string) => void;
  onReport: (userId: string) => void;
  onViewImage: (url: string) => void;
  onVotePoll: (messageId: string, optionId: string) => void;
  onToggleEphemeral: () => void;
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];
const QUICK_EMOJIS = ["😀", "😂", "😍", "🥺", "😎", "🤔", "👍", "👎", "👋", "🎉", "🔥", "❤️"];
const STICKERS = [
  "https://cdn-icons-png.flaticon.com/512/742/742751.png",
  "https://cdn-icons-png.flaticon.com/512/742/742752.png",
  "https://cdn-icons-png.flaticon.com/512/742/742760.png",
  "https://cdn-icons-png.flaticon.com/512/10609/10609346.png", 
  "https://cdn-icons-png.flaticon.com/512/4762/4762232.png",
  "https://cdn-icons-png.flaticon.com/512/1236/1236123.png"
];

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  chat, 
  onSendMessage, 
  onBack,
  onStartCall, 
  onReact,
  onEdit,
  onDelete,
  onForward,
  onStar,
  onPin,
  onMute,
  onArchive,
  onBlock,
  onReport,
  onViewImage,
  onVotePoll,
  onToggleEphemeral,
  currentUser,
  partnerTyping,
  wallpaper
}) => {
  const [inputValue, setInputValue] = useState('');
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTab, setEmojiTab] = useState<'emoji' | 'sticker'>('emoji');
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Interactive States
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showReactionMenuId, setShowReactionMenuId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  // Feature States
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  
  // Poll Creator State
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<any>(null);
  const longPressTimerRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        // Close reaction menu if clicking anywhere else
        if (showReactionMenuId) {
            setShowReactionMenuId(null);
        }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showReactionMenuId]);

  useEffect(() => {
    scrollToBottom();
    setSmartReplies([]); 
    setSelectedMessageId(null);
    setShowContactInfo(false);
    setShowSearch(false);
    setSearchQuery('');
    setReplyingTo(null);
    setShowMediaGallery(false);
    setShowStarred(false);
    setShowEmojiPicker(false);
    setShowPollCreator(false);
    setShowReactionMenuId(null);
  }, [chat?.id]);

  useEffect(() => {
    if (!editingMessageId && !showSearch && !showMediaGallery && !showStarred && !showPollCreator) {
      scrollToBottom();
    }
  }, [chat?.messages, editingMessageId, partnerTyping]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue, MessageType.TEXT, undefined, replyingTo?.id);
      setInputValue('');
      setSmartReplies([]);
      setReplyingTo(null);
      setShowEmojiPicker(false);
    }
  };

  const handleCreatePoll = () => {
    const validOptions = pollOptions.filter(o => o.trim() !== '');
    if (pollQuestion.trim() && validOptions.length >= 2) {
      onSendMessage(pollQuestion, MessageType.POLL, undefined, replyingTo?.id, validOptions);
      setShowPollCreator(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setShowAttachments(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      let type = MessageType.DOCUMENT;
      if (file.type.startsWith('image/')) type = MessageType.IMAGE;
      if (file.type.startsWith('video/')) type = MessageType.VIDEO;
      if (file.type.startsWith('audio/')) type = MessageType.AUDIO;
      
      onSendMessage(file.name, type, url, replyingTo?.id);
      setShowAttachments(false);
      setReplyingTo(null);
    }
  };

  const triggerSmartReply = async () => {
    if (!chat) return;
    setLoadingAI(true);
    const suggestions = await generateSmartReplies(chat.messages);
    setSmartReplies(suggestions);
    setLoadingAI(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      setRecordingDuration(0);
      onSendMessage("Voice Message", MessageType.AUDIO, "mock_audio_blob", replyingTo?.id);
      setReplyingTo(null);
    } else {
      setIsRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    }
  };

  const startEditing = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
    setShowReactionMenuId(null);
    setSelectedMessageId(null);
  };

  const saveEdit = (msgId: string) => {
    if (editContent.trim()) {
      onEdit(msgId, editContent);
    }
    setEditingMessageId(null);
    setEditContent('');
  };

  const handlePressStart = (id: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setSelectedMessageId(prev => (prev === id ? null : id));
    }, 500); 
  };

  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!chat) return null; 

  const partner = chat.participants.find(p => p.id !== currentUser.id) || chat.participants[0];
  const pinnedMessage = chat.pinnedMessageId ? chat.messages.find(m => m.id === chat.pinnedMessageId) : null;
  const isBlocked = currentUser.blockedUsers.includes(partner.id);
  
  let displayedMessages = chat.messages;
  if (showSearch && searchQuery.trim()) {
      displayedMessages = chat.messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));
  } else if (showStarred) {
      displayedMessages = chat.messages.filter(m => m.isStarred);
  }

  const mediaMessages = chat.messages.filter(m => m.type === MessageType.IMAGE || m.type === MessageType.VIDEO);

  // Poll Creator Modal
  if (showPollCreator) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 dark:bg-black/50 backdrop-blur z-50 p-4">
        <div className="bg-white dark:bg-dark-panel w-full max-w-md rounded-2xl shadow-2xl p-6 animate-pop-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Poll</h3>
            <button onClick={() => setShowPollCreator(false)} className="text-gray-500 hover:text-gray-700">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="space-y-4">
             <div>
               <label className="block text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Question</label>
               <input 
                  autoFocus
                  type="text" 
                  value={pollQuestion} 
                  onChange={(e) => setPollQuestion(e.target.value)} 
                  placeholder="Ask a question..."
                  className="w-full bg-gray-50 dark:bg-dark-input rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-nexus-500 outline-none text-gray-900 dark:text-white"
               />
             </div>
             <div className="space-y-2">
               <label className="block text-sm font-semibold text-gray-500 dark:text-gray-400">Options</label>
               {pollOptions.map((opt, idx) => (
                 <input 
                   key={idx}
                   type="text" 
                   value={opt} 
                   onChange={(e) => {
                     const newOpts = [...pollOptions];
                     newOpts[idx] = e.target.value;
                     setPollOptions(newOpts);
                   }} 
                   placeholder={`Option ${idx + 1}`}
                   className="w-full bg-gray-50 dark:bg-dark-input rounded-xl px-4 py-2 border border-gray-200 dark:border-gray-700 focus:ring-1 focus:ring-nexus-500 outline-none text-gray-900 dark:text-white"
                 />
               ))}
               <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-nexus-600 text-sm font-semibold hover:underline">+ Add Option</button>
             </div>
             <button 
               onClick={handleCreatePoll}
               className="w-full py-3 bg-nexus-600 text-white rounded-xl font-bold shadow-lg hover:bg-nexus-700 transition"
             >
               Send Poll
             </button>
          </div>
        </div>
      </div>
    );
  }

  // Media Gallery Overlay
  if (showMediaGallery) {
      return (
          <div className="flex h-full bg-white dark:bg-dark-bg flex-col animate-fade-in absolute inset-0 z-50">
              <div className="h-16 shrink-0 flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
                  <button onClick={() => setShowMediaGallery(false)} className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                      <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Media Gallery</h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 md:grid-cols-4 gap-2">
                  {mediaMessages.map(m => (
                      <div key={m.id} className="aspect-square relative group cursor-pointer" onClick={() => m.mediaUrl && onViewImage(m.mediaUrl)}>
                          {m.type === MessageType.IMAGE && <img src={m.mediaUrl} className="w-full h-full object-cover rounded-lg" alt="" />}
                          {m.type === MessageType.VIDEO && <video src={m.mediaUrl} className="w-full h-full object-cover rounded-lg" />}
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-full bg-gray-100 dark:bg-dark-bg transition-colors relative overflow-hidden">
        <div className="flex-1 flex flex-col h-full min-w-0 relative">
        
        {/* Header - Fixed container that grows with content */}
        <div className="shrink-0 flex flex-col z-30 transition-all relative bg-white/80 dark:bg-dark-panel/80 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between px-4 sm:px-6 h-16 sm:h-20 border-b border-gray-200/50 dark:border-gray-700/50 relative z-20">
                <div className={`flex items-center justify-between w-full transition-opacity duration-200 ${showSearch ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <div className="flex items-center cursor-pointer flex-1 min-w-0" onClick={() => setShowContactInfo(true)}>
                            <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="md:hidden mr-2 text-gray-500 dark:text-gray-400 hover:text-nexus-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="relative group flex-shrink-0" onClick={(e) => { e.stopPropagation(); onViewImage(partner.avatar); }}>
                            <img src={partner.avatar} alt={partner.name} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm hover:opacity-90 transition" />
                            {partner.status === 'online' && (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full shadow-sm"></span>
                            )}
                            </div>
                            <div className="ml-3 overflow-hidden">
                            <h3 className="font-bold text-gray-900 dark:text-white leading-tight text-base sm:text-lg truncate flex items-center">
                                {partner.name}
                                {chat.muted && <svg className="w-4 h-4 ml-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>}
                                {chat.ephemeralMode && <svg className="w-4 h-4 ml-2 text-nexus-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
                                {isBlocked ? 'Blocked' : (partnerTyping ? <span className="text-nexus-500 animate-pulse font-semibold">Typing...</span> : partner.status === 'online' ? 'Online' : 'Offline')}
                            </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-1 sm:space-x-2 text-gray-600 dark:text-gray-300">
                            <button onClick={() => { setShowSearch(true); setShowStarred(false); }} className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition hover:text-nexus-600">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </button>
                            {!isBlocked && (
                              <>
                                <button onClick={() => onStartCall(CallType.AUDIO)} className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition hover:text-nexus-600 hidden sm:block">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                </button>
                                <button onClick={() => onStartCall(CallType.VIDEO)} className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition hover:text-nexus-600 hidden sm:block">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </button>
                              </>
                            )}
                            <button onClick={() => setShowContactInfo(!showContactInfo)} className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition hover:text-nexus-600">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                        </div>
                </div>

                {showSearch && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-dark-panel/95 z-50 flex items-center px-4 animate-fade-in backdrop-blur-sm">
                        <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-2 mr-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-700/50 rounded-xl px-4 py-2.5">
                            <input 
                                autoFocus
                                className="bg-transparent border-none focus:ring-0 text-base px-2 w-full text-gray-800 dark:text-white placeholder-gray-500 outline-none"
                                placeholder="Search messages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>
            {pinnedMessage && (
                <div onClick={() => document.getElementById(`msg-${pinnedMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="bg-gray-100/90 dark:bg-gray-800/90 backdrop-blur text-xs flex items-center justify-between px-4 py-2 cursor-pointer border-b border-gray-200 dark:border-gray-700 shadow-sm animate-fade-in z-10 relative">
                    <div className="flex items-center space-x-2 truncate">
                         <svg className="w-3.5 h-3.5 text-nexus-500 transform rotate-45" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/></svg>
                         <span className="font-bold text-nexus-600 dark:text-nexus-400">Pinned:</span>
                         <span className="truncate text-gray-600 dark:text-gray-300 max-w-[200px] sm:max-w-md">{pinnedMessage.type === MessageType.TEXT ? pinnedMessage.content : 'Media Attachment'}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onPin(pinnedMessage.id); }} className="text-gray-400 hover:text-gray-600 p-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 z-0 bg-cover bg-center relative scrollbar-hide" style={{ backgroundImage: `url(${wallpaper})` }}>
          <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/95 pointer-events-none z-0"></div>
          
          <div className="relative z-10 flex flex-col justify-end min-h-full">
              {displayedMessages.map((msg, index) => {
                const isMe = msg.senderId === currentUser.id;
                const isHovered = hoveredMessageId === msg.id;
                const isSelected = selectedMessageId === msg.id;
                const showMenu = showReactionMenuId === msg.id;
                const isEditing = editingMessageId === msg.id;
                const isDeleted = msg.isDeleted;
                
                const prevMsg = displayedMessages[index - 1];
                const nextMsg = displayedMessages[index + 1];
                const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;
                const bottomMargin = msg.reactions.length > 0 ? 'mb-8' : (isLastInGroup ? 'mb-4' : 'mb-1');

                return (
                  <div 
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${bottomMargin}`}
                  >
                    <div 
                      className="relative group flex flex-col max-w-[85%] md:max-w-[70%]"
                      onMouseEnter={() => setHoveredMessageId(msg.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      <div 
                        className={`relative px-4 py-2.5 shadow-sm transition-all duration-200 z-10
                        ${isMe ? 'bg-gradient-to-br from-nexus-500 to-nexus-600 text-white rounded-l-2xl rounded-tr-2xl rounded-br-md' : 'bg-white dark:bg-dark-panel text-gray-800 dark:text-gray-200 rounded-r-2xl rounded-tl-2xl rounded-bl-md'} 
                        ${isSelected ? 'ring-2 ring-nexus-400 dark:ring-nexus-500 ring-offset-2 ring-offset-transparent' : ''}`}
                        onMouseDown={() => !isDeleted && handlePressStart(msg.id)}
                        onMouseUp={handlePressEnd}
                        onTouchStart={() => !isDeleted && handlePressStart(msg.id)}
                        onTouchEnd={handlePressEnd}
                      >
                        {!isDeleted && msg.replyToId && (
                           <div className={`mb-2 text-xs border-l-2 pl-2 rounded-sm bg-black/5 dark:bg-white/5 p-1 ${isMe ? 'border-white/50 text-white/90' : 'border-nexus-500 text-gray-500 dark:text-gray-400'}`}>
                              <span className="font-bold opacity-80">Replied Message</span>
                              <div className="truncate opacity-70">Click to view...</div>
                           </div>
                        )}
                        
                        {!isDeleted && msg.forwarded && (
                           <div className="flex items-center text-xs italic opacity-70 mb-1">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                              Forwarded
                           </div>
                        )}

                        {isDeleted ? (
                            <div className="flex items-center space-x-2 italic opacity-60 text-sm py-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                <span>This message was deleted</span>
                            </div>
                        ) : (
                            <>
                                {msg.type === MessageType.POLL && msg.pollOptions && (
                                   <div className="min-w-[200px] space-y-3">
                                       <h4 className="font-bold text-lg mb-2">{msg.content}</h4>
                                       {msg.pollOptions.map(opt => {
                                           const totalVotes = msg.pollOptions!.reduce((acc, o) => acc + o.votes.length, 0);
                                           const percent = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);
                                           const userVoted = opt.votes.includes(currentUser.id);
                                           return (
                                               <div key={opt.id} onClick={() => !isBlocked && onVotePoll(msg.id, opt.id)} className={`cursor-pointer relative overflow-hidden rounded-lg bg-black/10 dark:bg-white/10 p-2 ${isBlocked ? 'opacity-50 pointer-events-none' : ''}`}>
                                                   <div className="absolute top-0 left-0 bottom-0 bg-nexus-400/30 dark:bg-nexus-400/50 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                                   <div className="relative flex justify-between items-center z-10 text-sm">
                                                       <span className="font-medium flex items-center">
                                                           {userVoted && <span className="mr-2 text-green-500">✓</span>}
                                                           {opt.text}
                                                       </span>
                                                       <span className="font-bold opacity-80">{percent}%</span>
                                                   </div>
                                               </div>
                                           );
                                       })}
                                       <p className="text-xs opacity-70 text-right">{msg.pollOptions.reduce((acc, o) => acc + o.votes.length, 0)} votes</p>
                                   </div>
                                )}
                                {msg.type === MessageType.IMAGE && msg.mediaUrl && (
                                  <div className="mb-1 rounded-lg overflow-hidden cursor-pointer" onClick={(e) => { e.stopPropagation(); msg.mediaUrl && onViewImage(msg.mediaUrl); }}>
                                    <img src={msg.mediaUrl} alt="Shared" className="w-full h-auto object-cover max-h-72 transition hover:scale-[1.01]" />
                                  </div>
                                )}
                                {msg.type === MessageType.TEXT && (
                                  isEditing ? (
                                    <div className="min-w-[220px]">
                                      <input 
                                        type="text" 
                                        value={editContent} 
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full bg-white/20 dark:bg-black/20 rounded px-2 py-1 text-inherit focus:outline-none focus:ring-1 focus:ring-white/50"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') saveEdit(msg.id);
                                          if (e.key === 'Escape') setEditingMessageId(null);
                                        }}
                                      />
                                      <div className="flex justify-end space-x-2 mt-2">
                                         <button onClick={() => setEditingMessageId(null)} className="text-xs opacity-80 hover:opacity-100 font-medium">Cancel</button>
                                         <button onClick={() => saveEdit(msg.id)} className="text-xs bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 font-bold transition">Save</button>
                                      </div>
                                    </div>
                                  ) : <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{msg.content}</p>
                                )}
                                {msg.type === MessageType.AUDIO && (
                                  <div className="flex items-center space-x-3 min-w-[220px] py-2">
                                     <button className={`p-2.5 rounded-full shadow-sm transition transform hover:scale-105 ${isMe ? 'bg-white text-nexus-600' : 'bg-nexus-500 text-white'}`}>
                                       <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                     </button>
                                     <div className="flex-1">
                                        <div className={`h-1 rounded-full overflow-hidden ${isMe ? 'bg-white/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                                           <div className={`w-1/3 h-full rounded-full ${isMe ? 'bg-white' : 'bg-nexus-500'}`}></div>
                                        </div>
                                        <span className="text-xs opacity-70 mt-1.5 block font-mono">0:24</span>
                                     </div>
                                  </div>
                                )}
                            </>
                        )}
                        
                        {/* Status, Time, and Ephemeral Indicator */}
                        <div className={`flex items-center justify-end space-x-1 mt-1 text-[10px] ${isMe ? 'text-blue-50/80' : 'text-gray-400 dark:text-gray-500'}`}>
                          {!isDeleted && msg.isStarred && <svg className="w-3 h-3 mr-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
                          {!isDeleted && msg.isEdited && <span className="italic mr-1">Edited</span>}
                          <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {chat.ephemeralMode && !isDeleted && (
                             <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          )}
                          {isMe && !isDeleted && (
                            <span className="ml-1">
                              {msg.status === MessageStatus.READ ? <span className="text-white font-bold">✓✓</span> : msg.status === MessageStatus.DELIVERED ? <span className="text-white/70">✓✓</span> : <span>✓</span>}
                            </span>
                          )}
                        </div>

                        {!isDeleted && msg.reactions.length > 0 && (
                           <div className={`absolute -bottom-6 ${isMe ? 'right-0' : 'left-0'} flex flex-wrap gap-1 bg-white dark:bg-gray-700 rounded-2xl px-2 py-1 shadow-md border border-gray-100 dark:border-gray-600 z-20 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition max-w-[90vw] w-max`}
                             onClick={(e) => { e.stopPropagation(); setShowReactionMenuId(showMenu ? null : msg.id); }}>
                             {msg.reactions.map((r, i) => (
                               <span key={i} className={`text-xs whitespace-nowrap ${r.userReacted ? 'bg-blue-100 dark:bg-blue-900/40 rounded px-1' : ''}`}>
                                 {r.emoji} <span className="text-[10px] font-bold ml-0.5">{r.count > 1 ? r.count : ''}</span>
                               </span>
                             ))}
                           </div>
                        )}

                        {/* Reaction Menu: Increased Z-Index to stay on top */}
                        {!isDeleted && showMenu && !isBlocked && (
                          <div className={`absolute bottom-full mb-2 ${isMe ? 'right-0' : 'left-0'} z-[100] bg-white dark:bg-gray-800 rounded-full shadow-glass border border-gray-200 dark:border-gray-600 p-1.5 flex items-center space-x-1 animate-pop-in origin-bottom`}>
                            {REACTION_EMOJIS.map(emoji => (
                               <button key={emoji} onClick={(e) => { e.stopPropagation(); onReact(msg.id, emoji); setShowReactionMenuId(null); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition hover:scale-125 text-xl leading-none">
                                 {emoji}
                               </button>
                            ))}
                         </div>
                        )}
                      </div>

                      {/* QUICK ACTIONS TOOLBAR */}
                      {/* Hide this when Reaction Menu (showMenu) is active to prevent overlap */}
                      {!isDeleted && !isBlocked && !showMenu && (
                          <div className={`
                              absolute -top-12 z-40 flex items-center bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-100 dark:border-gray-700 p-1 transition-all duration-200 animate-pop-in
                              ${isMe ? 'right-0' : 'left-0'}
                              ${isHovered || isSelected ? 'opacity-100 visible' : 'opacity-0 invisible'}
                              max-w-[280px] sm:max-w-none overflow-x-auto scrollbar-hide
                          `}>
                              <div className="flex items-center space-x-1 min-w-max px-1">
                                <button onClick={(e) => { e.stopPropagation(); setShowReactionMenuId(msg.id); }} className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:text-nexus-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition" title="React">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                                <button onClick={() => setReplyingTo(msg)} className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition" title="Reply">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                </button>
                                <button onClick={() => onForward(msg)} className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition" title="Forward">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </button>
                                <button onClick={() => onStar(msg.id)} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition ${msg.isStarred ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-300 hover:text-yellow-500'}`} title={msg.isStarred ? "Unstar" : "Star"}>
                                  <svg className="w-5 h-5" fill={msg.isStarred ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                </button>
                                <button onClick={() => onPin(msg.id)} className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:text-nexus-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition" title="Pin">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                </button>
                                {isMe && (
                                  <>
                                    {msg.type === MessageType.TEXT && (
                                      <button onClick={() => startEditing(msg)} className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:text-orange-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition" title="Edit">
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      </button>
                                    )}
                                    <button onClick={() => onDelete(msg.id)} className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition" title="Delete">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  </>
                                )}
                              </div>
                          </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {partnerTyping && (
                  <div className="flex justify-start mb-4 animate-fade-in">
                      <div className="bg-white dark:bg-dark-panel rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex space-x-1 items-center border border-gray-100 dark:border-gray-700/50">
                          <div className="w-2 h-2 bg-nexus-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-nexus-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-nexus-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                  </div>
              )}
              <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Floating Components - Attached to parent relative container */}
        {replyingTo && !isBlocked && (
           <div className="absolute bottom-20 left-4 right-4 z-20 mx-auto max-w-4xl">
               <div className="bg-white/95 dark:bg-dark-panel/95 backdrop-blur-md border-l-4 border-nexus-500 rounded-r-lg shadow-lg flex justify-between items-center p-3 animate-slide-in-right">
                   <div className="pl-2">
                       <p className="text-xs text-nexus-600 dark:text-nexus-400 font-bold mb-0.5 uppercase tracking-wide">Replying to {replyingTo.senderId === currentUser.id ? 'Yourself' : partner.name}</p>
                       <p className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs md:max-w-md">{replyingTo.content || (replyingTo.type !== 'text' ? 'Media Attachment' : '')}</p>
                   </div>
                   <button onClick={() => setReplyingTo(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
               </div>
           </div>
        )}

        {showAttachments && !isBlocked && (
          <div className="absolute bottom-24 left-6 flex flex-col space-y-3 z-30 animate-pop-in">
             {[
               { type: 'image', color: 'bg-gradient-to-tr from-purple-500 to-indigo-500', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
               { type: 'document', color: 'bg-gradient-to-tr from-blue-500 to-cyan-500', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
               { type: 'poll', color: 'bg-gradient-to-tr from-yellow-500 to-orange-500', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
               { type: 'schedule', color: 'bg-gradient-to-tr from-pink-500 to-rose-500', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
             ].map(item => (
               <button 
                 key={item.type} 
                 onClick={() => {
                   if (item.type === 'poll') { setShowPollCreator(true); setShowAttachments(false); }
                   else if (item.type === 'schedule') { alert("Schedule Message feature coming soon!"); setShowAttachments(false); }
                   else fileInputRef.current?.click();
                 }}
                 className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg text-white hover:scale-110 transition-transform ${item.color}`}
                 title={item.type}
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
               </button>
             ))}
          </div>
        )}

        {showEmojiPicker && !isBlocked && (
            <div className="absolute bottom-20 right-4 sm:right-auto sm:left-14 bg-white dark:bg-dark-panel border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl z-40 animate-pop-in w-72 h-80 flex flex-col overflow-hidden">
                <div className="flex border-b border-gray-100 dark:border-gray-700">
                    <button onClick={() => setEmojiTab('emoji')} className={`flex-1 py-2 text-sm font-semibold ${emojiTab === 'emoji' ? 'bg-gray-100 dark:bg-gray-700 text-nexus-600' : 'text-gray-500'}`}>Emojis</button>
                    <button onClick={() => setEmojiTab('sticker')} className={`flex-1 py-2 text-sm font-semibold ${emojiTab === 'sticker' ? 'bg-gray-100 dark:bg-gray-700 text-nexus-600' : 'text-gray-500'}`}>Stickers</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                  {emojiTab === 'emoji' ? (
                     <div className="grid grid-cols-6 gap-2">
                        {QUICK_EMOJIS.concat(["🥰","😊","🥳","😡","🤯","😱","🥶","😴","🙌","👏","🤝","💪","👀","🧠","💄","💍","🙉","🙊","👻","👽","🤖","💩"]).map(emoji => (
                            <button key={emoji} onClick={() => setInputValue(prev => prev + emoji)} className="text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1">
                                {emoji}
                            </button>
                        ))}
                     </div>
                  ) : (
                     <div className="grid grid-cols-3 gap-3">
                        {STICKERS.map((s, i) => (
                           <button key={i} onClick={() => { onSendMessage("Sticker", MessageType.IMAGE, s, replyingTo?.id); setShowEmojiPicker(false); }} className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg">
                              <img src={s} className="w-16 h-16 object-contain" alt="sticker" />
                           </button>
                        ))}
                     </div>
                  )}
                </div>
            </div>
        )}

        {smartReplies.length > 0 && !isBlocked && (
          <div className="absolute bottom-20 right-4 left-4 flex justify-end gap-2 overflow-x-auto z-10 scrollbar-hide py-2 pointer-events-none">
            {smartReplies.map((reply, idx) => (
              <button key={idx} onClick={() => { onSendMessage(reply, MessageType.TEXT, undefined, replyingTo?.id); setSmartReplies([]); setReplyingTo(null); }} className="pointer-events-auto bg-white/90 dark:bg-gray-700/90 backdrop-blur-md border border-nexus-200 dark:border-gray-600 text-nexus-700 dark:text-gray-100 px-4 py-2 rounded-full text-sm font-medium shadow-glass hover:bg-nexus-50 dark:hover:bg-gray-600 whitespace-nowrap transition-all transform hover:-translate-y-1">
                ✨ {reply}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="shrink-0 p-2 md:p-4 bg-transparent z-10">
          {isBlocked ? (
             <div className="max-w-4xl mx-auto bg-red-50 dark:bg-red-900/20 p-4 rounded-xl text-center shadow-sm border border-red-100 dark:border-red-900/30 transition-all">
                <span className="text-red-500 font-semibold mr-2">You have blocked this contact.</span>
                <button onClick={() => onBlock(partner.id)} className="px-3 py-1 bg-white dark:bg-red-800 text-red-500 dark:text-red-100 text-xs font-bold rounded-full border border-red-200 dark:border-red-700 shadow-sm hover:bg-red-50 dark:hover:bg-red-700 transition">Unblock</button>
             </div>
          ) : (
             <div className="max-w-4xl mx-auto flex items-center space-x-2 bg-white dark:bg-dark-panel p-2 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 transition-colors">
                <button onClick={() => setShowAttachments(!showAttachments)} className={`p-3 transition rounded-full flex-shrink-0 ${showAttachments ? 'bg-gray-100 dark:bg-gray-700 rotate-45 text-nexus-600' : 'text-gray-500 dark:text-gray-400 hover:text-nexus-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload}/>
                <div className="flex-1 py-2 flex items-center relative min-w-0">
                   <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-gray-400 hover:text-yellow-500 transition mr-2 flex-shrink-0">
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </button>
                  <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyPress} placeholder="Message..." className="flex-1 bg-transparent text-gray-800 dark:text-gray-100 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 max-h-24 min-w-0"/>
                  <button onClick={triggerSmartReply} disabled={loadingAI} className={`ml-2 p-1.5 rounded-full hover:bg-nexus-50 dark:hover:bg-gray-700 text-nexus-500 dark:text-nexus-400 transition flex-shrink-0 ${loadingAI ? 'animate-pulse' : ''}`} title="AI Suggest">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </button>
                </div>
                {inputValue.trim() ? (
                  <button onClick={handleSend} className="p-3 bg-nexus-600 text-white rounded-full shadow-lg shadow-nexus-500/30 hover:bg-nexus-700 transition-all transform active:scale-95 flex-shrink-0">
                    <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                ) : (
                  <button onMouseDown={toggleRecording} className={`p-3 rounded-full shadow-lg transition-all transform active:scale-110 flex-shrink-0 ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-red-500/30' : 'bg-nexus-600 text-white hover:bg-nexus-700 shadow-nexus-500/30'}`}>
                    {isRecording ? <span className="text-xs font-bold font-mono px-0.5">{formatDuration(recordingDuration)}</span> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
                  </button>
                )}
             </div>
          )}
        </div>
      </div>
      
      {showContactInfo && (
          <div className="w-80 bg-white dark:bg-dark-panel border-l border-gray-200 dark:border-gray-700 flex flex-col h-full animate-slide-in-right shadow-2xl z-40 absolute right-0 md:relative transition-colors">
              <div className="h-16 sm:h-20 shrink-0 flex items-center px-4 border-b border-gray-100 dark:border-gray-700">
                  <button onClick={() => setShowContactInfo(false)} className="mr-3 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">Contact Info</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                  <div className="text-center mb-6">
                      <div className="relative inline-block" onClick={() => onViewImage(partner.avatar)}>
                          <img src={partner.avatar} className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-gray-600 shadow-lg mx-auto cursor-pointer hover:opacity-90 transition" alt="" />
                          <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-4 border-white dark:border-dark-panel rounded-full"></div>
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-4">{partner.name}</h2>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">{partner.phoneNumber}</p>
                  </div>
                  <div className="space-y-6">
                      <div className="bg-gray-50 dark:bg-dark-input p-4 rounded-xl">
                          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">About</p>
                          <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{partner.bio || "Hey there! I am using NexusChat."}</p>
                      </div>
                      <div>
                           <div className="flex justify-between items-center mb-3">
                               <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Media</p>
                               <button onClick={() => setShowMediaGallery(true)} className="text-nexus-600 text-xs font-semibold hover:underline">See All</button>
                           </div>
                           <div className="grid grid-cols-3 gap-2">
                               {mediaMessages.slice(0, 6).map((m, i) => (
                                   <div key={i} onClick={() => m.mediaUrl && onViewImage(m.mediaUrl)} className="cursor-pointer">
                                        <img src={m.mediaUrl} className="w-full h-20 object-cover rounded-lg hover:opacity-80 transition" alt="media" />
                                   </div>
                               ))}
                               {mediaMessages.length === 0 && (
                                   <div className="col-span-3 text-center text-sm text-gray-400 py-6 bg-gray-50 dark:bg-dark-input rounded-xl border border-dashed border-gray-200 dark:border-gray-700">No media shared</div>
                               )}
                           </div>
                      </div>
                      <div className="space-y-2">
                          <button onClick={() => { setShowStarred(true); setShowContactInfo(false); }} className="flex items-center space-x-3 w-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 p-3 rounded-xl transition font-medium">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                              <span>Starred Messages</span>
                          </button>
                          <button onClick={onToggleEphemeral} className="flex items-center space-x-3 w-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 p-3 rounded-xl transition font-medium">
                              {chat.ephemeralMode ? (
                                  <svg className="w-5 h-5 text-nexus-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              ) : (
                                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              )}
                              <span>Disappearing Messages {chat.ephemeralMode ? '(ON)' : '(OFF)'}</span>
                          </button>
                          <button onClick={onMute} className="flex items-center space-x-3 w-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 p-3 rounded-xl transition font-medium">
                              {chat.muted ? (
                                  <svg className="w-5 h-5 text-nexus-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                              ) : (
                                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                              )}
                              <span>{chat.muted ? 'Unmute Notifications' : 'Mute Notifications'}</span>
                          </button>
                          <button onClick={onArchive} className="flex items-center space-x-3 w-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 p-3 rounded-xl transition font-medium">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                              <span>{chat.archived ? 'Unarchive Chat' : 'Archive Chat'}</span>
                          </button>
                      </div>
                      <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                          <button onClick={() => onBlock(partner.id)} className="flex items-center space-x-3 w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-3 rounded-xl transition font-medium">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                              <span>{isBlocked ? 'Unblock Contact' : 'Block Contact'}</span>
                          </button>
                          <button onClick={() => onReport(partner.id)} className="flex items-center space-x-3 w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-3 rounded-xl transition font-medium">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              <span>Report Contact</span>
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
