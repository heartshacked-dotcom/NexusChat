
import React, { useState, useRef } from 'react';
import { User, Chat, Story, CallLog, CallStatus, CallType, UserSettings, AppTheme } from '../types';
import { WALLPAPERS } from '../constants';

interface SidebarProps {
  currentUser: User;
  chats: Chat[];
  stories: Story[];
  callLogs: CallLog[];
  users: User[];
  activeChatId: string | null;
  activeTab: 'chats' | 'status' | 'calls' | 'settings';
  appTheme: AppTheme;
  currentWallpaper: string;
  navPosition: 'top' | 'bottom';
  onTabChange: (tab: 'chats' | 'status' | 'calls' | 'settings') => void;
  onSelectChat: (chatId: string) => void;
  onCreateChat: (userId: string) => void;
  onViewStory: (storyId: string) => void;
  onStartCall: (userId: string, type: CallType) => void;
  onWallpaperChange: (url: string) => void;
  onClearChats: () => void;
  onAddStory: (type: 'text' | 'image' | 'video', content: string) => void;
  onToggleReadReceipts: () => void;
  onUnblockUser: (userId: string) => void;
  onToggleNavPosition: () => void;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
}

type SettingsView = 'main' | 'account' | 'privacy' | 'chats' | 'notifications' | 'storage' | 'help' | 'app-info' | 'help-center' | 'contact-us' | 'terms';

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentUser, chats, stories, callLogs, activeChatId, activeTab, appTheme,
  currentWallpaper, navPosition, onTabChange, onSelectChat, users, onCreateChat,
  onViewStory, onStartCall, onWallpaperChange, onClearChats, onAddStory,
  onToggleReadReceipts, onUnblockUser, onToggleNavPosition, onUpdateSettings
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [settingsView, setSettingsView] = useState<SettingsView>('main');
  const [showArchived, setShowArchived] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const storyInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Styles based on Theme
  const getPanelClass = () => {
      switch(appTheme) {
          case 'glass': return "bg-black/20 backdrop-blur-xl border-r border-white/10";
          case 'amoled': return "bg-black border-r border-gray-900";
          case 'pastel': return "bg-white border-r border-gray-100 shadow-sm";
          default: return "bg-white border-r border-gray-200";
      }
  };

  const getTextClass = () => appTheme === 'pastel' ? "text-gray-800" : "text-white";
  const getSubTextClass = () => appTheme === 'pastel' ? "text-gray-500" : "text-gray-400";
  const getCardHoverClass = () => appTheme === 'pastel' ? "hover:bg-gray-50 shadow-sm" : "hover:bg-white/10";
  const getActiveCardClass = () => {
      switch(appTheme) {
          case 'glass': return "bg-white/10 shadow-glass border border-white/10";
          case 'amoled': return "bg-gray-900 border border-gray-800";
          case 'pastel': return "bg-indigo-50 border border-indigo-100 shadow-sm";
          default: return "bg-gray-100";
      }
  };

  const filteredChats = chats.filter(chat => {
    if (showArchived && !chat.archived) return false;
    if (!showArchived && chat.archived) return false;
    const partner = chat.participants.find(p => p.id !== currentUser.id) || chat.participants[0];
    return partner?.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const SettingsHeader = ({ title, onBack }: { title: string, onBack: () => void }) => (
    <div className={`flex items-center space-x-4 mb-6 sticky top-0 z-10 py-4 ${appTheme === 'glass' ? 'bg-transparent' : appTheme === 'amoled' ? 'bg-black' : 'bg-white'}`}>
      <button onClick={onBack} className={`p-2 rounded-full transition ${appTheme === 'pastel' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-200'}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <h2 className={`text-2xl font-bold tracking-tight ${getTextClass()}`}>{title}</h2>
    </div>
  );

  const Toggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange?: () => void }) => (
    <div className="flex items-center justify-between py-4 cursor-pointer group" onClick={onChange}>
      <span className={`font-medium ${getTextClass()}`}>{label}</span>
      <div className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${checked ? 'bg-emerald-500' : 'bg-gray-600'}`}>
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`}></div>
      </div>
    </div>
  );

  const renderSettings = () => {
    // Theme Card Component
    const ThemeOption = ({ id, name, colors }: { id: AppTheme, name: string, colors: string }) => (
        <button onClick={() => onUpdateSettings({ appTheme: id })} className={`relative w-full p-4 rounded-2xl border-2 transition-all duration-200 flex items-center space-x-4 ${appTheme === id ? 'border-emerald-500 bg-emerald-500/10' : 'border-transparent hover:bg-gray-500/10'}`}>
            <div className={`w-12 h-12 rounded-full shadow-lg ${colors}`}></div>
            <span className={`font-bold text-lg ${getTextClass()}`}>{name}</span>
            {appTheme === id && <div className="absolute right-4 text-emerald-500"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div>}
        </button>
    );

    switch (settingsView) {
        case 'chats': return (
            <div className="animate-slide-up px-2 pb-20">
                <SettingsHeader title="Appearance" onBack={() => setSettingsView('main')} />
                <div className="space-y-6">
                    <div className="space-y-3">
                        <h3 className={`text-sm font-bold uppercase tracking-wider opacity-60 ${getTextClass()}`}>UI Theme</h3>
                        <ThemeOption id="glass" name="Neo-Modern Glass" colors="bg-gradient-to-tr from-cyan-500 to-blue-600" />
                        <ThemeOption id="amoled" name="Premium Dark AMOLED" colors="bg-black border border-gray-700" />
                        <ThemeOption id="pastel" name="Minimal Pastel" colors="bg-white border border-gray-200" />
                    </div>
                    <div className="space-y-3">
                         <h3 className={`text-sm font-bold uppercase tracking-wider opacity-60 ${getTextClass()}`}>Wallpapers</h3>
                         <div className="grid grid-cols-3 gap-3">
                           {WALLPAPERS.map((wp, i) => (
                             <div key={i} onClick={() => onWallpaperChange(wp)} className={`aspect-[9/16] rounded-xl cursor-pointer bg-cover bg-center border-2 transition-all ${currentWallpaper === wp ? 'border-emerald-500 scale-105' : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'}`} style={{ backgroundImage: `url(${wp})` }}></div>
                           ))}
                         </div>
                    </div>
                    <Toggle label="Bottom Navigation" checked={navPosition === 'bottom'} onChange={onToggleNavPosition} />
                </div>
            </div>
        );
        case 'main': return (
            <div className="px-2 pb-20 animate-fade-in space-y-4">
                 <div className={`p-6 rounded-3xl flex items-center space-x-4 mb-6 cursor-pointer transition transform hover:scale-[1.02] ${appTheme === 'pastel' ? 'bg-white shadow-lg' : 'bg-gradient-to-r from-gray-800 to-gray-900 border border-white/10'}`} onClick={() => setSettingsView('account')}>
                    <img src={currentUser.avatar} className="w-20 h-20 rounded-full border-4 border-emerald-500 shadow-neon" alt="Profile" />
                    <div>
                        <h2 className={`text-2xl font-bold ${getTextClass()}`}>{currentUser.name}</h2>
                        <p className={`text-sm ${getSubTextClass()}`}>{currentUser.bio}</p>
                    </div>
                 </div>
                 {[
                    { id: 'chats', name: 'Appearance & Chats', icon: '🎨', color: 'bg-pink-500' },
                    { id: 'notifications', name: 'Notifications', icon: '🔔', color: 'bg-orange-500' },
                    { id: 'privacy', name: 'Privacy & Security', icon: '🔒', color: 'bg-blue-500' },
                    { id: 'storage', name: 'Data & Storage', icon: '💾', color: 'bg-green-500' },
                    { id: 'help', name: 'Help & Support', icon: '❓', color: 'bg-purple-500' },
                 ].map(item => (
                    <button key={item.id} onClick={() => setSettingsView(item.id as SettingsView)} className={`w-full p-4 rounded-2xl flex items-center space-x-4 transition hover:scale-[1.01] ${appTheme === 'pastel' ? 'bg-white shadow-sm hover:shadow-md' : 'bg-white/5 border border-white/5 hover:bg-white/10'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg ${item.color} text-white`}>{item.icon}</div>
                        <span className={`flex-1 text-left font-semibold text-lg ${getTextClass()}`}>{item.name}</span>
                        <svg className={`w-5 h-5 opacity-50 ${getTextClass()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                 ))}
            </div>
        );
        default: return <div className="p-4"><SettingsHeader title="Settings" onBack={() => setSettingsView('main')} /><p className={getTextClass()}>Section content placeholder...</p></div>;
    }
  };

  return (
    <div className={`h-full flex flex-col ${getPanelClass()} transition-colors duration-500 relative`}>
        {/* Modern Header */}
        <div className="p-6 shrink-0 flex justify-between items-center">
            <div className="flex items-center space-x-3" onClick={() => { onTabChange('settings'); setSettingsView('main'); }}>
                 <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center shadow-neon">
                     <span className="text-white font-bold text-lg">N</span>
                 </div>
                 <h1 className={`text-2xl font-bold tracking-tight ${getTextClass()}`}>Nexus</h1>
            </div>
            <button onClick={() => { onTabChange('settings'); setSettingsView('main'); }} className="relative">
                <img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-white/20 hover:border-emerald-500 transition-all" alt="Me" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-black rounded-full"></span>
            </button>
        </div>

        {navPosition === 'top' && <NavTabs activeTab={activeTab} onChange={onTabChange} theme={appTheme} position="top" />}

        {/* Content */}
        <div className={`flex-1 overflow-y-auto scrollbar-hide px-4 ${navPosition === 'bottom' ? 'pb-28' : 'pb-4'}`}>
            {activeTab === 'chats' && (
                <>
                  <div className={`mb-6 sticky top-0 z-20 pt-2 pb-4 transition-all ${appTheme === 'glass' ? 'bg-transparent' : appTheme === 'amoled' ? 'bg-black' : 'bg-white'}`}>
                      <div className={`relative group w-full`}>
                          <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none`}>
                              <svg className={`w-5 h-5 ${getSubTextClass()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                          </div>
                          <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                                 className={`w-full pl-12 pr-4 py-3 rounded-full outline-none transition-all shadow-lg ${appTheme === 'pastel' ? 'bg-gray-100 text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-200' : 'bg-white/5 text-white focus:bg-white/10 border border-white/10 focus:border-white/30'}`} />
                      </div>
                  </div>

                  <div className="space-y-2">
                      {filteredChats.map(chat => {
                          const partner = chat.participants.find(p => p.id !== currentUser.id) || chat.participants[0];
                          const isActive = activeChatId === chat.id;
                          return (
                              <div key={chat.id} onClick={() => onSelectChat(chat.id)} 
                                   className={`group p-4 rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-[1.02] flex items-center space-x-4 ${isActive ? getActiveCardClass() : getCardHoverClass()}`}>
                                  <div className="relative">
                                      <img src={partner.avatar} className="w-14 h-14 rounded-full object-cover shadow-sm group-hover:shadow-neon transition-all" alt="" />
                                      {partner.status === 'online' && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-black rounded-full shadow-neon"></div>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-center mb-1">
                                          <h3 className={`font-bold text-lg truncate ${getTextClass()}`}>{partner.name}</h3>
                                          <span className={`text-xs font-medium ${getSubTextClass()}`}>12:40 PM</span>
                                      </div>
                                      <p className={`text-sm truncate opacity-80 ${getSubTextClass()}`}>{chat.messages[chat.messages.length - 1]?.content || "Start chatting..."}</p>
                                  </div>
                                  {chat.unreadCount > 0 && <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-black shadow-neon">{chat.unreadCount}</div>}
                              </div>
                          );
                      })}
                  </div>
                </>
            )}

            {activeTab === 'settings' && renderSettings()}
            
            {activeTab === 'status' && <div className={`text-center py-10 opacity-60 ${getTextClass()}`}>Status Stories Coming Soon UI</div>}
            {activeTab === 'calls' && <div className={`text-center py-10 opacity-60 ${getTextClass()}`}>Call History Coming Soon UI</div>}

        </div>

        {/* Floating Action Button for New Chat */}
        {activeTab === 'chats' && (
             <button onClick={() => setShowNewChatModal(true)} className={`absolute bottom-28 right-6 w-14 h-14 bg-gradient-to-tr from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center text-white shadow-float hover:scale-110 transition-transform z-30 ${navPosition === 'bottom' ? 'mb-0' : 'mb-0'}`}>
                 <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
             </button>
        )}

        {navPosition === 'bottom' && <NavTabs activeTab={activeTab} onChange={onTabChange} theme={appTheme} position="bottom" />}
    </div>
  );
};

const NavTabs = ({ activeTab, onChange, theme, position }: { activeTab: string, onChange: (t: any) => void, theme: AppTheme, position: 'top' | 'bottom' }) => {
    const isPastel = theme === 'pastel';
    const isGlass = theme === 'glass';
    
    // Floating styling for bottom position with glassmorphism and rounded shape
    const wrapperClass = position === 'bottom' 
        ? "absolute bottom-6 left-6 right-6 z-40" 
        : "relative px-6 py-2 mb-2";

    const containerClass = isPastel 
        ? "bg-white/95 shadow-lg border border-gray-100" 
        : isGlass 
            ? "bg-black/40 backdrop-blur-xl border border-white/10 shadow-glass"
            : "bg-gray-900 border border-gray-800 shadow-2xl";

    const activeItemClass = isPastel
        ? "text-purple-600 bg-purple-50 shadow-sm -translate-y-1"
        : "text-white bg-gradient-to-tr from-cyan-500 to-blue-500 shadow-neon -translate-y-1";

    const inactiveItemClass = isPastel
        ? "text-gray-400 hover:text-gray-600"
        : "text-gray-500 hover:text-gray-300";

    return (
        <div className={wrapperClass}>
            <div className={`flex justify-around items-center px-2 py-3 rounded-[2rem] ${containerClass} transition-all duration-300`}>
                {['chats', 'status', 'calls', 'settings'].map(tab => {
                    const isActive = activeTab === tab;
                    return (
                        <button 
                            key={tab} 
                            onClick={() => onChange(tab)} 
                            className={`relative group flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ease-out ${isActive ? activeItemClass : inactiveItemClass}`}
                        >
                            <span className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                               {tab === 'chats' ? (
                                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                               ) : tab === 'status' ? (
                                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                               ) : tab === 'calls' ? (
                                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                               ) : (
                                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                               )}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
