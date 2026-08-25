import os
import sys
import time
import subprocess
from pathlib import Path

def create_html_and_pdf():
    project_root = Path(__file__).resolve().parents[1]
    md_file = project_root / "docs" / "TECHNICAL_ARCHITECTURE.md"
    html_file = project_root / "docs" / "TECHNICAL_ARCHITECTURE.html"
    pdf_file = project_root / "docs" / "TECHNICAL_ARCHITECTURE.pdf"

    if not md_file.exists():
        print(f"Error: {md_file} not found.")
        return

    md_content = md_file.read_text(encoding="utf-8")

    # Escape backticks and backslashes for JS template literal
    escaped_md = md_content.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DECC Review Portal — Technical Architecture & Implementation Document</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  
  <!-- Marked & Mermaid CDN -->
  <script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>

  <style>
    :root {{
      --navy: #0A2540;
      --navy-dark: #071A2B;
      --gold: #C59B27;
      --gold-light: #FFFBEB;
      --gold-border: #FDE68A;
      --slate-50: #F8FAFC;
      --slate-100: #F1F5F9;
      --slate-200: #E2E8F0;
      --slate-300: #CBD5E1;
      --slate-600: #475569;
      --slate-700: #334155;
      --slate-900: #0F172A;
      --green: #15803D;
      --green-bg: #DCFCE7;
      --red: #DC2626;
      --red-bg: #FEF2F2;
    }}

    * {{
      box-sizing: border-box;
    }}

    body {{
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.65;
      color: var(--slate-900);
      background-color: var(--slate-50);
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}

    /* Top Action Bar (hidden in print) */
    .top-action-bar {{
      position: sticky;
      top: 0;
      background: var(--navy);
      color: white;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.15);
    }}
    .top-action-bar h1 {{
      font-size: 15px;
      font-weight: 700;
      margin: 0;
      color: white;
      letter-spacing: 0.5px;
      border: none;
      padding: 0;
    }}
    .btn-print {{
      background: var(--gold);
      color: var(--navy-dark);
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }}
    .btn-print:hover {{
      background: #dfb234;
      transform: translateY(-1px);
    }}

    .container {{
      max-width: 960px;
      margin: 32px auto 64px;
      background: white;
      padding: 48px 64px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(10, 37, 64, 0.06);
      border: 1px solid var(--slate-200);
    }}

    /* Typography & Headings */
    h1, h2, h3, h4, h5, h6 {{
      color: var(--navy);
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-top: 1.8em;
      margin-bottom: 0.6em;
      page-break-after: avoid;
      break-after: avoid;
    }}
    h1 {{
      font-size: 26px;
      border-bottom: 2px solid var(--slate-200);
      padding-bottom: 10px;
      margin-top: 1.2em;
    }}
    h2 {{
      font-size: 20px;
      border-bottom: 1px solid var(--slate-200);
      padding-bottom: 8px;
    }}
    h3 {{
      font-size: 16px;
      font-weight: 700;
    }}
    h4 {{
      font-size: 14px;
      font-weight: 700;
    }}

    p, li {{
      color: #334155;
      font-size: 13.5px;
    }}

    a {{
      color: #0A2540;
      text-decoration: underline;
      font-weight: 600;
    }}

    code {{
      font-family: 'JetBrains Mono', monospace;
      background: #F1F5F9;
      color: #0A2540;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      border: 1px solid #E2E8F0;
    }}

    pre {{
      background: #071A2B;
      color: #E2E8F0;
      padding: 16px;
      border-radius: 10px;
      overflow-x: auto;
      font-size: 12px;
      border: 1px solid #1E293B;
      page-break-inside: avoid;
      break-inside: avoid;
    }}
    pre code {{
      background: transparent;
      color: inherit;
      padding: 0;
      border: none;
    }}

    /* Tables */
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 12.5px;
      page-break-inside: avoid;
      break-inside: avoid;
      border: 1px solid var(--slate-200);
      border-radius: 8px;
      overflow: hidden;
    }}
    th, td {{
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid var(--slate-200);
      vertical-align: top;
    }}
    th {{
      background: var(--navy);
      color: white;
      font-weight: 700;
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    tr:nth-child(even) {{
      background: #F8FAFC;
    }}
    tr:hover {{
      background: #F1F5F9;
    }}

    /* Blockquotes */
    blockquote {{
      margin: 16px 0;
      padding: 12px 20px;
      background: var(--gold-light);
      border-left: 4px solid var(--gold);
      border-radius: 0 8px 8px 0;
      color: #78350F;
      font-size: 13px;
      page-break-inside: avoid;
    }}

    /* Mermaid Diagrams Styling */
    .mermaid-container {{
      background: #FFFFFF;
      border: 1px solid var(--slate-200);
      border-radius: 12px;
      padding: 24px 16px;
      margin: 24px 0;
      display: flex;
      justify-content: center;
      align-items: center;
      page-break-inside: avoid;
      break-inside: avoid;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
      overflow-x: auto;
    }}
    .mermaid {{
      text-align: center;
      width: 100%;
    }}
    .mermaid svg {{
      max-width: 100% !important;
      height: auto !important;
    }}

    hr {{
      border: none;
      border-top: 1px solid var(--slate-200);
      margin: 32px 0;
    }}

    /* Print Optimizations */
    @media print {{
      body {{
        background: white;
        font-size: 11pt;
      }}
      .top-action-bar {{
        display: none !important;
      }}
      .container {{
        max-width: 100%;
        margin: 0;
        padding: 0;
        border: none;
        box-shadow: none;
        border-radius: 0;
      }}
      @page {{
        size: A4 portrait;
        margin: 15mm 15mm 15mm 15mm;
      }}
      h1, h2, h3, h4 {{
        page-break-after: avoid;
        break-after: avoid;
      }}
      .mermaid-container, table, pre, blockquote {{
        page-break-inside: avoid;
        break-inside: avoid;
      }}
      .mermaid svg {{
        max-width: 100% !important;
      }}
    }}
  </style>
</head>
<body>

  <!-- Top Action Bar -->
  <div class="top-action-bar">
    <h1>🏛️ Directorate of Environment & Climate Change — Technical Architecture Document</h1>
    <button class="btn-print" onclick="window.print()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Print to PDF
    </button>
  </div>

  <div class="container">
    <div id="content">Loading documentation...</div>
  </div>

  <script>
    const rawMarkdown = `{escaped_md}`;

    // Custom marked renderer to intercept mermaid code blocks
    const renderer = new marked.Renderer();
    const originalCode = renderer.code.bind(renderer);

    renderer.code = function(code, language, isEscaped) {{
      if (typeof code === 'object') {{
        language = code.lang;
        code = code.text;
      }}
      if (language === 'mermaid') {{
        return `<div class="mermaid-container"><div class="mermaid">${{code}}</div></div>`;
      }}
      return originalCode(code, language, isEscaped);
    }};

    marked.setOptions({{
      renderer: renderer,
      gfm: true,
      breaks: false,
    }});

    // Render markdown to HTML
    document.getElementById('content').innerHTML = marked.parse(rawMarkdown);

    // Initialize Mermaid
    mermaid.initialize({{
      startOnLoad: false,
      theme: 'neutral',
      themeVariables: {{
        primaryColor: '#0A2540',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#C59B27',
        lineColor: '#0A2540',
        secondaryColor: '#FFFBEB',
        tertiaryColor: '#F8FAFC',
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif'
      }},
      securityLevel: 'loose',
      flowchart: {{
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }}
    }});

    // Run Mermaid rendering
    async function renderMermaidDiagrams() {{
      try {{
        await mermaid.run({{
          nodes: document.querySelectorAll('.mermaid')
        }});
        console.log('All Mermaid diagrams successfully rendered!');
        window.__MERMAID_DONE = true;
      }} catch (err) {{
        console.error('Mermaid render error:', err);
        window.__MERMAID_DONE = true;
      }}
    }}

    renderMermaidDiagrams();
  </script>
</body>
</html>
"""

    html_file.write_text(html_template, encoding="utf-8")
    print(f"Generated standalone HTML: {html_file}")

    # Generate PDF using Microsoft Edge / Chrome in headless mode
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]

    edge_bin = None
    for p in edge_paths:
        if os.path.exists(p):
            edge_bin = p
            break

    if edge_bin:
        print(f"Using browser executable: {edge_bin}")
        cmd = [
            edge_bin,
            "--headless=new",
            "--disable-gpu",
            "--no-pdf-header-footer",
            "--run-all-compositor-stages-before-draw",
            f"--print-to-pdf={str(pdf_file)}",
            str(html_file.as_uri())
        ]
        try:
            print("Rendering PDF with full Mermaid diagrams...")
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if pdf_file.exists() and pdf_file.stat().st_size > 1000:
                print(f"Successfully created PDF: {pdf_file} ({round(pdf_file.stat().st_size / 1024, 1)} KB)")
            else:
                print("PDF generation completed. File:", pdf_file)
        except Exception as e:
            print(f"Browser PDF export note: {e}")
    else:
        print("Edge/Chrome executable not located. The standalone HTML file can be opened and printed to PDF directly via any browser.")

if __name__ == "__main__":
    create_html_and_pdf()
