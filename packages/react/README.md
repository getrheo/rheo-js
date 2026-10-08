# @getrheo/react

Embed Rheo flows in a browser. Install after publish:

```bash
pnpm add @getrheo/react
```

Mount `RheoProvider` and `Flow`. Register the site origin on the app, and point Stripe at the app webhook URL so a completed Checkout Session is the purchase record.

Product analytics is on by default. To wait for a consent banner, mount with `analytics: { consent: 'pending' }` and call `setAnalyticsConsent('granted')` or `setAnalyticsConsent('denied')` from `@getrheo/react`.

Resolve responses cache per channel + locale (`localStorage` + `If-None-Match`). Pass `prefetch="all"` (or a channel id list) on `RheoProvider`, or call `prefetch` / `prefetchAll`.

Engage: `identify` writes email and marketing consent; `track` emits custom events for automations and segments. `registerPush()` asks the host service worker to subscribe with the app VAPID public key (`RheoConfig.push.serviceWorkerUrl`, or `navigator.serviceWorker.ready`). A notifications grant in a flow calls it. `unregisterPush()` revokes the cached subscription.
