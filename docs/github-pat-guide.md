# GitHub PAT Guide for OtariOptm

## Generaging a PAT (Personal Access Token)

1. **Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. **Generate new token** with these scopes:
   - `repo` (full control of private repositories)
   - `read:me` (profile information)
   - `workflow` (GitHub Actions)
3. **Save the token** - it will only be shown once

## Using PAT in Claude Code / opencode

```bash
# Set PAT as environment variable (never commit to repo)
export GITHUB_PAT="ghp_your_personal_token_here"

# Or in .env file (gitignored)
echo "GITHUB_PAT=ghp_your_personal_token_here" >> .env
echo ".env" >> .gitignore
```

## Scanning README Files Remotely (without exposing tokens)

### Option 1: GitHub API (public repos only, no auth needed)
```bash
# List README from public repo
curl -s "https://api.github.com/repos/owner/repo/readme" | jq .download_url | xargs -I{} curl -s {} | jq .content | base64 -d
```

### Option 2: Using gh CLI (requires PAT)
```bash
# Clone and read all READMEs
gh repo clone owner/repo
find . -name "README.md" -exec cat {} \;
```

### Option 3: OAuth App (for organizational repos)
- Register OAuth app at GitHub
- Use authorization code flow
- Store refresh token securely

## What You Can Utilize from README Files

| Source | What to Extract |
|---|---|
| **Project README** | Installation steps, usage examples, setup commands |
| **Docs README** | Feature lists, API references, configuration options |
| **Contributing Guide** | Development workflow, test commands, coding standards |
| **CHANGELOG** | Version history, recent changes, deprecation notices |
| **License** | Legal requirements, attribution format |

## Safe Patterns for Reading Files

```markdown
# ✅ Safe: Read local files only
- `README.md` (project root)
- `docs/*.md` (documentation)
- `config/*.yml` (configuration)

# ❌ Never: Hardcode tokens or secrets
- API keys in source code
- PAT values in README files
- Authentication credentials in docs
```

## Recommended Workflow for OtariOptm Hackathon

1. **Clone your repo**: `git clone https://github.com/your-handle/otarioptm.git`
2. **Read local docs**: `cat otarioptm/docs/overview.md`
3. **Check git status**: `git status` (no token needed)
4. **Commit changes**: `git add . && git commit -m "feat: add budget node"` 
5. **Push to branch**: `git push origin hackathon-2026-nov`
6. **Create PR** via GitHub UI (no PAT needed for public repos)

## .gitignore Template

```gitignore
# Environment variables
.env

# Otari configuration
otari.conf.yml

# Logs and temp files
*.log
tmp/

# IDE specific
.vscode/
.idea/
*.swp
```

---

**Security Note**: Never share your PAT in screenshots, recordings, or chat messages. The hackathon submission only requires:
- GitHub repository link
- Demo video link
- Feedback recording
- Feature checklist (no tokens needed)