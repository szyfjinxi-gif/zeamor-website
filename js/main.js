/**
 * ZEAMOR Website - Main JavaScript
 * Handles: i18n (EN/ZH/JA), dynamic rendering, mobile menu, scroll effects, contact form
 */

// =====================
// Config Override from Admin Panel
// =====================
(function applyAdminOverrides() {
  try {
    const saved = localStorage.getItem('zeamor-config');
    if (saved) {
      const override = JSON.parse(saved);
      // Deep merge overrides into SITE_CONFIG
      Object.keys(override).forEach(key => {
        if (typeof override[key] === 'object' && !Array.isArray(override[key]) && typeof SITE_CONFIG[key] === 'object' && !Array.isArray(SITE_CONFIG[key])) {
          // Deep merge for nested objects (e.g., i18n -> en/zh/ja -> key/values)
          deepMerge(SITE_CONFIG[key], override[key]);
        } else {
          SITE_CONFIG[key] = override[key];
        }
      });
      console.log('[ZEAMOR] Applied saved config overrides');
    }
  } catch(e) { console.error('[ZEAMOR] Config override error:', e); }
})();

function deepMerge(target, source) {
  Object.keys(source).forEach(k => {
    if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k]) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      deepMerge(target[k], source[k]);
    } else {
      target[k] = source[k];
    }
  });
}

// =====================
// i18n Engine
// =====================
let currentLang = localStorage.getItem('zeamor-lang') || 'en';

function t(key) {
  return (SITE_CONFIG.i18n[currentLang] && SITE_CONFIG.i18n[currentLang][key]) || key;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('zeamor-lang', lang);

  // Update all [data-i18n] elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val === key) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = val;
    } else if (el.tagName === 'OPTION') {
      el.textContent = val;
    } else {
      el.textContent = val;
    }
  });

  // Update lang switch labels
  const nextLabel = { en: '日本語', ja: '中文', zh: 'EN' };
  const label = nextLabel[lang] || 'EN';
  const langLabel = document.getElementById('langLabel');
  const mobileLangLabel = document.getElementById('mobileLangLabel');
  if (langLabel) langLabel.textContent = label;
  if (mobileLangLabel) mobileLangLabel.textContent = label;

  document.documentElement.lang = lang === 'ja' ? 'ja' : (lang === 'zh' ? 'zh-CN' : 'en');

  // Re-render dynamic content
  renderFeaturedProducts();
  renderProductGallery();
  renderModelGallery();
}

function toggleLang() {
  const next = { en: 'ja', ja: 'zh', zh: 'en' };
  setLang(next[currentLang] || 'en');
}

// =====================
// Dynamic Content Renderers
// =====================

// Render featured products on index page
function renderFeaturedProducts() {
  const container = document.getElementById('featuredProducts');
  if (!container) return;
  const lang = currentLang;

  container.innerHTML = SITE_CONFIG.featuredProducts.map(p => `
    <a href="products.html" class="product-card">
      <div class="product-card-img">
        <img src="${p.img}" alt="${p.alt || ''}" loading="lazy">
      </div>
      <div class="product-card-body">
        <h3>${p.title[lang] || p.title.en}</h3>
        <p>${p.desc[lang] || p.desc.en}</p>
      </div>
    </a>
  `).join('');
}

