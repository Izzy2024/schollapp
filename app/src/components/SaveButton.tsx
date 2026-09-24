'use client';

import React, { useState } from 'react';
import { Button, type ButtonProps } from 'antd';

/**
 * Drop-in replacement for a primary "Guardar"/submit Button. Runs onClick,
 * shows the Antd loading spinner while pending, then briefly swaps the
 * label for an animated check (see .t-success-check in globals.css) before
 * reverting. If onClick rejects, the check is skipped and the button just
 * returns to idle — error UI (antd message, etc.) stays the caller's job.
 */
export default function SaveButton({
  onClick,
  children,
  successDurationMs = 900,
  ...rest
}: Omit<ButtonProps, 'onClick' | 'loading'> & {
  onClick: () => Promise<unknown> | unknown;
  successDurationMs?: number;
}) {
  const [phase, setPhase] = useState<'idle' | 'pending' | 'success'>('idle');

  async function handleClick() {
    setPhase('pending');
    try {
      await onClick();
      setPhase('success');
      setTimeout(() => setPhase('idle'), successDurationMs);
    } catch {
      setPhase('idle');
    }
  }

  return (
    <Button {...rest} onClick={handleClick} loading={phase === 'pending'}>
      {phase === 'success' ? (
        <span className="t-success-check" data-state="in" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <path d="M5 12l4 4 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
