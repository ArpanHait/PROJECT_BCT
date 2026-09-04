let API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://127.0.0.1:8000'
  : 'https://to-do-backend-s7y9.onrender.com'; // Default remote fallback

// Load config dynamically
async function loadConfig() {
  try {
    const res = await fetch('config.json');
    if (res.ok) {
      const data = await res.json();
      if (data.API_BASE) {
        // If current window is local, prioritize local unless configured
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          API_BASE = 'http://127.0.0.1:8000';
        } else {
          API_BASE = data.API_BASE.replace(/\/$/, '');
        }
      }
    }
  } catch (e) {
    console.warn('Using default API_BASE:', API_BASE);
  }
}

function getToken() {
  return localStorage.getItem('token') || '';
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch (e) {
    return null;
  }
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

function logoutLocal() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

async function logout() {
  const token = getToken();
  if (token) {
    try {
      await fetch(`${API_BASE}/api/auth/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        }
      });
    } catch (e) {
      console.error('Logout error:', e);
    }
  }
  logoutLocal();
}

function getAvatarUrl(url) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${API_BASE}${url}`;
}

// Global initialization promise
const configPromise = loadConfig();

// Health check engine for the Glowing Pulse LED Indicator
async function checkBackendHealth() {
  const badge = document.getElementById('serverStatusBadge');
  const textEl = document.getElementById('serverStatusText');
  const pingEl = document.getElementById('serverPingTime');
  if (!badge || !textEl) return;

  await configPromise;

  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(`${API_BASE}/api/health/`, {
      signal: controller.signal,
      cache: 'no-store'
    });
    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - startTime);

    if (res.ok) {
      const data = await res.json();
      badge.className = 'server-status-badge status-online';
      if (data.database === 'connected') {
        textEl.textContent = 'Backend & Neon DB Live';
      } else {
        textEl.textContent = 'Backend Live (DB Connecting)';
      }
      if (pingEl) pingEl.textContent = `• ${latency}ms`;
    } else {
      badge.className = 'server-status-badge status-waking';
      textEl.textContent = 'Backend Waking Up...';
      if (pingEl) pingEl.textContent = '';
    }
  } catch (e) {
    badge.className = 'server-status-badge status-offline';
    textEl.textContent = 'Backend Offline';
    if (pingEl) pingEl.textContent = '';
  }
}

// Auto-run health check on page load if element exists
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('serverStatusBadge')) {
    checkBackendHealth();
    setInterval(checkBackendHealth, 15000);
  }
});
