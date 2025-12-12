
import React, { useState, useRef, useEffect } from 'react';
import { Chat, Message, MessageType, MessageStatus, User, CallType, AppTheme, PollOption } from '../types';
import { generateChatSummary } from '../services/geminiService';
import { socketService } from '../services/socketService';
import { apiService } from '../services/apiService';

interface ChatWindowProps {
  chat: Chat | null;
  currentUser: User;
  partnerTyping: boolean;
  wallpaper: string;
  appTheme: AppTheme;
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
  onToggleChatLock: () => void;
  onUpdateNote: (note: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  chat, currentUser, partnerTyping, wallpaper, appTheme,
  onSendMessage, onBack, onStartCall, onReact, onEdit, onDelete, onForward, onStar, onPin,
  onMute, onArchive, onBlock, onReport, onViewImage, onVotePoll, onToggleEphemeral,
  onToggleChatLock, onUpdateNote
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showAllMedia, setShowAllMedia] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [chatSummary, setChatSummary] = useState('');
  const [contactNote, setContactNote] = useState('');

  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  
  useEffect(() => { 
      if (!isSearching) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
      }
  }, [chat?.messages, partnerTyping, isSearching]);

  useEffect(() => {
      if (chat) setContactNote(chat.contactNotes || '');
      setReplyingTo(null);
      setEditingMessageId(null);
      setInputValue('');
      setIsSearching(false);
      setSearchTerm('');
      setShowAllMedia(false);
      setHoveredMessageId(null);
  }, [chat?.id]);

  // Handle Typing Indicator Emission
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);

    if (chat?.id) {
        socketService.sendTypingStart(chat.id);
        
        // Debounce sending "stop typing"
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socketService.sendTypingEnd(chat.id);
        }, 1500);
    }
  };

  const isPastel = appTheme === 'pastel';
  
  // Theme Classes - Same as before ...
  const getHeaderClass = () => {
     switch(appTheme) {
        case 'glass': return "bg-white/10 backdrop-blur-xl border-b border-white/10 shadow-glass";
        case 'amoled': return "bg-black/80 backdrop-blur-lg border-b border-gray-800";
        case 'pastel': return "bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-sm";
        case 'hybrid': return "bg-slate-900/60 backdrop-blur-2xl border-b border-white/5 shadow-hybrid";
        default: return "bg-white border-b border-gray-200";
     }
  };
  
  const getBubbleClass = (isMe: boolean) => {
     if (isMe) {
        switch(appTheme) {
            case 'glass': return "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-blue-500/20";
            case 'amoled': return "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md";
            case 'pastel': return "bg-indigo-500 text-white shadow-md shadow-indigo-200";
            case 'hybrid': return "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 border border-white/10";
            default: return "bg-blue-500 text-white";
        }
     } else {
        switch(appTheme) {
            case 'glass': return "bg-black/40 backdrop-blur-md text-white border border-white/10 shadow-glass-sm";
            case 'amoled': return "bg-gray-900 text-gray-100 border border-gray-800";
            case 'pastel': return "bg-white text-gray-800 shadow-sm border border-gray-100";
            case 'hybrid': return "bg-gradient-to-r from-purple-900/80 to-fuchsia-900/80 backdrop-blur-md text-white border border-white/5 shadow-hybrid";
            default: return "bg-white text-gray-800 shadow-sm";
        }
     }
  };

  const getInputClass = () => {
      switch(appTheme) {
          case 'glass': return "bg-black/30 backdrop-blur-xl border border-white/10 text-white placeholder-white/50";
          case 'amoled': return "bg-gray-900 border border-gray-800 text-white placeholder-gray-500";
          case 'pastel': return "bg-white border border-gray-200 text-gray-800 shadow-lg";
          case 'hybrid': return "bg-white/5 backdrop-blur-xl border border-white/10 text-white placeholder-white/30 shadow-inner";
          default: return "bg-white border border-gray-200";
      }
  };

  const getDrawerClass = () => {
      switch(appTheme) {
          case 'glass': return "bg-gray-900/95 backdrop-blur-xl border-l border-white/10 text-white shadow-2xl";
          case 'amoled': return "bg-black/95 border-l border-gray-800 text-white shadow-2xl";
          case 'pastel': return "bg-white/95 border-l border-gray-200 text-gray-800 shadow-2xl";
          case 'hybrid': return "bg-slate-900/95 backdrop-blur-2xl border-l border-white/5 text-white shadow-2xl";
          default: return "bg-white text-gray-800";
      }
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

  const formatMessageDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, today)) return "Today";
    if (isSameDay(date, yesterday)) return "Yesterday";
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  if (!chat) return <div className={`flex-1 flex items-center justify-center ${isPastel ? 'text-gray-400' : 'text-gray-600'}`}><p>Select a chat to start messaging</p></div>;

  const partner = chat.participants.find(p => p.id !== currentUser.id) || chat.participants[0] || { name: 'User', avatar: '', id: 'unknown', status: 'offline' } as User;
  const pinnedMessage = chat.pinnedMessageId ? chat.messages.find(m => m.id === chat.pinnedMessageId) : null;
  const isBlocked = currentUser.blockedUsers.includes(partner.id);

  // Search Logic
  const filteredMessages = searchTerm ? chat.messages.filter(m => m.content.toLowerCase().includes(searchTerm.toLowerCase())) : [];
  
  // Handlers
  const handleSendText = () => {
      if (!inputValue.trim()) return;
      if (editingMessageId) {
          onEdit(editingMessageId, inputValue);
          setEditingMessageId(null);
      } else {
          onSendMessage(inputValue, MessageType.TEXT, undefined, replyingTo?.id);
      }
      setInputValue('');
      setReplyingTo(null);
  };

  const handleCreatePoll = () => {
      const validOptions = pollOptions.filter(o => o.trim().length > 0);
      if (pollQuestion.trim() && validOptions.length >= 2) {
          onSendMessage(pollQuestion, MessageType.POLL, undefined, undefined, validOptions);
          setShowPollCreator(false);
          setPollQuestion('');
          setPollOptions(['', '']);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setIsUploading(true);
          
          try {
              // Use API Service to get presigned URL and upload to R2
              const uploadedUrl = await apiService.uploadFile(currentUser.id, file);
              
              if (uploadedUrl) {
                  const type = file.type.startsWith('video') ? MessageType.VIDEO : file.type.startsWith('audio') ? MessageType.AUDIO : MessageType.IMAGE;
                  onSendMessage("Sent a file", type, uploadedUrl);
              } else {
                  alert("Upload failed. Please try again.");
              }
          } catch (err) {
              console.error(err);
              alert("Error uploading file.");
          } finally {
              setIsUploading(false);
              setShowAttachMenu(false);
          }
      }
  };

  const handleGenerateSummary = async () => {
      setSummaryLoading(true);
      const summary = await generateChatSummary(chat.messages);
      setChatSummary(summary);
      setSummaryLoading(false);
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? <span key={i} className="bg-yellow-400 text-black px-0.5 rounded">{part}</span> : part
    );
  };

  const renderQuickActions = (msg: Message, isMe: boolean) => (
      <div 
        className={`absolute -top-10 ${isMe ? 'right-0' : 'left-0'} flex items-center space-x-1 p-1.5 rounded-full shadow-xl z-50 transition-all duration-200 animate-pop-in ${appTheme === 'pastel' ? 'bg-white text-gray-600' : 'bg-gray-800 text-gray-200 border border-white/10'}`}
        onClick={(e) => e.stopPropagation()}
      >
          <button onClick={(e) => { e.stopPropagation(); onReact(msg.id, '❤️'); setHoveredMessageId(null); }} className="hover:scale-125 transition p-1">❤️</button>
          <button onClick={(e) => { e.stopPropagation(); onReact(msg.id, '😂'); setHoveredMessageId(null); }} className="hover:scale-125 transition p-1">😂</button>
          <button onClick={(e) => { e.stopPropagation(); onReact(msg.id, '👍'); setHoveredMessageId(null); }} className="hover:scale-125 transition p-1">👍</button>
          <div className="w-px h-4 bg-gray-500/30 mx-1"></div>
          <button onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setHoveredMessageId(null); }} className="hover:text-cyan-400 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>
          <button onClick={(e) => { e.stopPropagation(); onPin(msg.id); setHoveredMessageId(null); }} className="hover:text-yellow-400 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg></button>
          {isMe && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setEditingMessageId(msg.id); setInputValue(msg.content); setHoveredMessageId(null); }} className="hover:text-green-400 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(msg.id); setHoveredMessageId(null); }} className="hover:text-red-400 p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </>
          )}
      </div>
  );

  return (
    <div className="flex h-full relative overflow-hidden bg-gray-900">
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative h-full w-full">
            {/* Background */}
            <div className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700" 
                style={{ 
                    backgroundImage: `url(${wallpaper})`,
                    filter: appTheme === 'glass' ? 'blur(0px)' : appTheme === 'hybrid' ? 'blur(10px) brightness(0.7)' : 'none'
                }}>
            </div>
            
            {/* Theme Overlay */}
            <div className={`absolute inset-0 z-0 pointer-events-none transition-all duration-700 ${
                appTheme === 'glass' ? 'bg-black/40' : 
                appTheme === 'amoled' ? 'bg-black/90' : 
                appTheme === 'hybrid' ? 'bg-slate-900/50' :
                'bg-white/60'
            }`}></div>

            {/* Floating Header (or Search Bar) */}
            <div className={`shrink-0 z-40 px-6 py-3 flex justify-between items-center transition-all duration-300 ${getHeaderClass()} m-4 rounded-[24px]`}>
                {isSearching ? (
                   <div className="flex-1 flex items-center space-x-3 w-full">
                       <button onClick={() => { setIsSearching(false); setSearchTerm(''); }} className="p-2 rounded-full hover:bg-black/10 text-gray-500">
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                       </button>
                       <div className="flex-1 relative">
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Search in chat..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full bg-transparent border-none outline-none text-lg ${isPastel ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-gray-500'}`}
                            />
                       </div>
                       <div className={`text-sm ${isPastel ? 'text-gray-500' : 'text-gray-400'}`}>
                           {searchTerm ? `${filteredMessages.length} matches` : ''}
                       </div>
                   </div>
                ) : (
                    <>
                        <div className="flex items-center space-x-4 cursor-pointer flex-1 min-w-0" onClick={() => setShowContactInfo(!showContactInfo)}>
                            <button onClick={(e) => { e.stopPropagation(); onBack(); }} className={`md:hidden p-2 rounded-full transition ${isPastel ? 'hover:bg-gray-100' : 'hover:bg-white/10 text-white'}`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div className="relative group shrink-0">
                                <img src={partner.avatar} className={`w-14 h-14 rounded-full object-cover transition-transform group-hover:scale-105 ${appTheme === 'glass' ? 'ring-2 ring-white/30' : ''}`} alt="" />
                                {partner.status === 'online' && (
                                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-black flex items-center justify-center">
                                        <div className="w-full h-full rounded-full bg-emerald-500 animate-ping opacity-75 absolute"></div>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <h2 className={`text-xl font-bold leading-none truncate ${isPastel ? 'text-gray-900' : 'text-white'}`}>{partner.name} {chat.folder === 'locked' && '🔒'}</h2>
                                <div className={`text-xs font-medium mt-1 flex items-center ${isPastel ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {partnerTyping ? (
                                        <span className="text-emerald-400 animate-pulse">Typing...</span>
                                    ) : (
                                        partner.status === 'online' ? <span className="text-emerald-500">Online</span> : <span>Last seen recently</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex space-x-1">
                            <button onClick={() => setIsSearching(true)} className={`p-3 rounded-full transition ${isPastel ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button>
                            <button onClick={() => onStartCall(CallType.AUDIO)} className={`p-3 rounded-full transition ${isPastel ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg></button>
                            <button onClick={() => onStartCall(CallType.VIDEO)} className={`p-3 rounded-full transition ${isPastel ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                        </div>
                    </>
                )}
            </div>

            {/* Pinned Message Banner */}
            {pinnedMessage && !isSearching && (
                <div className={`mx-4 mb-2 shrink-0 z-20 flex items-center p-2 rounded-xl shadow-lg cursor-pointer animate-slide-up ${appTheme === 'pastel' ? 'bg-white/90 text-gray-800' : 'bg-gray-800/90 text-white backdrop-blur-md border border-white/10'}`}>
                    <div className="pl-2 border-l-4 border-emerald-500 mr-3">
                        <p className="text-xs font-bold text-emerald-500">Pinned Message</p>
                        <p className="text-xs truncate max-w-[200px]">{pinnedMessage.type === MessageType.IMAGE ? '📷 Photo' : pinnedMessage.content}</p>
                    </div>
                    <div className="flex-1"></div>
                    <button onClick={() => onPin(pinnedMessage.id)} className="p-2 hover:bg-black/10 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 z-10 scrollbar-hide space-y-4 pb-4 w-full box-border" onClick={() => { setShowAttachMenu(false); setHoveredMessageId(null); }}>
                {chat.messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser.id;
                    const isHovered = hoveredMessageId === msg.id;
                    const showTail = !chat.messages[idx + 1] || chat.messages[idx + 1].senderId !== msg.senderId;
                    const isNewDay = idx === 0 || !isSameDay(msg.timestamp, chat.messages[idx - 1].timestamp);
                    
                    const repliedMsg = msg.replyToId ? chat.messages.find(m => m.id === msg.replyToId) : null;
                    const repliedSender = repliedMsg ? (repliedMsg.senderId === currentUser.id ? 'You' : (chat.participants.find(p => p.id === repliedMsg.senderId)?.name || 'User')) : 'Unknown';

                    if (searchTerm && !msg.content.toLowerCase().includes(searchTerm.toLowerCase())) {
                        return null; // Simple filter for visual clarity
                    }

                    if (msg.isDeleted) {
                        return (
                            <React.Fragment key={msg.id}>
                                {isNewDay && (
                                    <div className="flex justify-center my-6">
                                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full shadow-sm ${isPastel ? 'bg-white/80 text-gray-500' : 'bg-black/30 text-gray-400 border border-white/5 backdrop-blur-sm'}`}>
                                            {formatMessageDate(msg.timestamp)}
                                        </span>
                                    </div>
                                )}
                                <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                    <div className={`px-4 py-2 rounded-full border ${isPastel ? 'border-gray-200 text-gray-400' : 'border-white/10 text-gray-500'} text-xs italic flex items-center space-x-2`}>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                        <span>Message deleted</span>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    }

                    return (
                        <React.Fragment key={msg.id}>
                            {isNewDay && (
                                <div className="flex justify-center my-6">
                                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full shadow-sm ${isPastel ? 'bg-white/80 text-gray-500' : 'bg-black/30 text-gray-400 border border-white/5 backdrop-blur-sm'}`}>
                                        {formatMessageDate(msg.timestamp)}
                                    </span>
                                </div>
                            )}
                            <div 
                                className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} group relative mb-2 select-none md:select-text`}
                                onMouseEnter={() => setHoveredMessageId(msg.id)}
                                onMouseLeave={() => setHoveredMessageId(null)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setHoveredMessageId(prev => prev === msg.id ? null : msg.id);
                                }}
                            >
                                {(isHovered || showTail) && (
                                    <div className={`absolute top-0 ${isMe ? 'right-0' : 'left-0'} w-full h-full pointer-events-none`}>
                                        {isHovered && <div className="pointer-events-auto">{renderQuickActions(msg, isMe)}</div>}
                                    </div>
                                )}

                                <div className={`max-w-[85%] md:max-w-[65%] relative transition-transform duration-200 ${isHovered ? 'scale-[1.01]' : ''}`}>
                                    {repliedMsg && (
                                        <div className={`text-xs mb-1 px-3 py-1.5 rounded-lg bg-black/10 dark:bg-black/20 border-l-2 border-emerald-400 mb-1 flex flex-col`}>
                                            <span className={`font-bold ${isMe ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>{repliedSender}</span>
                                            <span className="truncate opacity-80">{repliedMsg.type === MessageType.IMAGE ? '📷 Photo' : repliedMsg.content}</span>
                                        </div>
                                    )}

                                    <div className={`px-5 py-3 ${getBubbleClass(isMe)} rounded-[26px] ${isMe ? (showTail ? 'rounded-tr-sm' : '') : (showTail ? 'rounded-tl-sm' : '')} relative`}>
                                        {msg.type === MessageType.IMAGE && (
                                            <img 
                                                src={msg.mediaUrl} 
                                                className="rounded-2xl mb-2 max-h-72 w-full object-cover cursor-pointer hover:opacity-90 transition" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onViewImage(msg.mediaUrl!);
                                                }} 
                                                alt="attachment" 
                                            />
                                        )}

                                        {msg.type === MessageType.POLL && msg.pollOptions && (
                                            <div className="min-w-[240px]">
                                                <p className="font-bold text-lg mb-3">{msg.content}</p>
                                                <div className="space-y-2">
                                                    {msg.pollOptions.map(opt => {
                                                        const totalVotes = msg.pollOptions!.reduce((acc, curr) => acc + curr.votes.length, 0);
                                                        const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);
                                                        const hasVoted = opt.votes.includes(currentUser.id);
                                                        return (
                                                            <div key={opt.id} onClick={() => onVotePoll(msg.id, opt.id)} className="cursor-pointer">
                                                                <div className="flex justify-between text-xs mb-1 font-medium opacity-90">
                                                                    <span>{opt.text}</span>
                                                                    <span>{percentage}%</span>
                                                                </div>
                                                                <div className={`h-2.5 w-full rounded-full bg-black/20 overflow-hidden`}>
                                                                    <div className={`h-full transition-all duration-500 ${hasVoted ? 'bg-white' : 'bg-white/50'}`} style={{ width: `${percentage}%` }}></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {(msg.type === MessageType.TEXT || !msg.type) && (
                                            <p className="text-[15.5px] leading-relaxed whitespace-pre-wrap">
                                                {searchTerm ? highlightText(msg.content, searchTerm) : msg.content}
                                            </p>
                                        )}

                                        <div className={`text-[10px] mt-1.5 flex items-center justify-end space-x-1.5 ${isMe ? 'text-white/80' : 'opacity-60'}`}>
                                        {msg.isEdited && <span>(edited)</span>}
                                        {msg.isStarred && <span>★</span>}
                                        <span>{msg.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                        {isMe && (
                                            <span className={msg.status === MessageStatus.READ ? 'text-blue-200' : ''}>
                                                {msg.status === MessageStatus.READ ? 
                                                    <div className="flex -space-x-1">
                                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                                    </div>
                                                    : msg.status === MessageStatus.DELIVERED ?
                                                    <div className="flex -space-x-1 opacity-70">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    </div>
                                                    :
                                                    <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                }
                                            </span>
                                        )}
                                        </div>
                                    </div>
                                    {msg.reactions.length > 0 && (
                                        <div className={`absolute -bottom-3 ${isMe ? 'right-4' : 'left-4'} flex items-center -space-x-1 bg-white dark:bg-gray-800 rounded-full px-2 py-0.5 shadow-md border border-gray-100 dark:border-gray-700`}>
                                            {msg.reactions.slice(0, 3).map((r, i) => <span key={i} className="text-xs">{r.emoji}</span>)}
                                            {msg.reactions.reduce((a, b) => a + b.count, 0) > 1 && <span className="text-[10px] font-bold text-gray-500 pl-1">{msg.reactions.reduce((a, b) => a + b.count, 0)}</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Replying Preview Banner */}
            {replyingTo && (
                <div className={`mx-4 mb-2 p-3 rounded-xl flex justify-between items-center animate-slide-up z-20 ${isPastel ? 'bg-white shadow-lg' : 'bg-gray-800/90 border border-gray-700'}`}>
                    <div className="flex-1 border-l-4 border-emerald-500 pl-3">
                        <p className={`text-xs font-bold ${isPastel ? 'text-emerald-600' : 'text-emerald-400'}`}>Replying to {replyingTo.senderId === currentUser.id ? 'yourself' : (partner?.name || 'User')}</p>
                        <p className={`text-sm truncate ${isPastel ? 'text-gray-600' : 'text-gray-300'}`}>{replyingTo.type === MessageType.IMAGE ? '📷 Image' : replyingTo.content}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="p-2"><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            )}

            {/* Input Area */}
            {isBlocked ? (
                <div className="p-4 bg-gray-900 text-center text-gray-400 text-sm">You have blocked this contact. Unblock to send messages.</div>
            ) : (
                <div className="p-2 md:p-4 z-20 shrink-0 pb-safe">
                    {/* ... Poll Creator Logic (omitted for brevity, assume unchanged) ... */}
                    {showPollCreator && (
                        <div className={`mb-4 p-4 rounded-2xl animate-slide-up ${isPastel ? 'bg-white shadow-xl' : 'bg-gray-800 border border-gray-700'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`font-bold ${isPastel ? 'text-gray-800' : 'text-white'}`}>Create Poll</h3>
                                <button onClick={() => setShowPollCreator(false)}><svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                            </div>
                            <input className="w-full mb-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-emerald-500 outline-none" placeholder="Ask a question..." value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} />
                            {pollOptions.map((opt, i) => (
                                <input key={i} className="w-full mb-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 outline-none text-sm" placeholder={`Option ${i+1}`} value={opt} onChange={e => {
                                    const newOpts = [...pollOptions];
                                    newOpts[i] = e.target.value;
                                    if (i === newOpts.length - 1 && e.target.value) newOpts.push('');
                                    setPollOptions(newOpts);
                                }} />
                            ))}
                            <button onClick={handleCreatePoll} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold mt-2">Send Poll</button>
                        </div>
                    )}

                    <div className={`flex items-end space-x-2 p-1.5 rounded-[26px] shadow-2xl transition-all ${getInputClass()}`}>
                        <div className="flex items-center pb-1 pl-2">
                            <button onClick={() => setShowAttachMenu(!showAttachMenu)} className={`p-2 rounded-full transition ${isPastel ? 'hover:bg-gray-100 text-gray-400' : 'hover:bg-white/10 text-gray-400'}`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </button>
                            {showAttachMenu && (
                                <div className={`absolute bottom-20 left-6 p-2 rounded-2xl shadow-xl flex flex-col space-y-2 animate-pop-in z-50 ${isPastel ? 'bg-white' : 'bg-gray-800 border border-gray-700'}`}>
                                    <button onClick={() => setShowPollCreator(true)} className="flex items-center space-x-3 p-2 hover:bg-black/5 rounded-xl text-left">
                                        <span className="p-2 bg-yellow-500 rounded-full text-white">📊</span>
                                        <span className={isPastel ? 'text-gray-700' : 'text-white'}>Poll</span>
                                    </button>
                                    <label className="flex items-center space-x-3 p-2 hover:bg-black/5 rounded-xl cursor-pointer">
                                        <span className="p-2 bg-blue-500 rounded-full text-white">📷</span>
                                        <span className={isPastel ? 'text-gray-700' : 'text-white'}>Photo & Video</span>
                                        <input type="file" hidden ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" />
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Input Field Wrapper */}
                        <div className="flex-1 min-w-0 py-3 relative">
                            {isUploading && (
                                <div className="absolute inset-0 flex items-center px-2">
                                    <span className="text-emerald-500 text-sm animate-pulse">Uploading...</span>
                                </div>
                            )}
                            <textarea 
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendText();
                                    }
                                }}
                                placeholder={isUploading ? "" : (editingMessageId ? "Edit message..." : "Message...")}
                                rows={1}
                                className={`w-full bg-transparent border-none focus:ring-0 outline-none resize-none max-h-32 text-[16px] leading-6 ${isUploading ? 'opacity-0' : 'opacity-100'}`}
                                style={{ minHeight: '24px' }}
                                disabled={isUploading}
                            />
                        </div>

                        <div className="pr-1 pb-1">
                            {inputValue.trim() ? (
                                <button onClick={handleSendText} className={`p-3 rounded-full text-white shadow-lg transform transition active:scale-95 bg-gradient-to-r from-emerald-500 to-cyan-500`}>
                                    <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                </button>
                            ) : (
                                <button className={`p-3 rounded-full transition ${isPastel ? 'hover:bg-gray-100 text-gray-400' : 'hover:bg-white/10 text-gray-400'}`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* ... (Drawer & other elements remain unchanged) ... */}
        {showContactInfo && (
            <div className={`fixed inset-0 z-50 md:static md:w-96 md:shrink-0 md:border-l overflow-y-auto animate-slide-in-right ${getDrawerClass()}`}>
                {/* ... existing Drawer code ... */}
                <div className="relative mb-14">
                    <div className="h-32 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-b-[2rem] shadow-lg">
                        <button onClick={() => setShowContactInfo(false)} className="absolute top-4 left-4 p-2 bg-black/20 text-white rounded-full hover:bg-black/40 transition">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-purple-500 rounded-full blur opacity-75 group-hover:opacity-100 transition"></div>
                            <img src={partner.avatar} className="relative w-28 h-28 rounded-full border-4 border-gray-900 object-cover shadow-2xl" alt="" />
                            {partner.status === 'online' && (
                                <div className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-6 text-center mb-6">
                    <h2 className={`text-2xl font-bold ${isPastel ? 'text-gray-900' : 'text-white'}`}>{partner.name}</h2>
                    <p className={`text-sm mt-1 ${isPastel ? 'text-gray-500' : 'text-gray-400'}`}>{partner.bio || "No bio available"}</p>
                    <p className={`text-xs mt-1 font-medium ${isPastel ? 'text-gray-400' : 'text-gray-500'}`}>{partner.phoneNumber}</p>
                </div>
                {/* ... rest of drawer content ... */}
            </div>
        )}

        {showAllMedia && (
            <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col animate-fade-in">
                 {/* ... existing media gallery code ... */}
                <div className="p-4 flex justify-between items-center bg-black/50 backdrop-blur-xl border-b border-white/10">
                     <h3 className="text-white font-bold text-lg">Media Gallery</h3>
                     <button onClick={() => setShowAllMedia(false)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-2 align-start content-start">
                    {chat.messages.filter(m => m.type === MessageType.IMAGE || m.type === MessageType.VIDEO).map(m => (
                        <div key={m.id} className="aspect-square relative cursor-pointer group rounded-lg overflow-hidden border border-white/10" onClick={() => onViewImage(m.mediaUrl!)}>
                            {m.type === MessageType.IMAGE ? (
                                <img src={m.mediaUrl} className="w-full h-full object-cover transition duration-300 group-hover:scale-110" alt="" />
                            ) : (
                                <video src={m.mediaUrl} className="w-full h-full object-cover" />
                            )}
                            {/* ... */}
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};
