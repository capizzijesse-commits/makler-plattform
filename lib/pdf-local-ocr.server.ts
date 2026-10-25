import { execFile } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { parseTesseractTsv } from "./pdf-document-evidence";
export async function recognisePdfPageLocally(png: Buffer, width: number, height: number, options: { segmentation?:3|6 } = {}) {
  if(options.segmentation!==undefined && ![3,6].includes(options.segmentation)) throw new Error("PDF_OCR_SEGMENTATION_INVALID");
  const executable = process.env.IA_LOCAL_TESSERACT_PATH;
  if (!executable || !isAbsolute(executable)) throw new Error("PDF_LOCAL_OCR_UNAVAILABLE");
  const dir = await mkdtemp(join(tmpdir(), "inserat-pdf-ocr-"));
  try {
    const input = join(dir, "page.png"); await writeFile(input, png, { mode:0o600 });
    const tsv = await new Promise<string>((resolve, reject) => {
      execFile(executable, [input, "stdout", "-l", "deu+eng", "--psm", String(options.segmentation ?? 3), "tsv"],
        { timeout:25000, maxBuffer:4_000_000, windowsHide:true, encoding:"utf8" },
        (error, stdout) => error ? reject(new Error("PDF_LOCAL_OCR_FAILED")) : resolve(stdout));
    });
    return parseTesseractTsv(tsv, width, height);
  } finally { await rm(dir, { recursive:true, force:true }); }
}
