# MASSIVE Discipline — Chrome Extension

## Install (no PowerShell, Node, or cloning)

1. Open [MASSIVE Actions](https://github.com/deciphe/massiveprop/actions/workflows/deploy.yml), open the latest successful run, and download **massive-discipline-extension** under Artifacts. GitHub may ask you to sign in.
2. Unzip the artifact anywhere on your computer.
3. In Chrome, go to `chrome://extensions`, switch on Developer mode, click **Load unpacked**, and select that unzipped extension folder.
4. Open `https://myfundedperpetuals.com/trade/BTC`. The MASSIVE overlay should appear.
5. Paste an `fp_test_` **sandbox** API key into MASSIVE. Connect and ARM.

You can create an API key in [MFP API settings](https://myfundedperpetuals.com/settings/api-keys).

**This build is sandbox-only.** Live API key submission and live order execution are intentionally disabled until we validate the API flow end-to-end with sandbox fills. No account has been tested from this chat.

## How it works

- The extension uses the **official MFP API directly** from its Chrome background worker. No localhost server, bridge token, shell or repo clone.
- Your API key is kept in **Chrome extension-local storage** on your own machine (not in the page DOM, the GitHub repo, or our servers). Because a directly connected extension holds a trading credential locally, only install trusted builds, protect your Chrome profile, and revoke the key in MFP settings if the machine is shared or compromised.
- ARM sets your target, daily loss budget, max risk/trade and account equity baseline. Within the same New York trading day, re-arming preserves the initial baseline and plan.
- A market/limit order with attached SL/optional TP is checked against the voluntary rules using the latest available quote and risk snapshot. Qualifying orders go to confirmation. Violations enter the ten-confession Degen Gate.
- Each separate entry of `I am a degen` reveals new stats. After ten, MASSIVE collapses and the original ticket is usable; re-arm to engage the MASSIVE panel again.
- Native chart exits, stops and the firm's copy groups stay native. This is **not** a hard platform-wide lock: keyboard trading, chart trades, other devices and outside API clients may bypass the voluntary overlay.
- Order IDs are tracked to avoid blindly repeating ambiguous submissions. If an API response is lost, check the MFP order history before another trade.

## Current limitations

- Sandbox execution has not been validated with a real account. API endpoints may change during MFP beta.
- New entries against an existing position or open entry order in the same market are held for the native terminal, avoiding unsafe position/stop resizing in this first version.
- Estimates use current quote, price-to-stop distance, and estimated fees/slippage. Stops cannot guarantee a maximum realized loss; copied accounts have distinct fills and risk limits.
- Session P&L starts when ARM is pressed, not midnight. Uninstalling or clearing extension storage erases its local history and daily sessions.
- This extension currently requires MFP trading URLs matching `/trade/*`.

See `background.js` for the official API order routing and `panel.js` for the ticket and Degen Gate.