// Render full product gallery on products page
function renderProductGallery() {
  const container = document.getElementById('productGallery');
  if (!container) return;
  const lang = currentLang;

  container.innerHTML = SITE_CONFIG.productCategories.map((cat, i) => `
    <div class="section-header"${i > 0 ? ' style="margin-top:60px"' : ''}>
      <span class="section-tag">${cat.tag[lang] || cat.tag.en}</span>
      <h2 class="section-title">${cat.title[lang] || cat.title.en}</h2>
    </div>
    <div class="products-grid">
      ${cat.items.map(p => `
        <div class="product-card">
          <div class="product-card-img">
            <img src="${p.img}" alt="${p.title[lang] || p.title.en}" loading="lazy">
          </div>
          <div class="product-card-body">
            <h3>${p.title[lang] || p.title.en}</h3>
            <p>${p.desc[lang] || p.desc.en}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

// Render model gallery on index page
function renderModelGallery() {
  const container = document.getElementById('modelGallery');
  if (!container) return;

  container.innerHTML = SITE_CONFIG.modelGallery.map(p => `
    <div class="gallery-item">
      <img src="${p.img}" alt="ZEAMOR Lifestyle" loading="lazy">
    </div>
  `).join('');
}

// Inject contact info from config into DOM
function injectContactInfo() {
  const cfg = SITE_CONFIG.brand;

  // All mailto links
  document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
    a.href = `mailto:${cfg.email}`;
    if (!a.textContent.includes('zeamor') && !a.getAttribute('data-i18n')) {
      a.textContent = cfg.email;
    }
  });

  // All tel links
  document.querySelectorAll('a[href^="tel:"]').forEach(a => {
    a.href = `tel:${cfg.phone}`;
    if (a.textContent && a.textContent.startsWith('+')) {
      a.textContent = cfg.phone;
    }
  });

  // WhatsApp link
  document.querySelectorAll('a[href^="https://wa.me/"]').forEach(a => {
    const cleaned = cfg.whatsapp.replace(/[^0-9]/g, '');
    a.href = `https://wa.me/${cleaned}`;
  });

  // Update copyright year dynamically
  document.querySelectorAll('[data-config="copyright"]').forEach(el => {
    const year = new Date().getFullYear();
    el.textContent = `Copyright © ${cfg.foundedYear}-${year} www.zeamor.com. All rights reserved.`;
  });
}

// Inject stats from config
function injectStats() {
  const stats = SITE_CONFIG.stats;
  document.querySelectorAll('[data-config="stat-years"]').forEach(el => el.textContent = stats.yearsExperience);
  document.querySelectorAll('[data-config="stat-export"]').forEach(el => el.textContent = stats.yearsExport);
  document.querySelectorAll('[data-config="stat-clients"]').forEach(el => el.textContent = stats.happyClients);
}

// =====================
// Scroll Effects
// =====================
document.addEventListener('DOMContentLoaded', () => {
  // Header scroll effect
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // Fade-in animation
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  // Init i18n
  setLang(currentLang);

  // Render dynamic content
  renderFeaturedProducts();
  renderProductGallery();
  renderModelGallery();
  injectContactInfo();
  injectStats();
});

// =====================
// Mobile Menu
// =====================
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const overlay = document.getElementById('mobileMenuOverlay');
  menu?.classList.toggle('active');
  overlay?.classList.toggle('active');
  document.body.style.overflow = menu?.classList.contains('active') ? 'hidden' : '';
}

// =====================
// Contact Form Handler (Web3Forms - Direct POST)
// =====================
function validateContactForm(event) {
  const form = event.target;
  const btn = form.querySelector('button[type="submit"]');

  // Validation
  const name = form.querySelector('[name="name"]')?.value.trim();
  const email = form.querySelector('[name="email"]')?.value.trim();
  const message = form.querySelector('[name="message"]')?.value.trim();

  if (!name || !email || !message) {
    const alerts = { en: 'Please fill in all required fields.', zh: '请填写所有必填字段', ja: '必須項目をすべて入力してください。' };
    alert(alerts[currentLang] || alerts.en);
    return false;
  }

  // Loading state
  const loadingTexts = { en: 'Sending...', zh: '发送中...', ja: '送信中...' };
  btn.textContent = loadingTexts[currentLang] || loadingTexts.en;
  btn.disabled = true;

  // Form will submit directly to Web3Forms via action attribute
  return true;
}

// Show success message if redirected back from Web3Forms
function checkFormSuccess() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('sent') === '1') {
    const successEl = document.getElementById('formSuccess');
    if (successEl) successEl.style.display = 'block';
    // Clean URL
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }
}

// Run on page load
if (document.addEventListener) {
  document.addEventListener('DOMContentLoaded', checkFormSuccess);
} else {
  window.onload = checkFormSuccess;
}
