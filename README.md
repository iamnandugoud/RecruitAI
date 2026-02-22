# RecruitAI — Intelligent Resume Screener

AI-powered resume screening tool built with **n8n + Gemini AI**.

## 🚀 How to Run

1. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari)
2. That's it! No installation, no build step, no dependencies.

> **Note:** The app connects to an n8n webhook for AI screening. Make sure your n8n workflow is active.

## 📁 Files

| File | Purpose |
|------|---------|
| `index.html` | Main UI structure |
| `styles.css` | All styling (dark theme, animations) |
| `app.js` | Application logic, API calls, templates |

## ✨ Features

- **Upload & Screen** — Drop a Job Description + Resume PDF for instant AI evaluation
- **Scoring** — Animated gauge with color-coded score (green/amber/red)
- **Smart Email Drafts** — Auto-generated emails for all 3 outcomes:
  - 📛 **Reject** — Polite rejection email
  - 📋 **Talent Pool** — Includes AI summary, encourages future applications
  - 📅 **Interview** — Confirms interview, mentions calendar invite
- **Candidate History** — Expandable cards with full screening summaries
- **n8n Integration** — Sends screening + email payloads to your workflow

## 🔗 n8n Webhook

The app sends data to: `https://nandu90.app.n8n.cloud/webhook/Resume-Screener`

To use your own webhook, update the `API` constant in `app.js` (line 3).

## 📋 Requirements

- Any modern web browser
- Active internet connection (for Google Fonts + n8n webhook)
- n8n workflow configured to handle screening and email actions
