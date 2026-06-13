/**
 * ZEAMOR Website - Main JavaScript
 * Handles: i18n (EN/ZH/JA), dynamic rendering, mobile menu, scroll effects, contact form
 * Config: loads js/site.config.json asynchronously
 */

// =====================
// Async Config Loader
// =====================
let CONFIG_LOADED = false;
let CONFIG_PROMISE = null;

async function loadConfig() {
  try {
    const resp = await fetch('js/site.config.json?t=' + Date.now());
    if (!resp.ok) throw new Error('Failed to load site.config.json: ' + resp.status);
    const data = await resp.json();
    window.SITE_CONFIG = data;

    // Apply admin overrides from localStorage (for preview)
    applyAdminOverrides();

    CONFIG_LOADED = true;
    document.dispatchEvent(new Event('zeamor-config-loaded'));
    return data;
  } catch (e) {
    console.error('[ZEAMOR] Config load error:', e);
    // Fallback: try loading legacy site.config.js
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'js/site.config.js';
      s.onload = () => {
        CONFIG_LOADED = true;
        applyAdminOverrides();
        document.dispatchEvent(new Event('zeamor-config-loaded'));
        resolve(window.SITE_CONFIG);
      };
      s.onerror = () => {
        console.error('[ZEAMOR] Failed to load config from both JSON and JS');
        CONFIG_LOADED = true;
        document.dispatchEvent(new Event('zeamor-config-loaded'));
        resolve(null);
      };
      document.head.appendChild(s);
    });
  }
}

function applyAdminOverrides() {
  try {
    const saved = localStorage.getItem('zeamor-config');
    if (saved && window.SITE_CONFIG) {
      const override = JSON.parse(saved);
      Object.keys(override).forEach(key => {
        if (typeof override[key] === 'object' && !Array.isArray(override[key]) && typeof window.SITE_CONFIG[key] === 'object' && !Array.isArray(window.SITE_CONFIG[key])) {
          deepMerge(window.SITE_CONFIG[key], override[key]);
        } else {
          window.SITE_CONFIG[key] = override[key];
        }
      });
      console.log('[ZEAMOR] Applied saved config overrides');
    }
  } catch (e) { console.error('[ZEAMOR] Config override error:', e); }
}

function deepMerge(target, source) {
  Object.keys(source).forEach(k => {
    if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k]) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      deepMerge(target[k], source[k]);
    } else {
      target[k] = source[k];
    }
  });
}

// Start loading config immediately (not waiting for DOM)
CONFIG_PROMISE = loadConfig();

// =====================
// i18n Engine
// =====================
let currentLang = localStorage.getItem('zeamor-lang') || 'en';

function t(key) {
  return (window.SITE_CONFIG && window.SITE_CONFIG.i18n && window.SITE_CONFIG.i18n[currentLang] && window.SITE_CONFIG.i18n[currentLang][key]) || key;
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
  if (!container || !window.SITE_CONFIG) return;
  const lang = currentLang;

  container.innerHTML = window.SITE_CONFIG.featuredProducts.map(p => `
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
  if (!container || !window.SITE_CONFIG) return;
  const lang = currentLang;

  container.innerHTML = window.SITE_CONFIG.productCategories.map((cat, i) => `
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
  if (!container || !window.SITE_CONFIG) return;

  container.innerHTML = window.SITE_CONFIG.modelGallery.map(p => `
    <div class="gallery-item">
      <img src="${p.img}" alt="ZEAMOR Lifestyle" loading="lazy">
    </div>
  `).join('');
}

// Inject contact info from config into DOM
function injectContactInfo() {
  if (!window.SITE_CONFIG) return;
  const cfg = window.SITE_CONFIG.brand;

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
  if (!window.SITE_CONFIG) return;
  const stats = window.SITE_CONFIG.stats;
  document.querySelectorAll('[data-config="stat-years"]').forEach(el => el.textContent = stats.yearsExperience);
  document.querySelectorAll('[data-config="stat-export"]').forEach(el => el.textContent = stats.yearsExport);
  document.querySelectorAll('[data-config="stat-clients"]').forEach(el => el.textContent = stats.happyClients);
}

// =====================
// Scroll Effects
// =====================
function initScrollEffects() {
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
}

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

// =====================
// Main Init (waits for config + DOM)
// =====================
async function init() {
  // Wait for config to load (max 5s)
  if (!CONFIG_LOADED) {
    await Promise.race([
      CONFIG_PROMISE,
      new Promise(r => setTimeout(r, 5000))
    ]);
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
  }

  // Init scroll effects
  initScrollEffects();

  // Init i18n
  setLang(currentLang);

  // Render dynamic content
  renderFeaturedProducts();
  renderProductGallery();
  renderModelGallery();
  injectContactInfo();
  injectStats();

  // Check form success
  checkFormSuccess();
}

// Start init
init();
