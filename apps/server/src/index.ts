import fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CreateRoomInputSchema, parseDecklist, validateCommanderDeck } from '@mtgc/shared';
import { cardSearchService } from './services/card-search.service.js';
import { scryfallService } from './services/scryfall.service.js';
import { bulkSyncService } from './services/bulk-sync.service.js';
import { connectDatabase, prisma } from './db.js';
import { roomManager } from './game/room-manager.js';
import { wsHandler } from './game/ws-handler.js';

import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { authService } from './services/auth.service.js';
import { deckService } from './services/deck.service.js';
import { tokenService } from './services/token.service.js';
import { cardLocaleService } from './services/card-locale.service.js';

const isDev = process.env.NODE_ENV !== 'production';

const server = fastify({
  logger: isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      }
    : true,
});

await server.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://cards.scryfall.io',
        'https://svgs.scryfall.io',
        'https://api.scryfall.com',
        'https://*.scryfall.io',
        'https://*.scryfall.com',
      ],
      connectSrc: [
        "'self'",
        'https://api.scryfall.com',
        'https://*.scryfall.com',
        'https://cards.scryfall.io',
        'https://*.scryfall.io',
        'ws:',
        'wss:',
      ],
    },
  },
  crossOriginEmbedderPolicy: false,
});

await server.register(cors, {
  origin: true,
  credentials: true,
});

await server.register(cookie, {
  secret: process.env.SESSION_SECRET || 'mtgc_session_secret_min_32_characters_long',
});

await server.register(jwt, {
  secret: process.env.JWT_SECRET || 'mtgc_jwt_secret_min_32_characters_long_for_security',
  cookie: {
    cookieName: 'token',
    signed: false,
  },
});

await server.register(rateLimit, {
  max: 150,
  timeWindow: '1 minute',
});

await server.register(websocket);

// Health check endpoint
server.get('/health', async () => {
  return {
    status: 'ok',
    service: 'mtgc-server',
    timestamp: new Date().toISOString(),
  };
});

server.get('/api/health', async () => {
  return {
    status: 'ok',
    service: 'mtgc-server',
    timestamp: new Date().toISOString(),
  };
});

// Health check para cartas, fichas, dictamenes y mazos listos en la BD local (Punto 1)
server.get('/api/health/cards', async () => {
  try {
    const cardCount = await prisma.card.count();
    const tokenCount = await prisma.card.count({
      where: {
        OR: [
          { layout: 'token' },
          { typeLine: { contains: 'Token', mode: 'insensitive' } },
        ],
      },
    });
    const rulingCount = await prisma.ruling.count();
    const localeCount = await prisma.cardLocale.count();
    const presetDecks = await deckService.getPresetDecksDbStats();

    return {
      status: 'ok',
      counts: {
        cards: cardCount,
        tokens: tokenCount,
        rulings: rulingCount,
        cardLocales: localeCount,
      },
      presetDecks,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error?.message || 'Error consultando telemetria de cartas',
      counts: {
        cards: 0,
        tokens: 0,
        rulings: 0,
        cardLocales: 0,
      },
      presetDecks: [],
      timestamp: new Date().toISOString(),
    };
  }
});

// Metrics and Observability (Fase 7.2)
server.get('/api/metrics', async () => {
  const mem = process.memoryUsage();
  return {
    uptimeSeconds: Math.floor(process.uptime()),
    activeRooms: roomManager.getActiveRoomsCount(),
    activePlayers: roomManager.getActivePlayersCount(),
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    },
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString(),
  };
});

// --- Authentication & User Accounts (Fase 5.1) ---

// Register with email verification and Argon2id
server.post('/api/auth/register', async (request, reply) => {
  const body = request.body as { username?: string; email?: string; password?: string };
  if (!body.username || !body.password) {
    return reply.status(400).send({ error: 'Usuario y contraseña son obligatorios' });
  }

  try {
    const protocol = request.protocol || 'http';
    const host = request.headers.host || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    const user = await authService.register(
      {
        username: body.username,
        email: body.email,
        password: body.password,
      },
      baseUrl,
    );

    // Short-lived access token (15m)
    const accessToken = server.jwt.sign(
      {
        id: user.id,
        username: user.username,
        isGuest: false,
        isEmailVerified: user.isEmailVerified,
      },
      { expiresIn: '15m' },
    );

    // Rotating refresh token (7 days)
    const refreshToken = await authService.createRefreshToken(user.id);

    reply.setCookie('token', accessToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
    });

    reply.setCookie('mtgc_access_token', accessToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
    });

    reply.setCookie('mtgc_refresh_token', `${user.id}:${refreshToken}`, {
      path: '/api/auth',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return reply.status(201).send({
      user,
      accessToken,
      expiresIn: 900,
      message: user.email
        ? 'Usuario creado. Revisa tu correo para verificar tu cuenta.'
        : 'Usuario creado exitosamente',
    });
  } catch (err: any) {
    return reply.status(400).send({ error: err.message || 'Error al registrar usuario' });
  }
});

