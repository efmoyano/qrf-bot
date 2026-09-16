import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

async function main() {
  console.log("1. Reading README.md...");
  const readmeContent = fs.readFileSync("README.md", "utf8");

  console.log("2. Fetching marked parser...");
  const markedRes = await fetch("https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js");
  const markedJs = await markedRes.text();

  const tempMarkedPath = path.resolve("scripts/temp-marked.mjs");
  fs.writeFileSync(tempMarkedPath, markedJs, "utf8");

  const { marked } = await import("./temp-marked.mjs");
  fs.unlinkSync(tempMarkedPath);

  console.log("3. Converting Markdown to HTML...");
  let htmlBody = marked.parse(readmeContent);

  // Convert GitHub alerts (> [!NOTE] etc.) to styled alert boxes
  htmlBody = htmlBody.replace(
    /<blockquote>\s*<p>\[!NOTE\]([\s\S]*?)<\/blockquote>/g,
    `<div class="alert alert-note"><div class="alert-title">ℹ️ Note</div><p>$1</div>`,
  );
  htmlBody = htmlBody.replace(
    /<blockquote>\s*<p>\[!TIP\]([\s\S]*?)<\/blockquote>/g,
    `<div class="alert alert-tip"><div class="alert-title">💡 Tip</div><p>$1</div>`,
  );
  htmlBody = htmlBody.replace(
    /<blockquote>\s*<p>\[!IMPORTANT\]([\s\S]*?)<\/blockquote>/g,
    `<div class="alert alert-important"><div class="alert-title">⚠️ Important</div><p>$1</div>`,
  );

  const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Last War Discord Bot — Battlefield Coordinator Guide</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      // Find code blocks with class language-mermaid and replace them with div.mermaid
      document.querySelectorAll("pre code.language-mermaid").forEach(function(code) {
        const pre = code.parentElement;
        const div = document.createElement("div");
        div.className = "mermaid";
        div.textContent = code.textContent;
        pre.parentNode.replaceChild(div, pre);
      });

      mermaid.initialize({
        startOnLoad: true,
        theme: 'neutral',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        }
      });
    });
  </script>
  <style>
    @page {
      size: A4;
      margin: 16mm 14mm 16mm 14mm;
      @bottom-right {
        content: counter(page);
      }
    }
    
    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 12.5px;
      line-height: 1.55;
      color: #1f2328;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }

    h1, h2, h3, h4, h5, h6 {
      color: #0f172a;
      font-weight: 700;
      line-height: 1.25;
      margin-top: 24px;
      margin-bottom: 10px;
      page-break-after: avoid;
      break-after: avoid;
    }

    h1 {
      font-size: 24px;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 8px;
      margin-top: 0;
      color: #1d4ed8;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h2 {
      font-size: 16.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
      margin-top: 24px;
      color: #1e293b;
    }

    h3 {
      font-size: 14px;
      margin-top: 18px;
      color: #334155;
    }

    h4 {
      font-size: 13px;
      color: #475569;
      margin-top: 14px;
    }

    p, ul, ol {
      margin-top: 0;
      margin-bottom: 10px;
    }

    ul, ol {
      padding-left: 20px;
    }

    li {
      margin-bottom: 3px;
    }

    blockquote {
      margin: 12px 0;
      padding: 8px 14px;
      color: #475569;
      background-color: #f8fafc;
      border-left: 4px solid #3b82f6;
      border-radius: 0 6px 6px 0;
      font-size: 12px;
    }

    blockquote p {
      margin-bottom: 0;
    }

    .alert {
      margin: 14px 0;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.45;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .alert-title {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .alert-note {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      color: #1e40af;
    }

    .alert-tip {
      background-color: #f0fdf4;
      border-left: 4px solid #22c55e;
      color: #166534;
    }

    .alert-important {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      color: #92400e;
    }

    code {
      font-family: 'JetBrains Mono', SFMono-Regular, Consolas, Menlo, monospace;
      font-size: 11px;
      padding: 2px 5px;
      background-color: #f1f5f9;
      border-radius: 4px;
      color: #0369a1;
    }

    pre {
      font-family: 'JetBrains Mono', SFMono-Regular, Consolas, Menlo, monospace;
      font-size: 11px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      overflow-x: auto;
      line-height: 1.4;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    pre code {
      padding: 0;
      background-color: transparent;
      color: #0f172a;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 11.5px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    th, td {
      padding: 6px 10px;
      border: 1px solid #cbd5e1;
      text-align: left;
      vertical-align: top;
    }

    th {
      background-color: #f1f5f9;
      font-weight: 600;
      color: #0f172a;
    }

    tr:nth-child(even) {
      background-color: #f8fafc;
    }

    hr {
      height: 1px;
      background-color: #e2e8f0;
      border: none;
      margin: 20px 0;
    }

    .mermaid {
      margin: 16px 0;
      display: flex;
      justify-content: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .mermaid svg {
      max-width: 95%;
      height: auto;
    }

    a {
      color: #2563eb;
      text-decoration: none;
    }

    /* Print specific tweaks */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page-break {
        page-break-before: always;
        break-before: page;
      }
    }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`;

  const tmpHtml = path.resolve("README_temp.html");
  const outputPdf = path.resolve("Last_War_Battlefield_Coordinator_Guide.pdf");

  fs.writeFileSync(tmpHtml, htmlDoc, "utf8");
  console.log("4. Temporary HTML generated at", tmpHtml);

  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  console.log("5. Generating PDF with Google Chrome (Headless)...");

  // Run Chrome with virtual-time-budget so Mermaid JS finishes rendering SVG diagrams before print
  const cmd = `"${chromePath}" --headless=new --disable-gpu --virtual-time-budget=4000 --print-to-pdf="${outputPdf}" --no-pdf-header-footer "file://${tmpHtml}"`;
  execSync(cmd, { stdio: "inherit" });

  fs.unlinkSync(tmpHtml);
  console.log("\n🎉 PDF Generation Complete!");
  console.log("File saved to:", outputPdf);
  const stats = fs.statSync(outputPdf);
  console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("Error generating PDF:", err);
  process.exit(1);
});
