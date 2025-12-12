import express from 'express';
import { supabase } from './db.js';
import { getUploadUrl } from './storage.js';

const router = express.Router();

// Middleware placeholder for Auth Verification
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  // Verify token with Supabase Auth
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });
  
  req.user = user;
  next();
};

// GET /api/chats - Get user's chats
router.get('/chats', requireAuth, async (req, res) => {
  const userId = req.user.id;

  // This query assumes a 'chat_participants' junction table
  const { data, error } = await supabase
    .from('chat_participants')
    .select(`
      chat_id,
      chats (
        id,
        type,
        created_at,
        last_message_at
      )
    `)
    .eq('user_id', userId)
    .order('chats(last_message_at)', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/chats/:chatId/messages - Get messages for a chat
router.get('/chats/:chatId/messages', requireAuth, async (req, res) => {
  const { chatId } = req.params;
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(50); // Pagination needed in prod

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/upload-url - Generate Presigned URL for Cloudflare R2
router.post('/upload-url', requireAuth, async (req, res) => {
  const { fileName, contentType } = req.body;
  
  if (!fileName || !contentType) {
      return res.status(400).json({ error: 'Missing fileName or contentType' });
  }

  // Create a unique key for the file
  const key = `uploads/${req.user.id}/${Date.now()}-${fileName}`;
  
  try {
    const uploadUrl = await getUploadUrl(key, contentType);
    res.json({ 
        uploadUrl, 
        key, 
        publicUrl: `${process.env.R2_PUBLIC_URL}/${key}` 
    });
  } catch (err) {
    console.error("Storage Error:", err);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

export default router;