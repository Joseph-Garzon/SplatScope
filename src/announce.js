// Finds a role whose name matches a team/entrant name exactly (case/whitespace
// insensitive so "Team Foo" and "team foo " both resolve to the same role).
function findRoleForEntrant(guild, entrantName) {
  const normalized = entrantName.trim().toLowerCase();
  return guild.roles.cache.find((role) => role.name.trim().toLowerCase() === normalized) ?? null;
}

export function buildAnnouncement(guild, set) {
  const entrants = set.slots.map((s) => s.entrant).filter(Boolean);
  const [teamA, teamB] = entrants;
  const stationNumber = set.station.number;

  const roleA = findRoleForEntrant(guild, teamA.name);
  const roleB = findRoleForEntrant(guild, teamB.name);

  const mentionFor = (team, role) => (role ? `<@&${role.id}>` : `**${team.name}**`);
  const missingRoleWarnings = [teamA, teamB]
    .filter((team, i) => ![roleA, roleB][i])
    .map((team) => `⚠️ No role found named exactly "${team.name}" — that team wasn't pinged.`);

  // The phase name ("Top Cut", "Silver Bracket") is the human-readable bracket
  // name; the pool number only needs to show up as "Wave N" when a phase has
  // more than one pool ("Groups" split into Wave 1/Wave 2) — a single-pool
  // phase like "Top Cut" is unambiguous on its own.
  const phaseName = set.phaseGroup?.phase?.name ?? null;
  const poolNumber = set.phaseGroup?.displayIdentifier;
  const bracketLabel = phaseName
    ? `${phaseName}${set.phaseGroup?.hasMultiplePools && poolNumber ? ` Wave ${poolNumber}` : ''}`
    : null;
  const roundParts = [bracketLabel, set.fullRoundText].filter(Boolean);
  const roundText = roundParts.length > 0 ? ` (${roundParts.join(', ')})` : '';

  const content = [
    ``,
    `The matchup between:`,
    `${mentionFor(teamA, roleA)} vs ${mentionFor(teamB, roleB)}${roundText}`,
    `📍 __Station **${stationNumber == 1 ? 'Main Stage (Streamed)' : stationNumber}**__`,
    `Is starting shortly, please head to ${stationNumber == 1 ? 'the stage to setup as soon as the current set is done' : 'your station'}!`,
    ...missingRoleWarnings,
    `-------------------------------`,
  ].join('\n');

  return {
    content,
    allowedMentions: {
      parse: ['everyone'],
      roles: [roleA, roleB].filter(Boolean).map((r) => r.id),
    },
  };
}
