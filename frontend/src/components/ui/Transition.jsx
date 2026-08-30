import React, { useState, useEffect, useRef } from 'react';

/**
 * 通用过渡包装器（纯 opacity 淡入淡出 + 退场延迟卸载）
 * ----------------------------------------------------------
 * 只对包裹层应用 opacity 动画（不会改变 fixed 定位的包含块，安全）。
 * transform / scale 等位移动画请由调用方直接加在内容内部元素上。
 *
 * 用法：
 *   <Transition visible={open} enterClass="gwc-overlay-in" exitClass="gwc-overlay-out">
 *     <Modal />   // 内部若是 fixed 元素，其定位不受本包装器影响
 *   </Transition>
 */
export default function Transition({
  visible,
  children,
  enterClass = 'gwc-overlay-in',
  exitClass = 'gwc-overlay-out',
  duration = 220,            // 退场动画时长（ms），到点后卸载
  style = {},
}) {
  const [mounted, setMounted] = useState(!!visible);
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (visible) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (!mounted) setMounted(true);
      else if (leaving) setLeaving(false);
    } else if (mounted) {
      setLeaving(true);
      timerRef.current = setTimeout(() => {
        setMounted(false);
        setLeaving(false);
        timerRef.current = null;
      }, duration);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible, mounted, leaving, duration]);

  if (!mounted) return null;

  return (
    <div
      className={leaving ? exitClass : enterClass}
      style={{ pointerEvents: leaving ? 'none' : undefined, ...style }}
      data-gwc-transition={leaving ? 'out' : 'in'}
    >
      {children}
    </div>
  );
}
