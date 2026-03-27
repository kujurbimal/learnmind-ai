# LearnMind.AI 🎓

> **AI-powered K-12 EdTech landing page** — a fully replicated LearnWith.AI business model, ready to deploy on GitHub Pages in minutes.

![LearnMind.AI preview](https://img.shields.io/badge/Status-Live%20on%20GitHub%20Pages-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## 🚀 Live Demo

**[View Live Site →](https://YOUR-USERNAME.github.io/learnmind-ai)**

---

## 📁 Project Structure

```
learnmind-ai/
├── index.html          # Main HTML — semantic, SEO-ready
├── css/
│   ├── reset.css       # Minimal CSS reset
│   ├── variables.css   # Design tokens (colors, spacing, fonts)
│   ├── layout.css      # Page structure (nav, hero, sections, footer)
│   ├── components.css  # Reusable UI (buttons, cards, modal, toast)
│   └── animations.css  # Keyframes & motion utilities
├── js/
│   └── main.js         # Nav, counters, tutor strip, modal, reveal
└── README.md
```

---

## ⚡ Deploy to GitHub Pages (5 minutes)

### Option A — Upload via GitHub UI

1. Create a new repository on [github.com/new](https://github.com/new)
2. Name it `learnmind-ai` (or anything you like)
3. Click **"uploading an existing file"**
4. Drag and drop all files **preserving the folder structure**
5. Commit to `main`
6. Go to **Settings → Pages → Source → Deploy from branch → main / root**
7. Your site will be live at `https://YOUR-USERNAME.github.io/learnmind-ai`

### Option B — Git CLI

```bash
# Clone or init your repo
git init
git remote add origin https://github.com/YOUR-USERNAME/learnmind-ai.git

# Add all files
git add .
git commit -m "Initial commit: LearnMind.AI landing page"
git push -u origin main

# Enable GitHub Pages
# Settings → Pages → Branch: main, Folder: / (root) → Save
```

### Option C — GitHub CLI

```bash
gh repo create learnmind-ai --public --source=. --push
# Then enable Pages in repo settings
```

---

## 🎨 Customization

### Rebrand

| File | What to change |
|------|---------------|
| `index.html` | Replace `LearnMind` / `LearnMind.AI` with your brand name |
| `css/variables.css` | Swap `--color-electric` and `--color-gold` for your palette |
| `index.html` | Update `<meta>` title and description tags |

### Colors (edit `css/variables.css`)

```css
:root {
  --color-electric: #4f6ef7;  /* Primary action color */
  --color-gold:     #f5c842;  /* Accent / highlight */
  --color-navy:     #0b0f2a;  /* Background */
}
```

### Pricing (edit `index.html`)

Search for `$29` and `$49` and update the plan prices and features as needed.

### Tutor names (edit `index.html`)

Find the `.tutor-chip` elements in the `#hero` section and replace the names and avatar initials.

### Waitlist integration

In `js/main.js`, find the `submitWaitlist()` function and replace the `console.log` with a real API call:

```js
// Example: connect to Mailchimp, ConvertKit, Airtable, Supabase, etc.
async function submitWaitlist() {
  // ... validation ...

  const res = await fetch('https://your-api.com/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, grade }),
  });

  if (res.ok) {
    closeModal();
    showToast('🎉 You\'re on the list!');
  }
}
```

---

## 🧩 Business Model (Replicated from LearnWith.AI)

| Element | Implementation |
|---------|---------------|
| **Multi-product suite** | 3 apps by grade (TeachTales, Athena Jr., Athena) |
| **AI persona tutors** | Historical figures as branded AI teachers |
| **Grade segmentation** | Elementary / Middle / High School targeting |
| **Full AP + SAT coverage** | Every AP course + dedicated SAT prep module |
| **Freemium → subscription** | Free → $29/mo Pro → $49/mo Family |
| **Waitlist launch strategy** | CTA-gated with email capture modal |
| **Parent dashboard** | Trust/retention feature for parent buyers |
| **Short-form video** | TikTok-style learning format for engagement |

---

## 🛠 Tech Stack

- **Pure HTML5** — no build tools, no dependencies
- **Vanilla CSS** — custom properties, grid, flexbox, CSS animations
- **Vanilla JS** — IntersectionObserver, requestAnimationFrame, no frameworks
- **Google Fonts** — Fraunces (display) + DM Sans (body)

---

## 📄 License

MIT — free to use, modify, and deploy commercially.
