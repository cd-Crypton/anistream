// ===================================
// CONFIGURATION
// ===================================

const BASE_URL = '/api'; // Your Cloudflare proxy for TMDB
const POSTER_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_URL = 'https://image.tmdb.org/t/p/w1280';

let currentItem;
let animeMovieGenres = new Map();
let animeTvGenres = new Map();
let bannerSlidesData = [];
let currentBannerIndex = 0;
let bannerInterval;

// --- New State for Pagination ---
let airingCurrentPage = 1;
let airingTotalPages = 1;

// ===================================
// DATA FETCHING FUNCTIONS
// ===================================

async function fetchAnime(endpoint, params = '') {
  const res = await fetch(`${BASE_URL}/${endpoint}?with_genres=16&with_original_language=ja&${params}`);
  const data = await res.json();
  return data; // Return the full response now
}

async function fetchGenres() {
  // ... (This function remains unchanged)
  try {
    const movieRes = await fetch(`${BASE_URL}/genre/movie/list`);
    const movieData = await movieRes.json();
    movieData.genres.forEach(genre => animeMovieGenres.set(genre.id, genre.name));

    const tvRes = await fetch(`${BASE_URL}/genre/tv/list`);
    const tvData = await tvRes.json();
    tvData.genres.forEach(genre => animeTvGenres.set(genre.id, genre.name));
  } catch (error) {
    console.error("Failed to fetch genres:", error);
  }
}

async function searchTMDB() {
  const query = document.getElementById('search-input').value;
  const container = document.getElementById('search-results');

  if (!query.trim()) {
    container.innerHTML = '';
    return;
  }

  const res = await fetch(`${BASE_URL}/search/multi?query=${encodeURIComponent(query)}`);
  const data = await res.json();

  // --- ANIME FILTER RE-ADDED ---
  const animeResults = data.results.filter(item => 
      item.genre_ids && item.genre_ids.includes(16) && // Checks for Animation genre
      item.original_language === 'ja' &&              // Checks for Japanese language
      item.media_type !== 'person' &&                  // Excludes people
      item.poster_path                                 // Ensures it has an image
  );
  // --- END OF FILTER ---

  if (animeResults.length === 0) {
    container.innerHTML = `<p style="color: var(--text-color-secondary);">No anime found for "${query}".</p>`;
  } else {
    // Use the filtered list to display results
    displayList(animeResults, 'search-results');
  }
}

// ===================================
// UI & INTERACTION FUNCTIONS
// ===================================

function setupTabs() {
  // ... (This function remains unchanged)
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.add('active');
    });
  });
}

async function displayAiringList(items) {
  const container = document.getElementById('airing-now-list');
  container.innerHTML = '<h2>Loading...</h2>'; // Show loading state

  const cardPromises = items.map(async (item) => {
    if (!item.backdrop_path) return '';

    try {
      const res = await fetch(`${BASE_URL}/tv/${item.id}`);
      const details = await res.json();

      const latestEpisode = details.last_episode_to_air?.episode_number || 1;
      const latestSeason = details.last_episode_to_air?.season_number || 1;
      
      return `
        <a class="airing-card" href="watch.html?type=tv&id=${item.id}&s=${latestSeason}&e=${latestEpisode}">
          <img src="${BACKDROP_URL}${item.backdrop_path}" alt="${item.name}" loading="lazy">
          <div class="airing-card-overlay">
            <span class="airing-card-title">${item.name}</span>
            <span class="airing-card-episode">Ep. ${latestEpisode}</span>
          </div>
        </a>
      `;
    } catch (error) {
      console.error(`Failed to fetch details for ${item.name}:`, error);
      return '';
    }
  });

  const cards = await Promise.all(cardPromises);
  container.innerHTML = cards.join('');
}

