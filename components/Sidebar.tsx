
import React, { useState, useRef } from 'react';
import { User, Chat, Story, CallLog, CallStatus, CallType, UserSettings, AppTheme, ChatFolder } from '../types';
import { WALLPAPERS } from '../constants';
import { PinModal } from './PinModal';

interface SidebarProps {
  currentUser: User;
  chats: Chat[];
  stories: Story[];
  callLogs: CallLog[];
  users: User[];
  activeChatId: string | null;
  activeTab: 'chats' | 'groups' | 'status' | 'calls' | 'settings';
  appTheme: AppTheme;
  currentWallpaper: string;
  navPosition: 'top' | 'bottom';
  onTabChange: (tab: 'chats' | 'groups' | 'status' | 'calls' | 'settings') => void;
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
  onUpdateProfile: (updates: Partial<User>) => void;
}

type SettingsView = 'main' | 'account' | 'privacy' | 'chats' | 'notifications' | 'storage' | 'help' | 'app-info' | 'help-center' | 'contact-us' | 'terms';

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentUser, chats, stories, callLogs, activeChatId, activeTab, appTheme,
  currentWallpaper, navPosition, onTabChange, onSelectChat, users, onCreateChat,
  onViewStory, onStartCall, onWallpaperChange, onClearChats, onAddStory,
  onToggleReadReceipts, onUnblockUser, onToggleNavPosition, onUpdateSettings, onUpdateProfile
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [settingsView, setSettingsView] = useState<SettingsView>('main');
  const [showArchived, setShowArchived] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeFolder, setActiveFolder] = useState<ChatFolder>('all');
  const [isLockedFolderOpen, setIsLockedFolderOpen] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [callFilter, setCallFilter] = useState<'all' | 'missed' | 'incoming'>('all');

  // Dynamic Styles based on Theme
  const getPanelClass = () => {
      switch(appTheme) {
          case 'glass': return "bg-black/20 backdrop-blur-xl border-r border-white/10";
          case 'amoled': return "bg-black border-r border-gray-900";
          case 'pastel': return "bg-white border-r border-gray-100 shadow-sm";
          case 'hybrid': return "bg-slate-900/80 backdrop-blur-2xl border-r border-white/5 shadow-2xl";
          default: return "bg-white border-r border-gray-200";
      }
  };

  const getTextClass = () => appTheme === 'pastel' ? "text-gray-800" : "text-white";
  const getSubTextClass = () => appTheme === 'pastel' ? "text-gray-500" : "text-gray-400";
  const getCardHoverClass = () => {
      if (appTheme === 'pastel') return "hover:bg-gray-50 shadow-sm";
      if (appTheme === 'hybrid') return "hover:bg-white/5 transition-all duration-300";
      return "hover:bg-white/10";
  };
  const getActiveCardClass = () => {
      switch(appTheme) {
          case 'glass': return "bg-white/10 shadow-glass border border-white/10";
          case 'amoled': return "bg-gray-900 border border-gray-800";
          case 'pastel': return "bg-indigo-50 border border-indigo-100 shadow-sm";
          case 'hybrid': return "bg-gradient-to-r from-cyan-900/20 to-blue-900/20 shadow-hybrid-active border-l-2 border-cyan-400";
          default: return "bg-gray-100";
      }
  };

  const handleFolderClick = (e: React.MouseEvent, folder: ChatFolder) => {
      e.preventDefault();
      if (folder === 'locked') {
          if (isLockedFolderOpen) {
              setActiveFolder(folder);
          } else {
              setShowPinModal(true);
          }
      } else {
          setActiveFolder(folder);
      }
  };

  const handleLockFolder = () => {
      setIsLockedFolderOpen(false);
      setActiveFolder('all');
  };

  const filteredChats = chats.filter(chat => {
    // Tab Filtering
    if (activeTab === 'groups' && chat.type !== 'group') return false;
    if (activeTab === 'chats' && chat.type === 'group') return false;

    // Folder Filtering
    if (activeFolder !== 'all') {
        if (activeFolder === 'locked' && !isLockedFolderOpen) return false;
        if (chat.folder !== activeFolder && !(activeFolder === 'locked' && chat.folder === 'locked')) return false;
        // If 'locked' folder is selected, show only locked chats
        if (activeFolder === 'locked' && chat.folder !== 'locked') return false;
        // If 'personal'/'work', exclude locked
        if (activeFolder !== 'locked' && chat.folder === 'locked') return false;
    } else {
        // 'all' folder shouldn't show locked chats
        if (chat.folder === 'locked') return false;
    }

    if (showArchived && !chat.archived) return false;
    if (!showArchived && chat.archived) return false;
    
    const partner = chat.participants.find(p => p.id !== currentUser.id) || chat.participants[0];
    const nameMatch = partner?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const lastMsgMatch = chat.lastMessage?.content.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || lastMsgMatch;
  });

  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.userId]) acc[story.userId] = [];
    acc[story.userId].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const filteredCalls = callLogs.filter(log => {
      if (callFilter === 'missed') return log.status === CallStatus.MISSED;
      if (callFilter === 'incoming') return log.direction === 'incoming';
      return true;
  });

  const SettingsHeader = ({ title, onBack }: { title: string, onBack: () => void }) => (
    <div className={`flex items-center space-x-4 mb-6 sticky top-0 z-10 py-4 ${appTheme === 'glass' ? 'bg-transparent' : appTheme === 'amoled' ? 'bg-black' : appTheme === 'hybrid' ? 'bg-slate-900/80 backdrop-blur-md' : 'bg-white'}`}>
      <button onClick={onBack} className={`p-2 rounded-full transition ${appTheme === 'pastel' ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-200'}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <h2 className={`text-2xl font-bold tracking-tight ${getTextClass()}`}>{title}</h2>
    </div>
  );

  const Toggle = ({ label, checked, onChange, description }: { label: string, checked: boolean, onChange?: () => void, description?: string }) => (
    <div className="flex items-center justify-between py-4 cursor-pointer group" onClick={onChange}>
      <div className="flex flex-col">
        <span className={`font-medium ${getTextClass()}`}>{label}</span>
        {description && <span className={`text-xs ${getSubTextClass()}`}>{description}</span>}
      </div>
      <div className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${checked ? 'bg-emerald-500' : 'bg-gray-600'}`}>
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`}></div>
      </div>
    </div>
  );

  const renderSettings = () => {
    const ThemeOption = ({ id, name, colors }: { id: AppTheme, name: string, colors: string }) => (
        <button onClick={() => onUpdateSettings({ appTheme: id })} className={`relative w-full p-4 rounded-2xl border-2 transition-all duration-200 flex items-center space-x-4 ${appTheme === id ? 'border-emerald-500 bg-emerald-500/10' : 'border-transparent hover:bg-gray-500/10'}`}>
            <div className={`w-12 h-12 rounded-full shadow-lg ${colors}`}></div>
            <span className={`font-bold text-lg ${getTextClass()}`}>{name}</span>
            {appTheme === id && <div className="absolute right-4 text-emerald-500"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div>}
        </button>
    );

    switch (settingsView) {
        case 'account': return (
            <div className="animate-slide-up px-2 pb-20">
                <SettingsHeader title="Account" onBack={() => setSettingsView('main')} />
                <div className="flex flex-col items-center mb-8">
                    <div className="relative group cursor-pointer mb-4">
                        <img src={currentUser.avatar} className={`w-28 h-28 rounded-full border-4 object-cover shadow-2xl ${appTheme === 'pastel' ? 'border-white' : 'border-emerald-500'}`} alt="Profile" />
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                    </div>
                    <p className={`text-sm ${getSubTextClass()}`}>Tap to change profile photo</p>
                </div>

                <div className="space-y-6">
                    <div className={`p-4 rounded-2xl space-y-1 ${appTheme === 'pastel' ? 'bg-white shadow-sm' : 'bg-white/5 border border-white/5'}`}>
                        <label className={`text-xs font-bold uppercase tracking-wider opacity-60 ${getTextClass()}`}>Display Name</label>
                        <input 
                            type="text" 
                            value={currentUser.name} 
                            onChange={(e) => onUpdateProfile({ name: e.target.value })}
                            className={`w-full bg-transparent outline-none text-lg font-semibold ${getTextClass()} placeholder-gray-500`}
                        />
                    </div>

                    <div className={`p-4 rounded-2xl space-y-1 ${appTheme === 'pastel' ? 'bg-white shadow-sm' : 'bg-white/5 border border-white/5'}`}>
                        <label className={`text-xs font-bold uppercase tracking-wider opacity-60 ${getTextClass()}`}>Bio / About</label>
                        <input 
                            type="text" 
                            value={currentUser.bio} 
                            onChange={(e) => onUpdateProfile({ bio: e.target.value })}
                            className={`w-full bg-transparent outline-none text-lg ${getTextClass()} placeholder-gray-500`}
                        />
                    </div>

                    <div className={`p-4 rounded-2xl space-y-1 ${appTheme === 'pastel' ? 'bg-white shadow-sm' : 'bg-white/5 border border-white/5'}`}>
                        <label className={`text-xs font-bold uppercase tracking-wider opacity-60 ${getTextClass()}`}>Phone Number</label>
                         <input 
                            type="text" 
                            value={currentUser.phoneNumber} 
                            onChange={(e) => onUpdateProfile({ phoneNumber: e.target.value })}
                            className={`w-full bg-transparent outline-none text-lg ${getTextClass()} placeholder-gray-500`}
                        />
                    </div>
                    
                    <div className="pt-4">
                         <button className="w-full py-4 rounded-xl border border-red-500/30 text-red-500 font-bold hover:bg-red-500/10 transition">Delete My Account</button>
                         <p className={`text-center text-xs mt-3 opacity-50 ${getTextClass()}`}>This action allows you to permanently delete your account and data.</p>
                    </div>
                </div>
            </div>
        );
        case 'chats': return (
            <div className="animate-slide-up px-2 pb-20">
                <SettingsHeader title="Appearance & Chats" onBack={() => setSettingsView('main')} />
                <div className="space-y-6">
                    <div className="space-y-3">
                        <h3 className={`text-sm font-bold uppercase tracking-wider opacity-60 ${getTextClass()}`}>UI Theme</h3>
                        <ThemeOption id="glass" name="Neo-Modern Glass" colors="bg-gradient-to-tr from-cyan-500 to-blue-600" />
                        <ThemeOption id="amoled" name="Premium Dark AMOLED" colors="bg-black border border-gray-700" />
                        <ThemeOption id="pastel" name="Minimal Pastel" colors="bg-white border border-gray-200" />
                        <ThemeOption id="hybrid" name="VisionOS Hybrid" colors="bg-gradient-to-tr from-slate-900 to-cyan-900 border border-white/10" />
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
                    <button onClick={onClearChats} className="w-full py-3 text-red-500 font-bold border border-red-500/30 rounded-xl hover:bg-red-500/10 transition">Clear All Chats</button>
                </div>
            </div>
        );
        case 'privacy': return (
            <div className="animate-slide-up px-2 pb-20">
                <SettingsHeader title="Privacy & Security" onBack={() => setSettingsView('main')} />
                <div className="space-y-4">
                    <h3 className={`text-sm font-bold uppercase tracking-wider opacity-60 ${getTextClass()}`}>Visibility</h3>
                    <div className="flex justify-between items-center py-2">
                        <span className={getTextClass()}>Last Seen</span>
                        <select className={`bg-transparent ${getTextClass()} outline-none border-b border-gray-600`} value={currentUser.settings?.privacy.lastSeen} onChange={(e) => onUpdateSettings({ privacy: { ...currentUser.settings!.privacy, lastSeen: e.target.value as any } })}>
                            <option value="everyone" className="text-black">Everyone</option>
                            <option value="contacts" className="text-black">Contacts</option>
                            <option value="nobody" className="text-black">Nobody</option>
                        </select>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className={getTextClass()}>Profile Photo</span>
                        <select className={`bg-transparent ${getTextClass()} outline-none border-b border-gray-600`} value={currentUser.settings?.privacy.profilePhoto} onChange={(e) => onUpdateSettings({ privacy: { ...currentUser.settings!.privacy, profilePhoto: e.target.value as any } })}>
                            <option value="everyone" className="text-black">Everyone</option>
                            <option value="contacts" className="text-black">Contacts</option>
                            <option value="nobody" className="text-black">Nobody</option>
                        </select>
                    </div>
                    <Toggle label="Read Receipts" checked={currentUser.settings?.privacy.readReceipts || false} onChange={onToggleReadReceipts} />
                    
                    <h3 className={`text-sm font-bold uppercase tracking-wider opacity-60 mt-6 ${getTextClass()}`}>Blocked Users</h3>
                    {currentUser.blockedUsers.length === 0 ? <p className={getSubTextClass()}>No blocked users</p> : (
                        <div className="space-y-2">
                            {currentUser.blockedUsers.map(id => {
                                const blockedUser = users.find(u => u.id === id);
                                return (
                                    <div key={id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                        <span className={getTextClass()}>{blockedUser?.name || 'Unknown'}</span>
                                        <button onClick={() => onUnblockUser(id)} className="text-red-400 text-sm">Unblock</button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
        case 'notifications': return (
            <div className="animate-slide-up px-2 pb-20">
                <SettingsHeader title="Notifications" onBack={() => setSettingsView('main')} />
                <Toggle label="Message Sounds" checked={currentUser.settings?.notifications.sound || false} onChange={() => onUpdateSettings({ notifications: { ...currentUser.settings!.notifications, sound: !currentUser.settings!.notifications.sound } })} />
                <Toggle label="Vibration" checked={currentUser.settings?.notifications.vibration || false} onChange={() => onUpdateSettings({ notifications: { ...currentUser.settings!.notifications, vibration: !currentUser.settings!.notifications.vibration } })} />
                <Toggle label="Show Previews" checked={currentUser.settings?.notifications.preview || false} onChange={() => onUpdateSettings({ notifications: { ...currentUser.settings!.notifications, preview: !currentUser.settings!.notifications.preview } })} />
            </div>
        );
        case 'storage': return (
            <div className="animate-slide-up px-2 pb-20">
                <SettingsHeader title="Data & Storage" onBack={() => setSettingsView('main')} />
                <div className={`p-4 rounded-xl mb-6 ${appTheme === 'pastel' ? 'bg-gray-100' : 'bg-white/5'}`}>
                    <h3 className={`font-bold mb-2 ${getTextClass()}`}>Network Usage</h3>
                    <div className="flex justify-between text-sm mb-1"><span className={getSubTextClass()}>Sent</span><span className={getTextClass()}>1.2 GB</span></div>
                    <div className="flex justify-between text-sm"><span className={getSubTextClass()}>Received</span><span className={getTextClass()}>5.8 GB</span></div>
                    <div className="w-full bg-gray-600 h-2 rounded-full mt-3 overflow-hidden"><div className="bg-emerald-500 h-full w-[30%]"></div></div>
                </div>
                <h3 className={`text-sm font-bold uppercase tracking-wider opacity-60 mb-2 ${getTextClass()}`}>Auto-Download Media</h3>
                <Toggle label="Photos" checked={true} onChange={() => {}} description="Over WiFi and Cellular" />
                <Toggle label="Videos" checked={false} onChange={() => {}} description="WiFi Only" />
                <Toggle label="Documents" checked={false} onChange={() => {}} description="WiFi Only" />
            </div>
        );
        case 'help': return (
            <div className="animate-slide-up px-2 pb-20">
                <SettingsHeader title="Help & Support" onBack={() => setSettingsView('main')} />
                <div className="space-y-2">
                    <button onClick={() => setSettingsView('help-center')} className={`w-full p-4 rounded-xl text-left ${appTheme === 'pastel' ? 'bg-white shadow-sm' : 'bg-white/5 hover:bg-white/10'} ${getTextClass()}`}>FAQ / Help Center</button>
                    <button onClick={() => setSettingsView('contact-us')} className={`w-full p-4 rounded-xl text-left ${appTheme === 'pastel' ? 'bg-white shadow-sm' : 'bg-white/5 hover:bg-white/10'} ${getTextClass()}`}>Contact Us</button>
                    <button onClick={() => setSettingsView('terms')} className={`w-full p-4 rounded-xl text-left ${appTheme === 'pastel' ? 'bg-white shadow-sm' : 'bg-white/5 hover:bg-white/10'} ${getTextClass()}`}>Terms & Privacy Policy</button>
                    <button onClick={() => setSettingsView('app-info')} className={`w-full p-4 rounded-xl text-left ${appTheme === 'pastel' ? 'bg-white shadow-sm' : 'bg-white/5 hover:bg-white/10'} ${getTextClass()}`}>App Info</button>
                </div>
            </div>
        );
        case 'help-center': return (
            <div className="animate-slide-up px-2 pb-20">
                 <SettingsHeader title="Help Center" onBack={() => setSettingsView('help')} />
                 <div className={`p-4 rounded-xl space-y-4 ${getTextClass()}`}>
                     <details className="cursor-pointer group"><summary className="font-bold marker:text-emerald-500">How to secure my chat?</summary><p className={`mt-2 text-sm ${getSubTextClass()}`}>Use the Lock Chat feature in the Contact Info panel. You can set a PIN to access specific folders.</p></details>
                     <details className="cursor-pointer group"><summary className="font-bold marker:text-emerald-500">Is it end-to-end encrypted?</summary><p className={`mt-2 text-sm ${getSubTextClass()}`}>Yes, NexusChat uses simulated E2E encryption for all messages and calls.</p></details>
                     <details className="cursor-pointer group"><summary className="font-bold marker:text-emerald-500">How to delete my account?</summary><p className={`mt-2 text-sm ${getSubTextClass()}`}>Go to Account Settings and tap 'Delete My Account'. This action is irreversible.</p></details>
                 </div>
            </div>
        );
        case 'contact-us': return (
            <div className="animate-slide-up px-2 pb-20">
                 <SettingsHeader title="Contact Us" onBack={() => setSettingsView('help')} />
                 <textarea className={`w-full p-4 rounded-xl h-40 outline-none ${appTheme === 'pastel' ? 'bg-gray-100 text-gray-900' : 'bg-white/5 text-white border border-gray-700'}`} placeholder="Describe your issue..."></textarea>
                 <button className="w-full mt-4 py-3 bg-emerald-500 rounded-xl font-bold text-white hover:bg-emerald-600 transition">Submit Request</button>
            </div>
        );
        case 'terms': return (
            <div className="animate-slide-up px-2 pb-20">
                 <SettingsHeader title="Terms & Privacy" onBack={() => setSettingsView('help')} />
                 <div className={`text-sm space-y-4 leading-relaxed ${getTextClass()}`}>
                     <p><strong>1. Privacy Policy:</strong> We value your privacy. Your data is yours.</p>
                     <p><strong>2. Usage:</strong> Do not use NexusChat for illegal activities.</p>
                     <p><strong>3. Content:</strong> You are responsible for the media you share.</p>
                     <p className="opacity-50 text-xs">Last updated: Oct 2025</p>
                 </div>
            </div>
        );
        case 'app-info': return (
            <div className="animate-slide-up px-2 pb-20 text-center">
                 <SettingsHeader title="App Info" onBack={() => setSettingsView('help')} />
                 <div className="w-20 h-20 bg-gradient-to-tr from-cyan-500 to-emerald-500 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl shadow-neon text-white">N</div>
                 <h2 className={`text-2xl font-bold ${getTextClass()}`}>NexusChat</h2>
                 <p className={getSubTextClass()}>Version 2.5.0 (Beta)</p>
                 <p className={`mt-4 ${getSubTextClass()}`}>© 2025 Nexus Inc.</p>
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
        {/* Profile Card / Header (Dashboard Style) */}
        <div className="p-4 shrink-0">
            <div className={`p-4 rounded-2xl flex items-center justify-between shadow-lg transition-all duration-300 ${appTheme === 'pastel' ? 'bg-white' : appTheme === 'hybrid' ? 'bg-gradient-to-r from-slate-800 to-indigo-900 border border-white/10 shadow-hybrid' : 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-neon-purple'}`}>
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { onTabChange('settings'); setSettingsView('main'); }}>
                    <div className="relative">
                        <img src={currentUser.avatar} className="w-12 h-12 rounded-full border-2 border-white/50" alt="Me" />
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-indigo-700 rounded-full"></span>
                    </div>
                    <div>
                        <h3 className={`font-bold text-lg leading-tight ${appTheme === 'pastel' ? 'text-gray-900' : 'text-white'}`}>{currentUser.name}</h3>
                        <p className={`text-xs ${appTheme === 'pastel' ? 'text-gray-500' : 'text-gray-300'}`}>{currentUser.phoneNumber}</p>
                    </div>
                </div>
                <button onClick={() => { onTabChange('settings'); setSettingsView('main'); }} className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition">
                    <svg className={`w-5 h-5 ${appTheme === 'pastel' ? 'text-gray-700' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
            </div>
        </div>

        {navPosition === 'top' && <NavTabs activeTab={activeTab} onChange={onTabChange} theme={appTheme} position="top" />}

        {/* Content */}
        <div className={`flex-1 overflow-y-auto scrollbar-hide px-4 ${navPosition === 'bottom' ? 'pb-28' : 'pb-4'}`}>
            {(activeTab === 'chats' || activeTab === 'groups') && (
                <>
                  {/* Animated Search Bar */}
                  <div className={`mb-4 sticky top-0 z-20 pt-2 pb-2 transition-all ${appTheme === 'glass' ? 'bg-transparent' : appTheme === 'amoled' ? 'bg-black' : appTheme === 'hybrid' ? 'bg-slate-900/80 backdrop-blur-md' : 'bg-white'}`}>
                      <div className={`relative group w-full transition-all duration-300 ${isSearchFocused ? 'scale-105' : 'scale-100'}`}>
                          <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none`}>
                              <svg className={`w-5 h-5 ${isSearchFocused ? 'text-emerald-500' : getSubTextClass()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                          </div>
                          <input 
                                type="text" 
                                placeholder="Search conversations..." 
                                value={searchTerm} 
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setIsSearchFocused(false)}
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className={`w-full pl-12 pr-4 py-3 rounded-2xl outline-none transition-all shadow-lg ${appTheme === 'pastel' ? 'bg-gray-100 text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-200' : 'bg-white/5 text-white focus:bg-white/10 border border-white/5 focus:border-emerald-500/50'}`} 
                          />
                      </div>
                  </div>

                  {/* Folder Tabs */}
                  {activeTab === 'chats' && (
                     <>
                        <div className="flex space-x-2 mb-4 overflow-x-auto scrollbar-hide pb-1 z-10 relative">
                            {(['all', 'personal', 'work', 'locked'] as ChatFolder[]).map(folder => (
                                <button 
                                    key={folder}
                                    type="button" 
                                    onClick={(e) => handleFolderClick(e, folder)}
                                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${activeFolder === folder ? 'bg-emerald-500 text-white shadow-neon' : `${appTheme === 'pastel' ? 'bg-gray-200 text-gray-600' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}`}
                                >
                                    {folder === 'locked' ? '🔒 Locked' : folder.charAt(0).toUpperCase() + folder.slice(1)}
                                </button>
                            ))}
                        </div>
                        {/* Archived Toggle / Lock Actions */}
                        <div className="flex items-center justify-between mb-2 px-1">
                             <button 
                                onClick={() => setShowArchived(!showArchived)} 
                                className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-1 hover:text-emerald-500 transition ${showArchived ? 'text-emerald-500' : getSubTextClass()}`}
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                <span>{showArchived ? 'Hide Archived' : 'View Archived'}</span>
                             </button>
                             {activeFolder === 'locked' && isLockedFolderOpen && (
                                 <button 
                                    onClick={handleLockFolder}
                                    className="text-xs text-red-400 font-bold border border-red-500/30 px-3 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center space-x-1 transition"
                                 >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    <span>Lock Folder</span>
                                 </button>
                             )}
                        </div>
                     </>
                  )}

                  <div className="space-y-2">
                      {filteredChats.length === 0 ? (
                          <div className={`text-center py-10 opacity-60 ${getTextClass()}`}>
                              <p>No {activeTab === 'groups' ? 'groups' : 'chats'} found</p>
                              {activeFolder === 'locked' && !isLockedFolderOpen && <p className="text-sm mt-2">Tap 'Locked' above to unlock</p>}
                              {activeFolder === 'locked' && isLockedFolderOpen && <p className="text-sm mt-2 text-emerald-500">Folder is unlocked but empty.</p>}
                              <button onClick={() => setShowNewChatModal(true)} className="mt-4 text-emerald-500 font-bold hover:underline">Start a new chat</button>
                          </div>
                      ) : (
                          filteredChats.map(chat => {
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
                                              {chat.lastMessage && <span className={`text-xs font-medium ${getSubTextClass()}`}>{chat.lastMessage.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                                          </div>
                                          <p className={`text-sm truncate opacity-80 ${getSubTextClass()}`}>
                                              {chat.lastMessage ? (
                                                  <span className="flex items-center">
                                                      {chat.lastMessage.senderId === currentUser.id && <span className="mr-1">You:</span>}
                                                      {chat.lastMessage.type === 'image' ? '📷 Photo' : chat.lastMessage.content}
                                                  </span>
                                              ) : "Start chatting..."}
                                          </p>
                                      </div>
                                      {chat.unreadCount > 0 && <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-black shadow-neon">{chat.unreadCount}</div>}
                                  </div>
                              );
                          })
                      )}
                  </div>
                </>
            )}

            {activeTab === 'settings' && renderSettings()}
            
            {activeTab === 'status' && (
                <div className="space-y-6 animate-fade-in pb-20">
                    {/* My Status - Glowing & 3D */}
                    <div 
                        className={`relative overflow-hidden p-4 rounded-3xl cursor-pointer transition-all duration-300 group transform hover:scale-[1.01] ${
                            appTheme === 'pastel' ? 'bg-white shadow-lg border border-gray-100' : 
                            appTheme === 'hybrid' ? 'bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-hybrid' :
                            'bg-white/5 backdrop-blur-lg border border-white/5 shadow-glass'
                        }`}
                        onClick={() => onAddStory('image', '')}
                    >
                        {/* Background Glow for My Status */}
                        <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[50px] opacity-20 pointer-events-none ${appTheme === 'pastel' ? 'bg-purple-400' : 'bg-emerald-500'}`}></div>

                        <div className="flex items-center space-x-5 relative z-10">
                            <div className="relative">
                                <div className={`w-16 h-16 rounded-full p-[2px] ${appTheme === 'pastel' ? 'bg-gray-200' : 'bg-gradient-to-tr from-emerald-500 to-cyan-500 shadow-neon'}`}>
                                    <img src={currentUser.avatar} className={`w-full h-full rounded-full object-cover border-2 ${appTheme === 'pastel' ? 'border-white' : 'border-gray-900'}`} alt="My Status" />
                                </div>
                                <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-white font-bold text-sm shadow-md animate-pulse">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-bold text-lg ${getTextClass()}`}>My Status</h3>
                                <p className={`text-sm opacity-70 ${getSubTextClass()}`}>Tap to add to your story</p>
                            </div>
                            {/* Mini Camera Icon */}
                            <div className={`p-3 rounded-full ${appTheme === 'pastel' ? 'bg-gray-100 text-gray-600' : 'bg-white/10 text-white'}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* Recent Updates */}
                    <div>
                        <h4 className={`text-sm font-bold uppercase tracking-wider mb-4 px-2 opacity-60 ${getTextClass()}`}>Recent Updates</h4>
                        <div className="space-y-3">
                            {Object.entries(groupedStories).map(([userId, stories]) => {
                                const userStories = stories as Story[];
                                const user = users.find(u => u.id === userId);
                                const lastStory = userStories[userStories.length - 1];
                                if (!user || userId === currentUser.id) return null;

                                return (
                                    <div 
                                        key={userId} 
                                        onClick={() => onViewStory(userStories[0].id)} 
                                        className={`group relative flex items-center p-3 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                                            appTheme === 'pastel' ? 'bg-white shadow-sm hover:shadow-md border border-gray-100' : 
                                            appTheme === 'hybrid' ? 'bg-slate-800/40 backdrop-blur-md border border-white/5 hover:bg-slate-800/60 shadow-lg' :
                                            'bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10'
                                        }`}
                                    >
                                        {/* Avatar with 3D Ring */}
                                        <div className="relative mr-4 shrink-0">
                                            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-fuchsia-600 blur-[2px] opacity-80 group-hover:opacity-100 transition duration-500"></div>
                                            <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-fuchsia-600 shadow-lg">
                                                <img src={user.avatar} className={`w-14 h-14 rounded-full object-cover border-2 ${appTheme === 'pastel' ? 'border-white' : 'border-gray-900'}`} alt={user.name} />
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-bold text-lg truncate ${getTextClass()}`}>{user.name}</h3>
                                            <p className={`text-sm ${getSubTextClass()} truncate`}>
                                                {userStories.length} new {userStories.length === 1 ? 'story' : 'stories'} • {lastStory.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </p>
                                        </div>

                                        {/* Mini Thumbnail Preview */}
                                        <div className="shrink-0 w-10 h-14 rounded-lg overflow-hidden border border-white/10 shadow-md transform rotate-3 group-hover:rotate-0 transition duration-300">
                                            {lastStory.type === 'image' && <img src={lastStory.content} className="w-full h-full object-cover" alt="" />}
                                            {lastStory.type === 'video' && <video src={lastStory.content} className="w-full h-full object-cover" muted />}
                                            {lastStory.type === 'text' && (
                                                <div className="w-full h-full flex items-center justify-center text-[6px] text-white font-bold p-1 text-center" style={{ backgroundColor: lastStory.background || '#6366f1' }}>
                                                    {lastStory.content}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'calls' && (
                <div className="animate-fade-in relative h-full flex flex-col">
                    {/* Parallax Header */}
                    <div className={`h-40 shrink-0 relative overflow-hidden flex items-end p-6 ${appTheme === 'pastel' ? 'bg-gradient-to-br from-purple-100 to-blue-100' : 'bg-gradient-to-br from-indigo-900 to-purple-900'}`}>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <div className="relative z-10">
                            <h2 className={`text-3xl font-bold ${getTextClass()}`}>Call History</h2>
                            <p className={`text-sm ${getSubTextClass()}`}>Recent voice and video calls</p>
                        </div>
                        {/* Floating Icon */}
                        <div className="absolute top-4 right-4 text-white/10 transform rotate-12">
                            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.44-5.15-3.75-6.59-6.59l1.97-1.57c.26-.26.35-.65.24-1.01A11.36 11.36 0 018.59 3c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM12 3v10l3-3h6V3h-9z"/></svg>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className={`px-4 py-4 sticky top-0 z-20 ${appTheme === 'glass' ? 'backdrop-blur-md' : appTheme === 'amoled' ? 'bg-black' : 'bg-transparent'}`}>
                        <div className={`p-1 rounded-xl flex ${appTheme === 'pastel' ? 'bg-gray-200' : 'bg-black/20 border border-white/10'}`}>
                            {(['all', 'missed', 'incoming'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setCallFilter(f)}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all ${callFilter === f ? (appTheme === 'pastel' ? 'bg-white shadow-sm text-gray-900' : 'bg-white/10 text-white shadow-neon') : getSubTextClass()}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto px-2 pb-20">
                        {filteredCalls.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                                <div className="w-24 h-24 bg-gradient-to-tr from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg animate-float">
                                    <span className="text-4xl">📞✨</span>
                                </div>
                                <div>
                                    <h3 className={`text-xl font-bold ${getTextClass()}`}>No calls yet</h3>
                                    <p className={`text-sm ${getSubTextClass()}`}>Start a conversation with a new call!</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredCalls.map(log => {
                                    const user = users.find(u => u.id === log.userId) || users[0];
                                    const isMissed = log.status === CallStatus.MISSED;
                                    return (
                                         <div key={log.id} className={`flex items-center justify-between p-4 rounded-2xl transition hover:scale-[1.01] ${appTheme === 'pastel' ? 'bg-white shadow-sm' : 'bg-white/5 hover:bg-white/10 border border-white/5'}`}>
                                            <div className="flex items-center space-x-4">
                                                <img src={user.avatar} className="w-12 h-12 rounded-full border border-white/10" alt="" />
                                                <div>
                                                    <h4 className={`font-bold ${isMissed ? 'text-red-500' : getTextClass()}`}>{user.name}</h4>
                                                    <div className="flex items-center space-x-1 text-xs opacity-60">
                                                        {log.direction === 'outgoing' ? <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg> : <svg className={`w-3 h-3 ${isMissed ? 'text-red-500' : 'text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>}
                                                        <span className={getSubTextClass()}>{log.timestamp.toLocaleDateString()} • {log.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => onStartCall(user.id, log.type)} className={`p-3 rounded-full relative group overflow-hidden ${isMissed ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                                 <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-20 transition"></div>
                                                 {log.type === CallType.VIDEO ? (
                                                     <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                 ) : (
                                                     <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                 )}
                                            </button>
                                         </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>

        {/* Floating Action Button (New Chat) */}
        {(activeTab === 'chats' || activeTab === 'groups') && (
             <div className={`absolute bottom-28 right-6 z-30 flex flex-col items-center space-x-0 space-y-3`}>
                 <button onClick={() => setShowNewChatModal(true)} className={`w-14 h-14 bg-gradient-to-tr from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center text-white shadow-float hover:scale-110 transition-transform group`}>
                     <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                 </button>
             </div>
        )}
        
        {/* New Chat Modal (Internal) */}
        {showNewChatModal && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                <div className={`w-full sm:max-w-md h-[85vh] sm:h-auto sm:max-h-[80vh] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all transform scale-100 ${appTheme === 'pastel' ? 'bg-white' : appTheme === 'hybrid' ? 'bg-slate-900/90 border border-white/10 shadow-hybrid' : 'bg-gray-900 border border-gray-700'}`}>
                    
                    {/* Modal Header */}
                    <div className={`p-6 border-b shrink-0 flex justify-between items-center ${appTheme === 'pastel' ? 'border-gray-100' : 'border-white/5'}`}>
                        <div>
                            <h3 className={`font-bold text-2xl ${getTextClass()}`}>New Chat</h3>
                            <p className={`text-sm ${getSubTextClass()}`}>Select a contact to start messaging</p>
                        </div>
                        <button onClick={() => setShowNewChatModal(false)} className={`p-2 rounded-full transition ${appTheme === 'pastel' ? 'bg-gray-100 hover:bg-gray-200' : 'bg-white/5 hover:bg-white/10 text-white'}`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Floating Search Bar */}
                    <div className="px-6 py-2 shrink-0">
                        <div className={`relative group`}>
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className={`w-5 h-5 ${getSubTextClass()}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                             </div>
                             <input 
                                type="text" 
                                placeholder="Search contacts..." 
                                value={newChatSearch}
                                onChange={(e) => setNewChatSearch(e.target.value)}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all ${appTheme === 'pastel' ? 'bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-purple-200' : 'bg-black/20 text-white focus:bg-black/40 border border-white/5 focus:border-emerald-500/50'}`}
                             />
                        </div>
                    </div>

                    {/* Contact List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {users.filter(u => u.name.toLowerCase().includes(newChatSearch.toLowerCase())).map(u => (
                            <button 
                                key={u.id} 
                                onClick={() => { onCreateChat(u.id); setShowNewChatModal(false); }} 
                                className={`w-full p-3 flex items-center space-x-4 rounded-2xl transition-all duration-200 group relative overflow-hidden ${appTheme === 'pastel' ? 'hover:bg-gray-50 active:bg-gray-100' : 'hover:bg-white/5 active:bg-white/10'}`}
                            >
                                <div className="relative shrink-0">
                                    <img src={u.avatar} className={`w-14 h-14 rounded-full object-cover shadow-md group-hover:shadow-lg transition-shadow ${u.status === 'online' ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-transparent' : ''}`} alt="" />
                                    {u.status === 'online' && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-black rounded-full shadow-neon"></div>}
                                </div>
                                
                                <div className="flex-1 text-left min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <h4 className={`font-bold text-lg truncate ${getTextClass()}`}>{u.name}</h4>
                                        <span className={`text-xs font-medium ${u.status === 'online' ? 'text-emerald-500' : 'opacity-40'} ${getTextClass()}`}>
                                            {u.status === 'online' ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                    <p className={`text-sm truncate opacity-70 ${getSubTextClass()}`}>{u.bio}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}
        
        <PinModal 
            isOpen={showPinModal} 
            onClose={() => setShowPinModal(false)} 
            onSuccess={() => {
                setIsLockedFolderOpen(true);
                setActiveFolder('locked');
            }}
            title="Access Locked Folder"
            actionLabel="Unlock"
            appTheme={appTheme}
        />

        {navPosition === 'bottom' && <NavTabs activeTab={activeTab} onChange={onTabChange} theme={appTheme} position="bottom" />}
    </div>
  );
};

const NavTabs = ({ activeTab, onChange, theme, position }: { activeTab: string, onChange: (t: any) => void, theme: AppTheme, position: 'top' | 'bottom' }) => {
    const isPastel = theme === 'pastel';
    const isGlass = theme === 'glass';
    const isHybrid = theme === 'hybrid';
    
    const wrapperClass = position === 'bottom' 
        ? "absolute bottom-6 left-6 right-6 z-40" 
        : "px-4 py-2 mb-2";

    const containerClass = position === 'bottom'
        ? (isPastel ? "bg-white/95 shadow-lg border border-gray-100 rounded-[2rem] justify-around" : isGlass ? "bg-black/40 backdrop-blur-xl border border-white/10 shadow-glass rounded-[2rem] justify-around" : isHybrid ? "bg-slate-900/60 backdrop-blur-2xl border border-white/10 shadow-hybrid rounded-[2rem] justify-around" : "bg-gray-900 border border-gray-800 shadow-2xl rounded-[2rem] justify-around")
        : (isPastel ? "bg-gray-100 p-1 rounded-xl grid grid-cols-4 gap-1" : "bg-white/5 p-1 rounded-xl grid grid-cols-4 gap-1 border border-white/5");

    const activeItemClass = position === 'bottom'
        ? (isPastel ? "text-purple-600 bg-purple-50 shadow-sm -translate-y-1" : isHybrid ? "text-cyan-400 bg-cyan-900/20 border border-cyan-500/30 shadow-neon-cyan -translate-y-1" : "text-white bg-gradient-to-tr from-cyan-500 to-blue-500 shadow-neon -translate-y-1")
        : (isPastel ? "bg-white text-gray-900 shadow-sm" : "bg-white/10 text-white shadow-sm");

    const inactiveItemClass = position === 'bottom'
        ? (isPastel ? "text-gray-400 hover:text-gray-600" : "text-gray-500 hover:text-gray-300")
        : (isPastel ? "text-gray-500 hover:text-gray-700 hover:bg-white/50" : "text-gray-400 hover:text-white hover:bg-white/5");

    const tabs = ['chats', 'groups', 'status', 'calls'];

    return (
        <div className={wrapperClass}>
            <div className={`flex items-center px-2 py-2 ${containerClass} transition-all duration-300`}>
                {tabs.map(tab => {
                    const isActive = activeTab === tab;
                    return (
                        <button 
                            key={tab} 
                            onClick={() => onChange(tab)} 
                            className={`relative group flex flex-col items-center justify-center ${position === 'bottom' ? 'w-12 h-12 rounded-2xl' : 'h-9 rounded-lg'} transition-all duration-300 ease-out ${isActive ? activeItemClass : inactiveItemClass}`}
                        >
                            <span className={`transition-transform duration-300 ${isActive && position === 'bottom' ? 'scale-110' : ''}`}>
                               {tab === 'chats' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> : 
                                tab === 'groups' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> :
                                tab === 'status' ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" /></svg> :
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                            </span>
                            {position === 'top' && <span className="text-[10px] mt-0.5 font-medium capitalize">{tab}</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
