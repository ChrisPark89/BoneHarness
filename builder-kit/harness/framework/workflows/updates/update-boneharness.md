# Update BoneHarness

Use this guide when adopting a newer BoneHarness builder-kit release. To change repository tools or settings, use the [configuration guide](../maintenance/harness-maintenance.md).

1. **Get the newer kit.** Update your BoneHarness checkout/package. From a source checkout, run `npm ci` and `npm run build`; install the CLI with `npm install -g ./builder-kit` if needed.
2. **Preview repository changes.** In the target repository, run `bh update --dry-run`. It compares `.harness/` with the kit bundled with your CLI. For another local kit, add `--kit /path/to/builder-kit` to both preview and apply commands.
3. **Review.** Resolve reported conflicts or affected unfinished tasks. Unsupported changes stop without replacing the installation.
4. **Apply.** Run `bh update --yes`. It applies compatible kit changes while preserving repository settings and task history.
5. **Check.** Run `bh doctor`; inspect the update result with `bh status --update <id>`.

Updating the package supplies the newer kit. `bh update` applies that kit to a repository; it does not download a release. Each repository is updated separately.
