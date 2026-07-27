const SEMVER_PREFIX_RE = /^(\^|~|>=|<=|>|<|=|~>)\s*/;

export function getSupportedVersionPrefix(rawVersion: string): string {
  const match = rawVersion.trim().match(SEMVER_PREFIX_RE);
  return match ? match[0] : '';
}

export function applyVersionPrefix(rawVersion: string, latest: string): string {
  return getSupportedVersionPrefix(rawVersion) + latest;
}

export function stripVersionPrefix(raw: string): string {
  return raw.trim().replace(SEMVER_PREFIX_RE, '').replace(/^v/i, '').trim();
}

export function isMajorBump(from: string, to: string): boolean {
  const a = stripVersionPrefix(from).split('.')[0];
  const b = stripVersionPrefix(to).split('.')[0];
  const an = Number(a);
  const bn = Number(b);
  if (Number.isNaN(an) || Number.isNaN(bn)) return false;
  return bn > an;
}

export function compareSemver(a: string, b: string): number {
  const pa = stripVersionPrefix(a).split('.').map((x) => parseInt(x, 10) || 0);
  const pb = stripVersionPrefix(b).split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}
