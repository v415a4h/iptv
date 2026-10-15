import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const isDev = process.env.NODE_ENV !== 'production' && !process.env.K_SERVICE;
  const PORT = isDev ? 3000 : (Number(process.env.PORT) || 8080);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, User-Agent');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Stream & Playlist Proxy Endpoint
  // Handles remote M3U playlists and media streams that restrict CORS or require custom User-Agent
  app.get('/api/proxy', async (req: Request, res: Response) => {
    const targetUrl = req.query.url as string;
    const customUserAgent = (req.query.userAgent as string) || req.headers['user-agent'] || 'IPTVMate/1.0.0 (AndroidTV; Media3 ExoPlayer)';

    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing "url" query parameter' });
    }

    // SSRF protection: block local cloud metadata addresses
    try {
      const parsed = new URL(targetUrl);
      if (['169.254.169.254', 'metadata.google.internal', 'metadata'].includes(parsed.hostname)) {
        return res.status(403).json({ error: 'Access to cloud metadata is forbidden' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    try {
      const fetchHeaders: Record<string, string> = {
        'User-Agent': customUserAgent,
        'Accept': '*/*',
      };

      if (req.headers.range) {
        fetchHeaders['Range'] = req.headers.range as string;
      }

      const response = await fetch(targetUrl, {
        headers: fetchHeaders,
        redirect: 'follow',
      });

      // Pass forward headers
      const contentType = response.headers.get('content-type');
      if (contentType) res.setHeader('Content-Type', contentType);
      const contentLength = response.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);
      const contentRange = response.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);
      res.setHeader('Access-Control-Allow-Origin', '*');

      res.status(response.status);

      if (!response.body) {
        return res.end();
      }

      // Stream data back
      const reader = response.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } catch (streamErr) {
          res.end();
        }
      };
      await pump();
    } catch (err: any) {
      console.error('[Proxy Error]', err.message);
      res.status(502).json({ error: `Proxy fetch failed: ${err.message}` });
    }
  });

  // JioTV Go API Simulation & Verification Endpoint
  // Complies with master spec: { "code": 200, "message": "Success", "result": [...] }
  app.get('/api/jiotv-demo', (req: Request, res: Response) => {
    res.json({
      code: 200,
      message: 'Success',
      result: [
        {
          channel_id: 101,
          channel_name: 'Jio News HD',
          channel_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          key_url: null,
          channel_logo: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=160&auto=format&fit=crop&q=80',
          group: 'News'
        },
        {
          channel_id: 102,
          channel_name: 'Jio Sports Live',
          channel_url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
          key_url: null,
          channel_logo: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=160&auto=format&fit=crop&q=80',
          group: 'Sports'
        },
        {
          channel_id: 103,
          channel_name: 'Jio Cinema HD (DASH)',
          channel_url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
          key_url: null,
          channel_logo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=160&auto=format&fit=crop&q=80',
          group: 'Movies'
        },
        {
          channel_id: 104,
          channel_name: 'Jio Music Live',
          channel_url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
          key_url: null,
          channel_logo: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=160&auto=format&fit=crop&q=80',
          group: 'Music'
        },
        {
          channel_id: 105,
          channel_name: 'Jio Premium DRM (Widevine Demo)',
          channel_url: 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd',
          key_url: 'https://cwip-shaka-proxy.appspot.com/no_auth',
          channel_logo: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=160&auto=format&fit=crop&q=80',
          group: 'Premium DRM'
        }
      ]
    });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', name: 'IPTV Mate Server', version: '1.0.0' });
  });

  // Setup Vite in development or static serve in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[IPTV Mate] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
