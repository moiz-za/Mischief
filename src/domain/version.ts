export type Version = string;

export interface VersionParts {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export function parseVersion(version: Version): VersionParts {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(version);
  if (!match) {
    throw new Error(`Invalid semantic version: "${version}"`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
  };
}

export function compareVersions(a: Version, b: Version): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);

  for (const key of ["major", "minor", "patch"] as const) {
    if (pa[key] !== pb[key]) {
      return pa[key] < pb[key] ? -1 : 1;
    }
  }

  const hasPrereleaseA = pa.prerelease !== undefined;
  const hasPrereleaseB = pb.prerelease !== undefined;
  if (!hasPrereleaseA && !hasPrereleaseB) {
    return 0;
  }
  if (!hasPrereleaseA) {
    return 1;
  }
  if (!hasPrereleaseB) {
    return -1;
  }
  return pa.prerelease! < pb.prerelease! ? -1 : pa.prerelease! > pb.prerelease! ? 1 : 0;
}

export function isCompatible(version: Version, minimum: Version, maximum?: Version): boolean {
  return (
    compareVersions(version, minimum) >= 0 &&
    (maximum === undefined || compareVersions(version, maximum) <= 0)
  );
}
