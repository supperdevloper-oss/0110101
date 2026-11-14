import React, { useEffect, useRef, useState } from 'react';

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

/**
 * Keep below-the-fold CDN images out of the initial request queue. Native
 * loading="lazy" can preload several screens ahead on mobile; this observer
 * starts each request only as it approaches the viewport.
 */
export default function DeferredImage({ src, alt = '', priority = false, ...props }) {
  const imageRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(priority);

  useEffect(() => {
    if (priority) {
      setShouldLoad(true);
      return undefined;
    }

    setShouldLoad(false);
    const image = imageRef.current;
    if (!image) return undefined;
    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '400px 0px' });

    observer.observe(image);
    return () => observer.disconnect();
  }, [priority, src]);

  return <img
    {...props}
    ref={imageRef}
    src={shouldLoad ? src : TRANSPARENT_PIXEL}
    alt={alt}
    loading={shouldLoad ? 'eager' : 'lazy'}
    decoding="async"
    fetchpriority={priority ? 'high' : 'low'}
  />;
}
