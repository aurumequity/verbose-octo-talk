// Nav toggle (mobile)
const toggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
toggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close nav on link click (mobile)
navLinks.querySelectorAll('a').forEach((a) => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Scroll reveal
const reveals = document.querySelectorAll('.reveal');
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.1 },
);
reveals.forEach((el) => io.observe(el));

// Generate waveform bars
const waveform = document.getElementById('waveform');
const barCount = 48;
for (let i = 0; i < barCount; i++) {
  const bar = document.createElement('div');
  bar.className = 'wave-bar';
  const h = Math.floor(Math.random() * 30) + 4;
  const dur = (Math.random() * 0.6 + 0.5).toFixed(2);
  const delay = (Math.random() * 0.5).toFixed(2);
  bar.style.cssText = `--h:${h}px; --dur:${dur}s; animation-delay:${delay}s;`;
  waveform.appendChild(bar);
}

// Play button toggle (cosmetic)
const playBtn = document.querySelector('.play-btn');
let playing = false;
playBtn.addEventListener('click', () => {
  playing = !playing;
  playBtn.style.background = playing ? 'var(--gold)' : 'var(--gold-dim)';
  const icon = playBtn.querySelector('.play-icon');
  if (playing) {
    icon.style.cssText = `
          border-top: none; border-bottom: none;
          border-left: 3px solid var(--bg);
          border-right: 3px solid var(--bg);
          width: 14px; height: 18px;
          margin-left: 0;
        `;
  } else {
    icon.style.cssText = '';
  }
});

// ─── Scripture Terminal ──────────────────────────────────────────
const BIBLE_API = 'https://bible-api.com';
const TRANSLATION = 'kjv';

// Rotating VOTD references (one per day of week — always relevant)
const DAILY_REFS = [
  'john 1:1',
  'proverbs 3:5-6',
  'romans 8:28',
  'isaiah 55:11',
  'jeremiah 29:11',
  'ephesians 6:12',
  'revelation 22:13',
];

async function fetchVerse(ref) {
  const url = `${BIBLE_API}/${encodeURIComponent(ref)}?translation=${TRANSLATION}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Not found');
  return res.json();
}

async function loadVOTD() {
  const status = document.getElementById('votd-status');
  const display = document.getElementById('votd-display');
  const dayRef = DAILY_REFS[new Date().getDay()];
  try {
    const data = await fetchVerse(dayRef);
    status.textContent = 'LIVE';
    status.style.color = '#4ade80';
    status.style.borderColor = '#4ade80';
    display.innerHTML = `
          <div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--muted);margin-bottom:1rem;letter-spacing:0.12em;">
            <span style="color:var(--gold);">$</span> 200 OK — ${data.reference} · ${TRANSLATION.toUpperCase()}
          </div>
          <div class="votd-block">
            <div class="votd-text">&ldquo;${data.text.trim()}&rdquo;</div>
            <div class="votd-ref">— ${data.reference} · ${data.translation_name}</div>
          </div>`;
  } catch (e) {
    status.textContent = 'OFFLINE';
    display.innerHTML = `<div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--muted);padding-top:0.5rem;">
          <span style="color:var(--rose);">// Could not fetch verse. Check connection.</span></div>`;
  }
}

async function lookupVerse() {
  const input = document.getElementById('verse-input');
  const result = document.getElementById('verse-lookup-result');
  const ref = input.value.trim();
  if (!ref) return;
  result.style.display = 'block';
  result.innerHTML = `<div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--muted);">
        <span style="color:var(--gold);">$</span> fetch ${ref}...<span class="prompt-cursor"></span></div>`;
  try {
    const data = await fetchVerse(ref);
    result.innerHTML = `
          <div class="verse-lookup-block">
            <div class="verse-lookup-ref">${data.reference} · ${data.translation_name}</div>
            <div class="verse-lookup-text">&ldquo;${data.text.trim()}&rdquo;</div>
          </div>`;
  } catch (e) {
    result.innerHTML = `<div class="verse-error">// Reference not found. Try: "john 3:16" or "romans 8:28"</div>`;
  }
}

