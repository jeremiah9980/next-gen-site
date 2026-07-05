// NextGen Team Sites Slack slash-command handler
// Deploy as a Cloudflare Worker and point Slack slash commands to the Worker URL.
//
// Supports:
//   /roster 12u
//   /roster 14u
//   /venom12u
//   /venom14u
//   /roster help

const TEAM_ROSTERS = {
  "texas-venom-12u": {
    teamName: "Texas Venom",
    division: "12U",
    season: "2026 Summer",
    lastUpdated: "Edit roster-command-worker.js with live team stats",
    commandAliases: ["/roster 12u", "/venom12u"],
    players: [
      {
        name: "Ava M.",
        jersey: "2",
        positions: ["CF", "SS"],
        batsThrows: "R/R",
        stats: { AVG: ".421", OBP: ".512", OPS: "1.038", RBI: "18", R: "22", SB: "14" }
      },
      {
        name: "Bella R.",
        jersey: "7",
        positions: ["P", "1B"],
        batsThrows: "R/R",
        stats: { AVG: ".367", OBP: ".448", OPS: ".901", RBI: "21", ERA: "2.18", K: "46" }
      },
      {
        name: "Kassidy C.",
        jersey: "21",
        positions: ["3B", "C", "P"],
        batsThrows: "R/R",
        stats: { AVG: ".389", OBP: ".476", OPS: ".953", RBI: "16", CS: "8", FPCT: ".941" }
      },
      {
        name: "Mia T.",
        jersey: "24",
        positions: ["C", "3B"],
        batsThrows: "R/R",
        stats: { AVG: ".344", OBP: ".430", OPS: ".812", RBI: "13", CS: "6", FPCT: ".958" }
      },
      {
        name: "Sofia L.",
        jersey: "33",
        positions: ["LF", "2B"],
        batsThrows: "L/R",
        stats: { AVG: ".402", OBP: ".489", OPS: ".977", RBI: "12", R: "19", SB: "11" }
      }
    ]
  },
  "texas-venom-14u": {
    teamName: "Texas Venom",
    division: "14U",
    season: "2026 Summer",
    lastUpdated: "Edit roster-command-worker.js with live team stats",
    commandAliases: ["/roster 14u", "/venom14u"],
    players: [
      {
        name: "Addison P.",
        jersey: "4",
        positions: ["SS", "2B"],
        batsThrows: "R/R",
        stats: { AVG: ".438", OBP: ".529", OPS: "1.102", RBI: "24", R: "28", SB: "17" }
      },
      {
        name: "Harper J.",
        jersey: "11",
        positions: ["P", "OF"],
        batsThrows: "L/R",
        stats: { AVG: ".376", OBP: ".467", OPS: ".940", RBI: "19", ERA: "1.94", K: "61" }
      },
      {
        name: "Riley S.",
        jersey: "18",
        positions: ["C", "1B"],
        batsThrows: "R/R",
        stats: { AVG: ".351", OBP: ".423", OPS: ".889", RBI: "22", CS: "10", FPCT: ".972" }
      },
      {
        name: "Brooklyn W.",
        jersey: "27",
        positions: ["3B", "RF"],
        batsThrows: "R/R",
        stats: { AVG: ".329", OBP: ".414", OPS: ".801", RBI: "15", R: "16", FPCT: ".935" }
      },
      {
        name: "Emery D.",
        jersey: "42",
        positions: ["CF", "LF"],
        batsThrows: "L/L",
        stats: { AVG: ".395", OBP: ".481", OPS: ".968", RBI: "14", R: "25", SB: "21" }
      }
    ]
  }
};

