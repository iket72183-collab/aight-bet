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
    fighters: ['Dariush', 'Salkilld', 'Meerschaert', 'Malkoun'],
  },
  {
    date: '2026-05-03',
    org: 'UFC',
    event: 'UFC Perth',
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

/**
 * Look up the MMA organization and event name for a given API event.
 *
 * @param {string} commenceTime - ISO date string from the API
 * @param {string} homeTeam - Fighter name (home)
 * @param {string} awayTeam - Fighter name (away)
 * @returns {{ org: string, event: string } | null}
 */
export function lookupMmaEvent(commenceTime, homeTeam, awayTeam) {
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

    if (matched) {
      return { org: card.org, event: card.event };
    }
  }

  // No match — check if date alone matches a card (same-night fights
  // are almost certainly on the same card even if fighter names weren't listed)
  for (const card of MMA_EVENTS) {
    if (card.date === eventDate) {
      return { org: card.org, event: card.event };
    }
  }

  return null;
}

export default MMA_EVENTS;
