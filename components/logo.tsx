export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#FFFDF8" stroke="#EADCC4" strokeWidth="2" />
      <g transform="translate(23 37) rotate(-14)" fill="#E2795B">
        <ellipse cx="0" cy="5.6" rx="6.1" ry="8.3" />
        <circle cx="-5.4" cy="-5.2" r="2.1" />
        <circle cx="-2.1" cy="-7.3" r="2.35" />
        <circle cx="1.6" cy="-7.1" r="2.1" />
        <circle cx="4.8" cy="-5.3" r="1.9" />
        <circle cx="7.1" cy="-2.6" r="1.6" />
      </g>
      <g transform="translate(43 24) rotate(10) scale(.8)" fill="#7FA98B">
        <ellipse cx="0" cy="5.6" rx="6.1" ry="8.3" />
        <circle cx="-5.4" cy="-5.2" r="2.1" />
        <circle cx="-2.1" cy="-7.3" r="2.35" />
        <circle cx="1.6" cy="-7.1" r="2.1" />
        <circle cx="4.8" cy="-5.3" r="1.9" />
        <circle cx="7.1" cy="-2.6" r="1.6" />
      </g>
    </svg>
  );
}
