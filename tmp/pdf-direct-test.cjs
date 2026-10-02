const fs = require("fs");

(async () => {
  try {
    await import(
      "pdfjs-dist/legacy/build/pdf.worker.mjs"
    );

    const pdfjs = await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

    const file =
      "C:\\Users\\jess_\\Downloads\\1_Dokumentation Terrassenhaus_2017 (1).pdf";

    const buffer = fs.readFileSync(file);

    console.log("PDF BYTES:", buffer.length);
    console.log(
      "WORKER HANDLER:",
      !!globalThis.pdfjsWorker?.WorkerMessageHandler
    );

    const task = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: false,
    });

    const pdf = await task.promise;

    console.log("PDF OPEN OK");
    console.log("PAGES:", pdf.numPages);

    const page = await pdf.getPage(1);
    const ops = await page.getOperatorList();

    const counts = {};

    for (const fn of ops.fnArray) {
      counts[fn] = (counts[fn] || 0) + 1;
    }

    console.log(
      "paintImageXObject:",
      counts[pdfjs.OPS.paintImageXObject] || 0
    );

    console.log(
      "paintInlineImageXObject:",
      counts[pdfjs.OPS.paintInlineImageXObject] || 0
    );

    console.log(
      "paintImageMaskXObject:",
      counts[pdfjs.OPS.paintImageMaskXObject] || 0
    );

    await task.destroy();

    console.log("PDF DIRECT TEST PASS");
  } catch (error) {
    console.error(
      "PDF DIRECT TEST FAILED:",
      error
    );
    process.exit(1);
  }
})();
