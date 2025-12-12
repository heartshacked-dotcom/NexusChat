
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact',
  SYSTEM = 'system',
  POLL = 'poll'
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export type AppTheme = 'glass' | 'amoled' | 'pastel' | 'hybrid';
export type LayoutMode = 'modern' | 'classic';
export type ChatFolder = 'all' | 'personal' | 'work' | 'locked';

export interface UserSettings {
  privacy: {
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    profilePhoto: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
  };
  notifications: {
    sound: boolean;
    vibration: boolean;
    preview: boolean;
  };
  appTheme: AppTheme; 
  layoutMode: LayoutMode;
  wallpaper: string;
  navPosition: 'top' | 'bottom';
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
  lastSeen: Date;
  bio?: string;
  phoneNumber?: string;
  blockedUsers: string[]; 
  settings?: UserSettings; 
}

export interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; 
}

export interface Message {
  id: string;
  senderId: string;
  content: string; 
  type: MessageType;
  timestamp: Date;
  status: MessageStatus;
  mediaUrl?: string; 
  fileSize?: string;
  location?: { lat: number; lng: number; address?: string };
  reactions: Reaction[];
  replyToId?: string;
  forwarded?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  isStarred?: boolean;
  pollOptions?: PollOption[]; 
}

export interface Chat {
  id: string;
  type: 'individual' | 'group';
  participants: User[];
  messages: Message[];
  unreadCount: number;
  lastMessage?: Message;
  pinned: boolean;
  archived: boolean;
  muted?: boolean;
  muteUntil?: Date | null;
  wallpaper?: string;
  pinnedMessageId?: string;
  ephemeralMode?: boolean;
  folder?: ChatFolder;
  contactNotes?: string;
}

export interface Story {
  id: string;
  userId: string;
  type: 'image' | 'video' | 'text';
  content: string; 
  background?: string; 
  timestamp: Date;
  viewers: User[]; 
  expiresAt: Date;
}

export enum CallType {
  AUDIO = 'audio',
  VIDEO = 'video'
}

export enum CallStatus {
  MISSED = 'missed',
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  ONGOING = 'ongoing', 
  RINGING = 'ringing'
}

export interface CallLog {
  id: string;
  userId: string; 
  type: CallType;
  direction: 'incoming' | 'outgoing';
  status: CallStatus;
  timestamp: Date;
  duration?: number; 
}

// --- Backend DTO Mappers ---

export interface DBMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  type: string;
  media_url?: string;
  reply_to_id?: string;
  status: string;
  created_at: string;
}

export const mapDBMessageToMessage = (dbMsg: DBMessage): Message => ({
  id: dbMsg.id,
  senderId: dbMsg.sender_id,
  content: dbMsg.content || '',
  type: dbMsg.type as MessageType,
  timestamp: new Date(dbMsg.created_at),
  status: dbMsg.status as MessageStatus,
  mediaUrl: dbMsg.media_url,
  replyToId: dbMsg.reply_to_id,
  reactions: [] // Reactions would need a separate table/join
});
