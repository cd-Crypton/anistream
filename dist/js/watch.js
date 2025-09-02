document.addEventListener('DOMContentLoaded', async () => {
    // Get HTML elements
    const videoFrame = document.getElementById('video-frame');
    const serverButtonsContainer = document.getElementById('server-buttons');
    const episodeGuide = document.getElementById('episode-guide');
    const seasonSelector = document.getElementById('season-selector');
    const episodeList = document.getElementById('episode-list');

    // Get content details from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const id = urlParams.get('id');

    // ==========================================================
    // ** THE FIX IS HERE **
    // Read season/episode from URL, with fallbacks to S1E1
    // ==========================================================
    const startSeason = urlParams.get('s') ? parseInt(urlParams.get('s'), 10) : 1;
    const startEpisode = urlParams.get('e') ? parseInt(urlParams.get('e'), 10) : 1;

    // State to keep track of current selection
    let currentServer;
    let currentSeason = startSeason;
    let currentEpisode = startEpisode;
    // ==========================================================

    if (!type || !id) {
        document.body.innerHTML = '<h1>Error: Content information missing.</h1>';
        return;
    }

    // --- Server Definitions ---
    const servers = [
        { name: 'VidSrc', getUrl: (s, e) => `https://vidsrc.to/embed/${type}/${id}/${type === 'tv' ? `${s}-${e}` : ''}` },
        { name: 'VidSrc.me', getUrl: (s, e) => `https://vidsrc.net/embed/${type}/?tmdb=${id}${type === 'tv' ? `&season=${s}&episode=${e}` : ''}` },
        { name: 'Videasy', getUrl: (s, e) => `https://player.videasy.net/${type}/${id}${type === 'tv' ? `/${s}/${e}` : ''}` },
        { name: '2Embed', getUrl: (s, e) => `https://www.2embed.to/embed/tmdb/${type}?id=${id}${type === 'tv' ? `&s=${s}&e=${e}` : ''}` }
    ];

    // --- Core Functions ---
    function updateVideoSource() {
        if (currentServer) {
            videoFrame.src = currentServer.getUrl(currentSeason, currentEpisode);
            console.log('Loading new video source:', videoFrame.src);
        }
    }

    async function fetchAndDisplayEpisodes(seasonNumber) {
        const res = await fetch(`/api/tv/${id}/season/${seasonNumber}`);
        const data = await res.json();
        
        episodeList.innerHTML = '';
        data.episodes.forEach(episode => {
            const button = document.createElement('button');
            button.className = 'episode-btn';
            button.innerText = `Ep ${episode.episode_number}: ${episode.name}`;
            button.dataset.episodeNumber = episode.episode_number;

            button.addEventListener('click', () => {
                currentEpisode = episode.episode_number;
                updateVideoSource();
                document.querySelectorAll('.episode-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });

            episodeList.appendChild(button);
        });

        // ** FIX ** - Activate the correct starting episode button
        const activeEpisodeButton = episodeList.querySelector(`.episode-btn[data-episode-number="${currentEpisode}"]`);
        if (activeEpisodeButton) {
            activeEpisodeButton.classList.add('active');
        } else {
            // Fallback to the first episode if the specified one doesn't exist
            episodeList.querySelector('.episode-btn')?.classList.add('active');
        }
    }

    // --- Initialization Logic ---
    // 1. Generate Server Buttons
    servers.forEach((server, index) => {
        const button = document.createElement('button');
        button.className = 'server-btn';
        button.innerText = server.name;

        button.addEventListener('click', () => {
            currentServer = server;
            updateVideoSource();
            document.querySelectorAll('.server-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });

        serverButtonsContainer.appendChild(button);
        if (index === 0) {
            currentServer = server;
            button.classList.add('active');
        }
    });

    // 2. Handle TV Shows vs Movies
    if (type === 'tv') {
        episodeGuide.style.display = 'block';
        const res = await fetch(`/api/tv/${id}`);
        const data = await res.json();

        data.seasons.forEach(season => {
            if (season.season_number > 0) {
                const option = document.createElement('option');
                option.value = season.season_number;
                option.innerText = season.name;
                seasonSelector.appendChild(option);
            }
        });

        // ** FIX ** - Set the season selector to the correct starting season
        seasonSelector.value = currentSeason;

        seasonSelector.addEventListener('change', async () => {
            currentSeason = seasonSelector.value;
            currentEpisode = 1; // Reset to episode 1 when changing season
            await fetchAndDisplayEpisodes(currentSeason);
            updateVideoSource();
        });

        await fetchAndDisplayEpisodes(currentSeason);
    }
    
    // 3. Load the initial video
    updateVideoSource();
});
