"""Genera sopas-de-letras.pdf (corre primero generador.py si cambias temas)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from comun.constructor import construir  # noqa: E402

if __name__ == "__main__":
    sys.exit(construir(
        Path(__file__).resolve().parent,
        "Sopas de Letras Gigantes — El Rincón de la Abuela",
        "sopas-de-letras.pdf",
    ))
