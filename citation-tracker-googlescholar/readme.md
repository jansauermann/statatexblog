# Google Scholar Citation Export (Apps Script → GitHub)

This repository contains a **Google Apps Script** that automatically exports **Google Scholar citation metrics** for a given author profile and stores them as plain text files in a GitHub repository.

The setup is designed to be:

- ✅ Robust (no direct scraping of Google Scholar)
- ✅ Fully automated
- ✅ LaTeX- and website-friendly
- ✅ Low maintenance

It complements per-paper citation tracking from **Scopus** by adding **Google Scholar totals and h-index**, which are broader but not available via a stable official API.

---

## What the script does

On each run, the script:

1. Fetches Google Scholar metrics for a given author using **SerpApi**
2. Extracts:
   - **Total citations**
   - **h-index**
3. Writes the results to GitHub as **raw numeric files**:
   ```
   citations/GoogleScholarTotalCitations_raw.txt
   citations/GoogleScholarHIndex_raw.txt
   ```
4. Uses a safety guard to avoid overwriting values if they ever decrease
5. Can be scheduled to run automatically every morning

The raw files are intentionally minimal (digits only, no whitespace) so they can be:
- `\input{}` directly into LaTeX
- fetched client-side on a website
- reused in other scripts without parsing

---

## Why SerpApi?

Google Scholar aggressively blocks automated requests from cloud environments such as Apps Script.

Instead of brittle scraping, this script uses **SerpApi’s Google Scholar Author API**, which provides:
- stable JSON responses
- reliable access
- predictable rate limits

This makes the automation sustainable.

---

## Files written to the repository

| File | Contents |
|----|----|
| `citations/GoogleScholarTotalCitations_raw.txt` | Total Google Scholar citations |
| `citations/GoogleScholarHIndex_raw.txt` | Google Scholar h-index |

Example contents:
```
2444
```
(no trailing newline)

---

## Requirements

Before first run:

- A public **Google Scholar profile**
- A **SerpApi account** (free tier is sufficient)
- A **GitHub personal access token**
- A **Google Apps Script project**

---

## Setup instructions

### 1. Create required secrets

In **Apps Script → Project Settings → Script Properties**, add:

| Property | Description |
|--------|-------------|
| `SERPAPI_KEY` | Your SerpApi API key |
| `GITHUB_TOKEN` | GitHub token with repo write access |

Do **not** hard-code tokens in the script.

---

### 2. Configure the script

Edit these constants in the script:

```js
const scholarUserId = "YOUR_GOOGLE_SCHOLAR_USER_ID";
const githubUsername = "YOUR_GITHUB_USERNAME";
const repo = "YOUR_REPO_NAME";
```

Your Google Scholar user ID is the `user=` parameter in your profile URL:
```
https://scholar.google.com/citations?user=XXXXXXXX
```

---

### 3. First run (authorization)

Run this function once:

```js
updateGoogleScholarMetrics();
```

Approve the required permissions for external requests.

---

### 4. Enable daily automation (optional)

Run once:

```js
ensureMorningTrigger_();
```

This creates a time-driven trigger that runs every day at **08:00** (script timezone).

You can change the hour in the script:
```js
.atHour(7) // 07:00 instead
```

---

## Using the output

### LaTeX

```latex
(\input{citations/GoogleScholarTotalCitations_raw})
(h = \input{citations/GoogleScholarHIndex_raw})
```

To avoid spacing issues when using macros, always add `\unskip`:
```latex
\newcommand{\addcit}[1]{\input{#1}\unskip}
```

---

### Website (GitHub Pages)

The raw files can be fetched client-side and rendered dynamically in the reference list.

---

## Design choices and limitations

- Totals and h-index only  
  Per-paper Google Scholar citation counts are intentionally not included due to unstable identifiers and fuzzy matching.

- Guard against decreases  
  The script will not overwrite stored values with lower ones.

- No scraping  
  Avoids brittle HTML parsing and CAPTCHA blocks.

---

## License

MIT License.

---

## Acknowledgements

- Google Scholar (data source)
- SerpApi (API access layer)
- Google Apps Script
- GitHub API
