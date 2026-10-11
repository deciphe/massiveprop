# MASSIVE Discipline — MFP Entry Flow

MASSIVE overlays the order-entry panel on `myfundedperpetuals.com/trade/*`. It uses **only the official MyFundedPerps public API** via a private localhost bridge; it never reads website login cookies or calls MFP internal website APIs.

## Implemented

- Daily plan: target, stop, maximum risk per trade. Session starts at **ARM**, with equity marked from the MFP API. "Daily" projections use 5 and 20 target-hit sessions and are not a forecast.
- Public API-backed market / limit order ticket, market/account selection, leverage, base-asset size, mandatory stop and optional take profit.
- Fresh quote preview, fees and estimated stop risk/slippage, re-check at confirmation, unique idempotency/client-order identifiers, API submission and order reconciliation.
- Rejects orders breaking the voluntary plan: target met, stop hit, projected session loss, excess risk per trade, unknown stop exposure, exhausted drawdown room.
- Fail-closed V1 rule: no new entry if that market already has an account position or another working opening order. Use native MFP controls for resizing, reversals, partial closes and protective exits.
- Ten **separate** "I am a degen" entries. A new account-specific warning is revealed *after each* confirmation. The tenth releases the native ticket; only re-arming restores the overlay.
- Local browser-only history: plan, violations, submitted order IDs and overrides. No personal stats upload.
- MFP's **native copy groups** continue independently. This module does not replace or reimplement the copier.

## Windows quick start (Node 20+)

1. Create a **Test (Sandbox), Read And Trade** key in [MFP API settings](https://myfundedperpetuals.com/settings/api-keys). The key should start `fp_test_`. Sandbox keys never access live challenges.
2. In PowerShell, from the cloned MASSIVE repository, start the bridge. Use your own 24+-character random bridge token:

   ```powershell
   $env:FP_API_KEY="fp_test_YOUR_KEY"
   $env:MASSIVE_BRIDGE_TOKEN="replace-with-a-unique-long-private-token"
   node tools/discipline/bridge.mjs
   ```

   Keep this terminal running. **Never commit an API key** or paste an MFP API key into the extension itself.
3. Open Chrome `chrome://extensions`, enable Developer Mode and **Load unpacked** from `tools/discipline/extension`. You can also download the automatically built extension artifact from GitHub Actions, unzip it and load that folder.
4. Open [MFP's trading terminal](https://myfundedperpetuals.com/trade/BTC). The MASSIVE panel covers the right-hand ticket area, leaving the MFP chart and account controls native.
5. Enter the *bridge token* from step 2, connect, choose a sandbox account, define your limits and **ARM**.
6. Preview your order. Valid entries go through the documented public API with the same account/risk checks as MFP. Entries breaking your plan open the Degen Gate. After ten acknowledgments, the MASSIVE entry overlay collapses and the original ticket is usable again.

## What the V1 means / doesn't mean

- This is a **voluntary** on-page ticket replacement. The extension does **not** prevent someone from trading with MFP hotkeys, chart placement, another tab, a different client or their own API key. Native TP/SL manipulation remains MFP's own functionality. Full interception of all native entry paths has NOT been verified.
- Exits, reducing exposure and managing protective orders should be done with MFP's native tools; this V1 intentionally does not proxy them or lock them.
- Session P&L is based on **equity since ARM**, not all trades since calendar midnight. Re-arming within the same New York trading day retains the original baseline and plan while the bridge is running. Restarting the bridge loses its in-memory sessions and requires ARM again.
- Per-trade risk is an **estimate**, using order size × entry-to-stop distance + estimated round-trip fee + stop slippage buffer. It cannot guarantee maximum realized loss, especially in gaps and rapid markets. Copied followers have independent fills and risk limits and are not comprehensively included in the lead risk projection.
- There is no automatic live credential storage, server-side trading lock, silent retry or unattended auto-trader. The bridge refuses `fp_live_` keys unless the user explicitly sets `MASSIVE_ALLOW_LIVE=YES_I_UNDERSTAND`. Sandbox testing is the required starting point.
- For testing, use **a new sandbox account** where possible. A sandbox account can still breach its own evaluation rules.
- The authenticated bridge listens **only on 127.0.0.1:18740**. `MASSIVE_BRIDGE_TOKEN` must be kept private. Don't expose the port over a reverse proxy or LAN.
- MFP's API is beta. Endpoint changes can break the extension; errors are surfaced rather than silently falling back to undocumented website API calls.

## Order identity and failure recovery

Confirming an order makes the bridge generate an idempotency key and a `massive-...` client-order ID. If a response is ambiguous, **do not blindly re-submit**. Use the order lookup or inspect your MFP order history. The system deliberately does not issue a fresh trade when it cannot confirm the previous result.

## Development

The extension is plain Manifest V3 and no build step is required. The bridge is dependency-free Node 20+. Core files:

- `extension/panel.js` — the ticket and ten-confession gate.
- `extension/panel.css` — Massive-flat styling.
- `extension/background.js` — authenticated localhost request relay.
- `bridge.mjs` — official REST integration, authoritative preview and order submission.

Refer to official documentation: [Quickstart](https://docs.myfundedperpetuals.com/quickstart), [Trading with the API](https://docs.myfundedperpetuals.com/trading-with-api), [Sandbox](https://docs.myfundedperpetuals.com/sandbox), [Idempotency](https://docs.myfundedperpetuals.com/idempotency).
