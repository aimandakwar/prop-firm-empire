import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yuadrxbvyhbbtbmodsve.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YWRyeGJ2eWhiYnRibW9kc3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODY3MjMsImV4cCI6MjA4ODY2MjcyM30.J6E2hVdBftaz5wUiKzPDMZAc53XQuycAW7CKtnkIuL4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

export default supabase
