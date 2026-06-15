# Propuesta — Fleet Decision Tool interno

## El problema

La herramienta de decisión de flota (costos O&O multimarca, desempeño de
canteras, mantenimiento, CAPEX, dashboard ejecutivo) hoy corre como demo en un
hosting público (Vercel) y guarda los datos en el navegador de cada usuario.
Para usarla con **datos reales de la empresa** eso no es aceptable: sin control
de acceso, sin datos compartidos entre el equipo, sin respaldos ni bitácora, y
en un tercero público.

## La solución (ya construida y probada)

Una versión **centralizada y auto-hospedable**, pensada para correr **dentro de
la red de la empresa** detrás del firewall:

- **Datos compartidos** en una base de datos PostgreSQL interna — todo el equipo
  ve y edita la misma información (no copias por navegador).
- **Autenticación** con usuario/contraseña, **lista para SSO corporativo**
  (Entra ID / Okta / Google) con un cambio de configuración.
- **Control de acceso por rol** (consulta / edición / administración) y por
  **alcance de región o cantera** — cada quien ve solo lo que le corresponde.
- **Bitácora de auditoría** de cada cambio (quién, cuándo, qué).
- **Empaquetada en Docker** (app + base de datos + proxy con TLS y encabezados
  de seguridad): se levanta con un comando y es portable a una VM o a la
  plataforma de contenedores corporativa.
- **Respaldos** por `pg_dump` / herramientas de IT, más export/import a Excel.

Todo esto está **implementado y verificado de extremo a extremo**: login,
permisos por rol y por región/cantera, auditoría, y los 7 módulos de datos
leyendo/escribiendo de la base central.

## Lo que necesitamos definir con IT / Seguridad

1. **Proveedor de identidad (SSO):** ¿Entra ID, Okta o Google? (hasta tenerlo,
   se usa login usuario/contraseña).
2. **Dónde se hospeda:** ¿una VM con Docker o la plataforma de contenedores
   interna? ¿Quién termina el TLS — este stack o un balanceador corporativo?
3. **Certificado TLS:** CA interna o certificados provistos.
4. **Clasificación de datos:** ¿aplica algún mandato de cifrado en reposo,
   retención de respaldos o auditoría? — para alinear cifrado y respaldos.

## Esfuerzo y siguiente paso

La base centralizada ya está lista para un **piloto interno**. Siguientes
incrementos sugeridos: UI de administración de usuarios/roles, endurecer el CSP
(nonces), y conectar el SSO corporativo. Documentación técnica para IT en
`DEPLOY.md` y `SECURITY.md`.
