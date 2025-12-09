
import React, { useState, useRef, useEffect } from 'react';
import { Chat, Message, MessageType, MessageStatus, User, CallType, AppTheme } from '../types';

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
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  chat, currentUser, partnerTyping, wallpaper, appTheme,
  onSendMessage, onBack, onStartCall, onReact, onEdit, onDelete, onForward, onStar, onPin,
  onMute, onArchive, onBlock, onReport, onViewImage, onVotePoll, onToggleEphemeral
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat?.messages]);

  const isPastel = appTheme === 'pastel';
  
  // Dynamic Theme Classes
  const getHeaderClass = () => {
     switch(appTheme) {
        case 'glass': return "bg-white/10 backdrop-blur-md border-b border-white/10";
        case 'amoled': return "bg-black border-b border-gray-800";
        case 'pastel': return "bg-white border-b border-gray-100 shadow-sm";
        default: return "bg-white border-b border-gray-200";
     }
  };
  
  const getBubbleClass = (isMe: boolean) => {
     if (isMe) {
        switch(appTheme) {
            case 'glass': return "bg-gradient-to-br from-cyan-500/80 to-blue-600/80 backdrop-blur-sm text-white shadow-neon";
            case 'amoled': return "bg-emerald-600 text-white";
            case 'pastel': return "bg-purple-100 text-purple-900";
            default: return "bg-blue-500 text-white";
        }
     } else {
        switch(appTheme) {
            case 'glass': return "bg-black/40 backdrop-blur-sm text-white border border-white/10";
            case 'amoled': return "bg-gray-900 text-gray-100";
            case 'pastel': return "bg-white text-gray-800 shadow-sm";
            default: return "bg-white text-gray-800 shadow-sm";
        }
     }
  };

  const getInputClass = () => {
      switch(appTheme) {
          case 'glass': return "bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-white/50";
          case 'amoled': return "bg-gray-900 border border-gray-800 text-white placeholder-gray-500";
          case 'pastel': return "bg-white border border-gray-200 text-gray-800 shadow-lg";
          default: return "bg-white border border-gray-200";
      }
  };

  if (!chat) return <div className={`flex-1 flex items-center justify-center ${isPastel ? 'text-gray-400' : 'text-gray-600'}`}><p>Select a chat to start messaging</p></div>;

  const partner = chat.participants.find(p => p.id !== currentUser.id) || chat.participants[0];

  return (
    <div className="flex h-full flex-col relative overflow-hidden">
        {/* Chat Background Layer */}
        <div className="absolute inset-0 z-0 bg-cover bg-center opacity-40 pointer-events-none" style={{ backgroundImage: `url(${wallpaper})` }}></div>
        {appTheme === 'glass' && <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/30 to-black/60 pointer-events-none"></div>}

        {/* Floating Header */}
        <div className={`shrink-0 z-30 px-6 py-4 flex justify-between items-center transition-all ${getHeaderClass()} m-2 rounded-2xl`}>
            <div className="flex items-center space-x-4">
                <button onClick={onBack} className={`md:hidden p-2 rounded-full ${isPastel ? 'hover:bg-gray-100' : 'hover:bg-white/10 text-white'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="relative cursor-pointer" onClick={() => onViewImage(partner.avatar)}>
                    <img src={partner.avatar} className={`w-12 h-12 rounded-full object-cover ${appTheme === 'glass' ? 'ring-2 ring-white/50' : ''}`} alt="" />
                    {partner.status === 'online' && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black shadow-neon"></div>}
                </div>
                <div>
                    <h2 className={`text-lg font-bold leading-tight ${isPastel ? 'text-gray-900' : 'text-white'}`}>{partner.name}</h2>
                    <p className={`text-xs font-medium ${isPastel ? 'text-gray-500' : 'text-gray-400'}`}>
                        {partnerTyping ? <span className="text-emerald-500 animate-pulse">Typing...</span> : partner.status === 'online' ? 'Online' : 'Last seen recently'}
                    </p>
                </div>
            </div>
            <div className="flex space-x-2">
                <button onClick={() => onStartCall(CallType.VIDEO)} className={`p-3 rounded-full transition ${isPastel ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
                <button className={`p-3 rounded-full transition ${isPastel ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                </button>
            </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 z-10 scrollbar-hide space-y-6">
            {chat.messages.map((msg, idx) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                    <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-pop-in`}>
                        <div className={`max-w-[75%] relative group`}>
                            <div className={`px-5 py-3 rounded-2xl ${getBubbleClass(isMe)} ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                                {msg.type === MessageType.TEXT && <p className="text-[15px] leading-relaxed">{msg.content}</p>}
                                {msg.type === MessageType.IMAGE && <img src={msg.mediaUrl} className="rounded-xl mt-1 max-h-60" />}
                                <div className={`text-[10px] mt-1 flex items-center justify-end space-x-1 ${isMe ? 'opacity-80' : 'opacity-60'}`}>
                                   <span>{msg.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                   {isMe && <span>{msg.status === MessageStatus.READ ? '✓✓' : '✓'}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>

        {/* Floating Input */}
        <div className="p-4 z-20 shrink-0">
            <div className={`flex items-center space-x-3 p-2 rounded-full shadow-2xl ${getInputClass()}`}>
                <button className={`p-3 rounded-full transition ${isPastel ? 'hover:bg-gray-100 text-gray-400' : 'hover:bg-white/10 text-gray-400'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </button>
                <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            onSendMessage(inputValue, MessageType.TEXT);
                            setInputValue('');
                        }
                    }}
                    placeholder="Type a message..." 
                    className="flex-1 bg-transparent border-none focus:ring-0 outline-none h-10"
                />
                <button 
                    onClick={() => {
                        if (inputValue.trim()) {
                            onSendMessage(inputValue, MessageType.TEXT);
                            setInputValue('');
                        }
                    }}
                    className={`p-3 rounded-full text-white shadow-lg transform transition active:scale-95 ${inputValue.trim() ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-gray-600 opacity-50'}`}
                >
                    <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
            </div>
        </div>
    </div>
  );
};
