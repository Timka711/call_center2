import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === 'your-project-url') {
  throw new Error(
    'Please click the "Connect to Supabase" button in the top right corner to set up your Supabase project'
  );
}

if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key') {
  throw new Error(
    'Missing Supabase anonymous key. Please click the "Connect to Supabase" button to set up your project'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);