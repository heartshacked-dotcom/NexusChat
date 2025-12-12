
import { io, Socket } from "socket.io-client";
import { MessageType } from "../types";

// Ensure this matches your backend port
const SERVER_URL = "http://localhost:3001";

class SocketService {
  public socket: Socket | null = null;

  connect(userId: string) {
    if (this.socket) return;

    this.socket = io(SERVER_URL, {
      auth: {
        userId,
      },
      transports: ["websocket"],
    });

    this.socket.on("connect", () => {
      console.log("Connected to Socket.io server with ID:", this.socket?.id);
    });

    this.socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinChat(chatId: string) {
    this.socket?.emit("join_chat", chatId);
  }

  leaveChat(chatId: string) {
    this.socket?.emit("leave_chat", chatId);
  }

  sendMessage(payload: {
    chatId: string;
    senderId: string;
    content: string;
    type: MessageType;
    mediaUrl?: string;
    replyToId?: string;
  }) {
    this.socket?.emit("send_message", payload);
  }

  sendTypingStart(chatId: string) {
    this.socket?.emit("typing_start", { chatId });
  }

  sendTypingEnd(chatId: string) {
    this.socket?.emit("typing_end", { chatId });
  }

  // --- WebRTC Signaling Wrappers ---
  
  startCall(toUserId: string, offer: any, type: 'audio' | 'video') {
    this.socket?.emit('call_start', { to: toUserId, offer, type });
  }

  answerCall(toUserId: string, answer: any) {
    this.socket?.emit('call_answer', { to: toUserId, answer });
  }

  sendIceCandidate(toUserId: string, candidate: any) {
    this.socket?.emit('ice_candidate', { to: toUserId, candidate });
  }

  endCall(toUserId: string) {
    this.socket?.emit('call_end', { to: toUserId });
  }
}

export const socketService = new SocketService();
