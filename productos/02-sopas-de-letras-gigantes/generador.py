"""Generador de las 100 sopas de letras (letra gigante) y sus soluciones.

Crea src/02-puzzles.html y src/03-soluciones.html. Es determinista (semilla
fija): regenerar produce el mismo libro. Uso: python3 generador.py
"""
import random
import unicodedata
from pathlib import Path

random.seed(20260611)

SRC = Path(__file__).parent / "src"
TAM = 13          # cuadrícula 13 x 13
POR_PUZZLE = 10   # palabras por sopa
TOTAL = 100

# Letras de relleno con frecuencia parecida al español
RELLENO = "EEEEEAAAAAOOOOSSSSNNNRRRIIIDDLLLCCTTUUUMMPPBGVYQHFZJÑ"

TEMAS = {
    "En la cocina": [
        "CAZUELA", "COMAL", "MOLCAJETE", "SARTEN", "OLLA", "CUCHARON",
        "JARRO", "METATE", "TORTILLA", "FRIJOLES", "CALDO", "SAZON",
        "MANTECA", "EPAZOTE", "CANELA", "PILONCILLO", "MASA", "NIXTAMAL",
        "ANAFRE", "MOLINILLO", "SERVILLETA", "RECETA",
    ],
    "Frutas del mercado": [
        "MANGO", "GUAYABA", "PAPAYA", "SANDIA", "MELON", "TUNA", "MAMEY",
        "PLATANO", "NARANJA", "LIMA", "LIMON", "TEJOCOTE", "CAPULIN",
        "GRANADA", "ZAPOTE", "PERON", "MEMBRILLO", "CIRUELA", "GUANABANA",
        "PITAYA", "NANCHE", "TAMARINDO",
    ],
    "Flores de mi jardín": [
        "ROSA", "BUGAMBILIA", "CEMPASUCHIL", "GERANIO", "MARGARITA",
        "GARDENIA", "AZUCENA", "NARDO", "JAZMIN", "DALIA", "ALCATRAZ",
        "NOCHEBUENA", "VIOLETA", "GIRASOL", "CLAVEL", "ORQUIDEA",
        "HORTENSIA", "MALVON", "LAVANDA", "AMAPOLA",
    ],
    "Oficios de antes": [
        "PANADERO", "HERRERO", "CARPINTERO", "COSTURERA", "ZAPATERO",
        "PARTERA", "BOLERO", "AFILADOR", "TENDERO", "LECHERO", "PELUQUERO",
        "ALBANIL", "CAMPESINO", "MAESTRA", "BORDADORA", "CARTERO",
        "RELOJERO", "JARDINERO", "SOMBRERERO", "TELEGRAFISTA",
    ],
    "La familia": [
        "ABUELA", "ABUELO", "NIETOS", "HIJOS", "MAMA", "PAPA", "TIA",
        "COMPADRE", "MADRINA", "PADRINO", "SOBRINOS", "PRIMOS", "HERMANA",
        "CUNADA", "SUEGRA", "YERNO", "NUERA", "BISNIETO", "AHIJADO",
        "GEMELOS", "TATARABUELO",
    ],
    "Fiestas de México": [
        "POSADAS", "PINATA", "NAVIDAD", "REYES", "ROSCA", "TAMALES",
        "CANDELARIA", "OFRENDA", "ALTAR", "CALAVERA", "SERENATA",
        "MARIACHI", "CASTILLO", "FERIA", "KERMES", "BAUTIZO", "BODA",
        "PROCESION", "DANZANTES", "COHETES",
    ],
    "El café y el pan dulce": [
        "CONCHA", "CUERNO", "OREJA", "POLVORON", "BOLILLO", "TELERA",
        "CAMPECHANA", "GARIBALDI", "BESO", "EMPANADA", "CHOCOLATE",
        "CHURRO", "ATOLE", "CAFE", "CANILLA", "COCOL", "PUERQUITO",
        "MANTECADA", "BIZCOCHO", "REBANADA",
    ],
    "La naturaleza": [
        "ARBOL", "NUBE", "LLUVIA", "ARCOIRIS", "MILPA", "RIO", "MONTANA",
        "ESTRELLA", "LUNA", "AMANECER", "COLIBRI", "MARIPOSA", "GRILLO",
        "LUCIERNAGA", "NOPAL", "MAGUEY", "AHUEHUETE", "CASCADA", "ROCIO",
        "SEMILLA",
    ],
    "Nombres de mujer": [
        "GUADALUPE", "MARIA", "JOSEFINA", "CARMEN", "REMEDIOS", "SOCORRO",
        "CONSUELO", "ESPERANZA", "DOLORES", "ROSARIO", "AMPARO", "REFUGIO",
        "CONCEPCION", "VIRGINIA", "ELENA", "TERESA", "IMELDA", "EULALIA",
        "CATALINA", "FLORENCIA",
    ],
    "Nombres de hombre": [
        "JOSE", "JUAN", "PEDRO", "FRANCISCO", "ANTONIO", "MIGUEL", "RAFAEL",
        "IGNACIO", "JESUS", "SALVADOR", "GREGORIO", "AURELIO", "EUSEBIO",
        "FERMIN", "ROGELIO", "ARTURO", "ALFONSO", "RODRIGO", "EMILIANO",
        "FULGENCIO",
    ],
    "Lugares de México": [
        "OAXACA", "PUEBLA", "JALISCO", "VERACRUZ", "YUCATAN", "CHIAPAS",
        "SONORA", "MORELOS", "TLAXCALA", "DURANGO", "ZACATECAS", "COLIMA",
        "NAYARIT", "TABASCO", "QUERETARO", "GUANAJUATO", "MICHOACAN",
        "CAMPECHE", "HIDALGO", "SINALOA",
    ],
    "En el mercado": [
        "JITOMATE", "CEBOLLA", "CILANTRO", "NOPALES", "CHILES", "AGUACATE",
        "ELOTE", "CALABAZA", "REBOZO", "CANASTA", "MARCHANTA", "PUESTO",
        "BASCULA", "PILON", "VERDURA", "QUESO", "CREMA", "CHICHARRON",
        "HIERBAS", "MANDADO",
    ],
}

