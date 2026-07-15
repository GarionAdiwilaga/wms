import os
import re
import sys
import markdown
from weasyprint import HTML, CSS

# Add root folder to sys path if needed
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if os.path.exists("/app/docs"):
    DOCS_DIR = "/app/docs"
else:
    PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DOCS_DIR = os.path.join(PROJECT_ROOT, "docs")

ASSETS_DIR = os.path.join(DOCS_DIR, "assets")

# Base CSS styling optimized for A4 print
DOCUMENT_CSS = """
@page {
    size: A4;
    margin: 20mm 15mm 20mm 15mm;
    @top-right {
        content: "Gudang Piala Kaltim WMS";
        font-family: 'Outfit', 'Inter', sans-serif;
        font-size: 8pt;
        color: #64748b;
    }
    @bottom-left {
        content: "Panduan Operasional & Teknis";
        font-family: 'Outfit', 'Inter', sans-serif;
        font-size: 8pt;
        color: #64748b;
    }
    @bottom-right {
        content: "Halaman " counter(page) " dari " counter(pages);
        font-family: 'Outfit', 'Inter', sans-serif;
        font-size: 8pt;
        color: #64748b;
    }
}

body {
    font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1e293b;
    line-height: 1.6;
    font-size: 11pt;
}

h1.cover-title {
    font-size: 28pt;
    text-align: center;
    margin-top: 60mm;
    margin-bottom: 5mm;
    color: #0f766e;
    font-weight: 800;
    page-break-before: avoid;
}

p.cover-subtitle {
    font-size: 14pt;
    text-align: center;
    color: #475569;
    margin-bottom: 20mm;
}

div.cover-page {
    page-break-after: always;
    height: 100%;
}

h1 {
    font-size: 20pt;
    margin-top: 0;
    margin-bottom: 15pt;
    color: #0f172a;
    page-break-before: always;
    padding-top: 10mm;
}

/* Don't break before first heading after cover */
.content-start h1:first-of-type {
    page-break-before: avoid;
    padding-top: 0;
}

h2 {
    font-size: 14pt;
    margin-top: 25pt;
    margin-bottom: 10pt;
    color: #0f172a;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
    page-break-after: avoid;
}

h3 {
    font-size: 12pt;
    margin-top: 18pt;
    margin-bottom: 8pt;
    color: #1e293b;
    page-break-after: avoid;
}

p {
    margin-bottom: 10pt;
    text-align: justify;
}

ul, ol {
    margin-bottom: 10pt;
    padding-left: 20pt;
}

li {
    margin-bottom: 4pt;
}

code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    background-color: #f1f5f9;
    padding: 2px 4px;
    font-size: 9pt;
    border-radius: 4px;
    color: #0f766e;
}

pre {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 10pt;
    border-radius: 6px;
    margin-bottom: 12pt;
    page-break-inside: avoid;
}

pre code {
    background-color: transparent;
    padding: 0;
    font-size: 8.5pt;
    color: #1e293b;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15pt;
    page-break-inside: avoid;
}

th, td {
    border: 1px solid #cbd5e1;
    padding: 6pt 8pt;
    font-size: 9.5pt;
    text-align: left;
}

th {
    background-color: #f1f5f9;
    font-weight: bold;
    color: #0f172a;
}

tr:nth-child(even) {
    background-color: #f8fafc;
}

img {
    max-width: 100%;
    max-height: 110mm; /* Control image heights for A4 fitting */
    height: auto;
    display: block;
    margin: 15pt auto;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    page-break-inside: avoid;
}

/* Alert Boxes Style */
blockquote {
    padding: 10pt 12pt;
    margin: 0 0 12pt 0;
    border-left: 4px solid #cbd5e1;
    background-color: #f8fafc;
    border-radius: 0 6px 6px 0;
    page-break-inside: avoid;
}

blockquote p {
    margin-bottom: 0;
    font-size: 9.5pt;
}

.alert-note {
    border-left-color: #3b82f6;
    background-color: #eff6ff;
}

.alert-important {
    border-left-color: #8b5cf6;
    background-color: #f5f3ff;
}

.alert-warning {
    border-left-color: #f59e0b;
    background-color: #fffbeb;
}

.alert-tip {
    border-left-color: #10b981;
    background-color: #ecfdf5;
}

.alert-caution {
    border-left-color: #ef4444;
    background-color: #fef2f2;
}
"""

