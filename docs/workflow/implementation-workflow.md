# Pickle Rick implementation workflow

User-approved working agreement, recorded 2026-11-05. Follow these stages for
every implementation; task-specific instructions may add a review gate.

1. **Git Branch Cleaning.** Refresh remote references and inspect the working
   tree, worktrees, open PRs, and local/remote task branches. Remove branches
   only after proving their changes were integrated or explicitly abandoned.
   Preserve unique work. Fast-forward integration branches and report history
   differences; check again immediately before a merge.
2. **Git Branch Creation.** Create a separate purpose-prefixed branch from
   current `qa`, including the Jira key. Preserve unrelated changes.
   Create a new task-specific Docker Compose project and fresh database volume
   for every fix/implementation. Check that the project/volume do not already
   exist; use a new unique name if needed. Record both names and the services'
   ports. Run the local stack attached, using this isolated volume throughout
   implementation, review and testing. Keep existing development volumes intact.
3. **Fix Implementation.** Implement the agreed scope, citing applicable
   requirements and recording material decisions.
4. **Code Review.** Obtain review by the user, the implementing agent, or another
   AI agent as agreed. Resolve actionable findings. If the user reserves the
   review, leave that gate pending until they complete it.
5. **Fix Testing.** Run meaningful regression checks and verify test-data
   cleanup. Distinguish passing checks, failures, and untested coverage.
6. **Step-by-Step Instructions.** Provide reproducible validation steps,
   prerequisites, expected results, and cleanup so the user can test in parallel.
7. **Push and Merge to `qa` and `main`.** Respect the user's testing gate. Push
   the reviewed branch, integrate through a PR into `qa`, then promote via a
   PR into `main` after required checks pass. Resolve divergence without
   discarding unique commits. Refresh the branch audit before merging.
   After all changes have successfully merged into `main` and its required
   checks pass, stop/remove only the task's containers and delete its recorded
   Docker volumes. Verify project/volume ownership before deletion and confirm
   their removal afterward. Retain the task volume while testing, checks or
   merges are incomplete; never use a global Docker volume prune.
8. **Documentation.** Finalize affected setup/status documentation, dated
   evidence, Jira status, links, and `CHANGELOG.md`. Maintain documentation
   alongside implementation; this final stage reconciles it with actual
   validation and merge outcomes.

Completion requires evidence for the applicable stages. A fix awaiting user
review/testing or a merge remains explicitly pending.