// Verify Email
server.get('/api/auth/verify-email', async (request, reply) => {
  const query = request.query as { token?: string };
  if (!query.token) {
    return reply.status(400).send({ error: 'Token de verificación no proporcionado' });
  }

  const verified = await authService.verifyEmail(query.token);
  if (!verified) {
    return reply.status(400).send({ error: 'Token de verificación inválido o expirado' });
  }

  return reply.send({ verified: true, message: 'Correo verificado exitosamente' });
});

// Login with Argon2id and token rotation
server.post('/api/auth/login', async (request, reply) => {
  const body = request.body as { identifier?: string; password?: string };
  if (!body.identifier || !body.password) {
    return reply.status(400).send({ error: 'Identificador y contraseña son obligatorios' });
  }

  try {
    const user = await authService.login({
      identifier: body.identifier,
      password: body.password,
    });

    const accessToken = server.jwt.sign(
      {
        id: user.id,
        username: user.username,
        isGuest: user.isGuest,
        isEmailVerified: user.isEmailVerified,
      },
      { expiresIn: '15m' },
    );

    const refreshToken = await authService.createRefreshToken(user.id);

    reply.setCookie('token', accessToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
    });

    reply.setCookie('mtgc_access_token', accessToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
    });

    reply.setCookie('mtgc_refresh_token', `${user.id}:${refreshToken}`, {
      path: '/api/auth',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    });

    return reply.send({ user, accessToken, expiresIn: 900 });
  } catch (err: any) {
    return reply.status(401).send({ error: err.message || 'Credenciales incorrectas' });
  }
});

// Refresh Access Token with Rotating Refresh Token
server.post('/api/auth/refresh', async (request, reply) => {
  const cookieVal = request.cookies.mtgc_refresh_token;
  if (!cookieVal) {
    return reply.status(401).send({ error: 'No se encontró refresh token' });
  }

  const [userId, rawToken] = cookieVal.split(':');
  if (!userId || !rawToken) {
    return reply.status(401).send({ error: 'Refresh token con formato inválido' });
  }

  const newRefreshToken = await authService.rotateRefreshToken(userId, rawToken);
  if (!newRefreshToken) {
    reply.clearCookie('mtgc_refresh_token', { path: '/api/auth' });
    return reply.status(401).send({ error: 'Refresh token inválido o expirado' });
  }

  const newAccessToken = server.jwt.sign({ id: userId, isGuest: false }, { expiresIn: '15m' });

  reply.setCookie('token', newAccessToken, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60,
  });

  reply.setCookie('mtgc_access_token', newAccessToken, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60,
  });

  reply.setCookie('mtgc_refresh_token', `${userId}:${newRefreshToken}`, {
    path: '/api/auth',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
  });

  return reply.send({ accessToken: newAccessToken, expiresIn: 900 });
});

// Anonymous Guest Login
server.post('/api/auth/guest', async (request, reply) => {
  const body = request.body as { customName?: string };
  const user = await authService.createGuest(body?.customName);

  const token = server.jwt.sign({ id: user.id, username: user.username, isGuest: true });
  reply.setCookie('token', token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours
  });

  reply.setCookie('mtgc_access_token', token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60,
  });

  return reply.send({ user, token });
});

// Get Current User Profile
server.get('/api/auth/me', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = bearer || request.cookies.mtgc_access_token || request.cookies.token;
    if (!token) {
      return reply.status(401).send({ error: 'No autenticado' });
    }
    const decoded = server.jwt.verify<{ id: string; username: string; isGuest: boolean }>(token);
    return reply.send({ user: decoded });
  } catch {
    return reply.status(401).send({ error: 'Token inválido o expirado' });
  }
});

