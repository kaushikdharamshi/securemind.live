/* ═══════════════════════════════════════════════
   Sentinel — Shared JS
   ═══════════════════════════════════════════════ */

// Nav scroll effect
const nav = document.querySelector('.nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// Mobile toggle
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) {
  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    const expanded = links.classList.contains('open');
    toggle.setAttribute('aria-expanded', expanded);
  });
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}

// Scroll-reveal (fade-in)
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Active nav link
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === currentPage || (currentPage === 'index.html' && href === 'index.html')) {
    a.classList.add('active');
  }
});

// Visitor counter
const WORKER_URL = 'YOUR_WORKER_URL'; // replace after deploying workers/counter.js
const visitorEl = document.getElementById('visitor-count');
if (visitorEl && WORKER_URL !== 'YOUR_WORKER_URL') {
  fetch(WORKER_URL)
    .then(r => r.json())
    .then(({ count }) => {
      visitorEl.textContent = count.toLocaleString();
      visitorEl.closest('.visitor-badge').style.display = 'inline-flex';
    })
    .catch(() => {
      visitorEl.closest('.visitor-badge').style.display = 'none';
    });
}

// Animated counter
function animateCounters() {
  document.querySelectorAll('.stat-value[data-target]').forEach(el => {
    const target = el.getAttribute('data-target');
    if (target.match(/^\d+$/)) {
      const num = parseInt(target);
      let current = 0;
      const step = Math.max(1, Math.floor(num / 40));
      const timer = setInterval(() => {
        current += step;
        if (current >= num) { current = num; clearInterval(timer); }
        el.textContent = current;
      }, 30);
    }
  });
}
// Run counters when stats section is visible
const statsSection = document.querySelector('.stats-row');
if (statsSection) {
  const statsObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounters();
        statsObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  statsObs.observe(statsSection);
}
