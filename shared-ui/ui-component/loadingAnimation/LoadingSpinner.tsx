export default function LoadingSpinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin ${className || ''}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={{ animationDuration: '0.8s' }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="24"
        strokeDashoffset="6"
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}
