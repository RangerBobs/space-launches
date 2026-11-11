const API_BASE = 'https://ll.thespacedevs.com/2.3.0/launches/upcoming/';
const CACHE_KEY = 'spaceLaunchesCache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const launchesEl = document.getElementById('launches');
const statusEl = document.getElementById('status');
const searchEl = document.getElementById('search');
const refreshBtn = document.getElementById('refresh');

let allLaunches = [];

async function loadLaunches(force = false) {
  statusEl.textContent = 'Loading launches...';
  launchesEl.innerHTML = '';

  // Check cache
  const cached = localStorage.getItem(CACHE_KEY);
  if (!force && cached) {
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      allLaunches = data;
      render();
      statusEl.textContent = `Showing cached data (refreshed ${new Date(timestamp).toLocaleTimeString()})`;
      return;
    }
  }

  try {
    const url = `${API_BASE}?limit=30&mode=detailed`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    allLaunches = json.results || [];

    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: allLaunches
    }));

    render();
    statusEl.textContent = `Live data • ${allLaunches.length} launches`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Failed to load launches. Using cache if available.';
    if (cached) {
      const { data } = JSON.parse(cached);
      allLaunches = data;
      render();
    }
  }
}

function formatTime(iso) {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  const utc = d.toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC';
  const jst = d.toLocaleString('en-GB', { timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'short' }) + ' JST';
  return { utc, jst };
}

function getStatusClass(status) {
  const name = (status?.name || '').toLowerCase();
  if (name.includes('success')) return 'status-success';
  if (name.includes('scrub') || name.includes('fail')) return 'status-scrubbed';
  if (name.includes('delay') || name.includes('hold')) return 'status-delayed';
  return 'status-scheduled';
}

function render() {
  const query = searchEl.value.toLowerCase();
  const filtered = allLaunches.filter(l => {
    const text = `${l.name} ${l.launch_service_provider?.name || ''} ${l.rocket?.configuration?.full_name || ''} ${l.mission?.name || ''}`.toLowerCase();
    return text.includes(query);
  });

  if (filtered.length === 0) {
    launchesEl.innerHTML = '<p style="text-align:center;color:#666;padding:2rem;">No launches match your filter.</p>';
    return;
  }

  launchesEl.innerHTML = filtered.map(l => {
    const times = formatTime(l.net || l.window_start);
    const provider = l.launch_service_provider?.name || 'Unknown';
    const rocket = l.rocket?.configuration?.full_name || 'Unknown';
    const status = l.status?.name || 'Unknown';
    const statusClass = getStatusClass(l.status);
    const mission = l.mission?.name || '';
    const watch = l.vid_urls?.length ? l.vid_urls[0].url : null;

    return `
      <article class="launch">
        <h2>${l.name}</h2>
        <div class="meta">
          <span>${provider}</span>
          <span>${rocket}</span>
          ${mission ? `<span>${mission}</span>` : ''}
          <span class="status-badge ${statusClass}">${status}</span>
        </div>
        <div class="times">
          <div>${times.jst}</div>
          <div>${times.utc}</div>
        </div>
        ${watch ? `<div class="watch"><a href="${watch}" target="_blank" rel="noopener">Watch live →</a></div>` : ''}
      </article>
    `;
  }).join('');
}

searchEl.addEventListener('input', render);
refreshBtn.addEventListener('click', () => loadLaunches(true));

loadLaunches();