const DEFAULT_TEAM_KEY = "texas-venom-12u";

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return jsonResponse({ ok: true, message: "NextGen Slack roster command endpoint. Use POST from Slack." });
    }

    const rawBody = await request.text();

    if (env.SLACK_SIGNING_SECRET) {
      const verified = await verifySlackRequest(request, rawBody, env.SLACK_SIGNING_SECRET);
      if (!verified) {
        return jsonResponse({ response_type: "ephemeral", text: "Slack request verification failed." }, 401);
      }
    }

    const payload = new URLSearchParams(rawBody);
    const command = (payload.get("command") || "").trim().toLowerCase();
    const text = (payload.get("text") || "").trim().toLowerCase();

    if (text === "help" || text === "?") {
      return jsonResponse(buildHelpResponse());
    }

    const teamKey = resolveTeamKey(command, text);
    const team = TEAM_ROSTERS[teamKey];

    if (!team) {
      return jsonResponse(buildUnknownTeamResponse(command, text));
    }

    return jsonResponse(buildRosterResponse(team));
  }
};

function resolveTeamKey(command, text) {
  const commandMap = {
    "/venom12u": "texas-venom-12u",
    "/venom-12u": "texas-venom-12u",
    "/venom14u": "texas-venom-14u",
    "/venom-14u": "texas-venom-14u"
  };

  if (commandMap[command]) return commandMap[command];

  if (text.includes("14u") || text.includes("14 u")) return "texas-venom-14u";
  if (text.includes("12u") || text.includes("12 u")) return "texas-venom-12u";

  return DEFAULT_TEAM_KEY;
}

function buildRosterResponse(team) {
  const title = `${team.teamName} ${team.division} Roster`;
  const rosterBlocks = team.players.flatMap((player, index) => {
    const playerName = `*#${player.jersey} ${player.name}*`;
    const positionLine = `${player.positions.join(" / ")} · ${player.batsThrows || "B/T pending"}`;
    const statLine = formatStats(player.stats);

    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${playerName}\n_${positionLine}_\n${statLine}`
        }
      },
      ...(index < team.players.length - 1 ? [{ type: "divider" }] : [])
    ];
  });

  return {
    response_type: "in_channel",
    text: `${title}\n${team.players.map((player) => `#${player.jersey} ${player.name} — ${formatStats(player.stats, false)}`).join("\n")}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: title,
          emoji: true
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Season:* ${team.season} · *Players:* ${team.players.length} · *Updated:* ${team.lastUpdated}`
          }
        ]
      },
      { type: "divider" },
      ...rosterBlocks,
      { type: "divider" },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `NextGen Team Sites · aliases: ${team.commandAliases.join(", ")}`
          }
        ]
      }
    ]
  };
}

function buildHelpResponse() {
  return {
    response_type: "ephemeral",
    text: "NextGen roster commands",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "NextGen Roster Commands", emoji: true }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Use `/roster 12u`, `/roster 14u`, `/venom12u`, or `/venom14u`. The roster posts publicly in the channel with each player's statline below her name."
        }
      }
    ]
  };
}

function buildUnknownTeamResponse(command, text) {
  return {
    response_type: "ephemeral",
    text: `I could not match that roster request. Command: ${command || "n/a"}; text: ${text || "n/a"}. Try /roster 12u or /roster 14u.`
  };
}

function formatStats(stats = {}, markdown = true) {
  const entries = Object.entries(stats);
  if (!entries.length) return markdown ? "`Stats pending`" : "Stats pending";

  return entries
    .map(([label, value]) => (markdown ? `\`${label} ${value}\`` : `${label} ${value}`))
    .join(" • ");
}

async function verifySlackRequest(request, rawBody, signingSecret) {
  const signature = request.headers.get("x-slack-signature");
  const timestamp = request.headers.get("x-slack-request-timestamp");

  if (!signature || !timestamp) return false;

  const requestAgeSeconds = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(requestAgeSeconds) || requestAgeSeconds > 60 * 5) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signedData = encoder.encode(`v0:${timestamp}:${rawBody}`);
  const mac = await crypto.subtle.sign("HMAC", key, signedData);
  const digest = [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

  return timingSafeEqual(`v0=${digest}`, signature);
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a.length || !b.length) return false;

  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  let mismatch = aBytes.length ^ bBytes.length;

  for (let i = 0; i < Math.max(aBytes.length, bBytes.length); i += 1) {
    mismatch |= aBytes[i % aBytes.length] ^ bBytes[i % bBytes.length];
  }

  return mismatch === 0;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json;charset=UTF-8"
    }
  });
}
