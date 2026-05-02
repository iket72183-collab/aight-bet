/**
 * MMA Event Config — manual mapping of upcoming fight cards.
 *
 * The Odds API lumps all MMA fights under one generic "MMA" key with no
 * organization info. This file lets us tag each event card with its
 * proper organization and event name so the UI shows "UFC 315" or
 * "BKFC 72" instead of just "MMA."
 *
 * HOW TO UPDATE:
 * 1. Add an entry for each upcoming fight card.
 * 2. Use the card's start date (UTC) as the `date` field (YYYY-MM-DD).
 * 3. List a few key fighter last names in `fighters` — just enough to
 *    match against the API's fighter names. You don't need every fight
 *    on the card, just 2-3 recognizable names.
 * 4. Set `org` to the organization abbreviation and `event` to the
 *    full event name.
 * 5. If The Odds API has bad per-fight times for a card, add `startsAt`
 *    with the real card start time in UTC. MMA cards are hidden as soon
 *    as that mapped start time passes.
 *
 * Matching logic: for each MMA event from the API, we check if any
 * fighter name contains one of the listed fighter strings. If a match
 * is found, that event gets tagged with the org and event name.
 * Date matching is checked first to narrow candidates.
 */

const MMA_EVENTS = [
  // ── April 2026 ─────────────────────────────────────────────────
  {
    date: '2026-04-25',
    org: 'UFC',
    event: 'UFC Fight Night',
    fighters: ['Sterling', 'Zalal', 'Gorimbo', 'Morales', 'Tafa'],
  },
  {
    date: '2026-04-26',
    org: 'PFL',
    event: 'PFL',
    fighters: ['Buchecha', 'Spann', 'Barcelos'],
  },

  // ── May 2026 ───────────────────────────────────────────────────
  {
    date: '2026-05-02',
    org: 'UFC',
    event: 'UFC Perth',
    startsAt: '2026-05-02T11:00:00Z',
    fighters: ['Dariush', 'Salkilld', 'Meerschaert', 'Malkoun'],
  },
  {
    date: '2026-05-03',
    org: 'UFC',
    event: 'UFC Perth',
    startsAt: '2026-05-02T11:00:00Z',
    fighters: ['Maddalena', 'Prates'],
  },
  {
    date: '2026-05-10',
    org: 'UFC',
    event: 'UFC Newark',
    fighters: ['Chimaev', 'Strickland', 'Blachowicz', 'Guskov', 'Brady', 'Buckley'],
  },
  {
    date: '2026-05-17',
    org: 'PFL',
    event: 'PFL',
    fighters: ['Ngannou', 'Lins', 'Parnasse'],
  },

  // ── June 2026 ──────────────────────────────────────────────────
  {
    date: '2026-06-02',
    org: 'UFC',
    event: 'UFC',
    fighters: ['Makhachev', 'Topuria'],
  },
  {
    date: '2026-06-14',
    org: 'UFC',
    event: 'UFC Freedom 250',
    fighters: ['Pereira', 'Ulberg', 'Prochazka', 'Jones', 'Ankalaev'],
  },
  {
    date: '2026-06-15',
    org: 'UFC',
    event: 'UFC Freedom 250',
    fighters: ['Nickal', 'Daukaus', 'Chandler', 'Ruffy'],
  },
  {
    date: '2026-06-27',
    org: 'UFC',
    event: 'UFC',
    fighters: ['Shevchenko', 'Silva'],
  },
  {
    date: '2026-06-28',
    org: 'UFC',
    event: 'UFC',
    fighters: ['Pantoja', 'Aspinall', 'Gane', 'Zhang', 'Dern'],
  },
];

function findMmaEventCard(commenceTime, homeTeam, awayTeam) {
  if (!commenceTime) return null;

  const eventDate = commenceTime.slice(0, 10); // "YYYY-MM-DD"
  const homeLower = (homeTeam || '').toLowerCase();
  const awayLower = (awayTeam || '').toLowerCase();

  for (const card of MMA_EVENTS) {
    // Check date match first (cards usually span one day)
    if (card.date !== eventDate) continue;

    // Check if any listed fighter matches either side of this bout
    const matched = card.fighters.some((name) => {
      const needle = name.toLowerCase();
      return homeLower.includes(needle) || awayLower.includes(needle);
    });

    if (matched) return card;
  }

  // No fighter match — date-only match is still useful because many
  // same-card fights are missing from the compact manual fighter list.
  return MMA_EVENTS.find((card) => card.date === eventDate) || null;
}

/**
 * Look up the MMA organization and event name for a given API event.
 *
 * @param {string} commenceTime - ISO date string from the API
 * @param {string} homeTeam - Fighter name (home)
 * @param {string} awayTeam - Fighter name (away)
 * @returns {{ org: string, event: string } | null}
 */
export function lookupMmaEvent(commenceTime, homeTeam, awayTeam) {
  const card = findMmaEventCard(commenceTime, homeTeam, awayTeam);
  if (!card) return null;
  return { org: card.org, event: card.event };
}

/**
 * Determine whether an MMA event should be considered started/expired.
 * Falls back to the API's commence_time, but uses a mapped card start
 * when the API keeps stale fights around with bad placeholder times.
 *
 * @param {string} commenceTime - ISO date string from the API
 * @param {string} homeTeam - Fighter name (home)
 * @param {string} awayTeam - Fighter name (away)
 * @param {number} now - timestamp in milliseconds
 * @returns {boolean}
 */
export function hasMmaEventStarted(commenceTime, homeTeam, awayTeam, now = Date.now()) {
  if (!commenceTime) return false;

  const card = findMmaEventCard(commenceTime, homeTeam, awayTeam);
  const cutoffTime = card?.startsAt || commenceTime;
  const cutoffMs = new Date(cutoffTime).getTime();

  return Number.isFinite(cutoffMs) && cutoffMs <= now;
}

export default MMA_EVENTS;
