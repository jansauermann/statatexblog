function updateAllCitationCounts() {
  const apiKey = 'YOUR_SCOPUS_API_KEY';
  const githubToken = 'YOUR_GITHUB_TOKEN';
  const githubUsername = 'YOUR_GITHUB_USERNAME';
  const repo = 'YOUR_GITHUB_REPO';
  const email = 'YOUR_EMAIL';

  const papers = [
    { scopusId: 'SCOPUS_ID_Paper1', fileName: 'docs/citations/Paper1.txt' },
    { scopusId: 'SCOPUS_ID_Paper2', fileName: 'docs/citations/Paper2.txt' },
    ];

  let totalCitations = 0;
  let previousTotal = 0;
  const changes = [];

  const totalRawFile = 'docs/citations/TotalCitations_raw.txt';

  try {
    const getUrl = `https://api.github.com/repos/${githubUsername}/${repo}/contents/${totalRawFile}`;
    const getRes = UrlFetchApp.fetch(getUrl, {
      headers: { Authorization: 'token ' + githubToken }
    });
    const fileData = JSON.parse(getRes.getContentText());
    const decoded = Utilities.newBlob(Utilities.base64Decode(fileData.content)).getDataAsString().trim();
    previousTotal = parseInt(decoded || '0');
  } catch (err) {
    Logger.log('ℹ️ No previous total found, assuming 0');
  }

  papers.forEach(paper => {
    try {
      const prevRaw = getPreviousRawCount(githubToken, githubUsername, repo, paper.fileName);
      const count = updateCitationCount(apiKey, githubToken, githubUsername, repo, paper.scopusId, paper.fileName);

      totalCitations += count;

      const increase = count - prevRaw;
      if (increase > 0) {
        const shortName = paper.fileName.split('/').pop().replace('.txt', '');
        changes.push(`${shortName} +${increase}`);
      }
    } catch (e) {
      Logger.log(`❌ Failed to update ${paper.fileName}: ${e.message}`);
    }
  });

  if (totalCitations >= previousTotal) {
    try {
      const totalFile = 'docs/citations/TotalCitations.txt';
      const totalContent = `(citations according to SCOPUS; total: ${totalCitations} citations)\n`;
      updateFileInGitHub(githubToken, githubUsername, repo, totalFile, totalContent);

      const totalRawContent = `${totalCitations}\n`;
      updateFileInGitHub(githubToken, githubUsername, repo, totalRawFile, totalRawContent);

      Logger.log(`✅ Total citations written: ${totalCitations}`);

      if (totalCitations > previousTotal && changes.length > 0) {
        const subject = 'SCOPUS citation count updated';
        const body = `Your total SCOPUS citations increased by ${totalCitations - previousTotal}.\n` +
                     `New total: ${totalCitations}\n\n` +
                     `Breakdown:\n${changes.join('\n')}\n\n— Citation Tracker`;
        MailApp.sendEmail(email, subject, body);
      }

    } catch (e) {
      Logger.log(`❌ Failed to update total citations file: ${e.message}`);
    }
  } else {
    Logger.log('⚠️ Skipped total update to avoid overwriting with suspiciously low count');
  }
}

function updateCitationCount(apiKey, githubToken, githubUsername, repo, scopusId, fileName) {
  const scopusUrl = `https://api.elsevier.com/content/abstract/scopus_id/${scopusId}?apiKey=${apiKey}&field=citedby-count`;
  const response = UrlFetchApp.fetch(scopusUrl, {
    headers: { 'Accept': 'application/json' }
  });
  const data = JSON.parse(response.getContentText());
  const citations = parseInt(data['abstracts-retrieval-response']?.coredata?.['citedby-count'] || '0');

  const formattedContent = citations > 0
    ? ` (${citations} citation${citations === 1 ? '' : 's'})\n`
    : '% no citations\n';
  updateFileInGitHub(githubToken, githubUsername, repo, fileName, formattedContent);

  const rawFileName = fileName.replace('.txt', '_raw.txt');
  const rawContent = `${citations}\n`;
  updateFileInGitHub(githubToken, githubUsername, repo, rawFileName, rawContent);

  return citations;
}

function getPreviousRawCount(githubToken, githubUsername, repo, fileName) {
  const rawFileName = fileName.replace('.txt', '_raw.txt');
  const url = `https://api.github.com/repos/${githubUsername}/${repo}/contents/${rawFileName}`;
  try {
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'token ' + githubToken }
    });
    const data = JSON.parse(response.getContentText());
    const decoded = Utilities.newBlob(Utilities.base64Decode(data.content)).getDataAsString().trim();
    return parseInt(decoded || '0');
  } catch (e) {
    return 0;
  }
}

function updateFileInGitHub(githubToken, githubUsername, repo, fileName, content) {
  const apiUrl = `https://api.github.com/repos/${githubUsername}/${repo}/contents/${fileName}`;
  let sha = null;

  try {
    const getRes = UrlFetchApp.fetch(apiUrl, {
      headers: { Authorization: 'token ' + githubToken }
    });
    const fileData = JSON.parse(getRes.getContentText());
    sha = fileData.sha;
  } catch (e) {
    if (e.toString().indexOf('404') === -1) {
      throw e;
    }
  }

  const payload = {
    message: `Update citation count for ${fileName}`,
    content: Utilities.base64Encode(content)
  };

  if (sha) payload.sha = sha;

  UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: { Authorization: 'token ' + githubToken }
  });
}