def parse_markdown_to_html(md_content, base_path):
    # 1. Clean up GFM alert headers inside blockquotes
    # > [!NOTE] -> <blockquote class="alert-note">
    def repl_blockquote(match):
        bq_text = match.group(1)
        alert_class = "alert-normal"
        for alert_type in ["note", "important", "warning", "tip", "caution"]:
            flag = f"[!{alert_type.upper()}]"
            if flag in bq_text:
                alert_class = f"alert-{alert_type}"
                bq_text = bq_text.replace(flag, "").strip()
                break
        return f'<blockquote class="{alert_class}">\n{bq_text}\n</blockquote>'
    
    # Simple blockquote parser to identify alert blocks
    # We find matching consecutive blockquote lines
    lines = md_content.split("\n")
    new_lines = []
    in_bq = False
    bq_buf = []
    
    for line in lines:
        if line.strip().startswith(">"):
            in_bq = True
            bq_buf.append(line.strip().lstrip(">").strip())
        else:
            if in_bq:
                # Flush blockquote
                content = "\n".join(bq_buf)
                # Check for Alert types
                alert_class = ""
                for alert_type in ["note", "important", "warning", "tip", "caution"]:
                    flag = f"[!{alert_type.upper()}]"
                    if flag in content:
                        alert_class = f"alert-{alert_type}"
                        content = content.replace(flag, "").strip()
                        break
                if alert_class:
                    new_lines.append(f'<blockquote class="{alert_class}"><p>{content}</p></blockquote>')
                else:
                    new_lines.append(f'<blockquote><p>{content}</p></blockquote>')
                bq_buf = []
                in_bq = False
            new_lines.append(line)
            
    if in_bq:
        content = "\n".join(bq_buf)
        alert_class = ""
        for alert_type in ["note", "important", "warning", "tip", "caution"]:
            flag = f"[!{alert_type.upper()}]"
            if flag in content:
                alert_class = f"alert-{alert_type}"
                content = content.replace(flag, "").strip()
                break
        if alert_class:
            new_lines.append(f'<blockquote class="{alert_class}"><p>{content}</p></blockquote>')
        else:
            new_lines.append(f'<blockquote><p>{content}</p></blockquote>')

    md_content = "\n".join(new_lines)

    # 2. Rewrite image links to use absolute file paths so WeasyPrint can resolve them locally
    # e.g., ../assets/dashboard.png -> /opt/wms/docs/assets/dashboard.png
    def repl_img(match):
        alt = match.group(1)
        rel_path = match.group(2)
        # Normalize relative path
        abs_img_path = os.path.abspath(os.path.join(base_path, rel_path))
        return f"![{alt}](file://{abs_img_path})"
        
    md_content = re.sub(r'!\[(.*?)\]\((.*?)\)', repl_img, md_content)

    # 3. Rewrite internal links between documents
    # Replace [01_login_password.md](./01_login_password.md) -> <a href="#01-login-password">
    # (or simply remove them or make them styled bold tags since it is compiled to a single PDF anyway)
    # We will convert it to internal section references
    def repl_link(match):
        text = match.group(1)
        link = match.group(2)
        if link.endswith(".md"):
            anchor_name = os.path.basename(link).replace(".md", "").lower()
            return f"[{text}](#{anchor_name})"
        return f"[{text}]({link})"
        
    md_content = re.sub(r'\[(.*?)\]\((.*?)\)', repl_link, md_content)

    # 4. Render markdown
    html = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])
    return html

def compile_pdf(title, subtitle, files, output_path, folder_path):
    print(f"Compiling PDF: {title} -> {output_path}")
    
    # 1. Create cover page
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{title}</title>
</head>
<body>
    <div class="cover-page">
        <h1 class="cover-title">{title}</h1>
        <p class="cover-subtitle">{subtitle}</p>
        <div style="text-align: center; margin-top: 40mm; font-size: 10pt; color: #64748b;">
            <p>Gudang Piala Kaltim WMS</p>
            <p>Situs Operasional: wms.rionlab.space</p>
            <p>Tanggal Diterbitkan: 13 Juli 2026</p>
            <p>Versi: 1.0.0 (rc1)</p>
        </div>
    </div>
    <div class="content-start">
"""

    # 2. Read and append files
    for filepath in files:
        base_name = os.path.basename(filepath).replace(".md", "")
        # Add an anchor wrapper so internal links redirect to the correct page start
        html_content += f'\n<div id="{base_name.lower()}">\n'
        
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Parse and convert
        file_html = parse_markdown_to_html(content, os.path.dirname(filepath))
        html_content += file_html
        html_content += "\n</div>\n"

    html_content += """
    </div>
</body>
</html>
"""

    # Compile using WeasyPrint
    HTML(string=html_content).write_pdf(
        output_path,
        stylesheets=[CSS(string=DOCUMENT_CSS)]
    )
    print(f"Successfully compiled: {output_path}")

def main():
    # User Manual files list in order
    user_files = [
        os.path.join(DOCS_DIR, "user", "README.md"),
        os.path.join(DOCS_DIR, "user", "01_login_password.md"),
        os.path.join(DOCS_DIR, "user", "02_dashboard.md"),
        os.path.join(DOCS_DIR, "user", "03_master_data.md"),
        os.path.join(DOCS_DIR, "user", "04_stock_in.md"),
        os.path.join(DOCS_DIR, "user", "05_outbound_cart.md"),
        os.path.join(DOCS_DIR, "user", "06_branch_transfers.md"),
        os.path.join(DOCS_DIR, "user", "07_stock_opname.md"),
        os.path.join(DOCS_DIR, "user", "08_reports_analytics.md"),
        os.path.join(DOCS_DIR, "user", "09_audit_logs.md"),
    ]

    # Server Guide files list in order
    server_files = [
        os.path.join(DOCS_DIR, "server", "README.md"),
        os.path.join(DOCS_DIR, "server", "01_architecture.md"),
        os.path.join(DOCS_DIR, "server", "02_setup.md"),
        os.path.join(DOCS_DIR, "server", "03_maintenance.md"),
        os.path.join(DOCS_DIR, "server", "04_backup_recovery.md"),
        os.path.join(DOCS_DIR, "server", "05_system_updates.md"),
        os.path.join(DOCS_DIR, "server", "06_troubleshooting.md"),
    ]

    # Target output paths
    user_pdf_output = os.path.join(DOCS_DIR, "PANDUAN_PENGGUNA.pdf")
    server_pdf_output = os.path.join(DOCS_DIR, "PANDUAN_SERVER.pdf")

    # Compile User Manual
    compile_pdf(
        "Panduan Pengguna (User Manual)",
        "Gudang Piala Kaltim Warehouse Management System (WMS)",
        user_files,
        user_pdf_output,
        os.path.join(DOCS_DIR, "user")
    )

    # Compile Server Manual
    compile_pdf(
        "Panduan Server & Maintenance",
        "Gudang Piala Kaltim Warehouse Management System (WMS)",
        server_files,
        server_pdf_output,
        os.path.join(DOCS_DIR, "server")
    )

if __name__ == "__main__":
    main()
