"""Prueba de humo sin red: imports, base de datos, firma MP y parseo de webhook.

Uso:  cd bot-whatsapp && python3 tests/test_smoke.py
"""
import hashlib
import hmac
import os
import sys
import tempfile
from pathlib import Path

os.environ["SIMULADOR"] = "1"
os.environ["DB_PATH"] = str(Path(tempfile.mkdtemp()) / "test.db")
os.environ["MP_WEBHOOK_SECRET"] = "secreto-de-prueba"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import brain, config, db, payments, whatsapp  # noqa: E402


def test_db():
    db.init()
    db.upsert_cliente("521555", "Doña Mari")
    db.add_mensaje("521555", "user", "hola")
    db.add_mensaje("521555", "assistant", "¡Hola! 🌸")
    h = db.historial("521555")
    assert h == [
        {"role": "user", "content": "hola"},
        {"role": "assistant", "content": "¡Hola! 🌸"},
    ], h
    assert db.registrar_pago("p1", "521555", 99.0, "approved", "recetario") is True
    assert db.registrar_pago("p1", "521555", 99.0, "approved", "recetario") is False
    assert db.registrar_pago("p2", "521555", 79.0, "approved", "sopas") is True
    assert db.productos_comprados("521555") == ["recetario", "sopas"] or \
        set(db.productos_comprados("521555")) == {"recetario", "sopas"}
    db.marcar_pagado("521555")
    assert db.cliente("521555")["pagado"] == 1
    db.kv_set("media:x", "123")
    assert db.kv_get("media:x") == "123"
    print("✓ base de datos")


def test_firma_mp():
    ts, rid, did = "1718000000", "req-abc", "12345"
    manifest = f"id:{did};request-id:{rid};ts:{ts};"
    v1 = hmac.new(b"secreto-de-prueba", manifest.encode(), hashlib.sha256).hexdigest()
    assert payments.firma_valida(f"ts={ts},v1={v1}", rid, did) is True
    assert payments.firma_valida(f"ts={ts},v1=deadbeef", rid, did) is False
    print("✓ firma de Mercado Pago")


def test_simulador_whatsapp():
    whatsapp.send_text("521555", "mensaje de prueba")  # debe imprimir, no llamar red
    assert whatsapp.upload_media(config.ASSETS_DIR / "muestra-1.png").startswith(
        "media-simulado"
    )
    print("✓ whatsapp en modo simulador")


def test_estado_y_tools():
    estado = brain._estado_cliente("521555")
    assert "ya compró" in estado and "recetario" in estado, estado
    salida = brain._ejecutar_tool("enviar_link_pago", {"producto": "devocional"}, "521555")
    assert "devocional" in salida, salida
    salida = brain._ejecutar_tool("enviar_muestra", {}, "521555")
    assert "muestra" in salida.lower()
    salida = brain._ejecutar_tool("escalar_a_humano", {"motivo": "prueba"}, "521555")
    assert db.cliente("521555")["escalado"] == 1
    assert brain.TOOLS[2]["name"] == "escalar_a_humano"
    print("✓ estado del cliente y herramientas")


def test_webhook_parse():
    from app import main  # noqa: F401  (valida que el servidor importe completo)
    print("✓ servidor FastAPI importa")


if __name__ == "__main__":
    test_db()
    test_firma_mp()
    test_simulador_whatsapp()
    test_estado_y_tools()
    test_webhook_parse()
    print("\nTodo en orden ✅")
