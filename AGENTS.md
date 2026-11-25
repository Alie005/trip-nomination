# Trip Nomination: instructions for Codex / AI agents

## What this is
A static site (GitHub Pages) plus a Google Apps Script API that reads and writes a Google Sheet.
- Frontend: `index.html`, `styles.css`, `app.js`, `config.js`. Plain HTML/CSS/JS, no build step, no frameworks.
- Backend: `apps-script/Code.gs` (deployed separately in Apps Script, not by GitHub Pages).

## Business rules (do not weaken)
1. Email always comes from the verified Google ID token on the server. Never accept an email for the voter or runner from the form.
2. Only `@rentokil-initial.com` accounts (check `hd` claim and email suffix).
3. Nominees: Department, Name, Email -> `Nominees` sheet.
4. Voters: Name, Email, Voted For -> `Voters` sheet. One vote per email. Target must exist in `Nominees`.
5. Nominees cannot vote. Nobody can vote for themselves. Someone who has voted cannot run.
6. Emails in the `Excluded` sheet (sales consultants, service colleagues) cannot run.
7. All validation is repeated server-side in `Code.gs`. Frontend checks are only for convenience.

## Conventions
- Keep `fetch` bodies as `JSON.stringify` with no custom headers (avoids CORS preflight, which Apps Script cannot handle).
- Sanitise any text written to the sheet (`clean_`).
- After changing `Code.gs`, it must be redeployed: Apps Script > Deploy > Manage deployments > edit > New version. The web app URL stays the same.
- Frontend changes go live when pushed to `main`.
- Test manually: sign in with a work account, try run, vote, double vote, vote as nominee, vote for non-nominee, excluded email.
