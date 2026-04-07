import { useEffect, useRef } from 'react';

export function useInfiniteScroll({ enabled = true, hasMore = true, isLoading = false, onLoadMore }) {
    const loaderRef = useRef(null);

    useEffect(() => {
        if (!enabled || !hasMore || isLoading || typeof onLoadMore !== 'function') {
            return undefined;
        }

        const element = loaderRef.current;
        if (!element || typeof IntersectionObserver === 'undefined') {
            return undefined;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    onLoadMore();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [enabled, hasMore, isLoading, onLoadMore]);

    return loaderRef;
}