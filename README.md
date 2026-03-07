# app

## Push this local repo to GitHub

Use these commands from your local repository path:

```bash
cd C:\Dev\Repos\app
git status
```

### 1) Set the GitHub remote

If `origin` is not configured yet:

```bash
git remote add origin https://github.com/flytesandbox/app.git
```

If `origin` already exists and points elsewhere:

```bash
git remote set-url origin https://github.com/flytesandbox/app.git
```

You can verify with:

```bash
git remote -v
```

### 2) Push your branch

For a `main` branch:

```bash
git push -u origin main
```

If your branch is named differently, replace `main` with your current branch name.

### 3) If GitHub already has commits

If the remote has an initial README/license commit, sync first:

```bash
git pull --rebase origin main
git push -u origin main
```

If histories are unrelated:

```bash
git pull origin main --allow-unrelated-histories
# resolve any conflicts, then commit
git push -u origin main
```

### Authentication

For HTTPS remotes, authenticate with:

- GitHub username
- Personal Access Token (PAT)

(Use PAT instead of your GitHub password.)
