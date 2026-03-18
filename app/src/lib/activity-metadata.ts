const FALLBACK_METADATA = {
  _fallback: true,
  _errorCode: 'ACTIVITY_METADATA_INVALID_JSON',
} as const;

export function parseActivityMetadata(metadata: unknown) {
  if (metadata == null) return null;

  if (typeof metadata === 'object') {
    return metadata;
  }

  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch {
      return FALLBACK_METADATA;
    }
  }

  return FALLBACK_METADATA;
}
