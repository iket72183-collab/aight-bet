/**
 * Small league logo icons for the market tabs and cards.
 * Simple, recognizable silhouette-style SVGs.
 */

function NBALogo({ size = 20, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      {/* Basketball silhouette */}
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2C12 2 12 22 12 22" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M2 12C2 12 22 12 22 12" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M4.5 4.5C8 8 8 16 4.5 19.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M19.5 4.5C16 8 16 16 19.5 19.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function MLBLogo({ size = 20, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      {/* Baseball diamond */}
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M5 9C7 10 8 12 7 15" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M19 9C17 10 16 12 17 15" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M5 9.5C7 8 9 7.5 12 8C15 7.5 17 8 19 9.5" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M7 15C9 16.5 15 16.5 17 15" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function NFLLogo({ size = 20, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      {/* Football shape */}
      <ellipse cx="12" cy="12" rx="10" ry="6.5" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(-30 12 12)" />
      <path d="M8 8L16 16" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M9.5 11.5L14.5 11.5" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M10 13L14 13" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M10.5 10L14.5 10" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function MMAOctagonLogo({ size = 20, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      {/* Octagon */}
      <polygon
        points="8,2 16,2 22,8 22,16 16,22 8,22 2,16 2,8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">
        MMA
      </text>
    </svg>
  );
}

function MMALogo({ size = 20, className = '', organization = null }) {
  // Only show UFC logo for UFC fights; all others get the generic octagon
  if (organization === 'UFC') {
    return (
      <img
        src="https://a.espncdn.com/i/teamlogos/leagues/500/ufc.png"
        alt="UFC"
        width={size}
        height={size}
        className={`inline-block object-contain shrink-0 ${className}`}
        loading="lazy"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }
  return <MMAOctagonLogo size={size} className={className} />;
}

const logos = { NBA: NBALogo, MLB: MLBLogo, NFL: NFLLogo, MMA: MMALogo };

export default function LeagueLogo({ league, size = 20, className = '', organization = null }) {
  const Logo = logos[league];
  if (!Logo) return null;
  // Pass organization through so MMA can distinguish UFC vs others
  return <Logo size={size} className={className} organization={organization} />;
}
