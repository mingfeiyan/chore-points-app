interface CoinSmallProps {
  size?: number;
  className?: string;
}

export default function CoinSmall({ size = 18, className = "" }: CoinSmallProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Gem silhouette */}
      <path
        d="M12 3 L19 9 L12 21 L5 9 Z"
        fill="#FFCB3B"
        stroke="#7A4E00"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Crown highlight */}
      <path
        d="M12 4.5 L16 9 L8 9 Z"
        fill="#FFFDE8"
        opacity="0.7"
      />
      {/* Girdle line */}
      <line x1="5" y1="9" x2="19" y2="9" stroke="#7A4E00" strokeWidth="0.75" />
      {/* Pavilion shadow */}
      <path
        d="M12 21 L8 9 L12 10.5 Z"
        fill="#B27B00"
        opacity="0.4"
      />
      {/* Tiny shine */}
      <circle cx="10" cy="6.5" r="1" fill="white" opacity="0.8" />
    </svg>
  );
}
