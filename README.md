# app

## Push the local repository to GitHub

If you want to actually push your local repo to `https://github.com/flytesandbox/app`, use one of the helper scripts in `scripts/`.

### PowerShell (Windows)

```powershell
./scripts/push-to-github.ps1
```

Optional parameters:

```powershell
./scripts/push-to-github.ps1 -LocalPath "C:\Dev\Repos\app" -RemoteUrl "https://github.com/flytesandbox/app.git" -Branch "main"
```

### Bash

```bash
./scripts/push-to-github.sh /path/to/local/repo https://github.com/flytesandbox/app.git main
```

If `Branch` is omitted, both scripts auto-detect the current branch.
