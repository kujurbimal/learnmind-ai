/**
 * generate.js — LearnMind.AI Content Pipeline
 *
 * Reads config from environment variables, calls Claude for each
 * section, saves generated JSON to content/, then builds index.html.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... BRAND="MyBrand" node generate.js
 *   SECTIONS=hero,tutors node generate.js   ← partial regeneration
 *   SECTIONS=all node generate.js           ← full run (default)
 */

'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const fs        = require('fs');
const path      = require('path');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const CONFIG = {
  brand:    process.env.BRAND    || 'LearnMind.AI',
  audience: process.env.AUDIENCE || 'K-12 students and parents',
  tone:     process.env.TONE     || 'motivational and urgent',
  sections: (process.env.SECTIONS || 'all').split(',').map(s => s.trim()),
};

const ROOT_DIR    = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const OUTPUT_FILE = path.join(ROOT_DIR, 'index.html');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── SECTION DEFINITIONS ───────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'hero',
    name: 'Hero Section',
    prompt: (c) => `You are a world-class EdTech copywriter. Write hero section copy for ${c.brand}, an AI-powered K-12 learning platform.
Tone: ${c.tone}. Audience: ${c.audience}.
Return ONLY valid JSON (no markdown, no backticks):
{"badge":"short badge text (6 words max)","headline_plain":"first line of headline","headline_em":"emphasized italic word or phrase","subheadline":"2-sentence compelling subheadline","cta_primary":"primary button text","cta_secondary":"secondary button text"}`
  },
  {
    id: 'tutors',
    name: 'AI Tutor Personas',
    prompt: (c) => `Generate 12 historical figure AI tutor personas for ${c.brand}, an AI K-12 platform for ${c.audience}.
Choose diverse iconic figures across history, science, literature, leadership.
Return ONLY valid JSON:
{"tutors":[{"name":"Full Name","initials":"AB","subject":"Subject they teach","emoji":"🔬"}]}
12 tutors total. Vary subjects and eras. No duplicates.`
  },
  {
    id: 'stats',
    name: 'Stats & Social Proof',
    prompt: (c) => `Generate 3 compelling stat numbers for ${c.brand}, an AI EdTech platform for ${c.audience}.
Make them believable and specific to EdTech.
Return ONLY valid JSON:
{"stats":[{"number":"10×","label":"descriptive label"},{"number":"5.0","label":"descriptive label"},{"number":"50K+","label":"descriptive label"}]}`
  },
  {
    id: 'products',
    name: 'Product Cards',
    prompt: (c) => `Write 3 product card descriptions for ${c.brand}'s AI learning apps for ${c.audience}.
Tone: ${c.tone}. Products: Elementary (2nd–6th), Middle (3rd–8th), High School (9th–12th).
Return ONLY valid JSON:
{"products":[{"tag":"Grade range","name":"Product name","level":"School level","description":"2-3 sentence compelling description","color":"blue"}]}
Colors must be: blue, gold, purple (one each in that order).`
  },
  {
    id: 'subjects',
    name: 'Subject Grid',
    prompt: (c) => `List 6 core subject areas for ${c.brand}'s K-12 AI curriculum for ${c.audience}.
Return ONLY valid JSON:
{"subjects":[{"icon":"📜","name":"Subject Name","courses":"3 specific courses"}]}
Include History, Science, Math, English, Humanities, and one more. Use real AP course names.`
  },
  {
    id: 'how',
    name: 'How It Works',
    prompt: (c) => `Write 4 "How It Works" steps for ${c.brand}'s AI learning process for ${c.audience}.
Tone: ${c.tone}. Be specific and tangible.
Return ONLY valid JSON:
{"steps":[{"number":"01","title":"Step Title","description":"2-3 sentence description"}]}
4 steps covering: assessment → AI tutors → practice/feedback → progress tracking.`
  },
  {
    id: 'pricing',
    name: 'Pricing Plans',
    prompt: (c) => `Write 3 pricing plans for ${c.brand} targeting ${c.audience}.
Tone: ${c.tone}. Pro plan should be most appealing.
Return ONLY valid JSON:
{"plans":[{"name":"Plan Name","price":"$XX or Free","period":"/mo","description":"one-liner","features":["feature 1","feature 2","feature 3","feature 4"],"cta":"button text","featured":false}]}
3 plans: Free (4 features), Pro (6 features, featured:true, price $29), Family (4 features, price $49).`
  },
  {
    id: 'testimonials',
    name: 'Testimonials',
    prompt: (c) => `Write 3 realistic testimonials for ${c.brand}, an AI K-12 platform for ${c.audience}.
Each must mention a specific result (grade, score, exam outcome). Tone: ${c.tone}.
Return ONLY valid JSON:
{"testimonials":[{"text":"testimonial text","name":"Username","role":"Student type or parent","initial":"A"}]}
3 testimonials: a student, a parent, a test-prep student.`
  },
  {
    id: 'cta',
    name: 'Final CTA',
    prompt: (c) => `Write the closing call-to-action section for ${c.brand} targeting ${c.audience}.
Tone: ${c.tone}. Make it urgent and emotionally compelling.
Return ONLY valid JSON:
{"headline_plain":"first part of headline","headline_em":"emphasized climax word","subtext":"1-2 sentences of urgency","button_text":"CTA button text"}`
  },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function log(emoji, msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${emoji}  ${msg}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadExisting(id) {
  const file = path.join(CONTENT_DIR, `${id}.json`);
  if (fs.existsSync(file)) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
  }
  return null;
}

