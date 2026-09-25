import { STARTGG_API_TOKEN } from './config.js';
import { RateLimiter } from './rateLimiter.js';

const ENDPOINT = 'https://api.start.gg/gql/alpha';

// start.gg allows an average of 80 requests / 60s across the whole token.
const limiter = new RateLimiter(75, 60_000);

export class StartggError extends Error {}

async function graphqlRequest(query, variables) {
  return limiter.schedule(async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${STARTGG_API_TOKEN}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      throw new StartggError(`start.gg API request failed (${res.status}): ${JSON.stringify(body)}`);
    }
    if (body?.errors?.length) {
      throw new StartggError(body.errors.map((e) => e.message).join('; '));
    }
    return body.data;
  });
}

// Accepts either a bare slug ("my-tournament-13") or a full start.gg URL
// (https://www.start.gg/tournament/my-tournament-13/details or /event/...).
export function extractTournamentSlug(input) {
  const trimmed = input.trim();
  const match = trimmed.match(/tournament\/([^/?#]+)/i);
  if (match) return match[1];
  return trimmed.replace(/^\/+|\/+$/g, '');
}

const TOURNAMENT_QUERY = `
  query TournamentWithEvents($slug: String!) {
    tournament(slug: $slug) {
      id
      name
      events {
        id
        name
        state
      }
    }
  }
`;

export async function resolveTournament(slugOrUrl) {
  const slug = extractTournamentSlug(slugOrUrl);
  const data = await graphqlRequest(TOURNAMENT_QUERY, { slug });
  if (!data?.tournament) {
    throw new StartggError(`No tournament found for "${slug}". Double-check the URL or slug.`);
  }
  return { slug, ...data.tournament };
}

const CANDIDATE_SETS_QUERY = `
  query CandidateSets($eventId: ID!, $page: Int!, $perPage: Int!) {
    event(id: $eventId) {
      id
      name
      sets(page: $page, perPage: $perPage, sortType: STANDARD, filters: { hideEmpty: true }) {
        pageInfo {
          total
          totalPages
        }
        nodes {
          id
          completedAt
          fullRoundText
          phaseGroup {
            id
            displayIdentifier
            phase {
              id
              name
            }
          }
          station {
            id
            number
          }
          slots {
            id
            entrant {
              id
              name
            }
          }
        }
      }
    }
  }
`;

// A set is "ready to announce" once it has a station and two real entrants
// (not a bye or a slot still waiting on an earlier round) and hasn't been
// played yet. Note: assigning a station does NOT reliably move start.gg's
// `state` field to CALLED in practice, so we don't filter on `state` at all —
// `completedAt` is what actually distinguishes an upcoming set from a
// finished one that still shows its old station.
export async function fetchReadyToAnnounceSets(eventId) {
  const perPage = 50;
  let page = 1;
  let totalPages = 1;
  const allNodes = [];

  do {
    const data = await graphqlRequest(CANDIDATE_SETS_QUERY, { eventId, page, perPage });
    const sets = data?.event?.sets;
    if (!sets) break;
    totalPages = sets.pageInfo.totalPages || 1;
    allNodes.push(...sets.nodes);
    page += 1;
  } while (page <= totalPages);

  // Which pools (phase groups) exist per phase, so we can tell announce.js
  // whether "Groups" needs a pool number ("Groups Wave 2") or is a single
  // -pool phase like "Top Cut" that doesn't ("Top Cut" alone).
  const poolIdsByPhase = new Map();
  for (const set of allNodes) {
    const phaseId = set.phaseGroup?.phase?.id;
    const poolId = set.phaseGroup?.id;
    if (!phaseId || !poolId) continue;
    if (!poolIdsByPhase.has(phaseId)) poolIdsByPhase.set(phaseId, new Set());
    poolIdsByPhase.get(phaseId).add(poolId);
  }

  const readySets = allNodes.filter((set) => {
    if (!set.station?.number) return false;
    if (set.completedAt) return false;
    const entrants = (set.slots || []).map((s) => s.entrant).filter(Boolean);
    return entrants.length === 2;
  });

  return readySets.map((set) => ({
    ...set,
    phaseGroup: set.phaseGroup && {
      ...set.phaseGroup,
      hasMultiplePools: (poolIdsByPhase.get(set.phaseGroup.phase?.id)?.size ?? 1) > 1,
    },
  }));
}
