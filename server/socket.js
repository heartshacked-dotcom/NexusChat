import { supabase } from './db.js';

export const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Expect userId in handshake auth
    const userId = socket.handshake.auth.userId;

    if (userId) {
      socket.join(userId);
      // Update user status to online
      supabase.from('users')
        .update({ status: 'online', last_seen: new Date().toISOString() })
        .eq('id', userId)
        .then(({ error }) => {
           if (error) console.error("Error updating status:", error);
        });
    }

    // Join specific chat room
    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`User ${userId} joined chat ${chatId}`);
    });

    // Leave chat room
    socket.on('leave_chat', (chatId) => {
      socket.leave(chatId);
    });

    // Typing Indicators
    socket.on('typing_start', ({ chatId }) => {
      socket.to(chatId).emit('partner_typing', { chatId, userId, isTyping: true });
    });

    socket.on('typing_end', ({ chatId }) => {
      socket.to(chatId).emit('partner_typing', { chatId, userId, isTyping: false });
    });

    // Handle Sending Messages
    socket.on('send_message', async (messagePayload) => {
      const { chatId, senderId, content, type, mediaUrl, replyToId } = messagePayload;

      // 1. Save message to Supabase
      const { data, error } = await supabase.from('messages').insert([
        {
          chat_id: chatId,
          sender_id: senderId,
          content: content,
          type: type,
          media_url: mediaUrl,
          reply_to_id: replyToId,
          status: 'sent',
          created_at: new Date().toISOString()
        }
      ]).select().single();

      if (error) {
        console.error("Error saving message:", error);
        socket.emit('message_error', { error: 'Failed to send message' });
        return;
      }

      // 2. Broadcast to room (including sender for confirmation, or handle optimistically on client)
      io.to(chatId).emit('receive_message', data);

      // 3. Update Chat's last message
      await supabase.from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', chatId);
        
      // TODO: Trigger FCM Push Notification here for offline users
    });

    // --- WebRTC Signaling ---
    
    // Initiate Call
    socket.on('call_start', ({ to, offer, type }) => {
      // 'to' is the partner's userId
      io.to(to).emit('call_incoming', { 
        from: userId, 
        offer, 
        type 
      });
    });

    // Answer Call
    socket.on('call_answer', ({ to, answer }) => {
      io.to(to).emit('call_answered', { 
        from: userId, 
        answer 
      });
    });

    // ICE Candidates (Connectivity checks)
    socket.on('ice_candidate', ({ to, candidate }) => {
      io.to(to).emit('ice_candidate', { 
        from: userId, 
        candidate 
      });
    });

    // End Call
    socket.on('call_end', ({ to }) => {
      io.to(to).emit('call_ended', { from: userId });
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (userId) {
        supabase.from('users')
          .update({ status: 'offline', last_seen: new Date().toISOString() })
          .eq('id', userId)
          .then();
      }
      console.log('User disconnected:', socket.id);
    });
  });
};