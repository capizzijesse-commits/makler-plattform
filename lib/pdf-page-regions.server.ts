import sharp from "sharp";

export type PageImageRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export async function detectPageImageRegions(
  source: Buffer
): Promise<PageImageRegion[]> {
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
    throw new Error("Unsupported PDF page image.");
  }

  const tile = 8;
  const cols = Math.floor(width / tile);
  const rows = Math.floor(height / tile);
  const total = cols * rows;

  const mask = new Uint8Array(total);

  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      let sum = 0;
      let sumSq = 0;
      let colored = 0;
      let dark = 0;
      let count = 0;

      for (let dy = 0; dy < tile; dy += 2) {
        for (let dx = 0; dx < tile; dx += 2) {
          const x = tx * tile + dx;
          const y = ty * tile + dy;
          const i = (y * width + x) * channels;

          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const gray = (r + g + b) / 3;
          const spread =
            Math.max(r, g, b) - Math.min(r, g, b);

          sum += gray;
          sumSq += gray * gray;

          if (spread > 24 && gray < 245) colored++;
          if (gray < 95) dark++;
          count++;
        }
      }

      const variance =
        sumSq / count - (sum / count) ** 2;

      if (
        (colored >= 4 && variance > 60) ||
        colored >= 7 ||
        (variance > 850 && dark >= 2 && dark <= 12)
      ) {
        mask[ty * cols + tx] = 1;
      }
    }
  }

  const visited = new Uint8Array(total);
  const results: PageImageRegion[] = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const start = y * cols + x;

      if (!mask[start] || visited[start]) {
        continue;
      }

      const queue: number[] = [start];
      visited[start] = 1;

      let head = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let size = 0;

      while (head < queue.length) {
        const index = queue[head++];
        const cx = index % cols;
        const cy = Math.floor(index / cols);

        size++;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        for (const [dx, dy] of [
          [-1, 0], [1, 0], [0, -1], [0, 1],
        ]) {
          const nx = cx + dx;
          const ny = cy + dy;

          if (
            nx < 0 ||
            ny < 0 ||
            nx >= cols ||
            ny >= rows
          ) {
            continue;
          }

          const next = ny * cols + nx;

          // T179B_BOUNDED_QUEUE:
          // Nur aktive, noch nicht besuchte Kacheln.
          if (mask[next] && !visited[next]) {
            visited[next] = 1;
            queue.push(next);
          }
        }

        if (queue.length > total) {
          throw new Error("Page region queue overflow.");
        }
      }

      const regionWidth = (maxX - minX + 1) * tile;
      const regionHeight = (maxY - minY + 1) * tile;

      if (
        regionWidth >= 90 &&
        regionHeight >= 75 &&
        size >= 60 &&
        regionWidth * regionHeight >= 12000
      ) {
        results.push({
          left: minX * tile,
          top: minY * tile,
          width: regionWidth,
          height: regionHeight,
        });
      }
    }
  }

  results.sort(
    (a, b) => a.top - b.top || a.left - b.left
  );

  if (results.length > 20) {
    throw new Error("Too many page regions.");
  }

  return results;
}