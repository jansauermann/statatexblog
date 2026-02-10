/**
 * Google Scholar metrics (total citations + h-index) → GitHub
 * Uses SerpApi (reliable, avoids Scholar blocking)
 *
 * Script Properties REQUIRED:
 *   SERPAPI_KEY
 *   GITHUB_TOKEN
 *
 * One-time setup:
 *   - Add Script Properties
 *   - Run ensureMorningTrigger_()
 */

function updateGoogleScholarMetrics() {
  // ===== CONFIG =====
  const scholarUserId = "ENTER_YOUR_PROFILE_ID";

  const githubUsername = "GITHUB_USERNAME";
  const repo = "GITHUB_USERNAME.github.io";

  const files = {
    total: {
      txt: "citations/GoogleScholarTotalCitations.txt",
      raw: "citations/GoogleScholarTotalCitations_raw.txt",
      label: "citations according to Google Scholar"
    },
    hindex: {
      txt: "citations/GoogleScholarHIndex.txt",
      raw: "citations/GoogleScholarHIndex_raw.txt",
      label: "h-index according to Google Scholar"
    }
  };

  // ===== SECRETS =====
  const serpApiKey = getRequiredSecret_("SERPAPI_KEY");
  const githubToken = getRequiredSecret_("GITHUB_TOKEN");

  // ===== PREVIOUS VALUES =====
  const prevTotal = readOrZero_(githubToken, githubUsername, repo, files.total.raw);
  const prevH = readOrZero_(githubToken, githubUsername, repo, files.hindex.raw);

  // ===== FETCH CURRENT METRICS =====
  const metrics = fetchScholarMetricsFromSerpApi_(serpApiKey, scholarUserId);
  const total = metrics.total;
  const hindex = metrics.hindex;

  Logger.log(`Fetched Scholar metrics: total=${total}, h-index=${hindex}`);

  // ===== GUARD AGAINST SUSPICIOUS DECREASES =====
  if (total < prevTotal || hindex < prevH) {
    Logger.log("⚠️ Skipped update to avoid overwriting with lower values");
    return;
  }

  // ===== WRITE FILES (raw files have NO newline) =====
  updateFileInGitHub_(
    githubToken, githubUsername, repo,
    files.total.txt,
    `(${files.total.label}; total: ${total} citations)`
  );
  updateFileInGitHub_(
    githubToken, githubUsername, repo,
    files.total.raw,
    `${total}`.trim()
  );

  updateFileInGitHub_(
    githubToken, githubUsername, repo,
    files.hindex.txt,
    `(${files.hindex.label}: ${hindex})`
  );
  updateFileInGitHub_(
    githubToken, githubUsername, repo,
    files.hindex.raw,
    `${hindex}`.trim()
  );

  Logger.log("✅ Google Scholar metrics written to GitHub");
}

/** DAILY MORNING TRIGGER (08:00 script timezone) */
function ensureMorningTrigger_() {
  const handler = "updateGoogleScholarMetrics";

  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction && t.getHandlerFunction() === handler) {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger(handler)
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  Logger.log("✅ Daily morning trigger created (08:00)");
}

