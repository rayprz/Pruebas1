"""Constructor compartido: concatena los fragmentos HTML de src/ y genera el PDF."""
import sys
from pathlib import Path

HEAD = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{titulo}</title>
<link rel="stylesheet" href="../../comun/base.css">
<link rel="stylesheet" href="estilo.css">
</head>
<body>
"""


def construir(carpeta: Path, titulo: str, salida: str) -> int:
    src = carpeta / "src"
    fragmentos = sorted(src.glob("[0-9]*.html"))
    if not fragmentos:
        print(f"No hay fragmentos en {src}", file=sys.stderr)
        return 1

    html = (HEAD.format(titulo=titulo)
            + "\n".join(f.read_text(encoding="utf-8") for f in fragmentos)
            + "\n</body>\n</html>\n")
    libro = src / "_libro.html"
    libro.write_text(html, encoding="utf-8")

    from weasyprint import HTML

    doc = HTML(filename=str(libro)).render()
    pdf = carpeta / salida
    doc.write_pdf(str(pdf))
    print(f"OK: {pdf.name} generado con {len(doc.pages)} páginas.")
    return 0