// Logout (Revoke refresh tokens and clear cookies)
server.post('/api/auth/logout', async (request, reply) => {
  const cookieVal = request.cookies.mtgc_refresh_token;
  if (cookieVal) {
    const [userId] = cookieVal.split(':');
    if (userId) {
      await authService.revokeRefreshToken(userId);
    }
  }

  reply.clearCookie('token', { path: '/' });
  reply.clearCookie('mtgc_access_token', { path: '/' });
  reply.clearCookie('mtgc_refresh_token', { path: '/api/auth' });
  return reply.send({ message: 'Sesión cerrada exitosamente' });
});

// Delete Account (GDPR / Privacy)
server.delete('/api/auth/account', async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = bearer || request.cookies.mtgc_access_token || request.cookies.token;
    if (!token) {
      return reply.status(401).send({ error: 'No autenticado' });
    }
    const decoded = server.jwt.verify<{ id: string }>(token);
    await authService.deleteAccount(decoded.id);
    reply.clearCookie('token', { path: '/' });
    reply.clearCookie('mtgc_access_token', { path: '/' });
    reply.clearCookie('mtgc_refresh_token', { path: '/api/auth' });
    return reply.send({ message: 'Cuenta eliminada exitosamente' });
  } catch {
    return reply.status(500).send({ error: 'Error al eliminar la cuenta' });
  }
});

// --- Privacy & Legal Disclaimers (Fase 5.3) ---
server.get('/api/legal/disclaimer', async () => {
  return {
    fanContentPolicy:
      'Mesa Virtual de Commander es un proyecto no comercial creado por aficionados, permitido bajo la Política de Contenido de Fans de Wizards of the Coast. Este software no está respaldado ni afiliado de ninguna manera con Wizards of the Coast LLC, subsidiaria de Hasbro, Inc.',
    scryfallAttribution:
      'Toda la información literal y gráfica relacionada con las cartas de Magic: The Gathering (incluyendo nombres, tipos, textos, artes y costes de maná) es propiedad exclusiva de Wizards of the Coast. Los datos de cartas son consultados a través de la API pública de Scryfall.',
    privacyStatement:
      'Respetamos tu privacidad. No comercializamos datos de usuarios, no utilizamos rastreadores de terceros ni cookies con fines publicitarios. Puedes eliminar tu cuenta y datos en cualquier momento desde tu perfil.',
  };
});

// Autocomplete card search
server.get('/api/cards/autocomplete', async (request, reply) => {
  const query = (request.query as { q?: string }).q || '';
  const results = await cardSearchService.autocomplete(query);
  return reply.send({ query, results });
});

// Endpoint por lotes para resolución de cartas desde base local con datos reales (Punto 4 - A.4)
server.post('/api/cards/resolve', async (request, reply) => {
  const body =
    (request.body as {
      names?: string[];
      ids?: string[];
      cards?: Array<string | { name?: string; id?: string; oracleId?: string }>;
      lang?: string;
    }) || {};

  const result = await cardSearchService.resolveCards(body);
  return reply.send(result);
});

// Search card by name (delegado a resolvedor único con soporte de idioma)
server.get('/api/cards/search', async (request, reply) => {
  const query = request.query as { name?: string; exact?: string; lang?: string };
  const name = query.name || '';
  const exact = query.exact === 'true';
  const lang = query.lang || 'es';
  const card = await cardSearchService.findCardByName(name, exact, lang);

  if (!card) {
    return reply.status(404).send({ error: 'Card not found', name });
  }

  return reply.send(card);
});

// Get official card rulings from local DB (REQ-7, Punto 4/5)
server.get('/api/cards/:oracleId/rulings', async (request, reply) => {
  const { oracleId } = request.params as { oracleId: string };
  if (!oracleId) {
    return reply.status(400).send({ error: 'Falta oracleId' });
  }

  try {
    const rulings = await bulkSyncService.getRulingsByOracleId(oracleId);
    return reply.send({ oracleId, rulings });
  } catch {
    return reply.send({ oracleId, rulings: [] });
  }
});

