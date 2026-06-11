"""Persistencia en SQLite: clientes, conversaciones, pagos y caché simple."""
import sqlite3
import time

from . import config


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(config.DB_PATH, timeout=15)
    c.row_factory = sqlite3.Row
    return c


def init() -> None:
    with _conn() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS clientes(
            wa_id    TEXT PRIMARY KEY,
            nombre   TEXT DEFAULT '',
            pagado   INTEGER DEFAULT 0,
            escalado INTEGER DEFAULT 0,
            creado   REAL,
            actualizado REAL
        );
        CREATE TABLE IF NOT EXISTS mensajes(
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            wa_id     TEXT,
            rol       TEXT,        -- 'user' o 'assistant'
            contenido TEXT,
            ts        REAL
        );
        CREATE TABLE IF NOT EXISTS pagos(
            payment_id TEXT PRIMARY KEY,
            wa_id      TEXT,
            monto      REAL,
            estado     TEXT,
            entregado  INTEGER DEFAULT 0,
            ts         REAL
        );
        CREATE TABLE IF NOT EXISTS kv(
            k TEXT PRIMARY KEY,
            v TEXT
        );
        """)


def upsert_cliente(wa_id: str, nombre: str = "") -> None:
    ahora = time.time()
    with _conn() as c:
        c.execute(
            """INSERT INTO clientes(wa_id, nombre, creado, actualizado)
               VALUES(?,?,?,?)
               ON CONFLICT(wa_id) DO UPDATE SET
                 actualizado=excluded.actualizado,
                 nombre=CASE WHEN excluded.nombre!='' THEN excluded.nombre
                             ELSE clientes.nombre END""",
            (wa_id, nombre, ahora, ahora),
        )


def cliente(wa_id: str):
    with _conn() as c:
        return c.execute("SELECT * FROM clientes WHERE wa_id=?", (wa_id,)).fetchone()


def marcar_pagado(wa_id: str) -> None:
    with _conn() as c:
        c.execute("UPDATE clientes SET pagado=1 WHERE wa_id=?", (wa_id,))


def marcar_escalado(wa_id: str, valor: int = 1) -> None:
    upsert_cliente(wa_id)
    with _conn() as c:
        c.execute("UPDATE clientes SET escalado=? WHERE wa_id=?", (valor, wa_id))


def add_mensaje(wa_id: str, rol: str, contenido: str) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO mensajes(wa_id, rol, contenido, ts) VALUES(?,?,?,?)",
            (wa_id, rol, contenido, time.time()),
        )


def historial(wa_id: str, limite: int = 20) -> list[dict]:
    """Últimos mensajes en formato para la API de Claude (solo texto)."""
    with _conn() as c:
        filas = c.execute(
            "SELECT rol, contenido FROM mensajes WHERE wa_id=? ORDER BY id DESC LIMIT ?",
            (wa_id, limite),
        ).fetchall()
    return [{"role": f["rol"], "content": f["contenido"]} for f in reversed(filas)]


def registrar_pago(payment_id: str, wa_id: str, monto: float, estado: str) -> bool:
    """Devuelve True si el pago es nuevo (no se había registrado)."""
    with _conn() as c:
        try:
            c.execute(
                "INSERT INTO pagos(payment_id, wa_id, monto, estado, ts) VALUES(?,?,?,?,?)",
                (payment_id, wa_id, monto, estado, time.time()),
            )
            return True
        except sqlite3.IntegrityError:
            return False


def pago_entregado(payment_id: str) -> None:
    with _conn() as c:
        c.execute("UPDATE pagos SET entregado=1 WHERE payment_id=?", (payment_id,))


def kv_get(k: str) -> str | None:
    with _conn() as c:
        fila = c.execute("SELECT v FROM kv WHERE k=?", (k,)).fetchone()
    return fila["v"] if fila else None


def kv_set(k: str, v: str) -> None:
    with _conn() as c:
        c.execute(
            "INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v",
            (k, v),
        )
