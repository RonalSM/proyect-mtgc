---
name: mtg-scryfall-integration
description: "Cómo integrar la API de Scryfall: límites de uso, cabeceras, bulk data, caché, importación de listas de mazo, imágenes y playmats (art_crop) y atribución legal. Úsala siempre que busques cartas, importes o valides mazos, muestres imágenes de cartas, sincronices la base de cartas o uses arte de cartas como fondo."
---

# Integración con Scryfall

Scryfall es un servicio gratuito mantenido por terceros: respetar sus reglas evita bloqueos y es parte de los requisitos legales del proyecto (REQ-18). **Antes de implementar, lee las guías vigentes** en `https://scryfall.com/docs/api` porque pueden cambiar.

## Reglas de uso (verifica en la documentación vigente)

- Envía siempre las cabeceras `User-Agent` (con el nombre de la app y un contacto) y `Accept`.
- Deja una pausa de **50–100 ms entre peticiones** (unas 10 por segundo como máximo). La pausa se aplica en el **servidor**, con una cola única, nunca desde cada navegador.
- Guarda en caché los datos al menos 24 horas.
- No cobres por acceder a las imágenes ni a los datos; no sugieras que Scryfall respalda tu producto.
- No recortes ni deformes las imágenes de forma engañosa; usa las variantes que ofrece la API (`art_crop`, `border_crop`, `normal`, `large`).
- Ante `429` o `5xx`, reintenta con espera exponencial y respeta `Retry-After` si viene.

## Endpoints útiles

| Necesidad | Endpoint |
|---|---|
| Carta por nombre | `GET /cards/named?exact=` o `?fuzzy=` |
| Autocompletado | `GET /cards/autocomplete?q=` |
| Varias cartas a la vez | `POST /cards/collection` con hasta 75 identificadores por llamada |
| Base completa | `GET /bulk-data` → descargar `oracle_cards` y cargarlo a PostgreSQL |

Prefiere el **bulk data nocturno** para consultas locales y deja la API para casos puntuales. Programa la sincronización con una tarea periódica (cron) y conserva un endpoint manual solo para administradores.

## Campos de carta que usarás

`id`, `oracle_id`, `name`, `mana_cost`, `type_line`, `oracle_text`, `color_identity`, `legalities`, `layout`, `image_uris` (`small`, `normal`, `large`, `art_crop`, `border_crop`) y `card_faces` (cada cara de una carta de doble cara trae su propio `image_uris`).

## Importación de listas

Acepta estos formatos y normalízalos a `{ cantidad, nombre, set?, numero?, seccion }`:

- `1 Sol Ring`, `1x Sol Ring`, `1 Sol Ring (CMM) 123`
- Exportaciones de Moxfield y MTG Arena, con encabezados como `Commander`, `Deck`, `Sideboard`
- Líneas de comentario que empiezan con `//` (ignóralas)

Resuelve con `POST /cards/collection` en lotes de 75. El resultado trae `not_found`: para esos nombres ofrece sugerencias con `/cards/autocomplete` o `fuzzy`, y reporta los que sigan sin resolverse sin abortar la importación.

## Imágenes y playmats

- Para el fondo de cada celda usa `art_crop` del comandante, con una capa oscura para legibilidad.
- Sirve las imágenes desde la CDN de Scryfall o desde tu caché, con carga diferida y precarga del playmat propio.
- Muestra en el pie la atribución a Scryfall y el aviso: «No oficial, sin afiliación con Wizards of the Coast».

## Esqueleto de cola con límite de tasa

```ts
class ScryfallQueue {
  private last = 0;
  private chain: Promise<unknown> = Promise.resolve();
  constructor(private minGapMs = 100) {}
  request<T>(fn: () => Promise<T>): Promise<T> {
    const run = async () => {
      const wait = Math.max(0, this.last + this.minGapMs - Date.now());
      if (wait) await new Promise(r => setTimeout(r, wait));
      this.last = Date.now();
      return fn();
    };
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => undefined);
    return p;
  }
}
```