// Card Spanish localization (Punto 5, C.5 - Español Prioritario)
server.get('/api/cards/:oracleId/locale', async (request, reply) => {
  const { oracleId } = request.params as { oracleId: string };
  const lang = ((request.query as { lang?: string }).lang || 'es').toLowerCase();
  const locale = await cardLocaleService.getLocale(oracleId, lang);
  if (!locale) {
    return reply.status(404).send({ error: 'Locale not found', oracleId, lang });
  }
  return reply.send({ oracleId, lang, locale });
});

// Batch card localizations (Punto 5)
server.post('/api/cards/locales', async (request, reply) => {
  const body = request.body as { oracleIds?: string[]; lang?: string };
  const oracleIds = body.oracleIds || [];
  const lang = (body.lang || 'es').toLowerCase();
  const results: Record<string, any> = {};

  await Promise.all(
    oracleIds.map(async id => {
      const loc = await cardLocaleService.getLocale(id, lang);
      if (loc) results[id] = loc;
    }),
  );

  return reply.send({ lang, locales: results });
});

// Seed test rulings in memory for local test/verification (Punto 5 / 8)
server.post('/api/cards/seed-test-rulings', async (request, reply) => {
  const body = request.body as {
    oracleId?: string;
    rulings?: Array<{ publishedAt: string; source: string; comment: string }>;
  };
  if (body.oracleId && body.rulings) {
    bulkSyncService.setRulingsForOracleId(body.oracleId, body.rulings);
    return reply.send({ success: true, oracleId: body.oracleId, count: body.rulings.length });
  }
  return reply.status(400).send({ error: 'Falta oracleId o rulings' });
});

// Common tokens (Punto 4)
server.get('/api/tokens/common', async () => {
  return { tokens: tokenService.getCommonTokens() };
});

// Card tokens (Punto 4)
server.get('/api/cards/:cardNameOrId/tokens', async (request, reply) => {
  const { cardNameOrId } = request.params as { cardNameOrId: string };
  if (!cardNameOrId) return reply.status(400).send({ error: 'Falta cardNameOrId' });
  const tokens = await tokenService.getTokensForCard(cardNameOrId);
  return reply.send({ cardNameOrId, tokens });
});

// Deck tokens (Punto 4)
server.post('/api/decks/tokens', async (request, reply) => {
  const body = request.body as { cardNames?: string[] };
  const cardNames = body?.cardNames || [];
  const deckTokens = await tokenService.getTokensForDeck(cardNames);
  return reply.send({ deckTokens });
});

