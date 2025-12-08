
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { CallModal } from './components/CallModal';
import { StoryViewer } from './components/StoryViewer';
import { ImageViewer } from './components/ImageViewer';
import { CURRENT_USER, INITIAL_CHATS, MOCK_USERS, MOCK_STORIES, MOCK_CALL_LOGS, DEFAULT_WALLPAPER } from './constants';
import { Chat, MessageType, MessageStatus, CallType, User, Story, CallLog, Message, UserSettings } from './types';

type AuthState = 'login' | 'app';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>('login');
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<{ isOpen: boolean, type: CallType, partnerId: string } | null>(null);
  const [viewingStoryId, setViewingStoryId] = useState<string | null>(null);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'status' | 'calls' | 'settings'>('chats');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [wallpaper, setWallpaper] = useState<string>(DEFAULT_WALLPAPER);
  const [navPosition, setNavPosition] = useState<'top' | 'bottom'>('bottom');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  const [stories, setStories] = useState<Story[]>(MOCK_STORIES);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(CURRENT_USER);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthState('app');
  };

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  const handleSendMessage = (text: string, type: MessageType, mediaUrl?: string, replyToId?: string, pollOptions?: string[], targetChatId?: string) => {
    const chatId = targetChatId || activeChatId;
    if (!chatId) return;
    
    // Find the chat object to get participants for blocking check
    const targetChat = chats.find(c => c.id === chatId);
    const partner = targetChat?.participants.find(p => p.id !== currentUser.id);

    if (partner && currentUser.blockedUsers.includes(partner.id)) {
        alert(`You have blocked ${partner.name}. Unblock to send messages.`);
        return;
    }

    const newMessage: Message = {
      id: `m-${Date.now()}`,
      senderId: currentUser.id,
      content: text,
      type,
      mediaUrl,
      timestamp: new Date(),
      status: MessageStatus.SENT,
      reactions: [],
      replyToId: replyToId,
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

    setTimeout(() => {
       setChats(prev => prev.map(c => 
         c.id === chatId ? {
           ...c, messages: c.messages.map(m => m.id === newMessage.id ? { ...m, status: MessageStatus.DELIVERED } : m)
         } : c
       ));
    }, 1000);

    if (currentUser.settings?.privacy.readReceipts) {
      setTimeout(() => {
         setChats(prev => prev.map(c => 
           c.id === chatId ? {
             ...c, messages: c.messages.map(m => m.id === newMessage.id ? { ...m, status: MessageStatus.READ } : m)
           } : c
         ));
      }, 2500);
    }

    // Auto-reply unless it's a poll or self-chat
    if (targetChat?.participants.length && targetChat.participants.length > 0 && !targetChatId) {
        setTimeout(() => {
            setPartnerTyping(true);
        }, 2000);

        setTimeout(() => {
          setPartnerTyping(false);
          const responseMsg: Message = {
            id: `m-r-${Date.now()}`,
            senderId: targetChat?.participants.find(p => p.id !== currentUser.id)?.id || 'unknown',
            content: type === MessageType.AUDIO ? "Can't listen right now." : "Interesting!",
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

      // Find chat with this user
      let chat = chats.find(c => c.participants.some(p => p.id === story.userId));
      
      if (!chat) {
         // Create new chat if not exists
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
      
      // Send message
      handleSendMessage(`Replying to story: ${text}`, MessageType.TEXT, undefined, undefined, undefined, chat.id);
      
      // If we weren't in that chat, don't navigate, just notify (optional). 
      // User stays in story view or closes it.
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
              newReactions = msg.reactions.map(r => 
                r.emoji === emoji ? { ...r, count: r.count - 1, userReacted: false } : r
              ).filter(r => r.count > 0);
            } else {
              newReactions = msg.reactions.map(r => 
                r.emoji === emoji ? { ...r, count: r.count + 1, userReacted: true } : r
              );
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
    setChats(prev => prev.map(chat => {
      if (chat.id !== chatId) return chat;
      return {
        ...chat,
        messages: chat.messages.map(msg => 
          msg.id === messageId ? { ...msg, content: newContent, isEdited: true } : msg
        )
      };
    }));
  };

  const handleDeleteMessage = (chatId: string, messageId: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id !== chatId) return chat;
      return {
        ...chat,
        messages: chat.messages.map(msg => 
          msg.id === messageId ? { ...msg, isDeleted: true, content: 'This message was deleted', type: MessageType.TEXT } : msg
        )
      };
    }));
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
        setChats(prev => prev.map(c => c.id === chatId ? {
            ...c,
            messages: [...c.messages, newMessage],
            lastMessage: newMessage,
            unreadCount: 0
        } : c));
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
    if (confirm("Are you sure you want to clear all chat history?")) {
        setChats(prev => prev.map(c => ({
          ...c,
          messages: [],
          lastMessage: undefined,
          unreadCount: 0
        })));
    }
  };

  const handleToggleStar = (messageId: string) => {
      if (!activeChatId) return;
      setChats(prev => prev.map(c => {
          if (c.id !== activeChatId) return c;
          return {
              ...c,
              messages: c.messages.map(m => m.id === messageId ? { ...m, isStarred: !m.isStarred } : m)
          };
      }));
  };

  const handlePinMessage = (messageId: string) => {
      if (!activeChatId) return;
      setChats(prev => prev.map(c => c.id === activeChatId ? { 
          ...c, 
          pinnedMessageId: c.pinnedMessageId === messageId ? undefined : messageId 
      } : c));
  };

  const handleVotePoll = (messageId: string, optionId: string) => {
      if (!activeChatId) return;
      setChats(prev => prev.map(c => {
          if (c.id !== activeChatId) return c;
          return {
              ...c,
              messages: c.messages.map(m => {
                  if (m.id !== messageId || !m.pollOptions) return m;
                  return {
                      ...m,
                      pollOptions: m.pollOptions.map(opt => {
                          const hasVoted = opt.votes.includes(currentUser.id);
                          if (opt.id === optionId) {
                              return {
                                  ...opt,
                                  votes: hasVoted 
                                    ? opt.votes.filter(id => id !== currentUser.id)
                                    : [...opt.votes, currentUser.id]
                              };
                          }
                          return opt;
                      })
                  };
              })
          };
      }));
  };

  const handleToggleMute = () => {
      if (!activeChatId) return;
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, muted: !c.muted } : c));
  };

  const handleToggleEphemeral = () => {
      if (!activeChatId) return;
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, ephemeralMode: !c.ephemeralMode } : c));
  };

  const handleArchiveChat = () => {
      if (!activeChatId) return;
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, archived: !c.archived } : c));
      setIsMobileListVisible(true);
      setActiveChatId(null);
  };

  const handleBlockUser = (userId: string) => {
      const isBlocked = currentUser.blockedUsers.includes(userId);
      if (isBlocked) {
          // Unblock
          setCurrentUser(prev => ({
              ...prev,
              blockedUsers: prev.blockedUsers.filter(id => id !== userId)
          }));
      } else {
          // Block
          if (confirm("Are you sure you want to block this user?")) {
            setCurrentUser(prev => ({
                ...prev,
                blockedUsers: [...prev.blockedUsers, userId]
            }));
            setPartnerTyping(false); // Stop typing if blocked
          }
      }
  };

  const handleUnblockUser = (userId: string) => {
      setCurrentUser(prev => ({
          ...prev,
          blockedUsers: prev.blockedUsers.filter(id => id !== userId)
      }));
  };

  const handleReportUser = (userId: string) => {
      if(confirm("Report this user for spam or inappropriate content?")) {
        alert("User reported to support.");
      }
  };

  const handleUpdateSettings = (newSettings: Partial<UserSettings>) => {
      setCurrentUser(prev => ({
          ...prev,
          settings: {
              ...prev.settings!,
              ...newSettings
          }
      }));
  };

  const handleToggleReadReceipts = () => {
      if (currentUser.settings) {
          handleUpdateSettings({
              privacy: {
                  ...currentUser.settings.privacy,
                  readReceipts: !currentUser.settings.privacy.readReceipts
              }
          });
      }
  };

  if (authState === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-nexus-50 to-blue-100 dark:from-dark-bg dark:to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-nexus-300/30 rounded-full blur-[100px] animate-pulse"></div>
           <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-blue-300/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        <div className="bg-white/80 dark:bg-dark-panel/80 backdrop-blur-xl p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-md transition-all border border-white/50 dark:border-gray-700/50 relative z-10 animate-pop-in">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-tr from-nexus-400 to-nexus-600 rounded-3xl rotate-3 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-nexus-500/40">
              <svg className="w-10 h-10 text-white transform -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">NexusChat</h1>
            <p className="text-gray-500 dark:text-gray-300 font-medium">Connect with everyone, everywhere.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">Email Address</label>
              <input type="email" defaultValue="alex@nexus.chat" className="w-full px-5 py-4 bg-gray-50 dark:bg-dark-input border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-nexus-500 focus:outline-none text-gray-800 dark:text-white transition-all shadow-inner" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-1">Password</label>
              <input type="password" defaultValue="password" className="w-full px-5 py-4 bg-gray-50 dark:bg-dark-input border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-nexus-500 focus:outline-none text-gray-800 dark:text-white transition-all shadow-inner" />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-nexus-600 to-nexus-500 hover:from-nexus-500 hover:to-nexus-400 text-white font-bold py-4 rounded-2xl transition-all transform active:scale-[0.98] shadow-xl shadow-nexus-500/20 text-lg">
              Sign In
            </button>
            <p className="text-center text-sm text-gray-400 mt-6">Don't have an account? <span className="text-nexus-600 font-semibold cursor-pointer hover:underline">Sign up</span></p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-gray-50 dark:bg-dark-bg font-sans transition-colors duration-300">
      <div className={`${isMobileListVisible ? 'flex' : 'hidden'} md:flex flex-col h-full z-20 w-full md:w-[400px] border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-panel flex-shrink-0`}>
        <Sidebar 
          currentUser={currentUser}
          chats={chats}
          stories={stories}
          callLogs={MOCK_CALL_LOGS}
          activeChatId={activeChatId}
          activeTab={sidebarTab}
          currentTheme={theme}
          currentWallpaper={wallpaper}
          navPosition={navPosition}
          onTabChange={setSidebarTab}
          onSelectChat={handleSelectChat}
          users={MOCK_USERS}
          onCreateChat={handleCreateChat}
          onViewStory={setViewingStoryId}
          onStartCall={(userId, type) => handleStartCall(userId, type)}
          onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
          onWallpaperChange={setWallpaper}
          onClearChats={handleClearChats}
          onAddStory={handleAddStory}
          onToggleReadReceipts={handleToggleReadReceipts}
          onUnblockUser={handleUnblockUser}
          onToggleNavPosition={() => setNavPosition(prev => prev === 'top' ? 'bottom' : 'top')}
          onUpdateSettings={handleUpdateSettings}
        />
      </div>

      <div className={`flex-1 flex flex-col h-full relative overflow-hidden ${!isMobileListVisible ? 'flex' : 'hidden md:flex'}`}>
        <ChatWindow 
          chat={activeChat}
          currentUser={currentUser}
          partnerTyping={partnerTyping}
          wallpaper={wallpaper}
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
        />
      </div>

      {activeCall && (
        <CallModal 
          isOpen={activeCall.isOpen}
          type={activeCall.type}
          partner={MOCK_USERS.find(u => u.id === activeCall.partnerId) || MOCK_USERS[0]}
          onEndCall={() => setActiveCall(null)}
        />
      )}

      {viewingStoryId && (
        <StoryViewer 
          stories={stories.filter(s => s.userId === (stories.find(st => st.id === viewingStoryId)?.userId))}
          initialStoryId={viewingStoryId}
          users={MOCK_USERS}
          onClose={() => setViewingStoryId(null)}
          onReply={handleStoryReply}
        />
      )}

      {viewingImage && (
        <ImageViewer 
          src={viewingImage} 
          onClose={() => setViewingImage(null)} 
        />
      )}

      {forwardingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-dark-panel rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh] border border-gray-200 dark:border-gray-700">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-dark-hover">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Forward to...</h3>
                    <button onClick={() => setForwardingMessage(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition text-gray-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-2">
                    {chats.map(chat => {
                        const partner = chat.participants.find(p => p.id !== currentUser.id) || chat.participants[0];
                        return (
                            <button 
                                key={chat.id}
                                onClick={() => handleForwardMessage(chat.id)}
                                className="w-full p-3 flex items-center space-x-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition group"
                            >
                                <img src={partner.avatar} className="w-12 h-12 rounded-full border border-gray-100 dark:border-gray-600" alt="" />
                                <div className="text-left">
                                    <p className="font-semibold text-gray-900 dark:text-white">{partner.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Tap to send</p>
                                </div>
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
