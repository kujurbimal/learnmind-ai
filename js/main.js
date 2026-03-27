/**
 * main.js — LearnMind.AI
 * Handles: nav scroll, mobile menu, tutor strip cloning,
 *          stat counters, scroll reveal, modal, toast
 */

'use strict';

/* ────────────────────────────────────────────────────────────
   NAV — scroll shadow + mobile hamburger
──────────────────────────────────────────────────────────── */
const nav        = document.getElementById('nav');
const hamburger  = document.getElementById('hamburger');
const mobileNav  = document.getElementById('mobileNav');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

hamburger.addEventListener('click', () => {
  const isOpen = mobileNav.classList.toggle('open');
  hamburger.classList.toggle('active', isOpen);
  hamburger.setAttribute('aria-expanded', isOpen);
});

function closeMobileNav() {
  mobileNav.classList.remove('open');
  hamburger.classList.remove('active');
  hamburger.setAttribute('aria-expanded', 'false');
}

/* ────────────────────────────────────────────────────────────
   TUTOR STRIP — duplicate chips for seamless infinite scroll
──────────────────────────────────────────────────────────── */
(function initTutorStrip() {
  const scroll = document.getElementById('tutorScroll');
  if (!scroll) return;
  // Clone the original set of chips so CSS marquee loops seamlessly
  const clone = scroll.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  scroll.parentElement.appendChild(clone);
})();

/* ────────────────────────────────────────────────────────────
   STAT COUNTERS — animate numbers when the bar enters view
──────────────────────────────────────────────────────────── */
function animateCounter(el) {
  const target  = parseFloat(el.dataset.count);
  const suffix  = el.dataset.suffix  || '';
  const decimal = parseInt(el.dataset.decimal || '0', 10);
  const duration = 1400; // ms
  const startTime = performance.now();

  function update(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased    = 1 - Math.pow(1 - progress, 3);
    const value    = target * eased;
    el.textContent = value.toFixed(decimal) + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = target.toFixed(decimal) + suffix;
      el.classList.add('popped');
    }
  }

  requestAnimationFrame(update);
}

(function initCounters() {
  const counters = document.querySelectorAll('.stat-num[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
})();

/* ────────────────────────────────────────────────────────────
   SCROLL REVEAL — cards & testimonials
──────────────────────────────────────────────────────────── */
(function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  items.forEach(el => observer.observe(el));
})();

/* ────────────────────────────────────────────────────────────
   MODAL
──────────────────────────────────────────────────────────── */
const modalOverlay = document.getElementById('modalOverlay');

function openWaitlist() {
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

function openDemo() {
  showToast('🎬 Demo video coming soon! Join the waitlist for early access.');
}

/* ────────────────────────────────────────────────────────────
   WAITLIST FORM SUBMIT
──────────────────────────────────────────────────────────── */
function submitWaitlist() {
  const name  = document.getElementById('waitlistName').value.trim();
  const email = document.getElementById('waitlistEmail').value.trim();
  const grade = document.getElementById('waitlistGrade').value;

  if (!name) { showToast('⚠️ Please enter your name.'); return; }
  if (!email || !email.includes('@')) { showToast('⚠️ Please enter a valid email.'); return; }
  if (!grade) { showToast('⚠️ Please select a grade level.'); return; }

  // In production: replace with real API call e.g. fetch('/api/waitlist', {...})
  console.log('Waitlist submission:', { name, email, grade });

  closeModal();
  showToast('🎉 You\'re on the list! We\'ll be in touch soon.');

  // Reset form
  document.getElementById('waitlistName').value  = '';
  document.getElementById('waitlistEmail').value = '';
  document.getElementById('waitlistGrade').value = '';
}

/* ────────────────────────────────────────────────────────────
   TOAST NOTIFICATION
──────────────────────────────────────────────────────────── */
let toastTimeout;

function showToast(message) {
  let toast = document.querySelector('.toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ────────────────────────────────────────────────────────────
   SMOOTH SCROLL — anchor links (supplement CSS scroll-behavior
   for browsers that don't support it or need offset)
──────────────────────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();

    const navHeight = nav.offsetHeight;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ────────────────────────────────────────────────────────────
   EXPOSE globals used in inline onclick attributes
──────────────────────────────────────────────────────────── */
window.openWaitlist   = openWaitlist;
window.closeModal     = closeModal;
window.closeMobileNav = closeMobileNav;
window.openDemo       = openDemo;
window.submitWaitlist = submitWaitlist;