// Allow Enter key in verse input
const verseInput = document.getElementById('verse-input');
if (verseInput) {
  verseInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') lookupVerse();
  });
}

// Load VOTD when section enters viewport
const votdObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        loadVOTD();
        votdObserver.disconnect();
      }
    });
  },
  { threshold: 0.15 },
);
const votdEl = document.getElementById('votd-display');
if (votdEl) {
  votdObserver.observe(votdEl);
} else {
  loadVOTD();
}

async function loadCardVerse(btnEl, ref) {
  const card = btnEl.closest('.scripture-card');
  const resultEl = card.querySelector('.scripture-card-result');
  btnEl.textContent = 'FETCHING...';
  try {
    const data = await fetchVerse(ref);
    resultEl.innerHTML = `&ldquo;${data.text.trim()}&rdquo;`;
    resultEl.style.display = 'block';
    btnEl.style.display = 'none';
  } catch (e) {
    btnEl.textContent = 'ERROR — RETRY →';
  }
}

// ─── Substack RSS Live Feed ───────────────────────────────────
// Replace 'graceintheglitch' with your actual Substack handle
const SUBSTACK_HANDLE = 'graceintheglitch';
const RSS_URL = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://${SUBSTACK_HANDLE}.substack.com/feed`)}`;

async function loadSubstackFeed() {
  const container = document.getElementById('substack-posts');
  const badge = document.getElementById('feed-status');
  try {
    const res = await fetch(RSS_URL);
    const data = await res.json();
    const parser = new DOMParser();
    const xml = parser.parseFromString(data.contents, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item')).slice(0, 4);

    if (!items.length) throw new Error('No items');

    badge.textContent = 'LIVE FEED';
    badge.style.color = '#4ade80';
    badge.style.borderColor = '#4ade80';

    container.innerHTML = items
      .map((item, i) => {
        const title = item.querySelector('title')?.textContent || 'Untitled';
        const link = item.querySelector('link')?.textContent || '#';
        const pub = item.querySelector('pubDate')?.textContent || '';
        const desc = item.querySelector('description')?.textContent || '';
        // Strip HTML tags from description
        const stripped = desc
          .replace(/<[^>]*>/g, '')
          .slice(0, 140)
          .trim();
        const date = pub
          ? new Date(pub).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : '';
        const border = i % 2 === 0 ? 'border-right:1px solid var(--border);' : '';
        const borderB = i < 2 ? 'border-bottom:1px solid var(--border);' : '';
        return `
            <a href="${link}" target="_blank" rel="noopener" class="report-item" style="background:var(--bg);text-decoration:none;display:block;${border}${borderB}">
              <div class="report-meta">
                <span class="report-ep" style="color:var(--rose);font-size:0.62rem;letter-spacing:0.15em;">REPORT</span>
                <span class="report-date" style="font-size:0.6rem;color:var(--muted);">${date}</span>
              </div>
              <div class="report-title" style="font-family:var(--font-serif);font-size:1rem;font-weight:700;color:var(--white);margin-bottom:0.5rem;line-height:1.3;">${title}</div>
              <div class="report-desc" style="font-size:0.72rem;color:var(--muted);line-height:1.65;">${stripped}${stripped.length >= 140 ? '…' : ''}</div>
            </a>`;
      })
      .join('');
  } catch (err) {
    badge.textContent = 'STANDBY';
    container.innerHTML = `
          <div style="background:var(--bg);padding:2rem;grid-column:1/-1;font-family:var(--font-mono);font-size:0.75rem;color:var(--muted);">
            <span style="color:var(--rose);">// Feed will populate once posts are published to your Substack.</span><br><br>
            Posts from <span style="color:var(--gold);">${SUBSTACK_HANDLE}.substack.com</span> will appear here automatically.
          </div>`;
  }
}

// Load feed when vault section comes into view
const feedObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        loadSubstackFeed();
        feedObserver.disconnect();
      }
    });
  },
  { threshold: 0.1 },
);
const feedEl = document.querySelector('.substack-feed');
if (feedEl) {
  feedObserver.observe(feedEl);
}
