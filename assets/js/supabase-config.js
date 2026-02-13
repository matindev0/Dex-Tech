// ===== SUPABASE CONFIGURATION =====
// Follow SUPABASE_SETUP.md for setup instructions

// IMPORTANT: Replace the values below with your actual Supabase credentials
// Get them from: Supabase Dashboard -> Project Settings -> API

const supabaseUrl = 'https://jkvsdgqsqekoruufxzjs.supabase.co';

// Preferred: anon public key (legacy name). Paste it here if you have it.
const supabaseAnonKey = '';

// New Supabase key label: publishable key (client-safe)
const supabasePublishableKey = 'sb_publishable_Oq8Dt2FNR0Zeh7rK6OXEGw_Rxqq5oEU';

// The SDK will use anon if present, otherwise publishable.
const supabaseKey = supabaseAnonKey || supabasePublishableKey;

// Example:
// const supabaseUrl = 'https://abc123.supabase.co';
// const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
// const supabasePublishableKey = 'sb_publishable_...';
// const supabaseKey = supabaseAnonKey || supabasePublishableKey;
