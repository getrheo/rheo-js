# Contributing

Thanks for your interest in Rheo open-source client libraries.

## Before you open a PR

1. Search [existing issues](https://github.com/getrheo) for duplicates.
2. For large changes, open an issue first so we can align on approach.
3. Keep PRs focused — one logical change per pull request.

## Development

Each repository is self-contained. Follow the **README** in this repo for install, build, and test commands:

```bash
pnpm install
pnpm verify
```

Active SDK development happens in the private Rheo platform monorepo first; public repos receive mirrored updates via `pnpm extract:oss-repos --push` (model B). External PRs against these repositories are welcome when CI is green.

## Pull requests

- Use the PR template checklist when present.
- Ensure CI passes (`Verify`, `Gitleaks`, and any platform-specific jobs).
- Update docs or CHANGELOG when user-visible behavior changes.

## Security

Do not open public issues for security vulnerabilities. Email security concerns to the Rheo team through your account contact or support channel.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
