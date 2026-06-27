# Plan: minijuego "cookie clicker" del gato chef

> Minijuego **temporal**. Todo vive en `src/cat-clicker/` para poder borrarlo fácil:
> eliminar esta carpeta + las 2 líneas agregadas en `index.html` deja el blog igual
> que el efecto de cierre original.

## Contexto

Al cargar la página, `triggerRedaction()` (`index.html:152`, corre en cada carga)
tacha el contenido de los posts y "estampa" al gato chef en el centro
(`#closure-stamp` — hoy `pointer-events: none`, `opacity: 0.95`, `position: fixed`
centrado). Ese gato ya-centrado-y-visible se convierte en un minijuego estilo
Cookie Clicker.

Decisiones acordadas:
- **Moneda:** Croquetas 🍪 (el gato chef las cocina).
- **Alcance:** clicker completo, **sin ganancias offline** — las pasivas solo
  generan mientras la pestaña está abierta.

## Archivos

### Nuevos (todo el juego, autocontenido)
- `src/cat-clicker/cat-clicker.js` — lógica completa: estado, clicks, mejoras,
  tick pasivo, persistencia y render del HUD/tienda (UI creada por JS).
- `src/cat-clicker/cat-clicker.css` — estilos del juego: cursor del gato, squash
  al click, números flotantes, contador HUD y panel de tienda. Combina con la
  estética sepia/Georgia (`#efe8dc`/`#f5f0e8`, borde `#bbb`, acento `#8a7d62`).

### Modificado (mínimo y reversible)
- `index.html` — SOLO 2 líneas:
  - en `<head>`: `<link rel="stylesheet" href="src/cat-clicker/cat-clicker.css">`
  - antes de `</body>`: `<script src="src/cat-clicker/cat-clicker.js"></script>`
  - Se reutiliza el `<div id="closure-stamp">` existente (`index.html:88`) como botón.
  - **No** se edita `src/styles.css`: el override de `pointer-events`/`cursor` del
    gato va en `cat-clicker.css`, así el cierre original queda intacto al quitar el juego.

## Lógica de `cat-clicker.js` (IIFE, sin dependencias)

**Estado** persistido en `localStorage["h3-cat-clicker"]`:
```js
{ score: number, perClick: number, items: { [id]: count } }
```
Sin timestamps — no hay offline.

**Persistencia:** `load()` al iniciar; `save()` en cada click, cada compra y en
`beforeunload`. Sin datos previos → `{ score: 0, perClick: 1, items: {} }`.

**Catálogo** (costo escala `cost = base * 1.15^owned`):

| id          | tipo      | base   | efecto        |
|-------------|-----------|--------|---------------|
| cuchara     | por-click | 15     | +1 por click  |
| sarten      | por-click | 200    | +5 por click  |
| cuchillo    | por-click | 3000   | +20 por click |
| souschef    | pasiva    | 50     | 1 🍪/s        |
| horno       | pasiva    | 500    | 8 🍪/s        |
| foodtruck   | pasiva    | 6000   | 50 🍪/s       |
| restaurante | pasiva    | 75000  | 300 🍪/s      |

`perClick` y `cps()` se recomputan desde `items` (fuente de verdad = cantidades).

**Click en el gato (`#closure-stamp`):** `score += perClick`; spawnea un "+N"
flotante que sube y se desvanece; clase de squash al `<img>` (se quita al terminar);
`save()` + `render()`.

**Tick pasivo (solo online):** `setInterval` cada 100 ms → `score += cps()/10`.
Acumula solo con la pestaña abierta; no se recupera tiempo offline. El tick refresca
el número y el estado `disabled` de los botones, sin re-renderizar toda la tienda.

**UI (generada por JS, no en index.html):**
- HUD fijo: total de croquetas + "🍪/s", estilo sepia, con botón para abrir/cerrar
  la tienda.
- Tienda: cada item con nombre, efecto, costo actual y cantidad poseída; botón de
  compra `disabled` si `score < costo`. Comprar: descuenta, `items[id]++`, recomputa,
  `save()`, `render()`.
- Botón "reiniciar": borra la clave de localStorage y resetea el estado.

## Verificación

1. Servir (NO `bun index.html`; usa el server estático): `bun serve.js` →
   http://localhost:8000
2. Comprobar:
   - El gato aparece centrado y ahora es clickeable (cursor pointer).
   - Click → "+N" flotante + squash + sube el contador.
   - HUD muestra total y 🍪/s; comprar `cuchara` sube perClick; comprar `souschef`
     hace subir el contador solo (mientras la pestaña está abierta).
   - Los costos escalan al recomprar; botones se deshabilitan sin fondos.
   - Recargar conserva el progreso (localStorage); cerrar y reabrir minutos después
     **no** regala croquetas (sin offline).
   - "Reiniciar" vuelve todo a cero.
3. Borrado limpio: quitar las 2 líneas de `index.html` y la carpeta `src/cat-clicker/`
   deja el blog idéntico al efecto de cierre original.
