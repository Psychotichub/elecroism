/**
 * Content-Security-Policy and navigation hardening for the renderer.
 *
 * Production uses a strict policy (no unsafe-eval). Dev loads the Vite server,
 * which requires 'unsafe-eval' for HMR — Electron will still warn in that case;
 * npm run electron:dev sets ELECTRON_DISABLE_SECURITY_WARNINGS for that reason.
 */

/** @param {boolean} isDev */
function buildContentSecurityPolicy(isDev) {
  if (isDev) {
    const origin = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";
    const wsOrigin = origin.replace(/^http/, "ws");
    return [
      `default-src 'self' ${origin} ${wsOrigin}`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${origin}`,
      `style-src 'self' 'unsafe-inline' ${origin}`,
      `img-src 'self' data: blob: ${origin}`,
      `font-src 'self' data: ${origin}`,
      `connect-src 'self' ${origin} ${wsOrigin}`,
      "worker-src 'self' blob:",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join("; ");
  }

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/**
 * Inject CSP on every document response (dev Vite server + packaged file://).
 * @param {import('electron').Session} session
 * @param {boolean} isDev
 */
function applyContentSecurityPolicy(session, isDev) {
  const policy = buildContentSecurityPolicy(isDev);

  session.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    headers["Content-Security-Policy"] = [policy];
    callback({ responseHeaders: headers });
  });
}

/**
 * Block unexpected navigation and pop-up windows.
 * @param {import('electron').WebContents} contents
 */
function hardenWebContents(contents) {
  contents.on("will-navigate", (event, url) => {
    const parsed = new URL(url);
    const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
    const allowedOrigins = new Set(["file:"]);
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      allowedOrigins.add(new URL(process.env.VITE_DEV_SERVER_URL).origin);
    }
    if (!allowedOrigins.has(parsed.origin)) {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(() => ({ action: "deny" }));
}

module.exports = {
  buildContentSecurityPolicy,
  applyContentSecurityPolicy,
  hardenWebContents,
};
