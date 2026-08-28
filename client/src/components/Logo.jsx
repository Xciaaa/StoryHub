import './Logo.css';

export default function Logo({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="indigo-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Frame */}
      <path
        d="M50 5 L90 25 V75 L50 95 L10 75 V25 Z"
        stroke="url(#indigo-glow)"
        strokeWidth="2"
        strokeLinejoin="round"
        className="logo-path"
      />

      {/* Inner Node Pattern */}
      <circle cx="50" cy="50" r="6" fill="url(#indigo-glow)" filter="url(#glow)" className="logo-node logo-node-center" />
      <circle cx="30" cy="35" r="4" fill="url(#indigo-glow)" opacity="0.6" className="logo-node logo-node-left" />
      <circle cx="70" cy="35" r="4" fill="url(#indigo-glow)" opacity="0.6" className="logo-node logo-node-right" />
      <circle cx="50" cy="75" r="4" fill="url(#indigo-glow)" opacity="0.6" className="logo-node logo-node-bottom" />

      {/* Connection Lines */}
      <path
        d="M50 50 L30 35 M50 50 L70 35 M50 50 L50 75"
        stroke="url(#indigo-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
        className="logo-line"
      />
    </svg>
  );
}