// Parse and validate decklist
server.post('/api/decks/parse', async (request, reply) => {
  const body = request.body as { decklist?: string };
  if (!body.decklist) {
    return reply.status(400).send({ error: 'Falta el texto de la lista de cartas (decklist)' });
  }

  const parsed = parseDecklist(body.decklist);

  // 1. Try local Prisma DB first (bulk data cache)
  const allCardNames = [...parsed.commanderEntries, ...parsed.maindeckEntries].map(e => e.cardName);
  let dbCards: any[] = [];
  try {
    dbCards = await prisma.card.findMany({
      where: {
        name: { in: allCardNames, mode: 'insensitive' },
      },
    });
  } catch {
    // Graceful fallback if DB is offline
  }

  const findInDb = (name: string): any | undefined => {
    const found = dbCards.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!found) return undefined;
    return {
      scryfallId: found.scryfallId,
      oracleId: found.oracleId ?? undefined,
      name: found.name,
      manaCost: found.manaCost ?? undefined,
      cmc: found.cmc,
      typeLine: found.typeLine,
      oracleText: found.oracleText ?? undefined,
      colors: found.colors as any,
      colorIdentity: found.colorIdentity as any,
      power: found.power ?? undefined,
      toughness: found.toughness ?? undefined,
      imageUrlSmall: found.imageUrlSmall ?? undefined,
      imageUrlNormal: found.imageUrlNormal ?? undefined,
      imageUrlArtCrop: found.imageUrlArtCrop ?? undefined,
    };
  };

  // 2. Fetch definitions for missing commander and maindeck cards via Scryfall Collection API
  const toScryfallLookupName = (rawName: string) => {
    return rawName.includes(' // ') ? (rawName.split(' // ')[0] || rawName).trim() : rawName.trim();
  };

  const missingCmdr = parsed.commanderEntries
    .filter(e => !findInDb(e.cardName))
    .map(e => ({ name: toScryfallLookupName(e.cardName) }));
  const missingMain = parsed.maindeckEntries
    .filter(e => !findInDb(e.cardName))
    .map(e => ({ name: toScryfallLookupName(e.cardName) }));

  const [cmdCollection, mainCollection] = await Promise.all([
    missingCmdr.length > 0
      ? scryfallService.getCollection(missingCmdr)
      : { found: [], notFound: [] },
    missingMain.length > 0
      ? scryfallService.getCollection(missingMain)
      : { found: [], notFound: [] },
  ]);

  const matchCard = (entryName: string) => {
    const q = entryName.toLowerCase().trim();
    const qFront = q.includes(' // ') ? (q.split(' // ')[0] || q).trim() : q;
    return (c: any) => {
      const cName = (c.name || '').toLowerCase();
      const cFront = cName.includes(' // ') ? (cName.split(' // ')[0] || cName).trim() : cName;
      return (
        cName === q ||
        cFront === q ||
        cFront === qFront ||
        (c.faces && c.faces[0]?.name.toLowerCase() === qFront)
      );
    };
  };

  const commanderCards = parsed.commanderEntries.map(entry => {
    const foundCard =
      findInDb(entry.cardName) || cmdCollection.found.find(matchCard(entry.cardName));
    return {
      card: foundCard || {
        scryfallId: `custom_${entry.cardName}`,
        name: entry.cardName,
        cmc: 0,
        typeLine: 'Legendary Creature',
        colors: [],
        colorIdentity: [],
        imageUrlNormal: undefined,
        imageUrlSmall: undefined,
        imageUrlArtCrop: undefined,
      },
      quantity: entry.quantity,
      isCommander: true,
    };
  });

  const maindeckCards = parsed.maindeckEntries.map(entry => {
    const foundCard =
      findInDb(entry.cardName) || mainCollection.found.find(matchCard(entry.cardName));
    return {
      card: foundCard || {
        scryfallId: `custom_${entry.cardName}`,
        name: entry.cardName,
        cmc: 0,
        typeLine: 'Card',
        colors: [],
        colorIdentity: [],
        imageUrlNormal: undefined,
        imageUrlSmall: undefined,
      },
      quantity: entry.quantity,
      isCommander: false,
    };
  });

  const validation = validateCommanderDeck(commanderCards, maindeckCards);

  // Enrich with Spanish locale data (Punto 5)
  const enrichedCommanderCards = await Promise.all(
    commanderCards.map(async c => ({
      ...c,
      card: await cardLocaleService.enrichCardWithLocale(c.card, 'es'),
    })),
  );

  const enrichedMaindeckCards = await Promise.all(
    maindeckCards.map(async c => ({
      ...c,
      card: await cardLocaleService.enrichCardWithLocale(c.card, 'es'),
    })),
  );

  return reply.send({
    parsed,
    validation,
    commanderCards: enrichedCommanderCards,
    maindeckCards: enrichedMaindeckCards,
  });
});

// Helper to authenticate user from token or cookies
function extractUserId(request: any): string | null {
  try {
    const authHeader = request.headers.authorization;
    const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = bearer || request.cookies.mtgc_access_token || request.cookies.token;
    if (!token) return null;
    const decoded = server.jwt.verify<{ id: string }>(token);
    return decoded.id;
  } catch {
    return null;
  }
}

// Save Deck to User Account (REQ-7.5 / Paso 2A.3)
server.post('/api/decks', async (request, reply) => {
  const userId = extractUserId(request);
  if (!userId) {
    return reply
      .status(401)
      .send({ error: 'Debes iniciar sesión para guardar mazos en tu cuenta' });
  }

  const body = request.body as {
    name?: string;
    format?: string;
    rawDecklist?: string;
    commanderCards?: any[];
    maindeckCards?: any[];
  };

  if (!body.name || !body.commanderCards || !body.maindeckCards) {
    return reply.status(400).send({
      error: 'Nombre del mazo, cartas de comandante y mazo principal son obligatorios',
    });
  }

  try {
    const saved = await deckService.saveDeck(userId, {
      name: body.name,
      format: body.format || 'commander',
      rawDecklist: body.rawDecklist,
      commanderCards: body.commanderCards,
      maindeckCards: body.maindeckCards,
    });

    return reply.status(201).send(saved);
  } catch (err: any) {
    return reply.status(400).send({ error: err.message || 'Error al guardar el mazo' });
  }
});

