import * as React from 'react';
import { cn } from '../../lib/utils';

/** SRP: purely visual timeline rail. No data fetching or state kept here. */
export default function TimelineRail({
  items,
  size = 'md',
  emphasizeActiveTrail = true,
  labelAngle = 45,
  gapClassName = 'gap-14',
  lineColorClass = 'bg-zinc-300 dark:bg-zinc-700',
  lineThickness = 6,
  dotClass = 'bg-zinc-400 dark:bg-zinc-600',
  dotActiveClass = 'bg-zinc-900 dark:bg-zinc-100',
  className,
  railClassName,
  itemClassName,
  labelClassName,
  captionClassName,
  renderLabel,
  renderCaption,
}) {
  // compute last active index (for emphasized rail)
  const lastActive = React.useMemo(() => {
    let idx = -1;
    items.forEach((it, i) => {
      if (it.active) idx = i;
    });
    return idx;
  }, [items]);

  const dotSize = size === 'sm' ? 14 : 18;
  const topOffset = size === 'sm' ? -22 : -26; // label y
  const captionOffset = size === 'sm' ? 18 : 22; // caption y

  return (
    <section aria-label='timeline' className={cn('relative w-full', className)}>
      {/* Rail */}
      <div
        aria-hidden
        className={cn('absolute', railClassName)}
        style={{
          top: 0,
          left: `${100 / (items.length * 2)}%`,
          width: `${100 - (100 / items.length)}%`,
          height: lineThickness,
          transform: `translateY(${captionOffset * -1}px)`,
        }}
      >
        <div className={cn('h-full rounded-full', lineColorClass)} />

        {/* Emphasized segment up to last active */}
        {emphasizeActiveTrail && lastActive >= 0 && (
          <div
            className='absolute left-0 top-0 h-full rounded-full bg-zinc-900 dark:bg-zinc-100'
            style={{
              width: `${items.length > 1 ? (lastActive / (items.length - 1)) * 100 : 0}%`,
            }}
          />
        )}
      </div>

      {/* Dots row */}
      <ol
        className={cn(
          'relative flex items-center justify-around',
          gapClassName,
          // push the whole row down so captions can sit below the rail
          `pt-${Math.max(captionOffset / 4, 4)}`
        )}
        style={{ marginTop: captionOffset }} // create space for labels and captions
        role='list'
      >
        {items.map((item, i) => {
          const isActive = !!item.active;
          return (
            <li
              key={i}
              className={cn(
                'relative flex flex-col items-center',
                itemClassName
              )}
            >
              {/* diagonal label above */}
              {item.label && (
                <span
                  className={cn(
                    'absolute -top-3 -translate-y-full select-none text-[11px] text-zinc-500 dark:text-zinc-400',
                    labelClassName
                  )}
                  style={{
                    transform: `translateY(${topOffset}px) rotate(${-Math.abs(labelAngle)}deg)`,
                    transformOrigin: 'bottom center',
                  }}
                  aria-hidden
                >
                  {renderLabel ? renderLabel(item, i) : item.label}
                </span>
              )}

              {/* dot */}
              {item.href ? (
                <a
                  href={item.href}
                  className={cn(
                    'relative rounded-full ring-2 ring-black/5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                    isActive ? dotActiveClass : dotClass
                  )}
                  style={{ width: dotSize, height: dotSize }}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={item.label ?? item.caption ?? `Step ${i + 1}`}
                  title={item.label ?? item.caption}
                />
              ) : (
                <button
                  type='button'
                  onClick={item.onClick}
                  className={cn(
                    'relative rounded-full ring-2 ring-black/5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
                    isActive ? dotActiveClass : dotClass
                  )}
                  style={{ width: dotSize, height: dotSize }}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={item.label ?? item.caption ?? `Step ${i + 1}`}
                  title={item.label ?? item.caption}
                />
              )}

              {/* caption below */}
              {item.caption && (
                <span
                  className={cn(
                    'absolute select-none text-xs text-zinc-600 dark:text-zinc-300',
                    captionClassName
                  )}
                  style={{ transform: `translateY(${captionOffset}px)` }}
                  aria-hidden
                >
                  {renderCaption ? renderCaption(item, i) : item.caption}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
