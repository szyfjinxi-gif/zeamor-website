/**
 * Cloudflare Worker — Decap CMS GitHub OAuth Provider
 *
 * Handles OAuth flow so Decap CMS can authenticate users via GitHub.
 * Compatible with the Netlify CMS / Decap CMS OAuth protocol.
 *
 * Deploy this Worker, then update admin/config.yml:
 *   backend:
 *     name: github
 *     base_url: https://<your-worker>.workers.dev
 *     ...
 *
 * Flow:
 *   GET  /auth          → Redirect user to GitHub OAuth
 *   GET  /callback      → GitHub redirects here; exchange code for token
 */

const GITHUB_AUTHORIZE = 'https://github.com/login/oauth/authorize';
const GITHUB_ACCESS_TOKEN = 'https://github.com/login/oauth/access_token';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

/**
 * Worker entry
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      const path = url.pathname.replace(/\/$/, '');

      if (path === '/auth') {
        return startAuth(url, env);
      }

      if (path === '/callback') {
        return finishAuth(url, env);
      }

      // Health check
      return new Response('Zeamor OAuth Worker OK', {
        headers: { ...corsHeaders(), 'Content-Type': 'text/plain' },
      });
    } catch (err) {
      return new Response('OAuth Error: ' + err.message, { status: 500 });
    }
  },
};

/**
 * GET /auth — Start OAuth flow by redirecting to GitHub
 */
function startAuth(url, env) {
  const clientId = env.OAUTH_CLIENT_ID;
  if (!clientId) {
    return new Response('OAUTH_CLIENT_ID not set. Run: wrangler secret put OAUTH_CLIENT_ID', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Build callback URL — GitHub will redirect here after user authorizes
  const callbackUrl = `${url.origin}/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'repo,user',
    redirect_uri: callbackUrl,
  });

  return Response.redirect(`${GITHUB_AUTHORIZE}?${params}`, 302);
}

/**
 * GET /callback — GitHub redirects here with ?code=xxx
 * Exchange the code for an access token, then return it to Decap CMS
 */
async function finishAuth(url, env) {
  const code = url.searchParams.get('code');
  if (!code) {
    return new Response('Missing ?code parameter', { status: 400 });
  }

  const clientId = env.OAUTH_CLIENT_ID;
  const clientSecret = env.OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response(
      'OAuth secrets not configured. Run:\n  wrangler secret put OAUTH_CLIENT_ID\n  wrangler secret put OAUTH_CLIENT_SECRET',
      { status: 500, headers: { 'Content-Type': 'text/plain' } }
    );
  }

  // Exchange code for access token
  const tokenResp = await fetch(GITHUB_ACCESS_TOKEN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    }),
  });

  const tokenData = await tokenResp.json();

  if (tokenData.error) {
    return new Response(
      `GitHub error: ${tokenData.error_description || tokenData.error}`,
      { status: 400, headers: { 'Content-Type': 'text/plain' } }
    );
  }

  // Return token to Decap CMS via postMessage (standard protocol)
  const html = renderCallbackPage(tokenData.access_token);

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * Render the callback page that sends token to Decap CMS via postMessage
 */
function renderCallbackPage(token) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Authorizing Zeamor CMS…</title>
<style>
  body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
  .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
  .spinner { width: 32px; height: 32px; border: 3px solid #e0e0e0; border-top-color: #4285f4; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div class="card">
  <div class="spinner"></div>
  <p>Authorization successful! Returning to CMS…</p>
</div>
<script>
  (function() {
    // Standard Netlify CMS / Decap CMS OAuth protocol
    window.addEventListener("message", function(e) {
      window.opener.postMessage(
        'authorization:github:success:${JSON.stringify({ token: token, provider: 'github' })}',
        e.origin
      );
      window.removeEventListener("message", arguments.callee, false);
    }, false);

    // Signal to Decap CMS that we're ready
    window.opener.postMessage("authorizing:github", "*");
  })();
</script>
</body>
</html>`;
}
