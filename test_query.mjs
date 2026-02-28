import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://tyhqaqazwslmvabpspfv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5aHFhcWF6d3NsbXZhYnBzcGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTU3NzEsImV4cCI6MjA4NzY5MTc3MX0.eirwzH2hOIcM4vlahOq0PjUSvgBm5vOJNcvEWGRX6mA')

async function run() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'mdnishan006@gmail.com',
    password: 'Password123!'
  })
  
  const { data: analyses } = await supabase
    .from('analyses')
    .select('id, status, app_name, app_id, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    
  console.log(JSON.stringify(analyses, null, 2))
}

run()