function saveContent(id, data) {
  ensureDir(CONTENT_DIR);
  fs.writeFileSync(
    path.join(CONTENT_DIR, `${id}.json`),
    JSON.stringify(data, null, 2),
    'utf8'
  );
}

// ── API CALL ──────────────────────────────────────────────────────────────────
async function callClaude(prompt, sectionName) {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const msg = await client.messages.create({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages:   [{ role: 'user', content: prompt }],
      });

      const text = msg.content.find(b => b.type === 'text')?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return parsed;

    } catch (err) {
      if (attempt < maxRetries) {
        log('⚠️', `${sectionName} attempt ${attempt} failed: ${err.message} — retrying in ${attempt * 2}s`);
        await new Promise(r => setTimeout(r, attempt * 2000));
      } else {
        throw new Error(`${sectionName} failed after ${maxRetries} attempts: ${err.message}`);
      }
    }
  }
}

// ── MAIN GENERATION LOOP ──────────────────────────────────────────────────────
async function generateSections() {
  const shouldGenerate = (id) =>
    CONFIG.sections.includes('all') || CONFIG.sections.includes(id);

  const results = {};
  let generated = 0;
  let skipped   = 0;
  let failed    = 0;

  log('🚀', `Starting pipeline — Brand: "${CONFIG.brand}" | Audience: "${CONFIG.audience}" | Tone: "${CONFIG.tone}"`);
  log('📋', `Sections: ${CONFIG.sections.join(', ')}`);
  console.log('─'.repeat(60));

  for (const section of SECTIONS) {
    if (!shouldGenerate(section.id)) {
      // Load existing content for sections we're not regenerating
      const existing = loadExisting(section.id);
      if (existing) {
        results[section.id] = existing;
        log('⏭️', `${section.name} — skipped (using cached)`);
        skipped++;
      } else {
        log('⚠️', `${section.name} — skipped but no cache found, will use defaults`);
      }
      continue;
    }

    log('⏳', `Generating: ${section.name}...`);
    try {
      const data = await callClaude(section.prompt(CONFIG), section.name);
      results[section.id] = data;
      saveContent(section.id, data);
      log('✅', `${section.name} — done`);
      generated++;

      // Small delay between calls to be polite to the API
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      log('❌', `${section.name} — ${err.message}`);
      // Fall back to cached version if available
      const cached = loadExisting(section.id);
      if (cached) {
        results[section.id] = cached;
        log('♻️', `${section.name} — using cached fallback`);
      }
      failed++;
    }
  }

  console.log('─'.repeat(60));
  log('📊', `Done: ${generated} generated, ${skipped} skipped, ${failed} failed`);

  // Save full combined snapshot
  ensureDir(CONTENT_DIR);
  fs.writeFileSync(
    path.join(CONTENT_DIR, 'generated.json'),
    JSON.stringify({ config: CONFIG, timestamp: new Date().toISOString(), sections: results }, null, 2),
    'utf8'
  );

  return results;
}

