# Create Pull Request

Create a pull request for the current branch using GitHub CLI.

## Steps

1. Run in parallel:
   - `git status`
   - `git diff`
   - `git log --oneline -5`
   - `git branch -vv`

2. If the branch has no upstream, push first:

```powershell
git push -u origin HEAD
```

3. Draft the PR from all commits since diverging from the base branch, usually `main`:
   - Title: include Task ID if known, for example `feat(console): P-04 knowledge upload page`
   - Body: Summary and test plan checklist

4. Create the PR:

```powershell
gh pr create --title "<title>" --body @"
## Summary
- ...

## Test plan
- [ ] ...
"@
```

5. Return the PR URL to the user.

## Notes

- Use `gh` only; do not open the browser for PR creation.
- If `gh auth status` fails, tell the user to run `gh auth login`.
- Do not commit unless the user explicitly asked for a commit.
