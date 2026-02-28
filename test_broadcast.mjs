async function run() {
  const url = 'https://tyhqaqazwslmvabpspfv.supabase.co/realtime/v1/api/broadcast'
  console.log('Sending broadcast...');
  const res = await fetch(url, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5aHFhcWF6d3NsbXZhYnBzcGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTU3NzEsImV4cCI6MjA4NzY5MTc3MX0.eirwzH2hOIcM4vlahOq0PjUSvgBm5vOJNcvEWGRX6mA',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5aHFhcWF6d3NsbXZhYnBzcGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTU3NzEsImV4cCI6MjA4NzY5MTc3MX0.eirwzH2hOIcM4vlahOq0PjUSvgBm5vOJNcvEWGRX6mA'
      },
      body: JSON.stringify({
          messages: [{
              topic: 'test-channel',
              event: 'broadcast',
              payload: { event: 'progress', data: { stage: 'saving_results', percent: 95 } }
          }]
      })
  });
  console.log(res.status, await res.text());
}
run();
