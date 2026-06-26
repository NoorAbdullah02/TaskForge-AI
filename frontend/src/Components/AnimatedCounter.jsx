import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * Animates a number from 0 to `value` using GSAP on mount.
 */
export default function AnimatedCounter({
  value,
  duration = 1.8,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}) {
  const ref = useRef(null);
  const animated = useRef(false);

  useEffect(() => {
    if (!ref.current || animated.current) return;
    animated.current = true;

    const numValue = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
    const obj = { val: 0 };

    gsap.to(obj, {
      val: numValue,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (ref.current) {
          const formatted =
            decimals > 0
              ? obj.val.toFixed(decimals)
              : Math.round(obj.val).toLocaleString();
          ref.current.textContent = `${prefix}${formatted}${suffix}`;
        }
      },
    });
  }, [value, duration, prefix, suffix, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}
