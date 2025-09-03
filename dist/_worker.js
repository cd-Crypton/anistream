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

      // Fetch the static asset
      const assetResponse = await env.ASSETS.fetch(request);
      
      // --- THE FIX IS HERE ---
      // Create a new, mutable Headers object from the asset's headers
      const newHeaders = new Headers(assetResponse.headers);
      const contentType = this.getContentType(url.pathname);
      if (contentType) {
        newHeaders.set('Content-Type', contentType);
      }
      
      // Return a new response with the original body but the new, modified headers
      return new Response(assetResponse.body, {
        ...assetResponse, // Copy status, statusText, etc.
        headers: newHeaders,
      });
      // --- END OF FIX ---

    } catch (error) {
      console.error('Unhandled error in fetch handler:', error);
      return new Response(error.stack || error, { status: 500 });
    }
  },

  async handleApiRequest(request, env, ctx) {
    const cache = caches.default;
    let response = await cache.match(request);
    if (response) {
      console.log("Cache HIT");
      return response;
    }
    console.log("Cache MISS");

    try {
      if (!env.TMDB_API_TOKEN) {
        return new Response("Secret binding 'TMDB_API_TOKEN' not found.", { status: 500 });
      }

      const apiToken = await env.TMDB_API_TOKEN.get();
      if (!apiToken) {
        return new Response("Failed to retrieve the API token value.", { status: 500 });
      }

      const url = new URL(request.url);
      const path = url.pathname.substring(5);
      const queryString = url.search;
      const apiUrl = `${TMDB_BASE_URL}/${path}${queryString}`;

      const apiRequest = new Request(apiUrl, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      });

      response = await fetch(apiRequest);

      if (response.ok) {
        // --- THE FIX IS ALSO HERE ---
        // Create a new, mutable response for the cache
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

        const cacheableResponse = new Response(response.body, {
            ...response,
            headers: newHeaders,
        });

        ctx.waitUntil(cache.put(request, cacheableResponse));
      }
      // --- END OF FIX ---

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