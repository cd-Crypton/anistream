const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Check if the request is for our API proxy
    if (url.pathname.startsWith('/api/')) {
      return this.handleApiRequest(request, env);
    }

    // 2. Otherwise, serve the static asset from the 'dist' directory
    return env.ASSETS.fetch(request);
  },

  async handleApiRequest(request, env) {
    const url = new URL(request.url);

    // Remove the '/api' prefix from the path
    // For example, '/api/discover/tv' becomes '/discover/tv'
    const path = url.pathname.substring(4); 
    const queryString = url.search;

    // Fetch the TMDB API key from your Cloudflare secrets
    const apiKey = env.TMDB_API_KEY;
    if (!apiKey) {
      return new Response("API key is not configured", { status: 500 });
    }

    const apiUrl = `${TMDB_BASE_URL}${path}${queryString ? '&' : '?'}api_key=${apiKey}`;

    // Create a new request to the TMDB API, preserving method and headers
    const apiRequest = new Request(apiUrl, request);

    // Fetch and return the response from the TMDB API
    return fetch(apiRequest);
  }
};