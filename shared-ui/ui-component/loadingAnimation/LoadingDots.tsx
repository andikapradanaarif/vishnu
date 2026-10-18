interface LoadingAnimationProps {
  className?: string;
  /** Replaces the default `text-primary-600` spinner color when provided. */
  colorClassName?: string;
  dotClassName?: string;
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ className = 'w-5 h-5', colorClassName = 'text-primary-600' }) => (
  <div className={`${colorClassName} ${className}`}>
    <svg width="100%" height="100%" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <style>
        {`
          .dot1, .dot2, .dot3 {
            animation: dotsBounce 0.8s infinite ease-in-out both;
            fill: currentColor;
          }
          .dot1 {
            animation-delay: -0.16s;
          }
          .dot2 {
            animation-delay: -0.08s;
          }
          @keyframes dotsBounce {
            0%, 80%, 100% { 
              transform: translateY(0);
            }
            45% { 
              transform: translateY(-5px);
            }
          }
        `}
      </style>
      <circle className={`dot1`} cx="4" cy="12" r="3" />
      <circle className={`dot2`} cx="12" cy="12" r="3" />
      <circle className={`dot3`} cx="20" cy="12" r="3" />
    </svg>
  </div>
);

export default LoadingAnimation;
