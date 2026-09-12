"""
generate_pdf.py — Phase 1 helper script.
Converts research_degrees_handbook_source.md → research_degrees_handbook.pdf
Uses fpdf2 (pip install fpdf2).
Run from: corpus/
"""

import sys
import re
from pathlib import Path


def install_and_import():
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fpdf2", "--quiet"])
    from fpdf import FPDF
    return FPDF


def parse_markdown_lines(md_text: str):
    """
    Yields (style, text) tuples where style is one of:
      'h1', 'h2', 'h3', 'bold', 'body', 'blank', 'hr'
    """
    for line in md_text.splitlines():
        stripped = line.rstrip()
        if stripped.startswith("# ") and not stripped.startswith("## "):
            yield ("h1", stripped[2:])
        elif stripped.startswith("## ") and not stripped.startswith("### "):
            yield ("h2", stripped[3:])
        elif stripped.startswith("### "):
            yield ("h3", stripped[4:])
        elif stripped.startswith("---"):
            yield ("hr", "")
        elif stripped == "":
            yield ("blank", "")
        elif re.match(r"^\*\*(.+)\*\*$", stripped):
            yield ("bold", re.match(r"^\*\*(.+)\*\*$", stripped).group(1))
        else:
            # strip inline markdown bold/italic for plain PDF
            clean = re.sub(r"\*\*(.+?)\*\*", r"\1", stripped)
            clean = re.sub(r"\*(.+?)\*", r"\1", clean)
            clean = re.sub(r"`(.+?)`", r"\1", clean)
            yield ("body", clean)


def build_pdf(source_path: Path, output_path: Path):
    try:
        from fpdf import FPDF
    except ImportError:
        FPDF = install_and_import()

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    pdf.set_margins(20, 20, 20)

    md_text = source_path.read_text(encoding="utf-8")

    for style, text in parse_markdown_lines(md_text):
        if style == "h1":
            pdf.set_font("Helvetica", "B", 16)
            pdf.set_text_color(20, 40, 80)
            pdf.ln(4)
            pdf.multi_cell(0, 8, text)
            pdf.ln(3)
        elif style == "h2":
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(30, 60, 120)
            pdf.ln(3)
            pdf.multi_cell(0, 7, text)
            pdf.ln(2)
        elif style == "h3":
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(50, 80, 140)
            pdf.ln(2)
            pdf.multi_cell(0, 6, text)
            pdf.ln(1)
        elif style == "hr":
            pdf.set_draw_color(180, 180, 180)
            pdf.ln(2)
            pdf.line(pdf.get_x(), pdf.get_y(), pdf.get_x() + 170, pdf.get_y())
            pdf.ln(3)
        elif style == "blank":
            pdf.ln(3)
        elif style == "bold":
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(0, 0, 0)
            pdf.multi_cell(0, 5, text)
            pdf.ln(1)
        else:  # body
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(30, 30, 30)
            # handle bullet points
            if text.startswith("- "):
                pdf.set_x(pdf.get_x() + 5)
                pdf.multi_cell(0, 5, "\u2022 " + text[2:])
            else:
                pdf.multi_cell(0, 5, text)

    pdf.output(str(output_path))
    print(f"PDF generated: {output_path} ({output_path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    corpus_dir = Path(__file__).parent
    source = corpus_dir / "research_degrees_handbook_source.md"
    output = corpus_dir / "research_degrees_handbook.pdf"

    if not source.exists():
        print(f"ERROR: Source not found: {source}")
        sys.exit(1)

    build_pdf(source, output)
