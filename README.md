# rheo-js

Public home for Rheo's shared **TypeScript runtime** packages used by the mobile SDKs.

## Packages

| npm | Role |
| --- | --- |
| [`@getrheo/flow-runtime`](https://www.npmjs.com/package/%40getrheo%2Fflow-runtime) | Flow state machine and resolve client |
| [`@getrheo/flow-ui-state`](https://www.npmjs.com/package/%40getrheo%2Fflow-ui-state) | UI state helpers |
| [`@getrheo/renderer-core`](https://www.npmjs.com/package/%40getrheo%2Frenderer-core) | Cross-platform renderer primitives |
| [`@getrheo/attribution`](https://www.npmjs.com/package/%40getrheo%2Fattribution) | Attribution facets |

All four packages share the same semver (`2.3.0.x`) and depend on [`@getrheo/contracts`](https://www.npmjs.com/package/%40getrheo%2Fcontracts) from npm.

**Release:** push git tag `v2.3.0` on `main` → CI publishes all four packages.

## Install

```bash
npm install @getrheo/flow-runtime @getrheo/flow-ui-state @getrheo/renderer-core @getrheo/attribution
```

Most apps should install a flavor package instead ([`rheo-react-native`](https://github.com/getrheo/rheo-react-native)).

## Development

```bash
pnpm install
pnpm verify
```

## Related repositories

- [`rheo-contracts`](https://github.com/getrheo/rheo-contracts) — [`@getrheo/contracts`](https://www.npmjs.com/package/%40getrheo%2Fcontracts)
- [`rheo-react-native`](https://github.com/getrheo/rheo-react-native) — Expo and bare React Native SDKs

[Documentation](https://docs.getrheo.io/docs/developer-guide/sdk) · [CONTRIBUTING](./CONTRIBUTING.md) · [MIT](./LICENSE)
