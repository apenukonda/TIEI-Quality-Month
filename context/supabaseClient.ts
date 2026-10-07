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
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  const isReal = (val?: string) => Boolean(val && val.trim() !== '' && !val.includes('your-'));
  const supabaseUrl = isReal(envUrl) ? envUrl.trim() : 'https://paysoqcytmymbkglhasy.supabase.co';
  const supabaseKey = isReal(envKey) ? envKey.trim() : 'sb_publishable_pCD2TXYDQlTDny0OHkeWnA_zHhHelZx';
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
