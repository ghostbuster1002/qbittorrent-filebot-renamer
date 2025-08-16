# Git Workflow Rules

## Mandatory Commit Practice

**CRITICAL RULE**: Every change made to the codebase MUST be committed to git immediately after completion. This is non-negotiable and applies to all modifications, additions, or deletions.

## Commit Requirements

### When to Commit
- After creating any new file
- After modifying any existing file
- After deleting any file
- After completing any logical unit of work
- Before moving to the next task or feature

### Commit Message Format
Use clear, descriptive commit messages following this pattern:
```
<type>: <description>

Examples:
feat: add torrent filtering by category
fix: resolve path sanitization issue in FileBot integration
docs: update README with new environment variables
refactor: extract validation logic into separate functions
style: improve responsive design for mobile devices
```

### Commit Types
- `feat`: New features or functionality
- `fix`: Bug fixes
- `docs`: Documentation changes
- `refactor`: Code restructuring without behavior changes
- `style`: UI/CSS changes
- `config`: Configuration or environment changes
- `security`: Security-related improvements

## Implementation Commands

### Basic Workflow
```bash
# After making changes
git add .
git commit -m "feat: add new torrent status filtering"

# For specific files
git add path/to/file.js
git commit -m "fix: resolve authentication retry logic"
```

### Verification
Always verify commits were created:
```bash
git log --oneline -5  # Show last 5 commits
git status           # Ensure working directory is clean
```

## Benefits of This Practice

1. **Rollback Capability**: Easy to revert specific changes if issues arise
2. **Change Tracking**: Clear history of what was modified and when
3. **Debugging**: Ability to bisect and identify when problems were introduced
4. **Collaboration**: Other developers can see incremental progress
5. **Backup**: Distributed version control provides automatic backups

## Emergency Procedures

If a change breaks the application:
```bash
# Revert the last commit
git revert HEAD

# Or reset to previous working state
git reset --hard HEAD~1

# View what changed in last commit
git show HEAD
```

## Enforcement

This rule is automatically enforced for all AI assistants. Any assistant that fails to commit changes after modifications will be considered non-compliant with project standards.

**Remember**: A clean git history is essential for maintaining this project's integrity and enabling safe experimentation.