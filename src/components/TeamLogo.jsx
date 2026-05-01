/**
 * Displays a small team logo next to the team name.
 * Uses ESPN's public CDN for team images.
 *
 * To add a new team, just add its name → abbreviation mapping below.
 * ESPN logo URL pattern: https://a.espncdn.com/i/teamlogos/{league}/500/{abbrev}.png
 */

const TEAM_LOGOS = {
  // ── NBA ──────────────────────────────────────────
  'Houston Rockets': { abbrev: 'hou', league: 'nba' },
  'Los Angeles Lakers': { abbrev: 'lal', league: 'nba' },
  'Los Angeles Clippers': { abbrev: 'lac', league: 'nba' },
  'Boston Celtics': { abbrev: 'bos', league: 'nba' },
  'Golden State Warriors': { abbrev: 'gs', league: 'nba' },
  'Miami Heat': { abbrev: 'mia', league: 'nba' },
  'Milwaukee Bucks': { abbrev: 'mil', league: 'nba' },
  'Phoenix Suns': { abbrev: 'phx', league: 'nba' },
  'Denver Nuggets': { abbrev: 'den', league: 'nba' },
  'Philadelphia 76ers': { abbrev: 'phi', league: 'nba' },
  'Cleveland Cavaliers': { abbrev: 'cle', league: 'nba' },
  'Oklahoma City Thunder': { abbrev: 'okc', league: 'nba' },
  'Minnesota Timberwolves': { abbrev: 'min', league: 'nba' },
  'New York Knicks': { abbrev: 'ny', league: 'nba' },
  'Dallas Mavericks': { abbrev: 'dal', league: 'nba' },
  'Sacramento Kings': { abbrev: 'sac', league: 'nba' },
  'Indiana Pacers': { abbrev: 'ind', league: 'nba' },
  'Orlando Magic': { abbrev: 'orl', league: 'nba' },
  'Atlanta Hawks': { abbrev: 'atl', league: 'nba' },
  'Chicago Bulls': { abbrev: 'chi', league: 'nba' },
  'Toronto Raptors': { abbrev: 'tor', league: 'nba' },
  'Brooklyn Nets': { abbrev: 'bkn', league: 'nba' },
  'Memphis Grizzlies': { abbrev: 'mem', league: 'nba' },
  'New Orleans Pelicans': { abbrev: 'no', league: 'nba' },
  'Portland Trail Blazers': { abbrev: 'por', league: 'nba' },
  'San Antonio Spurs': { abbrev: 'sa', league: 'nba' },
  'Utah Jazz': { abbrev: 'utah', league: 'nba' },
  'Washington Wizards': { abbrev: 'wsh', league: 'nba' },
  'Charlotte Hornets': { abbrev: 'cha', league: 'nba' },
  'Detroit Pistons': { abbrev: 'det', league: 'nba' },

  // ── MLB ──────────────────────────────────────────
  'Houston Astros': { abbrev: 'hou', league: 'mlb' },
  'Los Angeles Dodgers': { abbrev: 'lad', league: 'mlb' },
  'New York Yankees': { abbrev: 'nyy', league: 'mlb' },
  'New York Mets': { abbrev: 'nym', league: 'mlb' },
  'Atlanta Braves': { abbrev: 'atl', league: 'mlb' },
  'Philadelphia Phillies': { abbrev: 'phi', league: 'mlb' },
  'San Diego Padres': { abbrev: 'sd', league: 'mlb' },
  'Arizona Diamondbacks': { abbrev: 'ari', league: 'mlb' },
  'Texas Rangers': { abbrev: 'tex', league: 'mlb' },
  'Baltimore Orioles': { abbrev: 'bal', league: 'mlb' },
  'Tampa Bay Rays': { abbrev: 'tb', league: 'mlb' },
  'Minnesota Twins': { abbrev: 'min', league: 'mlb' },
  'Milwaukee Brewers': { abbrev: 'mil', league: 'mlb' },
  'Cleveland Guardians': { abbrev: 'cle', league: 'mlb' },
  'Seattle Mariners': { abbrev: 'sea', league: 'mlb' },
  'Toronto Blue Jays': { abbrev: 'tor', league: 'mlb' },
  'Chicago Cubs': { abbrev: 'chc', league: 'mlb' },
  'Chicago White Sox': { abbrev: 'chw', league: 'mlb' },
  'Boston Red Sox': { abbrev: 'bos', league: 'mlb' },
  'San Francisco Giants': { abbrev: 'sf', league: 'mlb' },
  'Detroit Tigers': { abbrev: 'det', league: 'mlb' },
  'Kansas City Royals': { abbrev: 'kc', league: 'mlb' },
  'St. Louis Cardinals': { abbrev: 'stl', league: 'mlb' },
  'Cincinnati Reds': { abbrev: 'cin', league: 'mlb' },
  'Pittsburgh Pirates': { abbrev: 'pit', league: 'mlb' },
  'Los Angeles Angels': { abbrev: 'laa', league: 'mlb' },
  'Colorado Rockies': { abbrev: 'col', league: 'mlb' },
  'Washington Nationals': { abbrev: 'wsh', league: 'mlb' },
  'Miami Marlins': { abbrev: 'mia', league: 'mlb' },
  'Oakland Athletics': { abbrev: 'oak', league: 'mlb' },

  // ── NFL ──────────────────────────────────────────
  'Kansas City Chiefs': { abbrev: 'kc', league: 'nfl' },
  'San Francisco 49ers': { abbrev: 'sf', league: 'nfl' },
  'Dallas Cowboys': { abbrev: 'dal', league: 'nfl' },
  'Philadelphia Eagles': { abbrev: 'phi', league: 'nfl' },
  'Buffalo Bills': { abbrev: 'buf', league: 'nfl' },
  'Miami Dolphins': { abbrev: 'mia', league: 'nfl' },
  'Baltimore Ravens': { abbrev: 'bal', league: 'nfl' },
  'Detroit Lions': { abbrev: 'det', league: 'nfl' },
  'Green Bay Packers': { abbrev: 'gb', league: 'nfl' },
  'Cincinnati Bengals': { abbrev: 'cin', league: 'nfl' },
  'Jacksonville Jaguars': { abbrev: 'jax', league: 'nfl' },
  'Los Angeles Rams': { abbrev: 'lar', league: 'nfl' },
  'Los Angeles Chargers': { abbrev: 'lac', league: 'nfl' },
  'New York Giants': { abbrev: 'nyg', league: 'nfl' },
  'New York Jets': { abbrev: 'nyj', league: 'nfl' },
  'Pittsburgh Steelers': { abbrev: 'pit', league: 'nfl' },
  'Seattle Seahawks': { abbrev: 'sea', league: 'nfl' },
  'Cleveland Browns': { abbrev: 'cle', league: 'nfl' },
  'Houston Texans': { abbrev: 'hou', league: 'nfl' },
  'Indianapolis Colts': { abbrev: 'ind', league: 'nfl' },
  'Tennessee Titans': { abbrev: 'ten', league: 'nfl' },
  'Denver Broncos': { abbrev: 'den', league: 'nfl' },
  'Las Vegas Raiders': { abbrev: 'lv', league: 'nfl' },
  'Minnesota Vikings': { abbrev: 'min', league: 'nfl' },
  'Chicago Bears': { abbrev: 'chi', league: 'nfl' },
  'New Orleans Saints': { abbrev: 'no', league: 'nfl' },
  'Tampa Bay Buccaneers': { abbrev: 'tb', league: 'nfl' },
  'Atlanta Falcons': { abbrev: 'atl', league: 'nfl' },
  'Carolina Panthers': { abbrev: 'car', league: 'nfl' },
  'Arizona Cardinals': { abbrev: 'ari', league: 'nfl' },
  'New England Patriots': { abbrev: 'ne', league: 'nfl' },
  'Washington Commanders': { abbrev: 'wsh', league: 'nfl' },
};

/**
 * Get the ESPN CDN logo URL for a team.
 * Returns null if team is not mapped (e.g. MMA fighters).
 */
function getLogoUrl(teamName) {
  const info = TEAM_LOGOS[teamName];
  if (!info) return null;
  return `https://a.espncdn.com/i/teamlogos/${info.league}/500/${info.abbrev}.png`;
}

/**
 * Small inline team logo.
 * Falls back to nothing if the team isn't mapped (graceful for MMA fighters, etc.).
 */
export default function TeamLogo({ team, size = 20 }) {
  const url = getLogoUrl(team);
  if (!url) return null;

  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className="inline-block object-contain shrink-0"
      loading="lazy"
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );
}
