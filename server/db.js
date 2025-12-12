import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase Client
// Note: On the backend, we use the Service Role Key to bypass RLS policies when necessary,
// or to act as an admin. For user actions, you might forward the user's JWT.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey);