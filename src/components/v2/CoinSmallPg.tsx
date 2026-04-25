// Paper Garden tinted small gem — green sibling of CoinSmall.
// Used in marketing surfaces where the gold accent clashes with the theme.

interface CoinSmallPgProps {
  size?: number;
  className?: string;
}

export default function CoinSmallPg({ size = 18, className = "" }: CoinSmallPgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 3 L19 9 L12 21 L5 9 Z"
        fill="#9bbf7a"
        stroke="#2a3e1d"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M12 4.5 L16 9 L8 9 Z" fill="#f6fbe6" opacity="0.7" />
      <line x1="5" y1="9" x2="19" y2="9" stroke="#2a3e1d" strokeWidth="0.75" />
      <path d="M12 21 L8 9 L12 10.5 Z" fill="#4a6a32" opacity="0.4" />
      <circle cx="10" cy="6.5" r="1" fill="white" opacity="0.8" />
    </svg>
  );
}
