
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { CallModal } from './components/CallModal';
import { StoryViewer } from './components/StoryViewer';
import { ImageViewer } from './components/ImageViewer';
import { PinModal } from './components/PinModal';
import { ConfirmModal } from './components/ConfirmModal';
import { CURRENT_USER, INITIAL_CHATS, MOCK_USERS, MOCK_STORIES, MOCK_CALL_LOGS, DEFAULT_WALLPAPER } from './constants';
import { Chat, MessageType, MessageStatus, CallType, User, Story, CallLog, Message, UserSettings, AppTheme, mapDBMessageToMessage, DBMessage } from './types';
import { socketService } from './services/socketService';
import { apiService } from './services/apiService';

type AuthState = 'login' | 'app';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>('login');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  
  // State
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS); // Fallback to MOCK if API fails
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

  // --- Socket.io & Data Fetching Integration ---
  
  useEffect(() => {
    if (authState === 'app') {
      // 1. Connect Socket
      socketService.connect(currentUser.id);

      // 2. Fetch Chats from API (simulated/real integration)
      const loadChats = async () => {
        const fetchedChats = await apiService.getChats(currentUser.id);
        if (fetchedChats.length > 0) {
            // Merge with MOCK_USERS to get participant info since backend assumes simple DB
            const hydratedChats = fetchedChats.map(fc => {
                 // Demo logic: Assign a random user as participant if DB doesn't provide
                 const mockParticipant = MOCK_USERS.find(u => u.id !== currentUser.id) || MOCK_USERS[0];
                 return {
                     ...fc,
                     participants: [mockParticipant],
                     messages: []
                 };
            });
            // We append local MOCK chats to the fetched ones for a fuller demo experience
            // In a real app, you'd only use fetchedChats
            setChats(prev => [...prev, ...hydratedChats]); 
        }
      };
      loadChats();

      // 3. Listen for Incoming Messages
      socketService.socket?.on('receive_message', (dbMessage: DBMessage) => {
          const newMessage = mapDBMessageToMessage(dbMessage);
          
          setChats(prevChats => {
              // Find if chat exists
              const chatExists = prevChats.find(c => c.id === dbMessage.chat_id);
              
              if (chatExists) {
                  return prevChats.map(chat => {
                      if (chat.id === dbMessage.chat_id) {
                          const isActive = chat.id === activeChatId;
                          return {
                              ...chat,
                              messages: [...chat.messages, newMessage],
                              lastMessage: newMessage,
                              unreadCount: isActive ? 0 : chat.unreadCount + 1
                          };
                      }
                      return chat;
                  }).sort((a, b) => (b.lastMessage?.timestamp.getTime() || 0) - (a.lastMessage?.timestamp.getTime() || 0));
              } else {
                  // If chat doesn't exist locally (new chat initiated by someone else), create it
                  // For demo, we just find the sender in mocks
                  const sender = MOCK_USERS.find(u => u.id === dbMessage.sender_id) || MOCK_USERS[0];
                  const newChat: Chat = {
                      id: dbMessage.chat_id,
                      type: 'individual',
                      participants: [sender],
                      messages: [newMessage],
                      unreadCount: 1,
                      pinned: false,
                      archived: false,
                      lastMessage: newMessage
                  };
                  return [newChat, ...prevChats];
              }
          });
      });

      // 4. Listen for Typing
      socketService.socket?.on('partner_typing', ({ chatId, isTyping }) => {
          if (chatId === activeChatId) {
              setPartnerTyping(isTyping);
          }
      });

      return () => {
        socketService.disconnect();
      };
    }
  }, [authState, currentUser.id, activeChatId]);


  // Apply Theme Classes
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'theme-glass', 'theme-amoled', 'theme-pastel', 'theme-hybrid');
    document.documentElement.classList.add(`theme-${appTheme}`);
    if (appTheme === 'amoled' || appTheme === 'hybrid' || appTheme === 'glass') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [appTheme]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail.trim()) {
        let displayName = "User";
        if (isRegistering && registerName.trim()) {
            displayName = registerName;
        } else {
            const namePart = loginEmail.split('@')[0];
            displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        }

        // Generate a pseudo-random ID for demo purposes if not strictly 'me'
        // In prod, this comes from Supabase Auth
        const userId = 'me'; 
        
        setCurrentUser(prev => ({
            ...prev,
            id: userId,
            email: loginEmail,
            name: displayName,
            avatar: prev.avatar || `https://ui-avatars.com/api/?name=${displayName}&background=random`
        }));
    }
    setAuthState('app');
  };

  const handleLogout = () => {
      socketService.disconnect();
      setAuthState('login');
      setLoginEmail('');
      setLoginPassword('');
      setRegisterName('');
      setActiveChatId(null);
  };

  const handleDeleteAccount = () => {
      showConfirm(
          "Delete Account",
          "Are you sure you want to delete your account? All data will be lost permanently.",
          () => {
             localStorage.removeItem('nexus_chats');
             setChats(INITIAL_CHATS);
             setCurrentUser(CURRENT_USER);
             handleLogout();
          },
          true,
          "Delete Forever"
      );
  };

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  // --- Message Handling Logic ---
  const handleSendMessage = (text: string, type: MessageType, mediaUrl?: string, replyToId?: string, pollOptions?: string[], targetChatId?: string) => {
    const chatId = targetChatId || activeChatId;
    if (!chatId) return;
    
    // Emit to Socket.io Server
    socketService.sendMessage({
        chatId,
        senderId: currentUser.id,
        content: text,
        type,
        mediaUrl,
        replyToId
    });

    // Optimistic UI Update (optional, but good for UX)
    // We can rely on the server 'receive_message' event for truth, 
    // but adding it locally immediately makes it feel faster.
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: currentUser.id,
      content: text,
      type,
      mediaUrl,
      timestamp: new Date(),
      status: MessageStatus.SENT,
      reactions: [],
      replyToId,
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
          messages: [...chat.messages, optimisticMessage],
          lastMessage: optimisticMessage,
          pinned: chat.pinned,
          unreadCount: 0
        };
      }
      return chat;
    }).sort((a, b) => (b.lastMessage?.timestamp.getTime() || 0) - (a.lastMessage?.timestamp.getTime() || 0)));
  };

  const handleStoryReply = (storyId: string, text: string) => {
      // ... existing story logic logic ...
      const story = stories.find(s => s.id === storyId);
      if (!story) return;
      let chat = chats.find(c => c.participants.some(p => p.id === story.userId));
      if (!chat) {
         const user = MOCK_USERS.find(u => u.id === story.userId);
         if (!user) return;
         // Note: In real app, you'd create chat via API first
         return; 
      }
      handleSendMessage(`Replying to story: ${text}`, MessageType.TEXT, undefined, undefined, undefined, chat.id);
  };

  const handleReaction = (chatId: string, messageId: string, emoji: string) => {
    // For reactions, we would typically have a separate socket event like 'send_reaction'
    // Here we just update local state for the demo feel
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
    // API/Socket call would go here
    setChats(prev => prev.map(chat => chat.id !== chatId ? chat : { ...chat, messages: chat.messages.map(msg => msg.id === messageId ? { ...msg, content: newContent, isEdited: true } : msg) }));
  };

  const handleDeleteMessage = (chatId: string, messageId: string) => {
    // API/Socket call would go here
    setChats(prev => prev.map(chat => chat.id !== chatId ? chat : { ...chat, messages: chat.messages.map(msg => msg.id === messageId ? { ...msg, isDeleted: true, content: 'This message was deleted', type: MessageType.TEXT } : msg) }));
  };

  const handleForwardMessage = (chatId: string) => {
    if (!forwardingMessage) return;
    setActiveChatId(chatId);
    setForwardingMessage(null);
    setIsMobileListVisible(false);
    setTimeout(() => {
       handleSendMessage(forwardingMessage.content, forwardingMessage.type, forwardingMessage.mediaUrl, undefined, undefined, chatId);
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

  const handleSelectChat = async (chatId: string) => {
    setActiveChatId(chatId);
    setIsMobileListVisible(false);
    
    // Join socket room
    socketService.joinChat(chatId);
    
    // Fetch full history from API
    // This allows lazy loading of messages only when opening the chat
    const messages = await apiService.getMessages(currentUser.id, chatId);
    if (messages.length > 0) {
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: messages, unreadCount: 0 } : c));
    } else {
        // Just clear unread if no new messages fetched (or failed)
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
    }
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
      // WebRTC Signal start
      socketService.startCall(partnerId, { sdp: 'dummy' }, type); // Simplified signaling
    }
  };

  const handleClearChats = () => {
    showConfirm(
      "Clear All Chats?",
      "This will permanently delete the message history.",
      () => setChats(prev => prev.map(c => ({ ...c, messages: [], lastMessage: undefined, unreadCount: 0 }))),
      true,
      "Clear All"
    );
  };

  // ... (Keep existing simple handlers for star, pin, mute, etc. as they are local state for now) ...
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
           if (a.pinned === b.pinned) return 0;
           if (!a.pinned && b.pinned) return 1;
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

  const handleBlockUser = (userId: string) => handleUnblockUser(userId); // Reusing for simplicity in this snippet
  const handleUnblockUser = (userId: string) => {
      // Toggle block logic
      const isBlocked = currentUser.blockedUsers.includes(userId);
      setCurrentUser(prev => ({ 
          ...prev, 
          blockedUsers: isBlocked ? prev.blockedUsers.filter(id => id !== userId) : [...prev.blockedUsers, userId] 
      }));
  };

  const handleReportUser = (userId: string) => alert("Reported");

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
          setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, folder: undefined } : c));
      } else {
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

  const getContainerStyles = () => {
      switch(appTheme) {
          case 'glass': return "bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-fixed";
          case 'amoled': return "bg-amoled-bg text-white";
          case 'pastel': return "bg-pastel-bg text-gray-800";
          case 'hybrid': return "bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black text-white";
          default: return "bg-gray-50";
      }
  };

  if (authState === 'login') {
    return (
      <div className="fixed inset-0 h-[100dvh] w-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-black animate-gradient-xy touch-none">
        {/* ... Login UI remains the same ... */}
        <div className="relative z-10 bg-white/10 backdrop-blur-2xl border border-white/20 p-6 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-[90%] max-w-md text-center transform transition-transform duration-500 hover:scale-[1.02] hover:shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
          <div className="mb-6 md:mb-8 relative inline-flex items-center justify-center">
             <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-tr from-cyan-400 to-purple-600 rounded-full animate-breathe blur-xl absolute opacity-60"></div>
             <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-tr from-cyan-300 to-purple-500 rounded-full relative z-10 shadow-neon flex items-center justify-center border border-white/20">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 font-display tracking-tighter drop-shadow-2xl">NexusChat</h1>
          <p className="text-gray-200 mb-6 text-base md:text-lg font-light tracking-wide opacity-80">{isRegistering ? "Create your account." : "The future of connection is here."}</p>
          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            {isRegistering && (
                <div className="animate-fade-in">
                    <input type="text" placeholder="Full Name" value={registerName} onChange={(e) => setRegisterName(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/50 outline-none focus:bg-white/20 focus:border-cyan-400 transition" />
                </div>
            )}
            <div><input type="email" placeholder="Email Address" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/50 outline-none focus:bg-white/20 focus:border-cyan-400 transition" /></div>
            <div><input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full px-5 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/50 outline-none focus:bg-white/20 focus:border-purple-400 transition" /></div>
            <button type="submit" className="group relative w-full py-4 rounded-2xl bg-white text-black font-bold text-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300 overflow-hidden animate-bounce-soft"><span className="relative z-10 flex items-center justify-center gap-3 group-hover:scale-105 transition-transform">{isRegistering ? "Sign Up" : "Log In"}</span></button>
          </form>
           <div className="text-white/40 text-sm">{isRegistering ? <button type="button" onClick={() => setIsRegistering(false)} className="hover:text-white transition underline">Log In</button> : <button type="button" onClick={() => setIsRegistering(true)} className="hover:text-white transition underline">Sign Up</button>}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-[100dvh] w-screen overflow-hidden overscroll-none transition-all duration-500 ${getContainerStyles()}`}>
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
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
        />
      </div>

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

      {activeCall && <CallModal isOpen={activeCall.isOpen} type={activeCall.type} partner={MOCK_USERS.find(u => u.id === activeCall.partnerId) || MOCK_USERS[0]} onEndCall={() => setActiveCall(null)} />}
      {viewingStoryId && <StoryViewer stories={stories.filter(s => s.userId === (stories.find(st => st.id === viewingStoryId)?.userId))} initialStoryId={viewingStoryId} users={MOCK_USERS} onClose={() => setViewingStoryId(null)} onReply={handleStoryReply} />}
      {viewingImage && <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} />}
      
      <PinModal isOpen={showLockChatModal} onClose={() => setShowLockChatModal(false)} onSuccess={handleChatLockSuccess} title="Lock This Chat" actionLabel="Lock" appTheme={appTheme} />

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