function displayList(items, containerId) {
  // ... (This function remains unchanged)
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => {
    if (!item.poster_path) return;

    const movieCard = document.createElement('div');
    movieCard.className = 'movie-card';
    movieCard.onclick = () => showDetails(item);

    const title = item.title || item.name;
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    const year = item.release_date ? item.release_date.substring(0, 4) : (item.first_air_date ? item.first_air_date.substring(0, 4) : '');
    const description = item.overview;

    movieCard.innerHTML = `
      <img src="${POSTER_URL}${item.poster_path}" alt="${title}" loading="lazy">
      <div class="card-content">
        <h3 class="card-title">${title}</h3>
        <div class="card-meta">
          <span class="rating">★ ${rating}</span>
          <span class="year">${year}</span>
        </div>
        <p class="card-description">${description}</p>
      </div>
    `;

    container.appendChild(movieCard);
  });
}

// --- New Pagination Functions ---
function setupAiringPagination() {
  const container = document.getElementById('airing-pagination');
  container.innerHTML = '';

  const prevButton = document.createElement('button');
  prevButton.className = 'pagination-btn';
  prevButton.innerText = '<';
  prevButton.disabled = airingCurrentPage === 1;
  prevButton.onclick = () => changeAiringPage(airingCurrentPage - 1);

  const pageButton = document.createElement('button');
  pageButton.className = 'pagination-btn active';
  pageButton.innerText = airingCurrentPage;
  pageButton.disabled = true;

  const nextButton = document.createElement('button');
  nextButton.className = 'pagination-btn';
  nextButton.innerText = '>';
  nextButton.disabled = airingCurrentPage >= airingTotalPages;
  nextButton.onclick = () => changeAiringPage(airingCurrentPage + 1);

  container.append(prevButton, pageButton, nextButton);
}

async function changeAiringPage(newPage) {
  airingCurrentPage = newPage;
  const data = await fetchAnime('discover/tv', `sort_by=popularity.desc&page=${airingCurrentPage}`);
  await displayAiringList(data.results);
  setupAiringPagination();
}

// ... (Rest of your UI functions like showDetails, setupBannerSlider, etc. remain unchanged)
async function showDetails(item) {
    const type = item.media_type === 'movie' || item.release_date ? 'movie' : 'tv';
    currentItem = item;

    document.getElementById('modal-title').textContent = item.title || item.name;
    document.getElementById('modal-description').textContent = item.overview;
    document.getElementById('modal-image').src = `${POSTER_URL}${item.poster_path}`;
    document.getElementById('modal-rating').innerHTML = '★'.repeat(Math.round(item.vote_average / 2));
    
    document.getElementById('watch-button').href = `watch.html?type=${type}&id=${item.id}`;

    const genresSpan = document.getElementById('modal-genres');
    const castSpan = document.getElementById('modal-cast');
    genresSpan.textContent = 'Loading...';
    castSpan.textContent = 'Loading...';

    const genreMap = type === 'movie' ? animeMovieGenres : animeTvGenres;
    const genreNames = item.genre_ids.map(id => genreMap.get(id)).filter(Boolean);
    genresSpan.textContent = genreNames.join(', ') || 'N/A';

    try {
        const res = await fetch(`${BASE_URL}/${type}/${item.id}/credits`);
        const creditsData = await res.json();
        const mainCast = creditsData.cast.slice(0, 4).map(actor => actor.name);
        castSpan.textContent = mainCast.join(', ') || 'N/A';
    } catch (error) {
        console.error("Failed to fetch credits:", error);
        castSpan.textContent = 'Info not available.';
    }

    document.getElementById('modal').style.display = 'flex';
}

