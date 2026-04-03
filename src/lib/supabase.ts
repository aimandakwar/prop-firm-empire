import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://yuadrxbvyhbbtbmodsve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YWRyeGJ2eWhiYnRibW9kc3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODY3MjMsImV4cCI6MjA4ODY2MjcyM30.J6E2hVdBftaz5wUiKzPDMZAc53XQuycAW7CKtnkIuL4'
)
