"""Chat de prueba en la terminal, sin WhatsApp ni Mercado Pago.

Uso (necesitas tu ANTHROPIC_API_KEY):
    cd bot-whatsapp
    export ANTHROPIC_API_KEY=sk-ant-...
    python3 -m app.simulador
"""
import os

os.environ["SIMULADOR"] = "1"
os.environ.setdefault("DB_PATH", "/tmp/rincon-simulador.db")

from . import brain, db  # noqa: E402 (el entorno debe fijarse antes de importar)

WA_ID_PRUEBA = "5215500000000"


def main() -> None:
    db.init()
    db.upsert_cliente(WA_ID_PRUEBA, "Clienta de Prueba")
    print("🌸 Simulador de El Rincón de la Abuela — escribe como si fueras la clienta.")
    print("   (Ctrl+C o 'salir' para terminar)\n")
    while True:
        try:
            texto = input("Clienta: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n¡Adiós!")
            break
        if not texto or texto.lower() in {"salir", "exit"}:
            break
        brain.responder(WA_ID_PRUEBA, texto)


if __name__ == "__main__":
    main()