// List Preset Decks (Punto 8)
server.get('/api/decks/presets', async (_request, reply) => {
  const presets = await deckService.getPresetDecks();
  return reply.send({ presets });
});

// List User Saved Decks (REQ-7.5 / Paso 2A.3)
server.get('/api/decks', async (request, reply) => {
  const userId = extractUserId(request);
  if (!userId) {
    return reply.status(401).send({ error: 'Debes iniciar sesión para consultar tus mazos' });
  }

  const decks = await deckService.getUserDecks(userId);
  return reply.send({ decks });
});

// Get Specific Deck
server.get('/api/decks/:id', async (request, reply) => {
  const userId = extractUserId(request);
  const params = request.params as { id: string };
  const deck = await deckService.getDeckById(params.id, userId || undefined);

  if (!deck) {
    return reply.status(404).send({ error: 'Mazo no encontrado' });
  }

  return reply.send(deck);
});

// Delete User Deck
server.delete('/api/decks/:id', async (request, reply) => {
  const userId = extractUserId(request);
  if (!userId) {
    return reply.status(401).send({ error: 'No autenticado' });
  }

  const params = request.params as { id: string };
  const deleted = await deckService.deleteDeck(params.id, userId);

  if (!deleted) {
    return reply.status(404).send({ error: 'Mazo no encontrado o no pertenece a tu cuenta' });
  }

  return reply.send({ message: 'Mazo eliminado exitosamente' });
});

// Trigger bulk sync (Admin only - REQ-18 / Paso 2A.5)
server.post('/api/cards/sync-bulk', async (request, reply) => {
  const adminKey = request.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_SECRET || 'mtgc_admin_secret_key';

  if (!adminKey || adminKey !== expectedKey) {
    return reply.status(403).send({
      error: 'Acceso denegado: solo administradores pueden ejecutar la sincronización manual',
    });
  }

  const limit = (request.body as { limit?: number })?.limit;
  const result = await bulkSyncService.syncOracleCards(limit);
  return reply.send(result);
});

// Trigger bulk rulings sync (Admin only - Punto 5 / REQ-7.28)
server.post('/api/cards/sync-rulings', async (request, reply) => {
  const adminKey = request.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_SECRET || 'mtgc_admin_secret_key';

  if (!adminKey || adminKey !== expectedKey) {
    return reply.status(403).send({
      error: 'Acceso denegado: solo administradores pueden ejecutar la sincronización manual',
    });
  }

  const limit = (request.body as { limit?: number })?.limit;
  const result = await bulkSyncService.syncRulings(limit);
  return reply.send(result);
});

// Bulk sync status & nightly cron info
server.get('/api/cards/sync-status', async (_request, reply) => {
  return reply.send(bulkSyncService.getStatus());
});

// Panel de diagnóstico y registro en el servidor de errores de datos de cartas (Punto 7)
interface CardErrorLogEntry {
  id: string;
  cardName?: string;
  url?: string;
  status?: number | string;
  reason?: string;
  lang?: string;
  timestamp: number;
}

const recentCardErrors: CardErrorLogEntry[] = [];
const MAX_CARD_ERRORS = 150;

server.post('/api/diagnostics/card-errors', async (request, reply) => {
  const body = (request.body || {}) as Partial<CardErrorLogEntry>;
  const entry: CardErrorLogEntry = {
    id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    cardName: body.cardName || 'Desconocida',
    url: body.url || '',
    status: body.status || 'ERROR',
    reason: body.reason || 'Fallo de carga desconocido',
    lang: body.lang || 'es',
    timestamp: body.timestamp || Date.now(),
  };

  server.log.warn(
    `[CARD-ERROR-DIAGNOSTIC] Card: "${entry.cardName}" | URL: "${entry.url}" | Status: ${entry.status} | Reason: "${entry.reason}" | Lang: ${entry.lang}`,
  );

  recentCardErrors.unshift(entry);
  if (recentCardErrors.length > MAX_CARD_ERRORS) {
    recentCardErrors.pop();
  }

  return reply.status(201).send({ ok: true, entry });
});

server.get('/api/diagnostics/card-errors', async (_request, reply) => {
  return reply.send({
    total: recentCardErrors.length,
    errors: recentCardErrors,
  });
});

