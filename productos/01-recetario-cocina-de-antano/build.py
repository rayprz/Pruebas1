#!/usr/bin/env python3
"""Genera recetario.pdf a partir de los fragmentos HTML de src/.

Uso: python3 build.py
Requiere: pip install weasyprint
"""
import sys
from pathlib import Path

BASE = Path(__file__).parent
SRC = BASE / "src"

HEADER = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>La Cocina de Antaño — El Rincón de la Abuela</title>
<link rel="stylesheet" href="estilo.css">
</head>
<body>
"""

FOOTER = "</body>\n</html>\n"


def main() -> int:
    fragmentos = sorted(SRC.glob("[0-9]*.html"))
    if not fragmentos:
        print("No hay fragmentos en src/", file=sys.stderr)
        return 1

    html = HEADER + "\n".join(f.read_text(encoding="utf-8") for f in fragmentos) + FOOTER
    salida_html = SRC / "recetario.html"
    salida_html.write_text(html, encoding="utf-8")

    from weasyprint import HTML

    pdf = BASE / "recetario.pdf"
    doc = HTML(filename=str(salida_html)).render()
    doc.write_pdf(str(pdf))
    print(f"OK: {pdf.name} generado con {len(doc.pages)} páginas "
          f"a partir de {len(fragmentos)} fragmentos.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
