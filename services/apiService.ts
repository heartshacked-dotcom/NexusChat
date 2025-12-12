
import { Chat, DBMessage, mapDBMessageToMessage, Message } from "../types";

const API_URL = "http://localhost:3001/api";

// Helper to get headers (simulating Auth token)
const getHeaders = (userId: string) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${userId}` // NOTE: In prod, this should be a real JWT from Supabase Auth
});

export const apiService = {
  
  /**
   * Fetch chats for the current user
   */
  getChats: async (userId: string): Promise<Chat[]> => {
    try {
      const response = await fetch(`${API_URL}/chats`, {
        headers: getHeaders(userId)
      });
      
      if (!response.ok) throw new Error('Failed to fetch chats');
      
      const data = await response.json();
      
      // Transform DB structure to App structure
      // Note: This assumes the backend returns chats joined with participant data
      // Since the mock backend is simple, we might need to merge with MOCK_USERS for participant details
      // if the DB doesn't fully hydrate them.
      return data.map((item: any) => ({
        id: item.chats.id,
        type: item.chats.type,
        participants: [], // In a real app, backend should return participants
        messages: [], // Fetched separately or last message included
        unreadCount: 0,
        pinned: false,
        archived: false,
        lastMessage: item.chats.last_message_at ? { timestamp: new Date(item.chats.last_message_at) } : undefined
      }));
    } catch (error) {
      console.error("API Error getChats:", error);
      return [];
    }
  },

  /**
   * Fetch message history for a specific chat
   */
  getMessages: async (userId: string, chatId: string): Promise<Message[]> => {
    try {
      const response = await fetch(`${API_URL}/chats/${chatId}/messages`, {
        headers: getHeaders(userId)
      });
      
      if (!response.ok) throw new Error('Failed to fetch messages');
      
      const dbMessages: DBMessage[] = await response.json();
      return dbMessages.map(mapDBMessageToMessage);
    } catch (error) {
      console.error("API Error getMessages:", error);
      return [];
    }
  },

  /**
   * Upload file flow:
   * 1. Get Presigned URL from Backend
   * 2. PUT file to Cloudflare R2
   * 3. Return public URL
   */
  uploadFile: async (userId: string, file: File): Promise<string | null> => {
    try {
      // 1. Get Presigned URL
      const preRes = await fetch(`${API_URL}/upload-url`, {
        method: 'POST',
        headers: getHeaders(userId),
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type
        })
      });

      if (!preRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, publicUrl } = await preRes.json();

      // 2. Upload to R2
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      });

      if (!uploadRes.ok) throw new Error('Failed to upload file to storage');

      return publicUrl;
    } catch (error) {
      console.error("File Upload Error:", error);
      return null;
    }
  }
};
