import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';

export const TOOLTIP_SHOW_DELAY_MS = 400;
export const TOOLTIP_HIDE_DELAY_MS = 80;

export type TooltipSide = 'top' | 'bottom' | 'right' | 'left';

type Props = {
  content: React.ReactNode;
  side?: TooltipSide;
  delay?: number;
  className?: string;
  children: React.ReactElement;
};

function composeHandlers<E>(
  ours: ((e: E) => void) | undefined,
  theirs: ((e: E) => void) | undefined
): ((e: E) => void) | undefined {
  if (!ours) return theirs;
  if (!theirs) return ours;
  return (e) => {
    ours(e);
    theirs(e);
  };
}

function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(node);
      else ref.current = node;
    }
  };
}

function positionStyle(
  rect: DOMRect,
  side: TooltipSide
): { top: number; left: number; transform: string } {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  switch (side) {
    case 'bottom':
      return {
        top: rect.bottom + 8,
        left: centerX,
        transform: 'translate(-50%, 0)',
      };
    case 'left':
      return {
        top: centerY,
        left: rect.left - 8,
        transform: 'translate(-100%, -50%)',
      };
    case 'right':
      return {
        top: centerY,
        left: rect.right + 8,
        transform: 'translate(0, -50%)',
      };
    case 'top':
    default:
      return {
        top: rect.top - 8,
        left: centerX,
        transform: 'translate(-50%, -100%)',
      };
  }
}

const Tooltip: React.FC<Props> = ({
  content,
  side = 'top',
  delay = TOOLTIP_SHOW_DELAY_MS,
  className,
  children,
}) => {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const showTimerRef = useRef<number | undefined>(undefined);
  const hideTimerRef = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    transform: 'translate(-50%, -100%)',
  });

  const clearTimers = () => {
    if (showTimerRef.current != null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = undefined;
    }
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = undefined;
    }
  };

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    setCoords(positionStyle(el.getBoundingClientRect(), side));
  }, [side]);

  const show = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = undefined;
    }
    if (showTimerRef.current != null) return;
    showTimerRef.current = window.setTimeout(() => {
      showTimerRef.current = undefined;
      updatePosition();
      setOpen(true);
    }, delay);
  }, [delay, updatePosition]);

  const hide = useCallback(() => {
    if (showTimerRef.current != null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = undefined;
    }
    if (hideTimerRef.current != null) return;
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = undefined;
      setOpen(false);
    }, TOOLTIP_HIDE_DELAY_MS);
  }, []);

  useEffect(() => clearTimers, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onReposition = () => updatePosition();
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open, updatePosition]);

  const child = React.Children.only(children);
  const childRef = (child as React.ReactElement & { ref?: React.Ref<HTMLElement> })
    .ref;

  const trigger = React.cloneElement(child, {
    ref: mergeRefs(childRef, triggerRef),
    onMouseEnter: composeHandlers(show, child.props.onMouseEnter),
    onMouseLeave: composeHandlers(hide, child.props.onMouseLeave),
    onFocus: composeHandlers(show, child.props.onFocus),
    onBlur: composeHandlers(hide, child.props.onBlur),
    'aria-describedby': open ? tooltipId : undefined,
    title: undefined,
  });

  return (
    <>
      {trigger}
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              className={cn('es-tooltip', className)}
              style={{
                top: coords.top,
                left: coords.left,
                transform: coords.transform,
              }}
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default Tooltip;
