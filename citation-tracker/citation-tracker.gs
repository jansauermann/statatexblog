function updateAllCitationCounts() {
  const apiKey = 'YOUR_SCOPUS_API_KEY';
  const githubToken = 'YOUR_GITHUB_TOKEN';
  const githubUsername = 'YOUR_GITHUB_USERNAME';
  const repo = 'YOUR_REPO_NAME'; // e.g., 'cv'

  const papers = [
    { scopusId: 'SCOPUS_ID_PAPER_1', fileName: 'cit/PAPER_1.txt' },
    { scopusId: 'SCOPUS_ID_PAPER_2', fileName: 'cit/PAPER_2.txt' }
  ];

  let totalCitations = 0;

  papers.forEach(paper => {
    try {
      const count = updateCitationCount(apiKey, githubToken, githubUsername, repo, paper.scopusId, paper.fileName);
      totalCitations += count;
    } catch (e) {
      Logger.log(`Failed to update ${paper.fileName}: ${e.message}`);
    }
  });

  // Write total citation count to a separate file
  try {
    const totalFile = 'cit/TotalCitations.txt';
    const totalContent = totalCitations > 0
      ? `${totalCitations}\n`
      : '%\n'; // LaTeX-safe placeholder

    updateFileInGitHub(githubToken, githubUsername, repo, totalFile, totalContent);
    Logger.log(`Total citations written: ${totalCitations}`);
  } catch (e) {
    Logger.log(`Failed to update total citations file: ${e.message}`);
  }
}

function updateCitationCount(apiKey, githubToken, githubUsername, repo, scopusId, fileName) {
  const scopusUrl = `https://api.elsevier.com/content/abstract/scopus_id/${scopusId}?apiKey=${apiKey}&field=citedby-count`;

  const response = UrlFetchApp.fetch(scopusUrl, {
    headers: { 'Accept': 'application/json' }
  });

  const data = JSON.parse(response.getContentText());
  const citations = parseInt(data['abstracts-retrieval-response']?.coredata?.['citedby-count'] || '0');
  const content = citations > 0 ? `${citations}\n` : '%\n'; // Plain number or LaTeX-safe comment

  updateFileInGitHub(githubToken, githubUsername, repo, fileName, content);
  return citations;
}

function updateFileInGitHub(githubToken, githubUsername, repo, fileName, content) {
  const getUrl = `https://api.github.com/repos/${githubUsername}/${repo}/contents/${fileName}`;

  const getRes = UrlFetchApp.fetch(getUrl, {
    headers: { Authorization: 'token ' + githubToken }
  });

  const fileData = JSON.parse(getRes.getContentText());
  const sha = fileData.sha;

  const payload = {
    message: `Update citation count for ${fileName}`,
    content: Utilities.base64Encode(content),
    sha: sha
  };

  UrlFetchApp.fetch(getUrl, {
    method: 'put',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: { Authorization: 'token ' + githubToken }
  });
}
