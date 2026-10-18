export default function LoadingSpinner({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin text-primary-500 ${className || ''}`}
      viewBox="0 0 24 24"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        animationDuration: '0.8s',
      }}
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
