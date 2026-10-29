interface LoadingAnimationProps {
	className?: string;
	/** Replaces the default `text-primary-600` spinner color when provided. */
	colorClassName?: string;
	dotClassName?: string;
}

/**
 * Two diagonal squares spinning in discrete steps — the pinwheel reads
 * as `▚`, matching vishnu's pixel spinner instead of a smooth loader.
 */
export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
	className = "w-5 h-5",
	colorClassName = "text-primary-600",
	dotClassName,
}) => (
	<div className={`${colorClassName} ${className}`}>
		<svg width="100%" height="100%" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<style>
				{`
          .shared-load-spin {
            transform-box: view-box;
            transform-origin: center;
            animation: sharedLoadStep 0.8s steps(8, end) infinite;
            fill: currentColor;
          }
          @keyframes sharedLoadStep {
            to {
              transform: rotate(360deg);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .shared-load-spin {
              animation: none;
            }
          }
        `}
			</style>
			<g className="shared-load-spin">
				<rect className={dotClassName} x="3" y="3" width="9" height="9" />
				<rect className={dotClassName} x="12" y="12" width="9" height="9" />
			</g>
		</svg>
	</div>
);

export default LoadingAnimation;
