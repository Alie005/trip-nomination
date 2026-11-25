# International Trip Nomination

GitHub Pages frontend + Google Apps Script/Google Sheets backend.

## One-time setup

### 1. Google Sheet and Apps Script
1. Create a Google Sheet. Open **Extensions > Apps Script**.
2. Paste `apps-script/Code.gs` into the editor. In Project Settings, tick "Show appsscript.json" and paste in `apps-script/appsscript.json`.
3. Run `setup()` once and approve permissions. Add ineligible people to the **Excluded** tab.

### 2. Google OAuth client (for sign-in)
1. In Google Cloud Console, pick or create a project > **APIs & Services > OAuth consent screen**. Choose **Internal** (restricts sign-in to your Workspace).
2. **Credentials > Create credentials > OAuth client ID > Web application**.
3. Under **Authorised JavaScript origins** add `https://YOUR-USERNAME.github.io` (origin only, no path).
4. Copy the Client ID. Paste it into `CLIENT_ID` in `Code.gs` and in `config.js`.

### 3. Deploy the API
**Deploy > New deployment > Web app**, Execute as **Me**, access **Anyone**. Copy the `/exec` URL into `API_URL` in `config.js`. (Anyone can reach the URL, but every call is rejected unless it carries a valid @rentokil-initial.com Google token.)

### 4. Publish the site
```bash
git init && git add . && git commit -m "Initial version"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/trip-nomination.git
git push -u origin main
```
In the repo: **Settings > Pages > Deploy from a branch > main / (root)**. Note: Pages sites are public even in private repos on most plans. Nothing sensitive is in the frontend.

## Working with VS Code + Codex
- Open the folder in VS Code and let Codex read `AGENTS.md`; it holds the rules it must preserve.
- Preview locally: `python3 -m http.server 8000`, but Google sign-in needs `http://localhost:8000` added as an authorised origin.
- Edits to `Code.gs` can be pushed with [clasp](https://github.com/google/clasp): `npm i -g @google/clasp`, `clasp login`, `clasp clone <scriptId> --rootDir apps-script`, then `clasp push` and redeploy a new version.
- Workflow: branch, ask Codex for a change, test, merge to `main`, Pages updates in about a minute.