// ── HTML BUILDER ──────────────────────────────────────────────────────────────
function buildHTML(data) {
  const brand = CONFIG.brand;
  const brandName = brand.replace(/\.ai$/i, '').replace(/\.AI$/, '');
  const brandHTML = `${brandName}<span style="color:var(--color-gold)">.AI</span>`;

  const hero         = data.hero         || {};
  const tutors       = data.tutors?.tutors       || defaultTutors();
  const stats        = data.stats?.stats         || defaultStats();
  const products     = data.products?.products   || defaultProducts();
  const subjects     = data.subjects?.subjects   || defaultSubjects();
  const how          = data.how?.steps           || defaultSteps();
  const pricing      = data.pricing?.plans       || defaultPlans();
  const testimonials = data.testimonials?.testimonials || defaultTestimonials();
  const cta          = data.cta          || {};

  const tutorChips = tutors.map(t =>
    `<div class="tutor-chip"><span class="avatar">${esc(t.initials)}</span>${esc(t.name)}</div>`
  ).join('\n        ');

  const statItems = stats.map(s => `
    <div class="stat">
      <div class="stat-num">${esc(s.number)}</div>
      <div class="stat-label">${esc(s.label)}</div>
    </div>`).join('');

  const productCards = products.map(p => `
      <div class="product-card product-${esc(p.color)}">
        <span class="product-tag tag-${esc(p.color)}">${esc(p.tag)}</span>
        <div class="product-name">${esc(p.name)}</div>
        <div class="product-grades">${esc(p.level)}</div>
        <p class="product-desc">${esc(p.description)}</p>
        <a href="#" class="product-link" onclick="openWaitlist();return false">Join Waitlist →</a>
      </div>`).join('');

  const subjectCards = subjects.map(s => `
      <div class="subject-card">
        <div class="subject-icon">${s.icon}</div>
        <div class="subject-name">${esc(s.name)}</div>
        <div class="subject-courses">${esc(s.courses)}</div>
      </div>`).join('');

  const stepCards = how.map(s => `
      <div class="step reveal">
        <div class="step-num">${esc(s.number)}</div>
        <div class="step-title">${esc(s.title)}</div>
        <p class="step-desc">${esc(s.description)}</p>
      </div>`).join('');

  const planCards = pricing.map(p => `
      <div class="plan${p.featured ? ' plan-featured' : ''}">
        ${p.featured ? '<div class="plan-badge">Most Popular</div>' : ''}
        <div class="plan-name">${esc(p.name)}</div>
        <div class="plan-price">${esc(p.price)}<span>${esc(p.period || '/mo')}</span></div>
        <div class="plan-desc">${esc(p.description)}</div>
        <ul class="features">
          ${p.features.map(f => `<li class="feature"><span class="check">✓</span>${esc(f)}</li>`).join('')}
        </ul>
        <button class="btn ${p.featured ? 'btn-white' : 'btn-outline'} btn-full" onclick="openWaitlist()">${esc(p.cta)}</button>
      </div>`).join('');

  const testimonialCards = testimonials.map(t => `
      <div class="testimonial reveal">
        <div class="stars">★★★★★</div>
        <p class="testimonial-text">"${esc(t.text)}"</p>
        <div class="testimonial-author">
          <div class="author-avatar">${esc(t.initial)}</div>
          <div>
            <div class="author-name">${esc(t.name)}</div>
            <div class="author-role">${esc(t.role)}</div>
          </div>
        </div>
      </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="description" content="${esc(brand)} — AI-powered K-12 education. ${esc(hero.subheadline || 'Learn faster with AI tutors.')}"/>
  <meta property="og:title" content="${esc(brand)} — ${esc(hero.headline_plain || 'Learn with AI')}"/>
  <meta property="og:type" content="website"/>
  <!-- Generated by AI Pipeline on ${new Date().toISOString()} -->
  <title>${esc(brand)} — ${esc(hero.headline_plain || 'Learn 10x Faster')} with AI Tutors</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,700;0,900;1,300&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="css/reset.css"/>
  <link rel="stylesheet" href="css/variables.css"/>
  <link rel="stylesheet" href="css/layout.css"/>
  <link rel="stylesheet" href="css/components.css"/>
  <link rel="stylesheet" href="css/animations.css"/>
</head>
<body>

  <nav class="nav" id="nav">
    <a href="#" class="logo">${brandHTML}</a>
    <ul class="nav-links">
      <li><a href="#products">Products</a></li>
      <li><a href="#subjects">Subjects</a></li>
      <li><a href="#pricing">Pricing</a></li>
      <li><a href="#testimonials">Reviews</a></li>
    </ul>
    <button class="btn btn-primary nav-cta" onclick="openWaitlist()">${esc(hero.cta_primary || 'Get Started Free')}</button>
    <button class="nav-hamburger" id="hamburger" aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>
  </nav>

  <div class="mobile-nav" id="mobileNav">
    <ul>
      <li><a href="#products" onclick="closeMobileNav()">Products</a></li>
      <li><a href="#subjects" onclick="closeMobileNav()">Subjects</a></li>
      <li><a href="#pricing" onclick="closeMobileNav()">Pricing</a></li>
      <li><a href="#testimonials" onclick="closeMobileNav()">Reviews</a></li>
    </ul>
    <button class="btn btn-primary" onclick="openWaitlist()">${esc(hero.cta_primary || 'Get Started Free')}</button>
  </div>

  <section class="hero" id="hero">
    <div class="hero-glow"></div>
    <div class="hero-content">
      <div class="badge fade-up" style="--delay:0s">🚀 ${esc(hero.badge || 'AI-Powered K-12 Education')}</div>
      <h1 class="fade-up" style="--delay:0.1s">${esc(hero.headline_plain || 'Learn 10x Faster')}<br>with <em>${esc(hero.headline_em || 'AI Tutors')}</em></h1>
      <p class="hero-sub fade-up" style="--delay:0.2s">${esc(hero.subheadline || 'Personalized AI courses for every grade level.')}</p>
      <div class="hero-actions fade-up" style="--delay:0.3s">
        <button class="btn btn-primary btn-lg" onclick="openWaitlist()">${esc(hero.cta_primary || 'Join Free Waitlist')} →</button>
        <button class="btn btn-ghost btn-lg" onclick="openDemo()">${esc(hero.cta_secondary || 'Watch Demo')}</button>
      </div>
    </div>
    <div class="tutor-strip fade-up" style="--delay:0.45s">
      <div class="tutor-scroll" id="tutorScroll">
        ${tutorChips}
      </div>
    </div>
  </section>

  <div class="stats-bar">${statItems}</div>

  <section class="section" id="products">
    <div class="section-header">
      <span class="section-label">Our Products</span>
      <h2 class="section-title">AI tutors for <em>every</em> stage of learning</h2>
      <p class="section-sub">Three distinct apps built for different grade levels.</p>
    </div>
    <div class="products-grid">${productCards}</div>
  </section>

  <section class="section subjects-section" id="subjects">
    <div class="section-header">
      <span class="section-label">Subjects</span>
      <h2 class="section-title">Every subject your child needs to <em>excel</em></h2>
      <p class="section-sub">Full K-12 coverage across all core disciplines.</p>
    </div>
    <div class="subjects-grid">${subjectCards}</div>
  </section>

  <section class="section how-section">
    <div class="section-header">
      <span class="section-label">How It Works</span>
      <h2 class="section-title">The AI education model that actually <em>works</em></h2>
    </div>
    <div class="steps-grid">${stepCards}</div>
  </section>

  <section class="section pricing-section" id="pricing">
    <div class="section-header" style="text-align:center">
      <span class="section-label">Pricing</span>
      <h2 class="section-title" style="margin:0 auto">Simple, transparent <em>pricing</em></h2>
    </div>
    <div class="pricing-grid">${planCards}</div>
  </section>

  <section class="section testimonials" id="testimonials">
    <div class="section-header">
      <span class="section-label">Reviews</span>
      <h2 class="section-title">Students and parents <em>love</em> it</h2>
    </div>
    <div class="testimonials-grid">${testimonialCards}</div>
  </section>

  <section class="final-cta">
    <div class="final-cta-glow"></div>
    <h2>${esc(cta.headline_plain || "Don't let your child")}<br>get left <em>${esc(cta.headline_em || 'behind')}</em></h2>
    <p>${esc(cta.subtext || 'Give your child the AI-powered edge to stay ahead.')}</p>
    <button class="btn btn-primary btn-xl" onclick="openWaitlist()">${esc(cta.button_text || 'Join the Waitlist Free')} →</button>
  </section>

  <footer class="footer">
    <a href="#" class="logo">${brandHTML}</a>
    <nav class="footer-links">
      <a href="#">Privacy Policy</a>
      <a href="#">Terms of Service</a>
      <a href="#">Contact</a>
    </nav>
    <p class="footer-copy">© ${new Date().getFullYear()} ${esc(brand)}. All rights reserved.</p>
  </footer>

  <div class="modal-overlay" id="modalOverlay" onclick="closeModal()">
    <div class="modal" onclick="event.stopPropagation()">
      <button class="modal-close" onclick="closeModal()">✕</button>
      <div class="modal-icon">🎓</div>
      <h3 class="modal-title">Join the Waitlist</h3>
      <p class="modal-sub">Be first to access AI-powered K-12 learning.</p>
      <div class="modal-form">
        <input type="text" placeholder="Your name" id="waitlistName"/>
        <input type="email" placeholder="Email address" id="waitlistEmail"/>
        <select id="waitlistGrade">
          <option value="">Select grade level</option>
          <option>2nd – 4th Grade</option>
          <option>5th – 8th Grade</option>
          <option>9th – 12th Grade</option>
          <option>I'm a parent</option>
        </select>
        <button class="btn btn-primary btn-full" onclick="submitWaitlist()">Reserve My Spot →</button>
      </div>
    </div>
  </div>

  <script src="js/main.js"></script>
</body>
</html>`;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

// ── DEFAULTS ──────────────────────────────────────────────────────────────────
function defaultTutors() {
  return [
    {name:'Albert Einstein',  initials:'AE', subject:'Physics'},
    {name:'Marie Curie',      initials:'MC', subject:'Chemistry'},
    {name:'George Washington',initials:'GW', subject:'History'},
    {name:'Nikola Tesla',     initials:'NT', subject:'Engineering'},
    {name:'Maya Angelou',     initials:'MA', subject:'Literature'},
    {name:'Isaac Newton',     initials:'IN', subject:'Mathematics'},
    {name:'Amelia Earhart',   initials:'AE', subject:'Aviation'},
    {name:'Galileo Galilei',  initials:'GG', subject:'Astronomy'},
    {name:'Leonardo da Vinci',initials:'LD', subject:'Art & Science'},
    {name:'Harriet Tubman',   initials:'HT', subject:'Social Studies'},
    {name:'Mahatma Gandhi',   initials:'MG', subject:'Ethics'},
    {name:'William Shakespeare',initials:'WS',subject:'English'},
  ];
}
function defaultStats() {
  return [
    {number:'10×',  label:'Faster than traditional classroom learning'},
    {number:'5.0',  label:'Average App Store rating from students'},
    {number:'50K+', label:'Students already on the waitlist'},
  ];
}
function defaultProducts() {
  return [
    {tag:'2nd–6th Grade', name:'TeachTales', level:'Elementary School',
     description:'Story-driven AI learning that makes young students fall in love with history and science through interactive adventures.',
     color:'blue'},
    {tag:'3rd–8th Grade', name:'Athena Jr.', level:'Middle School',
     description:'Adaptive AI curriculum accelerating middle schoolers through every core subject with personalized pacing and instant feedback.',
     color:'gold'},
    {tag:'9th–12th Grade',name:'Athena',     level:'High School',
     description:'Master every AP exam and dominate the SAT with AI tutors who adapt to your weaknesses and keep you engaged.',
     color:'purple'},
  ];
}
function defaultSubjects() {
  return [
    {icon:'📜',name:'History',   courses:'AP US History, AP World, AP European'},
    {icon:'🔬',name:'Science',   courses:'AP Biology, AP EnvSci, AP Physics'},
    {icon:'📐',name:'Math',      courses:'Algebra 1 & 2, Geometry, Precalc'},
    {icon:'✍️',name:'English',   courses:'AP Lang, AP Literature, ELA'},
    {icon:'🌍',name:'Humanities',courses:'AP Human Geography, AP Gov, AP Psych'},
    {icon:'📊',name:'SAT Prep',  courses:'Math, Reading, Writing, Full Tests'},
  ];
}
function defaultSteps() {
  return [
    {number:'01',title:'Personalized Assessment',
     description:'Our AI identifies exactly where your child stands and builds a custom curriculum around their strengths and gaps.'},
    {number:'02',title:'Learn from Legends',
     description:'AI personas of history\'s greatest thinkers deliver engaging short-form lessons that hold attention better than any textbook.'},
    {number:'03',title:'Active Practice & Feedback',
     description:'Instant AI feedback after every lesson closes knowledge gaps in real-time and reinforces long-term retention.'},
    {number:'04',title:'Parent Dashboard',
     description:'Full visibility into progress, time on task, mastery by topic, and projected exam outcomes — always in the loop.'},
  ];
}
function defaultPlans() {
  return [
    {name:'Basic', price:'Free',period:'/mo',description:'Get started with core content',
     features:['1 Subject Access','20 Lessons / Month','Basic Progress Tracking','Mobile App Access'],
     cta:'Get Started Free', featured:false},
    {name:'Pro',   price:'$29', period:'/mo',description:'Everything a student needs',
     features:['All Subjects Unlimited','Unlimited Lessons','Full AP Exam Prep','SAT Practice Tests','Parent Dashboard','AI Tutor Chat Access'],
     cta:'Start Pro →', featured:true},
    {name:'Family',price:'$49', period:'/mo',description:'Up to 4 children',
     features:['Everything in Pro','Up to 4 Student Profiles','Unified Parent Dashboard','Priority Support'],
     cta:'Get Family Plan', featured:false},
  ];
}
function defaultTestimonials() {
  return [
    {text:'The Einstein AI tutor explained physics in a way my actual teacher never could. Went from a C to a 5 on the AP exam.',
     name:'Waq230',    role:'AP Physics Student',       initial:'W'},
    {text:'My daughter went from failing history to a 5 on the AP exam in 3 months. The short-form format keeps her hooked.',
     name:'Sarina513', role:'Parent of AP Student',     initial:'S'},
    {text:'Went from 1280 to 1540 SAT in two months. The AI found my exact weak spots and drilled them relentlessly.',
     name:'JakeR_2026',role:'SAT Prep Student',         initial:'J'},
  ];
}

// ── ENTRY POINT ───────────────────────────────────────────────────────────────
(async () => {
  try {
    const data = await generateSections();
    log('🏗️', 'Building index.html...');
    const html = buildHTML(data);
    fs.writeFileSync(OUTPUT_FILE, html, 'utf8');
    log('✅', `index.html written to ${OUTPUT_FILE}`);
    log('🎉', 'Pipeline complete!');
  } catch (err) {
    log('💥', `Fatal error: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
})();