function setupBannerSlider(items) {
    bannerSlidesData = items.slice(0, 5);
    const slidesContainer = document.getElementById('banner-slides');
    const dotsContainer = document.getElementById('banner-dots');
    if (!slidesContainer || !dotsContainer) return;
    
    slidesContainer.innerHTML = '';
    dotsContainer.innerHTML = '';

    bannerSlidesData.forEach((item, index) => {
        const slide = document.createElement('div');
        slide.className = 'banner-slide';
        slide.style.backgroundImage = `url(${BACKDROP_URL}${item.backdrop_path})`;
        
        const content = document.createElement('div');
        content.className = 'banner-content';
        
        const year = item.first_air_date ? item.first_air_date.substring(0, 4) : '';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const type = 'tv';
        
        content.innerHTML = `
            <h1>${item.name || item.title}</h1>
            <div class="banner-meta">
              <span>${year}</span> &bull; <span class="rating">★ ${rating}</span>
            </div>
            <p class="banner-description">${item.overview}</p>
            <div class="banner-buttons">
                <a href="watch.html?type=${type}&id=${item.id}" class="btn btn-primary"><i class="fas fa-play"></i> Play Now</a>
                <button class="btn btn-secondary" onclick='showDetailsById(${JSON.stringify(item)})'><i class="fas fa-info-circle"></i> More Info</button>
            </div>
        `;
        slide.appendChild(content);
        slidesContainer.appendChild(slide);

        const dot = document.createElement('div');
        dot.className = 'banner-dot';
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });
    
    window.showDetailsById = (item) => showDetails(item);

    showSlide(0);
    startBannerAutoplay();
}

function showSlide(index) {
    const slidesContainer = document.getElementById('banner-slides');
    if (!slidesContainer) return;
    currentBannerIndex = index;
    slidesContainer.style.transform = `translateX(-${index * 100}%)`;
    document.querySelectorAll('.banner-dot').forEach((dot, i) => dot.classList.toggle('active', i === index));
}
function autoAdvanceSlide() {
    const nextIndex = (currentBannerIndex + 1) % bannerSlidesData.length;
    showSlide(nextIndex);
}
function goToSlide(index) {
    showSlide(index);
    resetBannerAutoplay();
}
function startBannerAutoplay() {
    clearInterval(bannerInterval);
    bannerInterval = setInterval(autoAdvanceSlide, 5000);
}
function resetBannerAutoplay() {
    startBannerAutoplay();
}
function slide(listId, direction) {
  const list = document.getElementById(listId);
  if (!list) return;
  const scrollAmount = list.clientWidth * 0.8;
  list.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
}
function openSearchModal() { document.getElementById('search-modal').style.display = 'flex'; document.getElementById('search-input').focus(); }
function closeSearchModal() { document.getElementById('search-modal').style.display = 'none'; }
function closeModal() { document.getElementById('modal').style.display = 'none'; }


// ===================================
// INITIALIZATION
// ===================================
async function init() {
  setupTabs();
  
  await fetchGenres();
  try {
    // --- Tab 1: Currently Airing (with Pagination) ---
    const airingNowData = await fetchAnime('discover/tv', `sort_by=popularity.desc&page=${airingCurrentPage}`);
    airingTotalPages = airingNowData.total_pages;
    if (airingNowData.results && airingNowData.results.length > 0) {
        await displayAiringList(airingNowData.results);
        setupAiringPagination();
    }

    // --- Tab 2: Popular Anime Series ---
    const popularSeriesData = await fetchAnime('discover/tv', 'sort_by=popularity.desc');
    if (popularSeriesData.results && popularSeriesData.results.length > 0) {
      setupBannerSlider(popularSeriesData.results);
      displayList(popularSeriesData.results, 'popular-series-list');
    }

    // --- Tab 3: Top Rated Anime Movies ---
    const topMoviesData = await fetchAnime('discover/movie', 'sort_by=vote_average.desc&vote_count.gte=200');
    if (topMoviesData.results && topMoviesData.results.length > 0) {
      displayList(topMoviesData.results, 'top-movies-list');
    }

  } catch (error) {
    console.error("Failed to initialize page:", error);
  }
}

// Wait for the DOM to be fully loaded before running the script.
document.addEventListener('DOMContentLoaded', init);