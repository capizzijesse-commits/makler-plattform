export type RoomCountVariant = {
  title: string;
  text: string;
};

export type RoomCountIssue = {
  variantIndex: number;
  field: "title" | "text";
  claimedRooms: number;
  expectedRooms: number;
};

function parseRoomCount(input: string): number | null {
  const normalized = input.trim()
    .replace(/(\d+)\s*½/u, "$1.5")
    .replace(/(\d+),5\b/u, "$1.5");

  if (!/^\d+(?:\.5)?$/u.test(normalized)) {
    return null;
  }

  const value = Number(normalized);

  return Number.isFinite(value) && value > 0
    ? value
    : null;
}

function findConflictingCounts(
  text: string,
  expected: number
): number[] {
  const claims: number[] = [];

  const patterns = [
    /\b(\d+(?:[.,]5|½)?)\s*[- ]\s*Zimmer(?:[- ](?:Haus|Wohnung|Einfamilienhaus))?\b/giu,
    /\b(?:umfasst|verfügt\s+über|hat)\s+(\d+(?:[.,]5|½)?)\s+Zimmer\b/giu,
    /\bbietet\s+Platz\s+in\s+(\d+(?:[.,]5|½)?)\s+Zimmern\b/giu
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const claimed = parseRoomCount(match[1]);

      if (claimed !== null && claimed !== expected) {
        claims.push(claimed);
      }
    }
  }

  return [...new Set(claims)];
}

export function findRoomCountContradictions(
  expectedRoomValue: string,
  variants: RoomCountVariant[]
): RoomCountIssue[] {
  const expected = parseRoomCount(expectedRoomValue);

  if (expected === null) {
    return [];
  }

  const issues: RoomCountIssue[] = [];

  variants.forEach((variant, variantIndex) => {
    for (const field of ["title", "text"] as const) {
      const claims = findConflictingCounts(
        String(variant[field] ?? ""),
        expected
      );

      for (const claimedRooms of claims) {
        issues.push({
          variantIndex,
          field,
          claimedRooms,
          expectedRooms: expected
        });
      }
    }
  });

  return issues;
}