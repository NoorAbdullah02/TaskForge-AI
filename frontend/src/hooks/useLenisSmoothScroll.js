import { useEffect } from 'react';
import Lenis from 'lenis';

// Any ancestor with its own vertical scrollbar (modals, chat panels, kanban
// columns, dropdowns, etc.) should scroll natively instead of being hijacked
// by the page-level Lenis instance.
function hasScrollableAncestor(node) {
    let el = node;
    while (el && el !== document.body) {
        if (el.nodeType === 1) {
            if (el.hasAttribute('data-lenis-prevent')) return true;
            const style = window.getComputedStyle(el);
            const canScrollY = /(auto|scroll)/.test(style.overflowY);
            if (canScrollY && el.scrollHeight > el.clientHeight + 1) return true;
        }
        el = el.parentNode;
    }
    return false;
}

// Buttery-smooth inertial scrolling across the whole app. Respects reduced-motion.
export default function useLenisSmoothScroll() {
    useEffect(() => {
        const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;

        const lenis = new Lenis({
            duration: 1.1,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            prevent: hasScrollableAncestor,
        });

        let rafId;
        function raf(time) {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        }
        rafId = requestAnimationFrame(raf);

        return () => {
            cancelAnimationFrame(rafId);
            lenis.destroy();
        };
    }, []);
}
