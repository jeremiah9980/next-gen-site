# Slack roster slash commands

This folder adds a deployable Slack slash-command backend for NextGen Team Sites.

It posts a team roster directly into the Slack channel with each player's statline shown below her name.

## Commands

| Command | What it posts |
| --- | --- |
| `/roster 12u` | Texas Venom 12U roster |
| `/roster 14u` | Texas Venom 14U roster |
| `/venom12u` | Texas Venom 12U roster |
| `/venom14u` | Texas Venom 14U roster |
| `/roster help` | Private command help |

## Files

- `roster-command-worker.js` — Cloudflare Worker endpoint that verifies Slack requests and returns Slack Block Kit JSON.
- `slack-app-manifest.json` — Slack app manifest with the slash commands pre-defined.

## Deploy with Cloudflare Workers

1. Create a Cloudflare Worker.
2. Paste the contents of `roster-command-worker.js` into the Worker editor.
3. Add this Worker environment variable:

   ```text
   SLACK_SIGNING_SECRET=your-slack-signing-secret
   ```

4. Deploy the Worker.
5. Copy the Worker URL, for example:

   ```text
   https://nextgen-roster.YOUR-SUBDOMAIN.workers.dev/slack/roster
   ```

6. In `slack-app-manifest.json`, replace `https://YOUR-WORKER-SUBDOMAIN.workers.dev/slack/roster` with your real Worker URL.
7. Create a Slack app from the manifest.
8. Install the app to your Slack workspace.
9. Test in a channel:

   ```text
   /roster 12u
   ```

## Edit roster data

Roster data currently lives at the top of `roster-command-worker.js` in the `TEAM_ROSTERS` object.

For each player, update:

```js
{
  name: "Kassidy C.",
  jersey: "21",
  positions: ["3B", "C", "P"],
  batsThrows: "R/R",
  stats: {
    AVG: ".389",
    OBP: ".476",
    OPS: ".953",
    RBI: "16",
    CS: "8",
    FPCT: ".941"
  }
}
```

The stat keys are flexible. You can use hitting, pitching, catching, or fielding labels like:

```text
AVG, OBP, OPS, RBI, R, SB, ERA, K, WHIP, CS, FPCT
```

## Privacy note

Because this repo is public and these are youth athletes, the sample roster uses abbreviated last names. Keep real roster data private unless the team and parents have approved public sharing.

## Slack response behavior

- Roster responses use `response_type: "in_channel"`, so they post publicly in the channel.
- Help and error responses use `response_type: "ephemeral"`, so only the person running the command sees them.
- Request verification is enabled when `SLACK_SIGNING_SECRET` is configured.
