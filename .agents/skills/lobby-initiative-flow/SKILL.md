---
name: lobby-initiative-flow
description: "Flujo de sala de espera: selección o importación de mazos, estado 'Listo', inicio de partida, reparto inicial y tirada de d20 para decidir el orden de turnos con manejo de empates. Úsala al implementar o modificar el lobby, el estado de la mesa (lobby, initiative, playing, finished), la iniciativa, el d20, los empates o el orden de turnos."
---

# Sala de espera e iniciativa (REQ-20 y REQ-21)

## Estados de la mesa

```
lobby ──(todos listos + el anfitrión inicia)──► initiative ──(orden resuelto)──► playing ──► finished
```

Si un jugador sale o quita «Listo» antes de que la iniciativa termine, la mesa vuelve a `lobby`.

## Sala de espera

- Cada asiento muestra: nombre, mazo elegido (**solo nombre y comandante**), estado Listo/No listo y si es anfitrión.
- La lista completa de cartas de un mazo **nunca** se envía a otros jugadores.
- Fuentes de mazo: guardados en la cuenta, o de sesión (invitados; caducan a las 24 h). Un jugador solo puede elegir mazos propios; valida `ownerId` o el token de sesión en el servidor.
- Importar desde la sala reutiliza el importador y la validación (`mtg-scryfall-integration`, `mtg-commander-domain`). Las advertencias se muestran pero no bloquean.
- «Iniciar partida» se habilita para el anfitrión solo si hay al menos 2 jugadores y todos están listos.

## Secuencia al iniciar

1. Cargar el mazo de cada jugador y crear sus `CardInstance`.
2. Barajar cada biblioteca con `crypto.randomInt`.
3. Comandante(s) a la zona de comando.
4. Repartir mano inicial de 7.
5. Pasar a `initiative` y emitir `INITIATIVE_STARTED` con el plazo.

## Iniciativa con d20

- Cada jugador envía `ROLL_D20`; el valor sale del servidor (`crypto.randomInt(1, 21)`).
- Si un jugador no lanza en 15 s o está desconectado, el servidor lanza por él.
- Orden de turnos: **de mayor a menor** resultado.
- Empates: solo los empatados relanzan, ocupando entre ellos las posiciones que les correspondían. Máximo 5 rondas; si persiste, desempata por número de asiento.

```ts
function resolveOrder(seats: number[], roll: () => number, round = 1): number[] {
  const rolls = new Map(seats.map(s => [s, roll()]));
  const groups = new Map<number, number[]>();
  for (const s of seats) groups.set(rolls.get(s)!, [...(groups.get(rolls.get(s)!) ?? []), s]);
  const values = [...groups.keys()].sort((a, b) => b - a);
  return values.flatMap(v => {
    const g = groups.get(v)!;
    if (g.length === 1) return g;
    if (round >= 5) return [...g].sort((a, b) => a - b);
    return resolveOrder(g, roll, round + 1);
  });
}
```

Emite `D20_ROLLED` por cada tirada (con la ronda), `INITIATIVE_TIE` cuando haya empate e `INITIATIVE_RESOLVED { order }` al final.

## Después de la iniciativa

- Guarda `turnOrder` y usa ese orden en `PASS_TURN`, saltando a jugadores eliminados.
- Muestra 1.º, 2.º, 3.º… en la etiqueta de cada jugador.
- Los asientos no cambian de lugar en pantalla.

## Casos límite que debes cubrir

Jugador que se desconecta durante la iniciativa, anfitrión que sale en el lobby (transferir el rol), mazo que se borra mientras está seleccionado, doble clic en «Iniciar», y reconexión en mitad de la tirada.
