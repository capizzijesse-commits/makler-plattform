import sharp from "sharp";

export type CollageRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type CollageSplitResult = {
  width: number;
  height: number;
  regions: CollageRegion[];
};

type Axis = "horizontal" | "vertical";

export async function detectCollageRegions(
  source: Buffer
): Promise<CollageSplitResult> {
  const { data, info } = await sharp(source)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  if (
    !width ||
    !height ||
    channels !== 3 ||
    width * height > 12000000
  ) {
    throw new Error("Unsupported collage image.");
  }

  function isWhite(x: number, y: number): boolean {
    const index = (y * width + x) * channels;
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];

    return (
      r >= 229 &&
      g >= 229 &&
      b >= 229 &&
      Math.max(r, g, b) - Math.min(r, g, b) < 27
    );
  }

  function lineScore(
    box: CollageRegion,
    axis: Axis,
    position: number
  ): number {
    let bright = 0;
    let count = 0;

    if (axis === "horizontal") {
      for (
        let x = box.left + 3;
        x < box.left + box.width - 3;
        x += 2
      ) {
        if (isWhite(x, position)) bright++;
        count++;
      }
    } else {
      for (
        let y = box.top + 3;
        y < box.top + box.height - 3;
        y += 2
      ) {
        if (isWhite(position, y)) bright++;
        count++;
      }
    }

    return count > 0 ? bright / count : 0;
  }

  function findSeam(
    box: CollageRegion,
    axis: Axis
  ): { first: number; last: number } | null {
    const horizontal = axis === "horizontal";
    const span = horizontal ? box.height : box.width;
    const offset = horizontal ? box.top : box.left;
    const minChild = horizontal ? 65 : 90;

    if (span < minChild * 2 + 3) return null;

    const scores: Array<{
      relative: number;
      score: number;
    }> = [];

    for (
      let position = minChild;
      position < span - minChild;
      position++
    ) {
      scores.push({
        relative: position,
        score: lineScore(box, axis, offset + position),
      });
    }

    const runs: Array<{
      first: number;
      last: number;
      width: number;
      score: number;
    }> = [];

    let start = -1;

    for (let i = 0; i <= scores.length; i++) {
      const qualifies =
        i < scores.length && scores[i].score >= 0.84;

      if (qualifies && start === -1) {
        start = i;
      }

      if (!qualifies && start !== -1) {
        const segment = scores.slice(start, i);

        if (segment.length >= 2) {
          const first = segment[0].relative;
          const last = segment[segment.length - 1].relative;

          runs.push({
            first,
            last,
            width: last - first + 1,
            score:
              segment.reduce(
                (sum, item) => sum + item.score,
                0
              ) / segment.length,
          });
        }

        start = -1;
      }
    }

    if (!runs.length) return null;

    runs.sort(
      (a, b) =>
        b.score * Math.min(b.width, 8) -
        a.score * Math.min(a.width, 8)
    );

    return {
      first: runs[0].first,
      last: runs[0].last,
    };
  }

  const regions: CollageRegion[] = [];

  function split(box: CollageRegion, depth = 0): void {
    if (depth >= 5 || regions.length >= 12) {
      regions.push(box);
      return;
    }

    for (const axis of ["horizontal", "vertical"] as const) {
      const seam = findSeam(box, axis);
      if (!seam) continue;

      const horizontal = axis === "horizontal";
      const firstSize = seam.first;
      const secondStart = seam.last + 1;
      const dimension = horizontal ? box.height : box.width;
      const secondSize = dimension - secondStart;
      const minimum = horizontal ? 65 : 90;

      if (firstSize < minimum || secondSize < minimum) {
        continue;
      }

      const first: CollageRegion = horizontal
        ? { ...box, height: firstSize }
        : { ...box, width: firstSize };

      const second: CollageRegion = horizontal
        ? {
            ...box,
            top: box.top + secondStart,
            height: secondSize,
          }
        : {
            ...box,
            left: box.left + secondStart,
            width: secondSize,
          };

      split(first, depth + 1);
      split(second, depth + 1);
      return;
    }

    regions.push(box);
  }

  split({ left: 0, top: 0, width, height });

  // Fail closed: do not accept excessive fragmentation.
  if (regions.length > 12) {
    return {
      width,
      height,
      regions: [{ left: 0, top: 0, width, height }],
    };
  }

  return { width, height, regions };
}