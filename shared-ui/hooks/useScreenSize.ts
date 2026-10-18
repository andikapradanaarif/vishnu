import { useState, useEffect } from 'react';

export function useIsSmallerThanTablet() {
  const [isSmaller, setIsSmaller] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      setIsSmaller(window.innerWidth < 768);
    };

    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return isSmaller;
}

export function useIsSmallPhone() {
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      setIsSmall(window.innerWidth < 480);
    };

    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return isSmall;
}
