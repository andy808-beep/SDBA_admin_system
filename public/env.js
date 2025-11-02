console.log('🔧 ENV: Loading environment variables');
window.ENV = {
  SUPABASE_URL: "https://khqarcvszewerjckmtpg.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocWFyY3ZzemV3ZXJqY2ttdHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE5MTEsImV4cCI6MjA2NDMyNzkxMX0.d8_q1aI_I5pwNf73FIKxNo8Ok0KNxzF-SGDGegpRwbY",
};

// Dev flag: true on localhost
window.__DEV__ = ['localhost', '127.0.0.1'].includes(location.hostname);

console.log('🔧 ENV: Environment variables loaded');
