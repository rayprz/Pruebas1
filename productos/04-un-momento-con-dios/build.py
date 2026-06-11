"""Genera un-momento-con-dios.pdf."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from comun.constructor import construir  # noqa: E402

if __name__ == "__main__":
    sys.exit(construir(
        Path(__file__).resolve().parent,
        "Un Momento con Dios — El Rincón de la Abuela",
        "un-momento-con-dios.pdf",
    ))
