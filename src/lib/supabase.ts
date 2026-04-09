import { createClient } from '@supabase/supabase-js';

// Singleton — created once, shared across the entire app
// Prevents "Multiple GoTrueClient instances" warning in development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