/** FETCH TOTAL CITATIONS + H-INDEX FROM SERPAPI */
function fetchScholarMetricsFromSerpApi_(serpApiKey, authorId) {
  const url =
    "https://serpapi.com/search.json" +
    "?engine=google_scholar_author" +
    "&author_id=" + encodeURIComponent(authorId) +
    "&api_key=" + encodeURIComponent(serpApiKey);

  const resp = fetchWithRetry_(url, {
    method: "get",
    headers: { Accept: "application/json" },
    muteHttpExceptions: true
  }, 4, 800);

  const code = resp.getResponseCode();
  if (code !== 200) {
    throw new Error(`SerpApi HTTP ${code}: ${resp.getContentText().slice(0, 300)}`);
  }

  const data = JSON.parse(resp.getContentText());

  const cited = data?.cited_by ?? data?.author?.cited_by ?? null;
  if (!cited) {
    Logger.log("Top-level keys: " + Object.keys(data || {}).join(", "));
    throw new Error("Could not find cited_by in SerpApi response");
  }

  // In your payload: cited_by.table is an array of rows:
  //  row 0: { citations: { all: ..., since_....: ... } }
  //  row 1: { h_index:  { all: ..., since_....: ... } }   (usually)
  const table = Array.isArray(cited.table) ? cited.table : null;

  if (!table || table.length === 0) {
    Logger.log("cited_by keys: " + Object.keys(cited || {}).join(", "));
    throw new Error("cited_by.table missing or empty");
  }

  // Total citations: prefer row containing "citations"
  const citationsRow = table.find(r => r && r.citations);
  // H-index: prefer row containing "h_index" (or sometimes "hindex")
  const hindexRow = table.find(r => r && (r.h_index || r.hindex));

  const totalRaw = citationsRow?.citations?.all ?? citationsRow?.citations?.total ?? null;
  const hRaw = hindexRow?.h_index?.all ?? hindexRow?.hindex?.all ?? hindexRow?.hindex ?? null;

  if (totalRaw == null || hRaw == null) {
    Logger.log("cited_by keys: " + Object.keys(cited || {}).join(", "));
    Logger.log("table length: " + table.length);
    Logger.log("citationsRow: " + JSON.stringify(citationsRow || {}).slice(0, 300));
    Logger.log("hindexRow: " + JSON.stringify(hindexRow || {}).slice(0, 300));
    throw new Error("Could not parse total citations or h-index from SerpApi response");
  }

  const total = parseInt(totalRaw, 10);
  const hindex = parseInt(hRaw, 10);

  if (!isFinite(total) || !isFinite(hindex)) {
    throw new Error(`Invalid parsed values: total=${totalRaw}, h=${hRaw}`);
  }

  return { total, hindex };
}

/** GITHUB HELPERS */

function readOrZero_(token, user, repo, path) {
  try {
    return readIntFromGitHubFile_(token, user, repo, path);
  } catch (_) {
    return 0;
  }
}

function readIntFromGitHubFile_(token, user, repo, path) {
  const url = `https://api.github.com/repos/${user}/${repo}/contents/${path}`;
  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: "token " + token },
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    throw new Error("GitHub read failed");
  }

  const data = JSON.parse(res.getContentText());
  const decoded = Utilities.newBlob(
    Utilities.base64Decode(data.content)
  ).getDataAsString().trim();

  return parseInt(decoded || "0", 10);
}

function updateFileInGitHub_(token, user, repo, path, content) {
  const apiUrl = `https://api.github.com/repos/${user}/${repo}/contents/${path}`;
  let sha = null;

  const getRes = UrlFetchApp.fetch(apiUrl, {
    headers: { Authorization: "token " + token },
    muteHttpExceptions: true
  });

  if (getRes.getResponseCode() === 200) {
    sha = JSON.parse(getRes.getContentText()).sha;
  } else if (getRes.getResponseCode() !== 404) {
    throw new Error("GitHub GET failed");
  }

  const payload = {
    message: `Update ${path}`,
    content: Utilities.base64Encode(content)
  };
  if (sha) payload.sha = sha;

  const putRes = UrlFetchApp.fetch(apiUrl, {
    method: "put",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    headers: { Authorization: "token " + token },
    muteHttpExceptions: true
  });

  if (putRes.getResponseCode() < 200 || putRes.getResponseCode() >= 300) {
    throw new Error("GitHub PUT failed");
  }
}

/** HTTP RETRY HELPER */
function fetchWithRetry_(url, options, tries, baseSleepMs) {
  let last;
  for (let i = 0; i < tries; i++) {
    last = UrlFetchApp.fetch(url, options);
    const c = last.getResponseCode();
    if (c >= 200 && c < 300) return last;
    if ([429, 500, 502, 503, 504].includes(c)) {
      Utilities.sleep(baseSleepMs * Math.pow(2, i));
      continue;
    }
    throw new Error(`HTTP ${c}`);
  }
  throw new Error(`HTTP ${last.getResponseCode()}`);
}

/** SECRETS */
function getRequiredSecret_(key) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) throw new Error(`Missing Script Property: ${key}`);
  return v.trim();
}
