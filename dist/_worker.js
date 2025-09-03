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

  const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      if (url.pathname.startsWith('/api/')) {
        // Pass ctx to the handler for caching
        return await this.handleApiRequest(request, env, ctx);
      }

      if (!env.ASSETS) {
        return new Response("Static asset handler is not configured.", { status: 500 });
      }

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
      // --- CACHING LOGIC RE-ADDED ---
      const cache = caches.default;
      let response = await cache.match(request);
      if (response) {
        console.log("Cache HIT");
        return response;
      }
      console.log("Cache MISS");
      // --- END CACHING LOGIC ---

      try {
        if (!env.TMDB_API_TOKEN) {
          return new Response("Secret binding 'TMDB_API_TOKEN' not found. Please add it in your Cloudflare dashboard.", { status: 500 });
        }

        const apiToken = await env.TMDB_API_TOKEN.get();
        if (!apiToken) {
          return new Response("Failed to retrieve the API token value. The secret might be empty.", { status: 500 });
        }

        const url = new URL(request.url);
        const path = url.pathname.substring(5); // Correctly removes "/api/"
        const queryString = url.search;
        const apiUrl = `${TMDB_BASE_URL}/${path}${queryString}`;

        const apiRequest = new Request(apiUrl, {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Accept': 'application/json'
          }
        });

        response = await fetch(apiRequest);

        // --- CACHING LOGIC RE-ADDED ---
        if (response.ok) {
          const cacheableResponse = response.clone();
          cacheableResponse.headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
          ctx.waitUntil(cache.put(request, cacheableResponse));
        }
        // --- END CACHING LOGIC ---

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