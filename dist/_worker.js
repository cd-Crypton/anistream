const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      if (url.pathname.startsWith('/api/')) {
        return await this.handleApiRequest(request, env, ctx);
      }

      if (!env.ASSETS) {
        return new Response("Static asset handler is not configured.", { status: 500 });
      }

      // Static asset handling remains the same
      const assetResponse = await env.ASSETS.fetch(request);
      const mutableResponse = new Response(assetResponse.body, assetResponse);
      const contentType = this.getContentType(url.pathname);
      if (contentType) {
        mutableResponse.headers.set('Content-Type', contentType);
      }
      return mutableResponse;

    } catch (error) {
      console.error('Unhandled error in fetch handler:', error);
      return new Response(error.stack || error, { status: 500 });
    }
  },

  async handleApiRequest(request, env, ctx) {
    // --- CACHING LOGIC ADDED ---
    const cache = caches.default; // Access the default cache
    let response = await cache.match(request); // Check if the request is already in the cache

    if (response) {
      // If found in cache, return the cached response immediately
      console.log("Cache HIT");
      return response;
    }
    console.log("Cache MISS");
    // --- END OF CACHING LOGIC ---

    try {
      if (!env.TMDB_API_TOKEN) {
        return new Response("Secret binding 'TMDB_API_TOKEN' not found.", { status: 500 });
      }

      const apiToken = await env.TMDB_API_TOKEN.get();
      if (!apiToken) {
        return new Response("Failed to retrieve the API token value.", { status: 500 });
      }

      const url = new URL(request.url);
      const path = url.pathname.substring(4);
      const queryString = url.search;
      const apiUrl = `${TMDB_BASE_URL}${path}${queryString}`;

      const apiRequest = new Request(apiUrl, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      });

      // Fetch the response from the TMDB API
      response = await fetch(apiRequest);

      // --- CACHING LOGIC ADDED ---
      // Before returning the response, we store it in the cache.
      if (response.ok) {
        // We must clone the response to be able to cache it and return it.
        const cacheableResponse = response.clone();

        // Set the Cache-Control header to determine how long it stays in cache.
        // 3600 seconds = 1 hour
        cacheableResponse.headers.set('Cache-Control', 'public, max-age=3600');

        // Use ctx.waitUntil to cache the response without blocking the user's request.
        ctx.waitUntil(cache.put(request, cacheableResponse));
      }
      // --- END OF CACHING LOGIC ---

      return response;

    } catch (error) {
      console.error('Error in API request handler:', error);
      return new Response(error.stack || error, { status: 500 });
    }
  },

  getContentType(pathname) {
    if (pathname.endsWith('.css')) return 'text/css';
    if (pathname.endsWith('.js')) return 'application/javascript';
    if (pathname.endsWith('.html')) return 'text/html';
    if (pathname.endsWith('.svg')) return 'image/svg+xml';
    if (pathname.endsWith('.png')) return 'image/png';
    if (pathname.endsWith('.jpg')) return 'image/jpeg';
    if (pathname.endsWith('.jpeg')) return 'image/jpeg';
    if (pathname.endsWith('.gif')) return 'image/gif';
    return null;
  }
};