server.delete('/api/diagnostics/card-errors', async (_request, reply) => {
  recentCardErrors.length = 0;
  return reply.send({ ok: true, cleared: true });
});

// Create Room REST endpoint
server.post('/api/rooms', async (request, reply) => {
  const parseResult = CreateRoomInputSchema.safeParse(request.body);
  if (!parseResult.success) {
    return reply.status(400).send({
      error: 'Configuración de mesa inválida',
      details: parseResult.error.flatten(),
    });
  }

  const hostId = (request.body as { hostId?: string }).hostId || `host_${Date.now()}`;
  const session = roomManager.createRoom({
    name: parseResult.data.name,
    hostName: parseResult.data.hostName,
    hostId,
    maxPlayers: parseResult.data.maxPlayers,
    startingLife: parseResult.data.startingLife,
    allowSpectators: parseResult.data.allowSpectators,
  });

  return reply.status(201).send({
    roomId: session.state.id,
    code: session.state.code,
    name: session.state.name,
    hostId,
    state: session.state,
  });
});

// Get Room Info
server.get('/api/rooms/:code', async (request, reply) => {
  const code = (request.params as { code?: string }).code || '';
  const session = roomManager.getSession(code);
  if (!session) {
    return reply.status(404).send({ error: 'Mesa no encontrada' });
  }
  return reply.send(session.state);
});

// WebSocket game route
server.register(async function (fastifyInstance) {
  fastifyInstance.get('/ws/table/:roomCode', { websocket: true }, (socket, req) => {
    const params = req.params as { roomCode?: string };
    const query = req.query as { playerId?: string; playerName?: string; spectator?: string };

    const roomCode = params.roomCode?.toUpperCase() || '';
    const playerId = query.playerId || `p_${Date.now()}`;
    const playerName = query.playerName || 'Planeswalker';
    const isSpectator = query.spectator === 'true';

    wsHandler.handleConnection(socket, roomCode, {
      playerId,
      playerName,
      isSpectator,
    });
  });
});

// En producción, servir los archivos estáticos de la aplicación React (apps/web/dist)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDistPath = path.resolve(__dirname, '../../web/dist');

if (fs.existsSync(webDistPath)) {
  await server.register(fastifyStatic, {
    root: webDistPath,
    prefix: '/',
    wildcard: false,
  });

  server.setNotFoundHandler((request, reply) => {
    // Si la ruta no encontrada es una llamada a la API o WebSocket, responder con 404 JSON
    if (request.url.startsWith('/api') || request.url.startsWith('/ws')) {
      reply.status(404).send({ error: 'Not Found', message: `Ruta ${request.url} no encontrada` });
      return;
    }
    // En cualquier otra ruta (SPA de React como /table/:code/play), servir index.html
    reply.sendFile('index.html');
  });
}

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

try {
  await connectDatabase();
  await roomManager.restoreFromSnapshots();
  await server.listen({ port: PORT, host: HOST });
  server.log.info(`🚀 Servidor MTGC activo en http://localhost:${PORT}`);

  if (process.env.NODE_ENV !== 'test') {
    bulkSyncService.startNightlyCron();
    // Carga de mazos listos (preset decks - Punto 8)
    deckService.loadPresetDecks().catch(err => {
      server.log.warn(`⚠️ [DeckService] Error al cargar mazos listos: ${err?.message || err}`);
    });
    // Sincronización automática de dictámenes de Scryfall al arrancar si la tabla está vacía (Punto 6)
    bulkSyncService.syncRulingsIfEmpty().catch(err => {
      server.log.warn(
        `⚠️ [BulkSync] Error al sincronizar dictámenes de Scryfall al arrancar: ${err?.message || err}`,
      );
    });

    // Sincronización automática de Oracle Cards al arrancar si la tabla está vacía o muy por debajo de lo esperado (Punto 2)
    (async () => {
      try {
        const cardCount = await prisma.card.count();
        if (cardCount < 10000) {
          server.log.info(
            `🔄 [BulkSync] Tabla 'cards' con ${cardCount} registros (esperado > 10,000). Lanzando sincronización automática de Oracle Cards...`,
          );
          await bulkSyncService.syncOracleCards();
        }
      } catch (err: any) {
        server.log.warn(
          `⚠️ [BulkSync] Error al verificar/sincronizar cartas al inicio: ${err?.message || err}`,
        );
      }
    })();
  }
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
