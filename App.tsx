import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { CallModal } from './components/CallModal';
import { StoryViewer } from './components/StoryViewer';
import { ImageViewer } from './components/ImageViewer';
import { PinModal } from './components/PinModal';
import { ConfirmModal } from './components/ConfirmModal';
import { CURRENT_USER, INITIAL_CHATS, MOCK_USERS, MOCK_STORIES, MOCK_CALL_LOGS, DEFAULT_WALLPAPER } from './constants';
import { Chat, MessageType, MessageStatus, CallType, User, Story, CallLog, Message, UserSettings, AppTheme } from './types';

type AuthState = 'login' | 'app';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>('login');
  
  // Initialize chats from LocalStorage or Default
  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = localStorage.getItem('nexus_chats');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Revive Date objects from ISO strings
            return parsed.map((c: any) => ({
                ...c,
                lastMessage: c.lastMessage ? { ...c.lastMessage, timestamp: new Date(c.lastMessage.timestamp) } : undefined,
                messages: c.messages.map((m: any) => ({ 
                    ...m, 
                    timestamp: new Date(m.timestamp),
                    pollOptions: m.pollOptions ? m.pollOptions.map((opt: any) => ({...opt})) : undefined
                })),
                muteUntil: c.muteUntil ? new Date(c.muteUntil) : undefined
            }));
        } catch (e) {
            console.error("Failed to load chats from storage", e);
            return INITIAL_CHATS;
        }
    }
    return INITIAL_CHATS;
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<{ isOpen: boolean, type: CallType, partnerId: string } | null>(null);
  const [viewingStoryId, setViewingStoryId] = useState<string | null>(null);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'groups' | 'status' | 'calls' | 'settings'>('chats');
  
  // Theme State
  const [appTheme, setAppTheme] = useState<AppTheme>('glass');
  const [wallpaper, setWallpaper] = useState<string>(DEFAULT_WALLPAPER);
  const [navPosition, setNavPosition] = useState<'top' | 'bottom'>('bottom');
  
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>(MOCK_STORIES);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(CURRENT_USER);

  // Pin Modal State for locking individual chats
  const [showLockChatModal, setShowLockChatModal] = useState(false);
  const [chatIdToLock, setChatIdToLock] = useState<string | null>(null);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    isDestructive: false,
    onConfirm: () => {},
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void, isDestructive = false, confirmLabel = "Confirm") => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, isDestructive, confirmLabel });
  };

  // Persist Chats to LocalStorage
  useEffect(() => {
      localStorage.setItem('nexus_chats', JSON.stringify(chats));
  }, [chats]);

  // Apply Theme Classes
  useEffect(() => {
    // Reset classes
    document.documentElement.classList.remove('dark', 'theme-glass', 'theme-amoled', 'theme-pastel', 'theme-hybrid');
    
    // Add base theme class
    document.documentElement.classList.add(`theme-${appTheme}`);

    // Handle Dark Mode logic for specific themes
    if (appTheme === 'amoled' || appTheme === 'hybrid') {
        document.documentElement.classList.add('dark');
    } else if (appTheme === 'glass') {
        // Glass can be dark or light, let's default to dark for Neo-Modern feel
        document.documentElement.classList.add('dark');
    } else {
        // Pastel is typically light
        document.documentElement.classList.remove('dark');
    }
  }, [appTheme]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthState('app');
  };

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  // --- Message Handling Logic ---
  const handleSendMessage = (text: string, type: MessageType, mediaUrl?: string, replyToId?: string, pollOptions?: string[], targetChatId?: string) => {
    const chatId = targetChatId || activeChatId;
    if (!chatId) return;
    
    const targetChat = chats.find(c => c.id === chatId);
    const partner = targetChat?.participants.find(p => p.id !== currentUser.id);

    if (partner && currentUser.blockedUsers.includes(partner.id)) {
        alert(`You have blocked ${partner.name}. Unblock to send messages.`);
        return;
    }

    // EXPLICITLY capture replyToId to ensure it persists in the object
    const newMessage: Message = {
      id: `m-${Date.now()}`,
      senderId: currentUser.id,
      content: text,
      type,
      mediaUrl,
      timestamp: new Date(),
      status: MessageStatus.SENT,
      reactions: [],
      replyToId: replyToId, // Ensure this is not undefined if a reply exists
      isStarred: false,
      pollOptions: type === MessageType.POLL && pollOptions ? pollOptions.map((opt, i) => ({
          id: `opt-${i}`,
          text: opt,
          votes: []
      })) : undefined
    };

    setChats(prevChats => prevChats.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          messages: [...chat.messages, newMessage],
          lastMessage: newMessage,
          pinned: chat.pinned,
          unreadCount: 0
        };
      }
      return chat;
    }).sort((a, b) => {
       if (a.pinned && !b.pinned) return -1;
       if (!a.pinned && b.pinned) return 1;
       const ta = a.lastMessage?.timestamp.getTime() || 0;
       const tb = b.lastMessage?.timestamp.getTime() || 0;
       return tb - ta;
    }));

    // Simulate status updates (Delivered)
    setTimeout(() => {
       setChats(prev => prev.map(c => 
         c.id === chatId ? {
           ...c, messages: c.messages.map(m => m.id === newMessage.id ? { ...m, status: MessageStatus.DELIVERED, replyToId: m.replyToId } : m)
         } : c
       ));
    }, 1000);

    // Simulate status updates (Read)
    if (currentUser.settings?.privacy.readReceipts) {
      setTimeout(() => {
         setChats(prev => prev.map(c => 
           c.id === chatId ? {
             ...c, messages: c.messages.map(m => m.id === newMessage.id ? { ...m, status: MessageStatus.READ, replyToId: m.replyToId } : m)
           } : c
         ));
      }, 2500);
    }

    // Partner Typing Simulation
    if (targetChat?.participants.length && targetChat.participants.length > 0 && !targetChatId) {
        setTimeout(() => setPartnerTyping(true), 2000);
        setTimeout(() => {
          setPartnerTyping(false);
          const responseMsg: Message = {
            id: `m-r-${Date.now()}`,
            senderId: targetChat?.participants.find(p => p.id !== currentUser.id)?.id || 'unknown',
            content: "Interesting!",
            type: MessageType.TEXT,
            timestamp: new Date(),
            status: MessageStatus.DELIVERED,
            reactions: [],
            isStarred: false
          };
          setChats(prevChats => prevChats.map(chat => {
            if (chat.id === chatId) {
              return {
                 ...chat,
                 messages: [...chat.messages, responseMsg],
                 lastMessage: responseMsg,
                 unreadCount: chat.id === activeChatId ? 0 : chat.unreadCount + 1
              };
            }
            return chat;
          }));
        }, 4500);
    }
  };

  const handleStoryReply = (storyId: string, text: string) => {
      const story = stories.find(s => s.id === storyId);
      if (!story) return;
      let chat = chats.find(c => c.participants.some(p => p.id === story.userId));
      if (!chat) {
         const user = MOCK_USERS.find(u => u.id === story.userId);
         if (!user) return;
         const newChat: Chat = {
            id: `c-${Date.now()}`,
            type: 'individual',
            participants: [user],
            messages: [],
            unreadCount: 0,
            pinned: false,
            archived: false,
            muted: false
         };
         setChats(prev => [newChat, ...prev]);
         chat = newChat;
      }
      handleSendMessage(`Replying to story: ${text}`, MessageType.TEXT, undefined, undefined, undefined, chat.id);
  };

  const handleReaction = (chatId: string, messageId: string, emoji: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id !== chatId) return chat;
      return {
        ...chat,
        messages: chat.messages.map(msg => {
          if (msg.id !== messageId) return msg;
          const existingReaction = msg.reactions.find(r => r.emoji === emoji);
          let newReactions;
          if (existingReaction) {
            if (existingReaction.userReacted) {
              newReactions = msg.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count - 1, userReacted: false } : r).filter(r => r.count > 0);
            } else {
              newReactions = msg.reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, userReacted: true } : r);
            }
          } else {
            newReactions = [...msg.reactions, { emoji, count: 1, userReacted: true }];
          }
          return { ...msg, reactions: newReactions };
        })
      };
    }));
  };

  const handleEditMessage = (chatId: string, messageId: string, newContent: string) => {
    setChats(prev => prev.map(chat => chat.id !== chatId ? chat : { ...chat, messages: chat.messages.map(msg => msg.id === messageId ? { ...msg, content: newContent, isEdited: true } : msg) }));
  };

  const handleDeleteMessage = (chatId: string, messageId: string) => {
    setChats(prev => prev.map(chat => chat.id !== chatId ? chat : { ...chat, messages: chat.messages.map(msg => msg.id === messageId ? { ...msg, isDeleted: true, content: 'This message was deleted', type: MessageType.TEXT } : msg) }));
  };

  const handleForwardMessage = (chatId: string) => {
    if (!forwardingMessage) return;
    setActiveChatId(chatId);
    setForwardingMessage(null);
    setIsMobileListVisible(false);
    setTimeout(() => {
        const newMessage: Message = {
            id: `m-fwd-${Date.now()}`,
            senderId: currentUser.id,
            content: forwardingMessage.content,
            type: forwardingMessage.type,
            mediaUrl: forwardingMessage.mediaUrl,
            timestamp: new Date(),
            status: MessageStatus.SENT,
            reactions: [],
            forwarded: true,
            isStarred: false
        };
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...c.messages, newMessage], lastMessage: newMessage, unreadCount: 0 } : c));
    }, 100);
  };

  const handleAddStory = (type: 'text' | 'image' | 'video', content: string) => {
      const newStory: Story = {
          id: `s-${Date.now()}`,
          userId: currentUser.id,
          type: type as any,
          content: content,
          timestamp: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          viewers: [],
          background: type === 'text' ? '#14b8a6' : undefined
      };
      setStories(prev => [newStory, ...prev]);
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setIsMobileListVisible(false);
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
  };

  const handleCreateChat = (userId: string) => {
    const existing = chats.find(c => c.participants.some(p => p.id === userId));
    if (existing) {
      handleSelectChat(existing.id);
      setSidebarTab('chats');
      return;
    }
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) return;
    const newChat: Chat = {
      id: `c-${Date.now()}`,
      type: 'individual',
      participants: [user],
      messages: [],
      unreadCount: 0,
      pinned: false,
      archived: false,
      muted: false
    };
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
    setSidebarTab('chats');
    setIsMobileListVisible(false);
  };

  const handleStartCall = (userId: string | null, type: CallType) => {
    const partnerId = userId || (activeChat?.participants.find(p => p.id !== currentUser.id)?.id);
    if(partnerId) {
      if (currentUser.blockedUsers.includes(partnerId)) {
        alert("You cannot call a blocked contact.");
        return;
      }
      setActiveCall({ isOpen: true, type, partnerId });
    }
  };

  const handleClearChats = () => {
    showConfirm(
      "Clear All Chats?",
      "This will permanently delete the message history for all conversations. This action cannot be undone.",
      () => setChats(prev => prev.map(c => ({ ...c, messages: [], lastMessage: undefined, unreadCount: 0 }))),
      true,
      "Clear All"
    );
  };

  const handleToggleStar = (messageId: string) => {
      if (!activeChatId) return;
      setChats(prev => prev.map(c => c.id !== activeChatId ? c : { ...c, messages: c.messages.map(m => m.id === messageId ? { ...m, isStarred: !m.isStarred } : m) }));
  };

  const handlePinMessage = (messageId: string) => {
      if (!activeChatId) return;
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, pinnedMessageId: c.pinnedMessageId === messageId ? undefined : messageId } : c));
  };

  const handleVotePoll = (messageId: string, optionId: string) => {
      if (!activeChatId) return;
      setChats(prev => prev.map(c => c.id !== activeChatId ? c : { ...c, messages: c.messages.map(m => {
          if (m.id !== messageId || !m.pollOptions) return m;
          return { ...m, pollOptions: m.pollOptions.map(opt => opt.id === optionId ? { ...opt, votes: opt.votes.includes(currentUser.id) ? opt.votes.filter(id => id !== currentUser.id) : [...opt.votes, currentUser.id] } : opt) };
      }) }));
  };

  const handleToggleMute = () => { if (activeChatId) setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, muted: !c.muted } : c)); };
  const handleToggleEphemeral = () => { if (activeChatId) setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, ephemeralMode: !c.ephemeralMode } : c)); };
  const handleArchiveChat = () => { if (activeChatId) { setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, archived: !c.archived } : c)); setIsMobileListVisible(true); setActiveChatId(null); }};

  // Chat Actions for Sidebar
  const handlePinChat = (chatId: string) => {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, pinned: !c.pinned } : c).sort((a, b) => {
           // Re-sort to move pinned to top
           if (a.pinned === b.pinned) return 0; // Stable sort for same pin status
           if (!a.pinned && b.pinned) return 1; // Wait, we just toggled, so re-sort logic in next render? No, manual sort here.
           return -1;
      }));
  };

  const handleMuteChat = (chatId: string) => {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, muted: !c.muted } : c));
  };

  const handleArchiveChatById = (chatId: string) => {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, archived: !c.archived } : c));
      if (activeChatId === chatId) {
          setIsMobileListVisible(true);
          setActiveChatId(null);
      }
  };

  const handleBlockUser = (userId: string) => {
      const isBlocked = currentUser.blockedUsers.includes(userId);
      const user = MOCK_USERS.find(u => u.id === userId);
      const name = user?.name || "this user";

      if (isBlocked) {
        showConfirm(
            "Unblock Contact?",
            `Are you sure you want to unblock ${name}? You will be able to send messages and calls to each other.`,
            () => {
               setCurrentUser(prev => ({ ...prev, blockedUsers: prev.blockedUsers.filter(id => id !== userId) }));
            },
            false,
            "Unblock"
        );
      } else {
        showConfirm(
            "Block Contact?",
            `Are you sure you want to block ${name}? They will not be able to send you messages or call you.`,
            () => {
              setCurrentUser(prev => ({ ...prev, blockedUsers: [...prev.blockedUsers, userId] }));
              setPartnerTyping(false);
            },
            true,
            "Block"
        );
      }
  };

  const handleUnblockUser = (userId: string) => {
      const user = MOCK_USERS.find(u => u.id === userId);
      const name = user?.name || "this user";
      showConfirm(
          "Unblock Contact?",
          `Are you sure you want to unblock ${name}?`,
          () => {
             setCurrentUser(prev => ({ ...prev, blockedUsers: prev.blockedUsers.filter(id => id !== userId) }));
          },
          false,
          "Unblock"
      );
  };

  const handleReportUser = (userId: string) => { 
      showConfirm(
          "Report Contact",
          "Are you sure you want to report this user for spam or inappropriate behavior? The last 5 messages will be forwarded to NexusChat.",
          () => alert("User reported successfully."),
          true,
          "Report"
      );
  };

  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
      setCurrentUser(prev => ({ ...prev, settings: { ...prev.settings!, ...newSettings } }));
      if (newSettings.appTheme) setAppTheme(newSettings.appTheme);
      if (newSettings.navPosition) setNavPosition(newSettings.navPosition);
      if (newSettings.wallpaper) setWallpaper(newSettings.wallpaper);
  };
  
  const handleUpdateProfile = (updates: Partial<User>) => {
      setCurrentUser(prev => ({ ...prev, ...updates }));
  };

  const handleToggleReadReceipts = () => {
      if (currentUser.settings) handleUpdateSettings({ privacy: { ...currentUser.settings.privacy, readReceipts: !currentUser.settings.privacy.readReceipts } });
  };
  
  const handleToggleChatLock = () => {
      if (!activeChatId) return;
      
      const chat = chats.find(c => c.id === activeChatId);
      if (!chat) return;

      if (chat.folder === 'locked') {
          // Unlock - No PIN needed here, assuming user is already authenticated or just toggling off
          setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, folder: undefined } : c));
      } else {
          // Lock - Show Modal
          setChatIdToLock(activeChatId);
          setShowLockChatModal(true);
      }
  };

  const handleChatLockSuccess = () => {
      if (chatIdToLock) {
          setChats(prev => prev.map(c => c.id === chatIdToLock ? { ...c, folder: 'locked' } : c));
          setActiveChatId(null); 
          setIsMobileListVisible(true);
          setShowLockChatModal(false);
          setChatIdToLock(null);
      }
  };

  const handleUpdateNote = (note: string) => {
      if (activeChatId) {
          setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, contactNotes: note } : c));
      }
  };

  // Get Background Styles based on Theme
  const getContainerStyles = () => {
      switch(appTheme) {
          case 'glass':
              return "bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-fixed";
          case 'amoled':
              return "bg-amoled-bg text-white";
          case 'pastel':
              return "bg-pastel-bg text-gray-800";
          case 'hybrid':
              return "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black text-white";
          default:
              return "bg-gray-50";
      }
  };

  if (authState === 'login') {
    return (
      <div className="fixed inset-0 h-[100dvh] w-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-black animate-gradient-xy touch-none">
        {/* Animated Particles */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl animate-float pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-float-delayed pointer-events-none"></div>

        {/* 3D Glass Card */}
        <div className="relative z-10 bg-white/10 backdrop-blur-2xl border border-white/20 p-6 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-[90%] max-w-md text-center transform transition-transform duration-500 hover:scale-[1.02] hover:shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
          
          {/* Breathing Orb Animation */}
          <div className="mb-6 md:mb-10 relative inline-flex items-center justify-center">
             <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-tr from-cyan-400 to-purple-600 rounded-full animate-breathe blur-xl absolute opacity-60"></div>
             <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-tr from-cyan-300 to-purple-500 rounded-full relative z-10 shadow-neon flex items-center justify-center border border-white/20">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 font-display tracking-tighter drop-shadow-2xl">NexusChat</h1>
          <p className="text-gray-200 mb-8 md:mb-12 text-base md:text-lg font-light tracking-wide opacity-80">The future of connection is here.</p>

          {/* Micro-bounce Button */}
          <button 
            onClick={() => setAuthState('app')} 
            className="group relative w-full py-4 md:py-5 rounded-2xl bg-white text-black font-bold text-lg md:text-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300 overflow-hidden animate-bounce-soft"
          >
            <span className="relative z-10 flex items-center justify-center gap-3 group-hover:scale-105 transition-transform">
               Enter Experience
               <svg className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-100 via-white to-purple-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
        
        {/* Footer Text */}
        <div className="absolute bottom-8 text-white/30 text-[10px] md:text-xs font-mono tracking-widest uppercase">
           Secure • Realtime • Intelligent
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-[100dvh] w-screen overflow-hidden overscroll-none transition-all duration-500 ${getContainerStyles()}`}>
      
      {/* Mobile Sidebar Logic */}
      <div className={`${isMobileListVisible ? 'flex' : 'hidden'} md:flex flex-col h-full z-20 w-full md:w-[380px] lg:w-[420px] flex-shrink-0 transition-all duration-300`}>
        <Sidebar 
          currentUser={currentUser}
          chats={chats}
          stories={stories}
          callLogs={MOCK_CALL_LOGS}
          activeChatId={activeChatId}
          activeTab={sidebarTab}
          appTheme={appTheme}
          currentWallpaper={wallpaper}
          navPosition={navPosition}
          onTabChange={setSidebarTab}
          onSelectChat={handleSelectChat}
          users={MOCK_USERS}
          onCreateChat={handleCreateChat}
          onViewStory={setViewingStoryId}
          onStartCall={(userId, type) => handleStartCall(userId, type)}
          onWallpaperChange={setWallpaper}
          onClearChats={handleClearChats}
          onAddStory={handleAddStory}
          onToggleReadReceipts={handleToggleReadReceipts}
          onUnblockUser={handleUnblockUser}
          onToggleNavPosition={() => setNavPosition(prev => prev === 'top' ? 'bottom' : 'top')}
          onUpdateSettings={handleUpdateSettings}
          onUpdateProfile={handleUpdateProfile}
          onPinChat={handlePinChat}
          onMuteChat={handleMuteChat}
          onArchiveChat={handleArchiveChatById}
        />
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col h-full relative overflow-hidden ${!isMobileListVisible ? 'flex' : 'hidden md:flex'}`}>
        <ChatWindow 
          chat={activeChat}
          currentUser={currentUser}
          partnerTyping={partnerTyping}
          wallpaper={wallpaper}
          appTheme={appTheme}
          onSendMessage={(text, type, mediaUrl, replyToId, pollOptions) => handleSendMessage(text, type, mediaUrl, replyToId, pollOptions)}
          onBack={() => setIsMobileListVisible(true)}
          onStartCall={(type) => handleStartCall(null, type)}
          onReact={(msgId, emoji) => activeChatId && handleReaction(activeChatId, msgId, emoji)}
          onEdit={(msgId, newContent) => activeChatId && handleEditMessage(activeChatId, msgId, newContent)}
          onDelete={(msgId) => activeChatId && handleDeleteMessage(activeChatId, msgId)}
          onForward={(msg) => setForwardingMessage(msg)}
          onStar={handleToggleStar}
          onPin={handlePinMessage}
          onMute={handleToggleMute}
          onArchive={handleArchiveChat}
          onBlock={handleBlockUser}
          onReport={handleReportUser}
          onViewImage={setViewingImage}
          onVotePoll={handleVotePoll}
          onToggleEphemeral={handleToggleEphemeral}
          onToggleChatLock={handleToggleChatLock}
          onUpdateNote={handleUpdateNote}
        />
      </div>

      {/* Modals */}
      {activeCall && <CallModal isOpen={activeCall.isOpen} type={activeCall.type} partner={MOCK_USERS.find(u => u.id === activeCall.partnerId) || MOCK_USERS[0]} onEndCall={() => setActiveCall(null)} />}
      {viewingStoryId && <StoryViewer stories={stories.filter(s => s.userId === (stories.find(st => st.id === viewingStoryId)?.userId))} initialStoryId={viewingStoryId} users={MOCK_USERS} onClose={() => setViewingStoryId(null)} onReply={handleStoryReply} />}
      {viewingImage && <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} />}
      
      {/* Pin Modal for Chat Locking */}
      <PinModal 
         isOpen={showLockChatModal} 
         onClose={() => setShowLockChatModal(false)}
         onSuccess={handleChatLockSuccess}
         title="Lock This Chat"
         actionLabel="Lock"
         appTheme={appTheme}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        isDestructive={confirmModal.isDestructive}
        appTheme={appTheme}
      />

      {forwardingMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className={`rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh] ${appTheme === 'pastel' ? 'bg-white' : 'bg-gray-900 border border-gray-700'}`}>
              <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                 <h3 className={`font-bold text-lg ${appTheme === 'pastel' ? 'text-gray-900' : 'text-white'}`}>Forward to...</h3>
                 <button onClick={() => setForwardingMessage(null)} className="p-2 rounded-full hover:bg-white/10 transition"><svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                 {chats.map(chat => {
                    const partner = chat.participants.find(p => p.id !== currentUser.id) || chat.participants[0];
                    return (
                       <button key={chat.id} onClick={() => handleForwardMessage(chat.id)} className={`w-full p-3 flex items-center space-x-4 rounded-2xl transition group ${appTheme === 'pastel' ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}>
                          <img src={partner.avatar} className="w-12 h-12 rounded-full object-cover" alt="" />
                          <div className="text-left"><p className={`font-semibold ${appTheme === 'pastel' ? 'text-gray-900' : 'text-white'}`}>{partner.name}</p></div>
                       </button>
                    );
                 })}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;