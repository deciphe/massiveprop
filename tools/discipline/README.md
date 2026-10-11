# MASSIVE Discipline 0.3

## Install

Download the extension ZIP, unzip it, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`. No terminal, server, or cloning is required.

Open `https://myfundedperpetuals.com/trade/BTC` or click the extension toolbar icon. Paste a sandbox `fp_test_` key. Connect, set your daily target, daily stop and maximum entry risk, then arm the plan. MFP's native copier stays native.

## Flow

- **Plan:** stored per account and New York calendar day. Re-arming restores the same limits and starting equity; it cannot reset losses or loosen that day's plan.
- **Entry:** market or limit, long or short, size, leverage, margin mode, protective stop and optional take profit. Fresh account/quote checks before both preview and send.
- **Within plan:** review the estimate, then explicitly confirm submission.
- **Plan violation:** the entry is held. Type and submit `I am a degen` ten separate times; each acknowledgment reveals another consequence. The final message remains visible.
- **Override:** the MASSIVE ticket remains available. Personal plan limits are overridden for this account through the current day; protective-stop, drawdown and existing-position checks still apply. **Return to my plan** restores discipline.
- **Trader record:** per-account disciplined-entry percentage, override entries, override sessions and recent events. Export the local history as JSON. These are extension-submitted entry records, not verified trading performance or fills.
- **Receipt:** client order ID and reconciliation. Previews and unresolved submissions survive a background-worker restart. Repeated confirmation cannot send the same preview twice.

The ticket can collapse into a moon dock. Click it to expand. The toolbar popup provides the same controls when the in-page panel is inconvenient.

## API and privacy

The worker connects directly to the official MFP sandbox API. The key stays in extension-local storage and is never inserted into the trading page or sent to MASSIVE servers. Fonts and lunar artwork are bundled, so the interface has no external asset requests. Disconnect removes the key and active override grants.

This is a voluntary discipline overlay, not a platform-wide lock. Native tickets, keyboard/chart orders, other devices and API clients can bypass it. Entries against an existing position or working entry in the same market are held for native management. Stops and estimates do not guarantee realized losses.

The current release accepts sandbox keys only. The supplied development key returned HTTP 401 at the sandbox accounts endpoint; real sandbox account/fill validation is pending a working key. No real-money order has been submitted.

## QA

The independent **MASSIVE Discipline QA** workflow runs on extension changes and can be run manually. It performs syntax checks, mocked worker execution tests, and complete browser interaction checks at 1440×1000, 1280×720, 390×844 and 320×568. Screenshots and a JSON report are preserved as `massive-discipline-qa`; only a passing job packages `massive-discipline-extension`.

Local commands:

```sh
npm ci
npm run discipline:check
node tools/discipline/tests/worker.test.mjs
npx playwright install chromium
node tools/discipline/tests/browser.mjs
```

Worker tests cover duplicate-send races, durable previews, immutable day limits, ten acknowledgments, protective checks and unresolved-order recovery. Browser fixtures use fake credentials and mocked API responses; they do not validate real MFP fills. The legacy `bridge.mjs` is retained for reference and is not part of the installed extension.
