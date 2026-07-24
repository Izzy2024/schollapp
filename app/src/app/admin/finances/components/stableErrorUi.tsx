'use client';

import React from 'react';
import { Alert } from 'antd';
import { STABLE_ERROR } from '@/lib/errors';

export type StableErrorLike = { message?: string } | Error | unknown;

export type StableErrorDisplay = {
  code: string;
  message?: string;
  details?: string;
};

export function getStableErrorCode(err: StableErrorLike): string | null {
  const msg = (err as any)?.message;
  if (!msg || typeof msg !== 'string') return null;

  const codes = Object.values(STABLE_ERROR);
  return codes.includes(msg as any) ? msg : null;
}

export function toStableErrorDisplay(err: StableErrorLike): StableErrorDisplay {
  const stableCode = getStableErrorCode(err);
  if (stableCode) return { code: stableCode, message: 'Acción no permitida o inválida.' };

  const msg = (err as any)?.message;
  if (typeof msg === 'string' && msg.trim()) {
    return { code: 'UNKNOWN_ERROR', message: msg };
  }

  return { code: 'UNKNOWN_ERROR', message: 'Error inesperado' };
}

export function formatErrorForMessage(err: StableErrorLike): string {
  const stableCode = getStableErrorCode(err);
  if (stableCode) return `${stableCode}`;
  return (err as any)?.message || 'Error inesperado';
}

export function StableErrorUi({ error, className }: { error: StableErrorDisplay | null; className?: string }) {
  if (!error) return null;

  return (
    <Alert
      className={className}
      type="error"
      showIcon
      title={
        <div className="space-y-1">
          <div className="font-medium">Error</div>
          <div className="text-xs text-gray-600">Código: {error.code}</div>
        </div>
      }
      description={
        <div className="space-y-2">
          {error.message ? <div>{error.message}</div> : null}
          {error.details ? <pre className="text-xs bg-gray-50 p-2 rounded-md overflow-auto">{error.details}</pre> : null}
        </div>
      }
    />
  );
}
