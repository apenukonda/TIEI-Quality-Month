// Single shared Supabase client for the app.
// The project currently loads Supabase from CDN (see index.html) so we access
// the global `supabase` object. We guard against multiple initializations by
// storing the client on `window.__TOYOTA_SUPABASE_CLIENT__` so HMR / multiple
// module evaluations don't create multiple GoTrueClient instances.
// @ts-ignore
const globalAny: any = typeof window !== 'undefined' ? window : globalThis;

let supabaseClient: any = globalAny.__TOYOTA_SUPABASE_CLIENT__;
if (!supabaseClient) {
  // Supabase is loaded from CDN in index.html
  // @ts-ignore
  const { createClient } = supabase;
  const supabaseUrl = 'https://kescaddzecbnhnhpifha.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlc2NhZGR6ZWNibmhuaHBpZmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MzAxMjksImV4cCI6MjA3NTQwNjEyOX0.h69xRfbJSzq_7xd4bR40AmmXoa9zgcMUjxPeWBmkynM';
  supabaseClient = createClient(supabaseUrl, supabaseKey);
  try {
    // non-sensitive debug: print only the supabaseUrl so hosted vs local differences are obvious
    // eslint-disable-next-line no-console
    console.debug('[supabaseClient] using supabaseUrl=', supabaseUrl);
  } catch (e) {
    // ignore
  }
  globalAny.__TOYOTA_SUPABASE_CLIENT__ = supabaseClient;
}

export default supabaseClient;
