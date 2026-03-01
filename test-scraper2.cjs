async function checkRelease() {
    try {
        const gplay = await import('google-play-scraper');

        // Sometimes it exports as default depending on the node environments
        const scraper = gplay.default || gplay;

        const app = await scraper.app({ appId: 'com.linecorp.b612.android' });
        console.log('App Name:', app.title);
        console.log('Version:', app.version);
        console.log('Updated (Date):', new Date(app.updated));
        console.log('Updated (Raw):', app.updated);
        console.log('Released:', app.released);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkRelease();
