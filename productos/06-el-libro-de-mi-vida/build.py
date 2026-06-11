"""Genera el-libro-de-mi-vida.pdf."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from comun.constructor import construir  # noqa: E402

if __name__ == "__main__":
    sys.exit(construir(
        Path(__file__).resolve().parent,
        "El Libro de Mi Vida — El Rincón de la Abuela",
        "el-libro-de-mi-vida.pdf",
    ))