DIRECCIONES = [(0, 1), (1, 0), (1, 1)]  # derecha, abajo, diagonal


def limpiar(palabra: str) -> str:
    """Mayúsculas y sin acentos, conservando la Ñ."""
    palabra = palabra.upper().replace("Ñ", "\x00")
    palabra = unicodedata.normalize("NFD", palabra)
    palabra = "".join(c for c in palabra if unicodedata.category(c) != "Mn")
    return palabra.replace("\x00", "Ñ")


def colocar(grid: list, palabra: str, marcas: set) -> bool:
    intentos = list(range(250))
    random.shuffle(DIRECCIONES)
    for _ in intentos:
        df, dc = random.choice(DIRECCIONES)
        max_f = TAM - (len(palabra) * df if df else 1)
        max_c = TAM - (len(palabra) * dc if dc else 1)
        if max_f <= 0 or max_c <= 0:
            return False
        f, c = random.randrange(max_f), random.randrange(max_c)
        celdas = [(f + i * df, c + i * dc) for i in range(len(palabra))]
        if all(grid[x][y] in ("", palabra[i]) for i, (x, y) in enumerate(celdas)):
            for i, (x, y) in enumerate(celdas):
                grid[x][y] = palabra[i]
                marcas.add((x, y))
            return True
    return False


def generar_puzzle(tema: str, banco: list) -> tuple:
    while True:
        grid = [["" for _ in range(TAM)] for _ in range(TAM)]
        marcas: set = set()
        palabras = random.sample([p for p in banco if len(p) <= TAM], POR_PUZZLE)
        if all(colocar(grid, limpiar(p), marcas) for p in sorted(palabras, key=len, reverse=True)):
            break
    for f in range(TAM):
        for c in range(TAM):
            if not grid[f][c]:
                grid[f][c] = random.choice(RELLENO)
    return grid, sorted(palabras), marcas


def html_tabla(grid: list, marcas: set, clase: str) -> str:
    filas = []
    for f in range(TAM):
        celdas = "".join(
            f'<td class="hit">{grid[f][c]}</td>' if (f, c) in marcas and clase == "sol"
            else f"<td>{grid[f][c]}</td>"
            for c in range(TAM)
        )
        filas.append(f"<tr>{celdas}</tr>")
    return f'<table class="{clase}">{"".join(filas)}</table>'


def main() -> None:
    temas = list(TEMAS.items())
    puzzles, soluciones = [], []

    for n in range(1, TOTAL + 1):
        tema, banco = temas[(n - 1) % len(temas)]
        grid, palabras, marcas = generar_puzzle(tema, banco)
        lista = "".join(f"<span>{limpiar(p)}</span>" for p in palabras)
        puzzles.append(
            f'<div class="puzzle">\n'
            f'<h3><span class="num">Sopa {n}</span> {tema}</h3>\n'
            f'{html_tabla(grid, marcas, "grande")}\n'
            f'<div class="palabras">{lista}</div>\n'
            f"</div>"
        )
        soluciones.append(
            f'<div class="sol-celda"><h4>Sopa {n} · {tema}</h4>\n'
            f'{html_tabla(grid, marcas, "sol")}</div>'
        )

    SRC.mkdir(exist_ok=True)
    (SRC / "02-puzzles.html").write_text("\n".join(puzzles), encoding="utf-8")

    paginas = []
    for i in range(0, TOTAL, 4):
        bloque = "\n".join(soluciones[i:i + 4])
        paginas.append(f'<div class="sol-pagina">{bloque}</div>')
    (SRC / "03-soluciones.html").write_text(
        '<div class="divisor">\n'
        '  <p class="num">Al final del libro</p>\n'
        "  <h2>Las soluciones</h2>\n"
        '  <p class="adorno">◆ ◆ ◆</p>\n'
        '  <p class="dicho">"Nomás para confirmar, no para adelantarse, ¿eh?"</p>\n'
        "</div>\n" + "\n".join(paginas),
        encoding="utf-8",
    )
    print(f"OK: {TOTAL} sopas generadas en {SRC}")


if __name__ == "__main__":
    main()
