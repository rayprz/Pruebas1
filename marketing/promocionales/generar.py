"""Genera las tarjetas promocionales 1080x1080 de cada producto.

Uso: python3 generar.py   (crea 0X-producto.png en esta carpeta)
Requiere: weasyprint y pdftoppm (poppler-utils).
"""
import subprocess
from pathlib import Path

AQUI = Path(__file__).parent
PROD = AQUI.parent.parent / "productos"

PRODUCTOS = [
    {
        "archivo": "01-recetario", "bg": "#8c2f1b",
        "titulo": "La Cocina<br>de Antaño",
        "sub": "50 recetas tradicionales mexicanas<br>con letra grande y los secretos de la abuela",
        "puntos": ["50 recetas de las de antes, paso a paso",
                   "Letra grande: cocine sin forzar la vista",
                   "Llega a su WhatsApp al instante"],
        "precio": "$99", "svg": "01-recetario-cocina-de-antano/src/img/portada-olla.svg",
    },
    {
        "archivo": "02-sopas", "bg": "#1f5d8c",
        "titulo": "Sopas de Letras<br>Gigantes",
        "sub": "100 juegos con letra GIGANTE<br>y temas bonitos de antes",
        "puntos": ["100 sopas + soluciones al final",
                   "Letra gigante: juegue sin lentes",
                   "Imprímalas las veces que quiera"],
        "precio": "$79", "svg": "02-sopas-de-letras-gigantes/src/img/portada-lupa.svg",
    },
    {
        "archivo": "03-cocina-que-cuida", "bg": "#2e5e46",
        "titulo": "Cocina<br>que Cuida",
        "sub": "4 semanas de menús mexicanos<br>bajitos en azúcar y en sal",
        "puntos": ["28 días de menús ya resueltos",
                   "20 recetas con todo el sabor",
                   "Cambios sencillos que hacen mucho"],
        "precio": "$149", "svg": "03-cocina-que-cuida/src/img/portada-plato.svg",
    },
    {
        "archivo": "04-devocional", "bg": "#2c3a64",
        "titulo": "Un Momento<br>con Dios",
        "sub": "Devocional de 30 días con letra grande<br>+ las oraciones de toda la vida",
        "puntos": ["Lectura, reflexión y oración diaria",
                   "Un renglón de gratitud cada día",
                   "Las oraciones de siempre, sin batallar"],
        "precio": "$99", "svg": "04-un-momento-con-dios/src/img/portada-paloma.svg",
    },
    {
        "archivo": "05-whatsapp", "bg": "#155e63",
        "titulo": "WhatsApp<br>sin Miedo",
        "sub": "La guía paciente, con letra grande...<br>y que ningún vivales lo engañe",
        "puntos": ["12 lecciones paso a paso, con dibujos",
                   "Las 10 estafas al descubierto",
                   "El regalo perfecto para sus papás"],
        "precio": "$129", "svg": "05-whatsapp-sin-miedo/src/img/portada-celular.svg",
    },
    {
        "archivo": "06-libro-de-mi-vida", "bg": "#6e3344",
        "titulo": "El Libro<br>de Mi Vida",
        "sub": "Sus memorias, escritas de su puño y letra,<br>para heredarlas a la familia",
        "puntos": ["Preguntas que jalan los recuerdos",
                   "Árbol genealógico y cartas",
                   "El regalo que se lee por generaciones"],
        "precio": "$149", "svg": "06-el-libro-de-mi-vida/src/img/portada-libro.svg",
    },
]

PLANTILLA = """<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>
@page {{ size: 1080px 1080px; margin: 0; background: {bg}; }}
body {{ font-family: "DejaVu Sans"; color: #fdf3e3; margin: 0; text-align: center; }}
.marco {{ margin: 42px; height: 956px; border: 7px double #e8b96a; padding: 0 60px; }}
.papel {{ width: 430px; margin: 22px auto 0 auto; display: block; }}
.marca {{ font-size: 25px; letter-spacing: 9px; text-transform: uppercase;
         color: #e8b96a; margin: 16px 0 0 0; }}
h1 {{ font-family: "DejaVu Serif"; font-size: 80px; line-height: 1.1; margin: 14px 0 10px 0; }}
.sub {{ font-size: 30px; line-height: 1.4; color: #f3d9ad; margin: 0; }}
.fila {{ margin-top: 16px; }}
.fila img {{ height: 205px; }}
ul {{ list-style: none; padding: 0; margin: 16px auto 0 auto; width: 760px; text-align: left; }}
li {{ font-size: 29px; padding: 5px 0 5px 52px; position: relative; }}
li::before {{ content: "✓"; position: absolute; left: 8px; color: #e8b96a;
             font-weight: bold; font-size: 34px; }}
.pie {{ margin-top: 18px; }}
.precio {{ display: inline-block; background: #e8b96a; color: {bg}; font-weight: bold;
          font-size: 46px; border-radius: 60px; padding: 12px 46px; }}
.cta {{ font-size: 26px; color: #f3d9ad; margin-top: 12px; }}
</style></head><body>
<div class="marco">
  <img class="papel" src="{papel}">
  <p class="marca">El Rincón de la Abuela</p>
  <h1>{titulo}</h1>
  <p class="sub">{sub}</p>
  <div class="fila"><img src="{svg}"></div>
  <ul>{puntos}</ul>
  <div class="pie">
    <span class="precio">{precio} MXN · pago único</span>
    <p class="cta">Pídalo por WhatsApp · Entrega inmediata · Garantía de 7 días</p>
  </div>
</div>
</body></html>
"""


def main() -> None:
    from weasyprint import HTML

    papel = (PROD / "01-recetario-cocina-de-antano/src/img/papel.svg").as_uri()
    for p in PRODUCTOS:
        html = PLANTILLA.format(
            bg=p["bg"], titulo=p["titulo"], sub=p["sub"], precio=p["precio"],
            papel=papel, svg=(PROD / p["svg"]).as_uri(),
            puntos="".join(f"<li>{x}</li>" for x in p["puntos"]),
        )
        pdf = AQUI / f"_{p['archivo']}.pdf"
        HTML(string=html, base_url=str(AQUI)).write_pdf(str(pdf))
        subprocess.run(
            ["pdftoppm", "-png", "-r", "96", "-singlefile",
             str(pdf), str(AQUI / p["archivo"])],
            check=True,
        )
        pdf.unlink()
        print(f"✓ {p['archivo']}.png")


if __name__ == "__main__":
    main()
