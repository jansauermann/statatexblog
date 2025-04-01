  # Automated Citation Count Updater for CVs

This Google Apps Script automatically retrieves citation counts for a list of Scopus-indexed papers and updates individual `.txt` files in a GitHub repository. The citation count files can then be included in a LaTeX document using `\input{}` to dynamically display citation numbers.

## What the Script Does

- Retrieves citation counts from the Scopus API (Elsevier)
- Updates one `.txt` file per paper (e.g., `cit/PAPER_1.txt`)
- Updates one `.txt` file with the total citation count (`cit/TotalCitations.txt`)
- Stores plain citation counts (e.g., `42`)
- For papers with 0 citations, it stores a LaTeX-safe comment (`%`) to prevent compilation issues

## Requirements

You will need:

- A [Scopus API key](https://dev.elsevier.com) from Elsevier
- A [GitHub personal access token](https://github.com/settings/tokens) with `repo` permissions
- A GitHub repository (e.g., `cv`) with a subfolder `cit/`
- A LaTeX CV that can include citation counts via `\input{}`

## How to Set It Up

### 1. Get a Scopus API Key

- Go to https://dev.elsevier.com/user and register for an API key
- After registration, go to "My API Key" and copy it

### 2. Create a GitHub Token

- Go to https://github.com/settings/tokens
- Click "Generate new token (classic)"
- Select the `repo` scope (for access to private/public repos)
- Copy the token and store it safely

### 3. Prepare Your GitHub Repository

- Create a new repository or use an existing one
- Inside the repo, create a folder called `cit/`
- Inside `cit/`, create one `.txt` file per paper you want to track (e.g., `PAPER_1.txt`)
- Also create an empty file called `TotalCitations.txt`

### 4. Set Up the Google Apps Script

- Go to https://script.google.com/
- Create a new project
- Paste the full script into the `Code.gs` file
- Replace the following placeholders:
  - `YOUR_SCOPUS_API_KEY`
  - `YOUR_GITHUB_TOKEN`
  - `YOUR_GITHUB_USERNAME`
  - `YOUR_REPO_NAME`
  - Scopus IDs and file names

### 5. Schedule It (Optional)

- In the Apps Script editor, go to Triggers
- Add a new trigger for the function `updateAllCitationCounts`
- Choose a time-based trigger (e.g., every week)

## Folder Structure

Your repository should look like this:

├── fullcv.tex
├── cit/
│   ├── PAPER_1.txt
│   ├── PAPER_2.txt
│   └── TotalCitations.txt

## How to Use in LaTeX

### Step 1: Add a toggle and macro in the preamble

```latex
\newif\ifshowcitations
\showcitationstrue % or \showcitationsfalse

\newcommand{\addcit}[1]{\ifshowcitations\input{#1}\fi}

