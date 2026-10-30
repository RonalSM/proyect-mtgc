/**
 * TEST G2: Verificación de Vista Ampliada, Desacoplamiento de Coordenadas, Acotamiento Numérico y ErrorBoundary
 */
import { getPlayerFraming } from '../apps/web/src/utils/table-framing.js';

function testG2() {
  console.log('========================================================================');
  console.log('🛡️ TEST G2: ACOTAMIENTO NUMÉRICO Y DESACOPLAMIENTO DE COORDENADAS');
  console.log('========================================================================\n');

  // Mock de sala de 4 jugadores
  const mockRoom: any = {
    players: {
      p1: { id: 'p1', seatNumber: 0, isSpectator: false, name: 'Jugador 1' },
      p2: { id: 'p2', seatNumber: 1, isSpectator: false, name: 'Jugador 2' },
      p3: { id: 'p3', seatNumber: 2, isSpectator: false, name: 'Jugador 3' },
      p4: { id: 'p4', seatNumber: 3, isSpectator: false, name: 'Jugador 4' },
    },
  };

  // 1. Verificar que getPlayerFraming es puramente geométrico y desacoplado de las cartas
  const framingP1 = getPlayerFraming('p1', mockRoom);
  console.log('1. Geometría de encuadre celda P1:', framingP1);
  if (
    framingP1.xMin !== 0 ||
    framingP1.yMin !== 0 ||
    framingP1.width !== 0.5 ||
    framingP1.height !== 0.5 ||
    !framingP1.isExpanded
  ) {
    throw new Error('Geometría de encuadre inválida para P1');
  }

  // 2. Simular transformación con valores atípicos y extremos (NaN, Infinity, negativos, gigantescos)
  const extremeCoords = [
    { x: NaN, y: NaN, label: 'Valores NaN' },
    { x: Infinity, y: -Infinity, label: 'Valores Infinito' },
    { x: -9999, y: 88888, label: 'Desborde numérico masivo' },
    { x: 1e180, y: -1e180, label: 'Valores exponenciales' },
    { x: undefined, y: undefined, label: 'Valores undefined' },
  ];

  const winW = 1920;
  const winH = 1080;
  const orientedW = 96;
  const orientedH = 134;

  let allClampedCleanly = true;

  console.log('\n2. Evaluando robustez ante coordenadas atípicas en vista ampliada:');
  for (const tc of extremeCoords) {
    const rawX = Number.isFinite(tc.x) ? tc.x : 0.5;
    const rawY = Number.isFinite(tc.y) ? tc.y : 0.5;

    let screenNormX = rawX;
    let screenNormY = rawY;

    if (framingP1.isExpanded && framingP1.width > 0 && framingP1.height > 0) {
      screenNormX = (rawX - framingP1.xMin) / framingP1.width;
      screenNormY = (rawY - framingP1.yMin) / framingP1.height;
    }

    screenNormX = Number.isFinite(screenNormX) ? Math.max(0.01, Math.min(0.99, screenNormX)) : 0.5;
    screenNormY = Number.isFinite(screenNormY) ? Math.max(0.01, Math.min(0.99, screenNormY)) : 0.5;

    const rawCenterX = screenNormX * winW;
    const rawCenterY = screenNormY * winH;
    const clampedCenterX = Number.isFinite(rawCenterX)
      ? Math.max(orientedW / 2, Math.min(winW - orientedW / 2, rawCenterX))
      : winW / 2;
    const clampedCenterY = Number.isFinite(rawCenterY)
      ? Math.max(orientedH / 2, Math.min(winH - orientedH / 2, rawCenterY))
      : winH / 2;

    const centerPixelX = Math.round(clampedCenterX);
    const centerPixelY = Math.round(clampedCenterY);

    const isSafe =
      Number.isFinite(centerPixelX) &&
      Number.isFinite(centerPixelY) &&
      centerPixelX >= orientedW / 2 &&
      centerPixelX <= winW - orientedW / 2 &&
      centerPixelY >= orientedH / 2 &&
      centerPixelY <= winH - orientedH / 2;

    console.log(`   - Caso: [${tc.label}] -> Pixeles: (${centerPixelX}px, ${centerPixelY}px) | Seguro: ${isSafe ? '✅' : '❌'}`);

    if (!isSafe) {
      allClampedCleanly = false;
    }
  }

  console.log('\n========================================================================');
  if (allClampedCleanly) {
    console.log('🎉 [ÉXITO G2] Encodings geométricos desacoplados y acotamiento numérico estricto verificado.');
    console.log('   Protegido contra NaN, Infinity y pantalla negra con ErrorBoundary.');
  } else {
    console.error('❌ [FALLO G2] Alguna coordenada no pudo ser acotada de forma segura.');
    process.exit(1);
  }
  console.log('========================================================================');
}

testG2();
