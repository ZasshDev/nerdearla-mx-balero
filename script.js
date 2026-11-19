// ===== El Balero Roguelike — Nerdearla México =====
// Simulación de balero en tiempo real optimizada para escritorio y celular.
// Regla de oro de captura: el palo superior (espiga) debe quedar completamente libre
// ("desnudo") y el hoyito del barril debe superar la altura de la punta superior
// antes de poder ensartarse al entrar por la punta.

// TODO 1: Personaliza los colores de las franjas artesanales de tu balero
const COLORES_BALERO = {
  madera: '#C87D4B',
  maderaOscura: '#8F5128',
  maderaClara: '#E7A977',
  franja1: '#E4007C', // Rosa mexicano
  franja2: '#FFC21A', // Amarillo cempasúchil
  franja3: '#00A6A6', // Turquesa
  tinta: '#2B1D14',
  cuerda: '#FFF6E5',
};

// TODO 2: Frases que se gritan al ensartar un truco
const GRITOS_EXITO = [
  '¡Ensartado!',
  '¡Eso, maestro!',
  '¡De pura muñeca!',
  '¡Qué tino!',
  '¡Fierro pariente!',
  '¡Puro Nerdearla!',
];

// ===== Base de Datos Local de Récords (Salón de la Fama) =====
const CLAVE_STORAGE_RECORDS = 'nerdearla_balero_records_v1';
const CLAVE_STORAGE_APODO = 'nerdearla_balero_ultimo_apodo';

function cargarRecords() {
  try {
    const raw = localStorage.getItem(CLAVE_STORAGE_RECORDS);
    if (!raw) return [];
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function guardarRecord(apodo, puntos, ronda, modo, mejorTruco) {
  try {
    const limpios = (apodo || 'Balerista').trim().slice(0, 16) || 'Balerista';
    localStorage.setItem(CLAVE_STORAGE_APODO, limpios);
    const lista = cargarRecords();
    lista.push({
      apodo: limpios,
      puntos: Number(puntos) || 0,
      ronda: Number(ronda) || 1,
      modo: modo || 'Feria de Pueblo',
      mejorTruco: mejorTruco || 'Sencillo',
      fecha: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
    });
    lista.sort((a, b) => b.puntos - a.puntos);
    const top = lista.slice(0, 8);
    localStorage.setItem(CLAVE_STORAGE_RECORDS, JSON.stringify(top));
    return top;
  } catch {
    return [];
  }
}

function obtenerMejorPuntaje() {
  const lista = cargarRecords();
  return lista.length > 0 ? lista[0].puntos : 0;
}

// ===== Configuración de Dificultades =====
const DIFICULTADES = {
  feria: {
    nombre: 'Feria de Pueblo',
    tirosPorRonda: 6,
    radioCaptura: 25,
    toleranciaAngulo: 0.62, // ~35°
    asistenciaGiro: 0.72,
    escalaMeta: 1.0,
  },
  artesano: {
    nombre: 'Maestro Balerista',
    tirosPorRonda: 5,
    radioCaptura: 21,
    toleranciaAngulo: 0.48, // ~27°
    asistenciaGiro: 0.52,
    escalaMeta: 1.25,
  },
  cosmico: {
    nombre: 'Caos Cósmico',
    tirosPorRonda: 5,
    radioCaptura: 18,
    toleranciaAngulo: 0.4, // ~23°
    asistenciaGiro: 0.38,
    escalaMeta: 1.5,
  },
  libre: {
    nombre: 'Práctica Libre',
    tirosPorRonda: 999,
    radioCaptura: 25,
    toleranciaAngulo: 0.62,
    asistenciaGiro: 0.72,
    escalaMeta: 1.0,
  },
};

// ===== Escenarios y Físicas de Gravedad =====
const ESCENARIOS = {
  tierra: {
    id: 'tierra',
    nombre: '🌎 Patio de Coyoacán (1.0g)',
    ambiente: 'tierra',
    gravedad: 1220,
    vientoMax: 0,
    rigidezCuerda: 38,
    amortiguacion: 0.992,
    descripcion: 'Gravedad clásica terrestre para calentar la muñeca.',
  },
  feria: {
    id: 'feria',
    nombre: '🎡 Feria de San Marcos (0.95g + Viento)',
    ambiente: 'tierra',
    gravedad: 1150,
    vientoMax: 310,
    rigidezCuerda: 36,
    amortiguacion: 0.991,
    descripcion: 'El viento de la feria empuja el barril de un lado a otro.',
  },
  luna: {
    id: 'luna',
    nombre: '🌙 Luna de Queso Oaxaca (0.42g)',
    ambiente: 'luna',
    gravedad: 530,
    vientoMax: 40,
    rigidezCuerda: 30,
    amortiguacion: 0.995,
    descripcion: 'Gravedad lunar flotante: ideal para Vueltas al Mundo dobles.',
  },
  liga: {
    id: 'liga',
    nombre: '🪀 Cuerda de Liga Loca (0.85g + Resorte)',
    ambiente: 'liga',
    gravedad: 1050,
    vientoMax: 80,
    rigidezCuerda: 11,
    amortiguacion: 0.994,
    descripcion: 'La cuerda se estira como resorte de feria y lanza el barril con rebote.',
  },
  jupiter: {
    id: 'jupiter',
    nombre: '🪐 Planeta Caguama (1.65g)',
    ambiente: 'jupiter',
    gravedad: 1980,
    vientoMax: 120,
    rigidezCuerda: 45,
    amortiguacion: 0.989,
    descripcion: 'Gravedad pesada: requiere jalones fuertes y reflejos de acero.',
  },
  vortice: {
    id: 'vortice',
    nombre: '🐍 Vórtice de Quetzalcóatl (Gravedad Oscilante)',
    ambiente: 'vortice',
    gravedad: 1120,
    vientoMax: 230,
    rigidezCuerda: 32,
    amortiguacion: 0.993,
    oscilante: true,
    descripcion: 'La gravedad fluctúa en ondas cósmicas cada segundo.',
  },
};

const ORDEN_RONDAS = ['tierra', 'feria', 'luna', 'liga', 'jupiter', 'vortice'];
const METAS_BASE = [300, 650, 1100, 1650, 2300, 3200];

// ===== Catálogo de Reliquias / Mejoras Roguelike =====
const CATALOGO_RELIQUIAS = [
  {
    id: 'iman',
    icono: '🧲',
    nombre: 'Punta Imantada',
    desc: 'Cuando el barril ya superó la punta libre y va cayendo cerca, atrae suavemente el hoyito hacia la espiga.',
  },
  {
    id: 'cera',
    icono: '🕯️',
    nombre: 'Barniz de Campeche',
    desc: 'Aumenta +35% la tolerancia de ángulo y el radio de entrada para que el barril resbale mejor dentro del palo.',
  },
  {
    id: 'oyamel',
    icono: '🪵',
    nombre: 'Madera de Oyamel',
    desc: 'Madera fina de alta resonancia: todos los trucos otorgan +40% de puntos base.',
  },
  {
    id: 'ixtle',
    icono: '🧵',
    nombre: 'Cuerda de Ixtle Fino',
    desc: 'Te da +2 lanzamientos extra en cada ronda para alcanzar la meta con más calma.',
  },
  {
    id: 'trompo',
    icono: '🌀',
    nombre: 'Espíritu de Trompo',
    desc: 'Impulsa el giro del barril y otorga +1.5x de multiplicador extra en Vueltas al Mundo y Remolinos.',
  },
  {
    id: 'chile',
    icono: '🌶️',
    nombre: 'Racha Picante',
    desc: 'Cada ensartada consecutiva sin fallar aumenta el multiplicador de racha en +0.75x (en vez de +0.35x).',
  },
  {
    id: 'plomo',
    icono: '⚖️',
    nombre: 'Corazón de Plomo',
    desc: 'Contrapeso en la boca del barril: ayuda a enderezar el hoyito hacia abajo automáticamente cuando empieza a caer.',
  },
];

// ===== Referencias al DOM =====
const patio = document.querySelector('#patio');
const lienzo = document.querySelector('#lienzo');
const ctx = lienzo.getContext('2d');
const capa = document.querySelector('#capa');
const verso = document.querySelector('#verso');

const statRonda = document.querySelector('#stat-ronda');
const statPuntos = document.querySelector('#stat-puntos');
const barraMeta = document.querySelector('#barra-meta');
const statTiros = document.querySelector('#stat-tiros');
const statRacha = document.querySelector('#stat-racha');
const statRecord = document.querySelector('#stat-record');
const btnRecords = document.querySelector('#btn-records');

const selectDificultad = document.querySelector('#select-dificultad');
const selectGravedad = document.querySelector('#select-gravedad');
const btnCatalogoMejoras = document.querySelector('#btn-catalogo-mejoras');
const contadorMejorasActivas = document.querySelector('#contador-mejoras-activas');
const btnImpulso = document.querySelector('#btn-impulso');
const btnTironMovil = document.querySelector('#btn-tiron-movil');
const btnSonido = document.querySelector('#btn-sonido');

const insigniaGravedad = document.querySelector('#insignia-gravedad');
const insigniaViento = document.querySelector('#insignia-viento');
const hudReliquias = document.querySelector('#hud-reliquias');

const modalReliquia = document.querySelector('#modal-reliquia');
const tituloModalReliquia = document.querySelector('#titulo-modal-reliquia');
const subtituloModalReliquia = document.querySelector('#subtitulo-modal-reliquia');
const contenedorReliquias = document.querySelector('#contenedor-reliquias');

const modalCatalogo = document.querySelector('#modal-catalogo');
const listaCatalogoMejoras = document.querySelector('#lista-catalogo-mejoras');
const btnCerrarCatalogo = document.querySelector('#btn-cerrar-catalogo');

const modalFinal = document.querySelector('#modal-final');
const tituloFinal = document.querySelector('#titulo-final');
const resumenFinal = document.querySelector('#resumen-final');
const formRecord = document.querySelector('#form-record');
const inputNombreRecord = document.querySelector('#input-nombre-record');
const btnReiniciar = document.querySelector('#btn-reiniciar');
const btnVerRecordsFinal = document.querySelector('#btn-ver-records-final');

const modalRecords = document.querySelector('#modal-records');
const listaRecords = document.querySelector('#lista-records');
const btnCerrarRecords = document.querySelector('#btn-cerrar-records');
const btnBorrarRecords = document.querySelector('#btn-borrar-records');

// ===== Sintetizador de Audio Web y Vibración Háptica =====
let audioCtx = null;
let sonidoActivo = true;

function vibrar(patron) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(patron);
    } catch {
      // Ignorar si el navegador bloquea vibrate
    }
  }
}

function asegurarAudio() {
  if (!sonidoActivo) return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function sonarMadera(frecuencia = 520, duracion = 0.08, volumen = 0.22) {
  const ac = asegurarAudio();
  if (!ac) return;
  const ahora = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(frecuencia, ahora);
  osc.frequency.exponentialRampToValueAtTime(frecuencia * 0.45, ahora + duracion);
  gain.gain.setValueAtTime(volumen, ahora);
  gain.gain.exponentialRampToValueAtTime(0.001, ahora + duracion);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ahora);
  osc.stop(ahora + duracion);
}

function sonarEnsartada(multiplicador = 1) {
  vibrar([25, 30, 45]);
  const ac = asegurarAudio();
  if (!ac) return;
  sonarMadera(680, 0.07, 0.3);
  const notas = [523.25, 659.25, 783.99, 1046.5];
  const cantidad = Math.min(4, Math.max(2, Math.round(multiplicador)));
  for (let i = 0; i < cantidad; i++) {
    setTimeout(() => {
      const ac2 = asegurarAudio();
      if (!ac2) return;
      const t = ac2.currentTime;
      const osc = ac2.createOscillator();
      const g = ac2.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notas[i], t);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g);
      g.connect(ac2.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    }, i * 55);
  }
}

// ===== Estado de la Partida Roguelike =====
let estado = {
  dificultadId: 'feria',
  ronda: 1,
  maxRondas: 6,
  puntosRonda: 0,
  puntosTotales: 0,
  metaRonda: 300,
  tirosRestantes: 6,
  racha: 0,
  multiplicadorRacha: 1.0,
  reliquias: new Set(),
  ensartadasTotales: 0,
  mejorTruco: 'Ninguno',
  maxPuntosTruco: 0,
  recordGuardadoEnPartida: false,
  pausadoPorModal: false,
};

// ===== Estado Físico Adaptable a Resoluciones =====
let ancho = 880;
let alto = 540;
let escalaVisual = 1;
let largoCuerdaActual = 165;
let tiempoTotal = 0;
let vientoActual = 0;
let gravedadActual = 1220;

const SEGMENTOS_CUERDA = 10;

// Mango (controlado por el jugador)
const mango = {
  x: 440,
  y: 240,
  objetivoX: 440,
  objetivoY: 240,
  vx: 0,
  vy: 0,
  angulo: 0,
  largoPunta: 52,
};

// Barril (cabeza del balero)
// Regla de captura legítima:
// 1. `paloDesnudo`: El barril debe haberse separado por completo de la espiga superior
//    (distancia desde cualquier parte del barril hasta la espiga > margen).
// 2. `superoPunta`: Con el palo ya desnudo, el hoyito del barril debe haber subido
//    por encima de la punta del palo (`hoyitoY < puntaY - margen`) antes de poder ensartarse.
const barril = {
  x: 440,
  y: 405,
  vx: 0,
  vy: 0,
  angulo: 0,
  vAngulo: 0,
  radio: 25,
  alto: 60,
  ensartado: false,
  tiempoEnsartado: 0,
  paloDesnudo: true,
  superoPunta: false,
  enVuelo: false,
  tiempoVuelo: 0,
  alturaMinY: 9999,
  anguloAcumulado: 0,
  ultimoAngulo: 0,
  rebotesPalito: 0,
  enfriamientoRebote: 0,
  enfriamientoCaptura: 0,
  estela: [],
};

let nodosCuerda = [];

function inicializarCuerda() {
  nodosCuerda = [];
  for (let i = 0; i <= SEGMENTOS_CUERDA; i++) {
    const f = i / SEGMENTOS_CUERDA;
    const x = mango.x;
    const y = mango.y + f * largoCuerdaActual;
    nodosCuerda.push({ x, y, vx: 0, vy: 0 });
  }
}

function ajustarTamanoLienzo() {
  const rect = patio.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  ancho = Math.max(300, Math.round(rect.width));
  alto = Math.max(300, Math.round(rect.height));

  lienzo.width = Math.round(ancho * dpr);
  lienzo.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const menorDimension = Math.min(ancho, alto);
  escalaVisual = limitar(menorDimension / 490, 0.72, 1.08);
  largoCuerdaActual = Math.round(limitar(alto * 0.31, 115, 175));
  barril.radio = Math.round(25 * escalaVisual);
  barril.alto = Math.round(60 * escalaVisual);
  mango.largoPunta = Math.round(52 * escalaVisual);

  mango.x = limitar(mango.x, 45, ancho - 45);
  mango.y = limitar(mango.y, 75, alto - 75);
  mango.objetivoX = limitar(mango.objetivoX, 45, ancho - 45);
  mango.objetivoY = limitar(mango.objetivoY, 75, alto - 75);
}

window.addEventListener('resize', ajustarTamanoLienzo);
window.addEventListener('orientationchange', () => setTimeout(ajustarTamanoLienzo, 120));

// ===== Utilidades =====
const limitar = (n, min, max) => Math.min(max, Math.max(min, n));
const azar = (min, max) => min + Math.random() * (max - min);
const normalizarAngulo = (a) => {
  let r = a % (Math.PI * 2);
  if (r > Math.PI) r -= Math.PI * 2;
  if (r < -Math.PI) r += Math.PI * 2;
  return r;
};

function obtenerDificultad() {
  return DIFICULTADES[estado.dificultadId] || DIFICULTADES.feria;
}

function obtenerEscenarioActual() {
  const seleccion = selectGravedad.value;
  if (seleccion !== 'auto' && ESCENARIOS[seleccion]) {
    return ESCENARIOS[seleccion];
  }
  const clave = ORDEN_RONDAS[(estado.ronda - 1) % ORDEN_RONDAS.length];
  return ESCENARIOS[clave];
}

function calcularMetaRonda(ronda) {
  const base = METAS_BASE[Math.min(ronda - 1, METAS_BASE.length - 1)];
  const dif = obtenerDificultad();
  return Math.round((base * dif.escalaMeta) / 10) * 10;
}

function calcularTirosIniciales() {
  const dif = obtenerDificultad();
  if (estado.dificultadId === 'libre') return 999;
  const extraIxtle = estado.reliquias.has('ixtle') ? 2 : 0;
  return dif.tirosPorRonda + extraIxtle;
}

// ===== Geometría del Mango y del Barril =====
function obtenerPuntosMango() {
  const sen = Math.sin(mango.angulo);
  const cos = Math.cos(mango.angulo);
  // Punta extrema superior de la espiga
  const puntaX = mango.x + sen * mango.largoPunta;
  const puntaY = mango.y - cos * mango.largoPunta;
  // Base de la espiga (collarín rosa donde hace tope el barril)
  const topeX = mango.x + sen * (12 * escalaVisual);
  const topeY = mango.y - cos * (12 * escalaVisual);
  // Punto donde se amarra la cuerda en el mango
  const amarreX = mango.x - sen * (20 * escalaVisual);
  const amarreY = mango.y + cos * (20 * escalaVisual);
  // Extremo inferior del mango
  const baseMangoX = mango.x - sen * (52 * escalaVisual);
  const baseMangoY = mango.y + cos * (52 * escalaVisual);
  return { puntaX, puntaY, topeX, topeY, amarreX, amarreY, baseMangoX, baseMangoY };
}

function obtenerPuntosBarril() {
  const sen = Math.sin(barril.angulo);
  const cos = Math.cos(barril.angulo);
  const dCorona = barril.alto * 0.48;
  const dHoyito = barril.alto * 0.46;

  return {
    coronaX: barril.x + sen * dCorona,
    coronaY: barril.y - cos * dCorona,
    hoyitoX: barril.x - sen * dHoyito,
    hoyitoY: barril.y + cos * dHoyito,
  };
}

// Distancia desde un punto (px, py) a un segmento (ax, ay)-(bx, by)
function distanciaPuntoSegmento(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby || 1;
  const t = limitar(((px - ax) * abx + (py - ay) * aby) / len2, 0, 1);
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  return { dist: Math.hypot(px - cx, py - cy), cx, cy, t };
}

// ===== Interfaz, HUD, Catálogo de Mejoras y Salón de la Fama =====
function actualizarHUD() {
  const esLibre = estado.dificultadId === 'libre';
  statRonda.textContent = esLibre ? 'Libre' : `${estado.ronda} / ${estado.maxRondas}`;
  statPuntos.textContent = esLibre
    ? `${estado.puntosRonda} pts`
    : `${estado.puntosRonda} / ${estado.metaRonda}`;

  const porcentaje = esLibre
    ? 100
    : limitar((estado.puntosRonda / Math.max(1, estado.metaRonda)) * 100, 0, 100);
  barraMeta.style.width = `${porcentaje}%`;

  statTiros.textContent = esLibre ? '∞' : `${estado.tirosRestantes}`;
  statRacha.textContent = `x${estado.multiplicadorRacha.toFixed(1)}`;

  const mejorRegistrado = Math.max(obtenerMejorPuntaje(), estado.puntosTotales);
  statRecord.textContent = `${mejorRegistrado}`;
  contadorMejorasActivas.textContent = `${estado.reliquias.size}`;

  const esc = obtenerEscenarioActual();
  insigniaGravedad.textContent = esc.nombre;
  patio.setAttribute('data-ambiente', esc.ambiente);

  if (esc.vientoMax > 0) {
    insigniaViento.hidden = false;
    const flecha = vientoActual > 15 ? '➡️' : vientoActual < -15 ? '⬅️' : '⏺️';
    insigniaViento.textContent = `💨 ${flecha} ${Math.abs(Math.round(vientoActual / 10))}`;
  } else {
    insigniaViento.hidden = true;
  }

  hudReliquias.replaceChildren();
  for (const id of estado.reliquias) {
    const rel = CATALOGO_RELIQUIAS.find((r) => r.id === id);
    if (!rel) continue;
    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'reliquia-badge';
    badge.title = `${rel.nombre}: ${rel.desc} (Haz clic para ver todas las mejoras)`;
    badge.textContent = `${rel.icono} ${rel.nombre}`;
    badge.addEventListener('click', abrirModalCatalogo);
    hudReliquias.append(badge);
  }
}

function renderizarCatalogoMejoras() {
  listaCatalogoMejoras.replaceChildren();
  for (const rel of CATALOGO_RELIQUIAS) {
    const esActiva = estado.reliquias.has(rel.id);
    const item = document.createElement('div');
    item.className = `item-catalogo ${esActiva ? 'activa' : ''}`;

    const icono = document.createElement('span');
    icono.className = 'icono-catalogo';
    icono.textContent = rel.icono;

    const texto = document.createElement('div');
    texto.className = 'texto-catalogo';

    const titulo = document.createElement('strong');
    titulo.className = 'titulo-catalogo';
    titulo.textContent = rel.nombre;

    const desc = document.createElement('span');
    desc.className = 'desc-catalogo';
    desc.textContent = rel.desc;

    texto.append(titulo, desc);

    const badgeEstado = document.createElement('span');
    badgeEstado.className = `estado-catalogo ${esActiva ? 'activa' : ''}`;
    badgeEstado.textContent = esActiva ? '✅ Equipada' : 'Por obtener';

    item.append(icono, texto, badgeEstado);
    listaCatalogoMejoras.append(item);
  }
}

function abrirModalCatalogo() {
  estado.pausadoPorModal = true;
  renderizarCatalogoMejoras();
  modalCatalogo.hidden = false;
}

function cerrarModalCatalogo() {
  modalCatalogo.hidden = true;
  if (modalFinal.hidden && modalReliquia.hidden && modalRecords.hidden) {
    estado.pausadoPorModal = false;
  }
}

function renderizarModalRecords() {
  const records = cargarRecords();
  listaRecords.replaceChildren();

  if (records.length === 0) {
    const vacio = document.createElement('p');
    vacio.className = 'resumen';
    vacio.textContent = 'Aún no hay récords registrados. ¡Completa una partida para inaugurar el Salón de la Fama!';
    listaRecords.append(vacio);
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'lista-records-ul';
  const medallas = ['🥇', '🥈', '🥉', '4º', '5º', '6º', '7º', '8º'];

  records.forEach((rec, idx) => {
    const li = document.createElement('li');
    li.className = 'fila-leaderboard';

    const spanMedalla = document.createElement('span');
    spanMedalla.className = 'medalla-pos';
    spanMedalla.textContent = medallas[idx] || `${idx + 1}º`;

    const divInfo = document.createElement('div');
    divInfo.className = 'info-jugador';

    const strongNombre = document.createElement('strong');
    strongNombre.className = 'nombre-jugador';
    strongNombre.textContent = `${rec.apodo} · Ronda ${rec.ronda}`;

    const spanDetalle = document.createElement('span');
    spanDetalle.className = 'detalle-jugador';
    spanDetalle.textContent = `${rec.modo} · ${rec.mejorTruco} (${rec.fecha || 'Hoy'})`;

    divInfo.append(strongNombre, spanDetalle);

    const spanPuntos = document.createElement('span');
    spanPuntos.className = 'puntos-jugador';
    spanPuntos.textContent = `${rec.puntos} pts`;

    li.append(spanMedalla, divInfo, spanPuntos);
    ul.append(li);
  });

  listaRecords.append(ul);
}

function abrirModalRecords() {
  estado.pausadoPorModal = true;
  renderizarModalRecords();
  modalRecords.hidden = false;
}

function cerrarModalRecords() {
  modalRecords.hidden = true;
  if (modalFinal.hidden && modalReliquia.hidden && modalCatalogo.hidden) {
    estado.pausadoPorModal = false;
  }
}

function mostrarTextoFlotante(x, y, texto, subtexto = '') {
  const p = document.createElement('p');
  p.className = 'pum';
  p.textContent = texto;
  p.style.left = `${limitar(x, 65, ancho - 65)}px`;
  p.style.top = `${limitar(y, 65, alto - 50)}px`;
  p.addEventListener('animationend', () => p.remove());
  capa.append(p);

  if (subtexto) {
    const sub = document.createElement('p');
    sub.className = 'pum sub';
    sub.textContent = subtexto;
    sub.style.left = `${limitar(x, 65, ancho - 65)}px`;
    sub.style.top = `${limitar(y + 26, 85, alto - 30)}px`;
    sub.addEventListener('animationend', () => sub.remove());
    capa.append(sub);
  }
}

function resaltarChipTruco(chipId) {
  document.querySelectorAll('.truco-chip').forEach((c) => c.classList.remove('activo'));
  const chip = document.querySelector(`#${chipId}`);
  if (chip) {
    chip.classList.add('activo');
    setTimeout(() => chip.classList.remove('activo'), 1200);
  }
}

// ===== Partículas de Confeti en Canvas =====
let particulas = [];

function lanzarConfeti(x, y, cantidad = 26) {
  const colores = ['#E4007C', '#FFC21A', '#00A6A6', '#FF7A1A', '#7A2AB8', '#2E933C'];
  for (let i = 0; i < cantidad; i++) {
    const ang = azar(0, Math.PI * 2);
    const vel = azar(120, 400);
    particulas.push({
      x,
      y,
      vx: Math.cos(ang) * vel,
      vy: Math.sin(ang) * vel - 140,
      color: colores[i % colores.length],
      tam: azar(5, 9),
      giro: azar(0, Math.PI * 2),
      vGiro: azar(-10, 10),
      vida: azar(0.7, 1.3),
    });
  }
}

// ===== Clasificación de Trucos y Puntuación =====
function evaluarTrucoYPremiar(fueInvertido) {
  const vueltas = Math.floor(Math.abs(barril.anguloAcumulado) / (Math.PI * 1.75));
  const fueRapido = barril.tiempoVuelo < 0.85;

  let nombreTruco = 'Sencillo';
  let puntosBase = 100;
  let multTruco = 1.0;
  let chipId = 'chip-sencillo';

  if (vueltas >= 2) {
    nombreTruco = `¡Remolino Azteca (${vueltas} giros)!`;
    puntosBase = 450;
    multTruco = 4.0 + (vueltas - 2) * 1.0;
    chipId = 'chip-remolino';
  } else if (vueltas === 1) {
    nombreTruco = '¡Vuelta al Mundo!';
    puntosBase = 320;
    multTruco = 3.0;
    chipId = 'chip-vuelta';
  } else if (fueInvertido) {
    nombreTruco = '¡Invertido al Vuelo!';
    puntosBase = 240;
    multTruco = 2.5;
    chipId = 'chip-invertido';
  } else if (fueRapido) {
    nombreTruco = '¡Capirucho Veloz!';
    puntosBase = 180;
    multTruco = 2.0;
    chipId = 'chip-capirucho';
  }

  if (barril.rebotesPalito > 0) {
    puntosBase += barril.rebotesPalito * 120;
    multTruco += barril.rebotesPalito * 0.75;
    nombreTruco += ` + Malabar`;
  }

  if (estado.reliquias.has('oyamel')) {
    puntosBase = Math.round(puntosBase * 1.4);
  }

  if (vueltas >= 1 && estado.reliquias.has('trompo')) {
    multTruco += 1.5;
  }

  estado.racha++;
  const incrementoRacha = estado.reliquias.has('chile') ? 0.75 : 0.35;
  if (estado.racha > 1) {
    estado.multiplicadorRacha += incrementoRacha;
  }

  const puntosGanados = Math.round(puntosBase * multTruco * estado.multiplicadorRacha);
  estado.puntosRonda += puntosGanados;
  estado.puntosTotales += puntosGanados;
  estado.ensartadasTotales++;

  if (puntosGanados > (estado.maxPuntosTruco || 0)) {
    estado.maxPuntosTruco = puntosGanados;
    estado.mejorTruco = `${nombreTruco} (${puntosGanados} pts)`;
  }

  sonarEnsartada(multTruco);
  lanzarConfeti(barril.x, barril.y, 30);
  resaltarChipTruco(chipId);

  const grito = GRITOS_EXITO[Math.floor(Math.random() * GRITOS_EXITO.length)];
  mostrarTextoFlotante(
    barril.x,
    barril.y - 25,
    `${nombreTruco} +${puntosGanados}`,
    `${grito} (Racha x${estado.multiplicadorRacha.toFixed(1)})`
  );

  verso.textContent = `¡${nombreTruco}! Toca o sacude hacia arriba para liberar el palo y lanzar de nuevo`;
  actualizarHUD();

  if (estado.dificultadId !== 'libre' && estado.puntosRonda >= estado.metaRonda) {
    setTimeout(() => {
      if (estado.puntosRonda >= estado.metaRonda && !estado.pausadoPorModal) {
        completarRonda();
      }
    }, 650);
  }
}

// ===== Flujo Roguelike: Rondas, Reliquias y Fin de Juego =====
function completarRonda() {
  estado.pausadoPorModal = true;

  if (estado.ronda >= estado.maxRondas) {
    mostrarPantallaFinal(true);
    return;
  }

  tituloModalReliquia.textContent = `¡Ronda ${estado.ronda} Superada!`;
  const siguienteEsc = ESCENARIOS[ORDEN_RONDAS[estado.ronda % ORDEN_RONDAS.length]];
  subtituloModalReliquia.textContent = `Siguiente escenario: ${siguienteEsc.nombre}. Elige 1 artesanía para tu balero:`;

  const disponibles = CATALOGO_RELIQUIAS.filter((r) => !estado.reliquias.has(r.id));
  const pool = disponibles.length >= 3 ? [...disponibles] : [...CATALOGO_RELIQUIAS];
  pool.sort(() => Math.random() - 0.5);
  const opciones = pool.slice(0, 3);

  contenedorReliquias.replaceChildren();
  for (const rel of opciones) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tarjeta-reliquia';
    btn.innerHTML = `
      <span class="reliquia-icono">${rel.icono}</span>
      <div>
        <div class="reliquia-titulo">${rel.nombre}</div>
        <div class="reliquia-desc">${rel.desc}</div>
      </div>
    `;
    btn.addEventListener('click', () => seleccionarReliquiaYAvanzar(rel.id));
    contenedorReliquias.append(btn);
  }

  modalReliquia.hidden = false;
}

function seleccionarReliquiaYAvanzar(reliquiaId) {
  estado.reliquias.add(reliquiaId);
  modalReliquia.hidden = true;
  estado.ronda++;
  estado.puntosRonda = 0;
  estado.metaRonda = calcularMetaRonda(estado.ronda);
  estado.tirosRestantes = calcularTirosIniciales();
  estado.pausadoPorModal = false;

  soltarBarril(false);
  const esc = obtenerEscenarioActual();
  verso.textContent = `Ronda ${estado.ronda}: ${esc.descripcion}`;
  sonarEnsartada(2);
  actualizarHUD();
}

function mostrarPantallaFinal(victoria) {
  estado.pausadoPorModal = true;
  tituloFinal.textContent = victoria ? '¡Campeón del Balero Cósmico!' : '¡Se acabaron los tiros!';
  resumenFinal.textContent = victoria
    ? `Superaste las ${estado.maxRondas} rondas con ${estado.puntosTotales} puntos totales y ${estado.ensartadasTotales} ensartadas. Mejor truco: ${estado.mejorTruco}.`
    : `Llegaste a la Ronda ${estado.ronda} con ${estado.puntosTotales} puntos totales (${estado.ensartadasTotales} ensartadas). Mejor truco: ${estado.mejorTruco}.`;

  if (estado.puntosTotales > 0 && !estado.recordGuardadoEnPartida) {
    formRecord.hidden = false;
    inputNombreRecord.value = localStorage.getItem(CLAVE_STORAGE_APODO) || '';
  } else {
    formRecord.hidden = true;
  }

  modalFinal.hidden = false;
}

formRecord.addEventListener('submit', (e) => {
  e.preventDefault();
  if (estado.recordGuardadoEnPartida) return;
  const dif = obtenerDificultad();
  guardarRecord(
    inputNombreRecord.value,
    estado.puntosTotales,
    estado.ronda,
    dif.nombre,
    estado.mejorTruco
  );
  estado.recordGuardadoEnPartida = true;
  formRecord.hidden = true;
  actualizarHUD();
  abrirModalRecords();
});

function iniciarNuevaPartida() {
  ajustarTamanoLienzo();
  estado.dificultadId = selectDificultad.value;
  estado.ronda = 1;
  estado.puntosRonda = 0;
  estado.puntosTotales = 0;
  estado.metaRonda = calcularMetaRonda(1);
  estado.racha = 0;
  estado.multiplicadorRacha = 1.0;
  estado.reliquias.clear();
  estado.ensartadasTotales = 0;
  estado.mejorTruco = 'Ninguno';
  estado.maxPuntosTruco = 0;
  estado.recordGuardadoEnPartida = false;
  estado.pausadoPorModal = false;
  estado.tirosRestantes = calcularTirosIniciales();

  modalReliquia.hidden = true;
  modalFinal.hidden = true;
  modalRecords.hidden = true;
  modalCatalogo.hidden = true;

  mango.x = ancho * 0.5;
  mango.y = alto * 0.46;
  mango.objetivoX = mango.x;
  mango.objetivoY = mango.y;
  mango.vx = 0;
  mango.vy = 0;

  barril.ensartado = false;
  barril.paloDesnudo = true;
  barril.superoPunta = false;
  barril.x = mango.x;
  barril.y = mango.y + largoCuerdaActual;
  barril.vx = 0;
  barril.vy = 0;
  barril.angulo = 0;
  barril.vAngulo = 0;
  barril.enVuelo = false;

  inicializarCuerda();
  verso.textContent = 'Lanza el barril por encima de la punta libre y ensártalo al caer';
  actualizarHUD();
}

// ===== Soltar o Lanzar el Barril =====
function soltarBarril(conImpulso = false) {
  if (!barril.ensartado && !conImpulso) return;

  if (barril.ensartado) {
    barril.ensartado = false;
    // Al soltarlo de estar ensartado, el palo superior AÚN NO está desnudo:
    // primero debe salir por completo de la espiga y elevarse sobre la punta antes de volver a contar punto.
    barril.paloDesnudo = false;
    barril.superoPunta = false;
    barril.enfriamientoCaptura = 0.35;
    barril.vy = conImpulso ? -630 * escalaVisual : Math.min(-260, mango.vy * 0.8 - 230);
    barril.vx = mango.vx * 0.6 + azar(-70, 70);
    barril.vAngulo = azar(-4.5, 4.5);
    barril.enVuelo = true;
    barril.tiempoVuelo = 0;
    barril.anguloAcumulado = 0;
    barril.ultimoAngulo = barril.angulo;
    barril.rebotesPalito = 0;
    sonarMadera(420, 0.06, 0.16);
    return;
  }

  if (conImpulso) {
    const impulsoVuelta = estado.reliquias.has('trompo') ? 12.5 : 8.5;
    const direccion = barril.x >= mango.x ? 1 : -1;
    barril.vy = -Math.sqrt(2 * gravedadActual * (230 * escalaVisual));
    barril.vx += direccion * 135 * escalaVisual;
    barril.vAngulo = direccion * impulsoVuelta;
    sonarMadera(480, 0.06, 0.18);
  }
}

// ===== Controles de Puntero (Mouse / Touch con Desfase Táctil) =====
function actualizarObjetivoPuntero(evento) {
  const rect = lienzo.getBoundingClientRect();
  const escalaX = ancho / rect.width;
  const escalaY = alto / rect.height;
  const x = (evento.clientX - rect.left) * escalaX;
  let y = (evento.clientY - rect.top) * escalaY;

  if (evento.pointerType === 'touch') {
    y -= 42 * escalaVisual;
  }

  mango.objetivoX = limitar(x, 45, ancho - 45);
  mango.objetivoY = limitar(y, 75, alto - 75);
}

patio.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.modal') || e.target.closest('.btn-tiron-movil') || e.target.closest('.reliquia-badge')) return;
  asegurarAudio();
  actualizarObjetivoPuntero(e);

  if (barril.ensartado && barril.tiempoEnsartado > 0.12) {
    soltarBarril(true);
  }
});

patio.addEventListener('pointermove', (e) => {
  if (estado.pausadoPorModal) return;
  actualizarObjetivoPuntero(e);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && document.activeElement !== inputNombreRecord) {
    e.preventDefault();
    if (estado.pausadoPorModal) return;
    soltarBarril(true);
  }
});

btnImpulso.addEventListener('click', () => {
  asegurarAudio();
  soltarBarril(true);
});

btnTironMovil.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  asegurarAudio();
  vibrar(15);
  soltarBarril(true);
});

btnSonido.addEventListener('click', () => {
  sonidoActivo = !sonidoActivo;
  btnSonido.setAttribute('aria-pressed', String(sonidoActivo));
  btnSonido.textContent = sonidoActivo ? '🔊' : '🔇';
});

btnCatalogoMejoras.addEventListener('click', abrirModalCatalogo);
btnCerrarCatalogo.addEventListener('click', cerrarModalCatalogo);

btnRecords.addEventListener('click', abrirModalRecords);
btnVerRecordsFinal.addEventListener('click', abrirModalRecords);
btnCerrarRecords.addEventListener('click', cerrarModalRecords);
btnBorrarRecords.addEventListener('click', () => {
  localStorage.removeItem(CLAVE_STORAGE_RECORDS);
  renderizarModalRecords();
  actualizarHUD();
});

selectDificultad.addEventListener('change', iniciarNuevaPartida);
selectGravedad.addEventListener('change', actualizarHUD);
btnReiniciar.addEventListener('click', iniciarNuevaPartida);

// ===== Motor de Física en Tiempo Real =====
function actualizarFisica(dt) {
  if (estado.pausadoPorModal) return;

  tiempoTotal += dt;
  const esc = obtenerEscenarioActual();
  const dif = obtenerDificultad();

  const gBase = esc.gravedad * Math.max(0.82, escalaVisual);
  gravedadActual = esc.oscilante
    ? gBase * (0.75 + 0.55 * Math.sin(tiempoTotal * 2.1))
    : gBase;

  if (esc.vientoMax > 0) {
    vientoActual = esc.vientoMax * Math.sin(tiempoTotal * 0.85) * Math.cos(tiempoTotal * 0.35);
  } else {
    vientoActual = 0;
  }

  // 1. Movimiento del Mango (Palito)
  const prevMangoX = mango.x;
  const prevMangoY = mango.y;
  const factorSeguimiento = 1 - Math.exp(-32 * dt);
  mango.x += (mango.objetivoX - mango.x) * factorSeguimiento;
  mango.y += (mango.objetivoY - mango.y) * factorSeguimiento;

  mango.vx = (mango.x - prevMangoX) / dt;
  mango.vy = (mango.y - prevMangoY) / dt;

  const anguloDeseado = limitar(mango.vx * 0.00028, -0.32, 0.32);
  mango.angulo += (anguloDeseado - mango.angulo) * (1 - Math.exp(-18 * dt));

  const ptsMango = obtenerPuntosMango();

  if (barril.enfriamientoCaptura > 0) barril.enfriamientoCaptura -= dt;
  if (barril.enfriamientoRebote > 0) barril.enfriamientoRebote -= dt;

  // 2. Si el barril está ENSARTADO en el palito
  if (barril.ensartado) {
    barril.tiempoEnsartado += dt;
    barril.paloDesnudo = false;
    barril.superoPunta = false;
    barril.x = ptsMango.topeX + Math.sin(mango.angulo) * (18 * escalaVisual);
    barril.y = ptsMango.topeY - Math.cos(mango.angulo) * (18 * escalaVisual);
    barril.vx = mango.vx;
    barril.vy = mango.vy;
    barril.angulo = mango.angulo;
    barril.vAngulo = 0;

    const aceleracion = Math.hypot(mango.vx, mango.vy);
    if (barril.tiempoEnsartado > 0.35 && aceleracion > 1650 * escalaVisual && mango.vy < -580 * escalaVisual) {
      soltarBarril(true);
    }

    actualizarCuerdaVisual(ptsMango, obtenerPuntosBarril(), dt);
    return;
  }

  // 3. Sub-pasos de física para estabilidad de la cuerda y rotación del barril
  const SUBPASOS = 4;
  const subDt = dt / SUBPASOS;

  for (let paso = 0; paso < SUBPASOS; paso++) {
    barril.vy += gravedadActual * subDt;
    barril.vx += vientoActual * subDt;

    const amort = Math.pow(esc.amortiguacion, subDt * 60);
    barril.vx *= amort;
    barril.vy *= amort;
    barril.vAngulo *= Math.pow(0.985, subDt * 60);

    barril.x += barril.vx * subDt;
    barril.y += barril.vy * subDt;
    barril.angulo += barril.vAngulo * subDt;

    const deltaAng = normalizarAngulo(barril.angulo - barril.ultimoAngulo);
    barril.anguloAcumulado += deltaAng;
    barril.ultimoAngulo = barril.angulo;

    const ptsBarril = obtenerPuntosBarril();
    const dx = ptsBarril.coronaX - ptsMango.amarreX;
    const dy = ptsBarril.coronaY - ptsMango.amarreY;
    const dist = Math.hypot(dx, dy) || 0.0001;

    if (dist > largoCuerdaActual) {
      const nx = dx / dist;
      const ny = dy / dist;
      const exceso = dist - largoCuerdaActual;

      const rigidez = esc.rigidezCuerda;
      const fuerza = exceso * rigidez;

      const correccion = Math.min(exceso * 0.45, 22);
      barril.x -= nx * correccion;
      barril.y -= ny * correccion;

      barril.vx -= nx * fuerza * subDt * 18;
      barril.vy -= ny * fuerza * subDt * 18;

      const vRelX = barril.vx - mango.vx * 0.72;
      const vRelY = barril.vy - mango.vy * 0.72;
      const velRadial = vRelX * nx + vRelY * ny;
      if (velRadial > 0) {
        const reboteCuerda = esc.id === 'liga' ? 1.28 : 1.05;
        barril.vx -= nx * velRadial * reboteCuerda;
        barril.vy -= ny * velRadial * reboteCuerda;
      }

      const rCoronaX = ptsBarril.coronaX - barril.x;
      const rCoronaY = ptsBarril.coronaY - barril.y;
      const productoCruz = rCoronaX * (-ny) - rCoronaY * (-nx);
      barril.vAngulo += productoCruz * 0.16 * subDt;
    }

    // Verificar si el palo superior (espiga entre tope y punta) ya quedó completamente DESNUDO (libre del barril)
    const segEspiga = distanciaPuntoSegmento(
      barril.x,
      barril.y,
      ptsMango.topeX,
      ptsMango.topeY,
      ptsMango.puntaX,
      ptsMango.puntaY
    );
    const distHoyitoPunta = Math.hypot(
      ptsBarril.hoyitoX - ptsMango.puntaX,
      ptsBarril.hoyitoY - ptsMango.puntaY
    );

    if (!barril.paloDesnudo) {
      // El palo superior queda oficialmente desnudo cuando el centro y el hoyito del barril
      // se alejan por completo de la espiga superior
      if (segEspiga.dist > barril.radio + 14 * escalaVisual && distHoyitoPunta > 28 * escalaVisual) {
        barril.paloDesnudo = true;
      }
    }

    // Una vez que el palo superior está completamente desnudo,
    // el barril debe elevarse por encima de la punta libre (o superarla con el hoyito arriba de puntaY)
    // para "armar" la ensartada legítima
    if (barril.paloDesnudo && !barril.superoPunta) {
      const margenAltura = 10 * escalaVisual;
      if (ptsBarril.hoyitoY < ptsMango.puntaY - margenAltura && barril.y < ptsMango.puntaY - margenAltura) {
        barril.superoPunta = true;
        if (!barril.enVuelo) {
          barril.enVuelo = true;
          barril.tiempoVuelo = 0;
          barril.alturaMinY = barril.y;
          barril.anguloAcumulado = 0;
          barril.ultimoAngulo = barril.angulo;
          barril.rebotesPalito = 0;
        }
      }
    }

    // Asistencia giroscópica sólo cuando el tiro ya está armado (superó la punta) y empieza a caer
    const fuerzaPlomo = estado.reliquias.has('plomo') ? 1.9 : 1.0;
    const factorAsistencia = dif.asistenciaGiro * fuerzaPlomo;

    if (barril.superoPunta && barril.vy > -120 && Math.abs(barril.vAngulo) < 5.5) {
      const errorAng = normalizarAngulo(mango.angulo - barril.angulo);
      barril.vAngulo += errorAng * 8.5 * factorAsistencia * subDt;
      barril.vAngulo *= Math.pow(0.95, subDt * 60);
    }

    // Reliquia: Punta Imantada (sólo atrae si el palo ya está desnudo, el barril ya superó la punta y viene cayendo)
    if (
      estado.reliquias.has('iman') &&
      barril.paloDesnudo &&
      barril.superoPunta &&
      barril.vy > -60 &&
      barril.enfriamientoCaptura <= 0
    ) {
      const radioIman = 85 * escalaVisual;
      if (distHoyitoPunta < radioIman) {
        const fIman = (1 - distHoyitoPunta / radioIman) * 880;
        const ix = (ptsMango.puntaX - ptsBarril.hoyitoX) / Math.max(1, distHoyitoPunta);
        const iy = (ptsMango.puntaY - ptsBarril.hoyitoY) / Math.max(1, distHoyitoPunta);
        barril.vx += ix * fIman * subDt;
        barril.vy += iy * fIman * subDt;
      }
    }

    // Colisión sólida contra el cuerpo inferior del mango (para que el barril no atraviese el palo desde abajo)
    const segCuerpoMango = distanciaPuntoSegmento(
      barril.x,
      barril.y,
      ptsMango.topeX,
      ptsMango.topeY,
      ptsMango.baseMangoX,
      ptsMango.baseMangoY
    );
    const radioChoqueMango = barril.radio + 9 * escalaVisual;
    if (segCuerpoMango.dist < radioChoqueMango) {
      const nx = (barril.x - segCuerpoMango.cx) / Math.max(0.1, segCuerpoMango.dist);
      const ny = (barril.y - segCuerpoMango.cy) / Math.max(0.1, segCuerpoMango.dist);
      const penetracion = radioChoqueMango - segCuerpoMango.dist;
      barril.x += nx * penetracion;
      barril.y += ny * penetracion;

      const vRelX = barril.vx - mango.vx;
      const vRelY = barril.vy - mango.vy;
      const velNormal = vRelX * nx + vRelY * ny;
      if (velNormal < 0) {
        barril.vx -= nx * velNormal * 1.35;
        barril.vy -= ny * velNormal * 1.35;
      }
    }

    // Límites de las paredes del patio
    const margen = 32 * escalaVisual;
    if (barril.x < margen) {
      barril.x = margen;
      barril.vx = Math.abs(barril.vx) * 0.55;
    } else if (barril.x > ancho - margen) {
      barril.x = ancho - margen;
      barril.vx = -Math.abs(barril.vx) * 0.55;
    }
    if (barril.y < 52) {
      barril.y = 52;
      barril.vy = Math.abs(barril.vy) * 0.45;
    }
  }

  // 4. Seguimiento de Vuelo
  if (barril.enVuelo) {
    barril.tiempoVuelo += dt;
    barril.alturaMinY = Math.min(barril.alturaMinY, barril.y);

    // Si cayó de regreso muy por debajo del mango después de haber superado la punta -> tiro fallido
    if (barril.superoPunta && barril.y > mango.y + largoCuerdaActual * 0.68 && barril.vy > 0 && barril.tiempoVuelo > 0.35) {
      registrarTiroFallido();
    }
  }

  // 5. Detección de Ensartada (sólo válida si paloDesnudo && superoPunta) o Rebote
  verificarColisionMango(ptsMango, dif);

  // 6. Actualizar cuerda visual y estela
  actualizarCuerdaVisual(ptsMango, obtenerPuntosBarril(), dt);
  actualizarEstela();
}

function verificarColisionMango(ptsMango, dif) {
  if (barril.enfriamientoCaptura > 0) return;

  const ptsBarril = obtenerPuntosBarril();
  const distHoyitoPunta = Math.hypot(
    ptsBarril.hoyitoX - ptsMango.puntaX,
    ptsBarril.hoyitoY - ptsMango.puntaY
  );

  const bonusCera = estado.reliquias.has('cera') ? 1.35 : 1.0;
  const radioMax = dif.radioCaptura * bonusCera * Math.max(0.85, escalaVisual);
  const anguloMax = dif.toleranciaAngulo * bonusCera;
  const difAngular = Math.abs(normalizarAngulo(barril.angulo - mango.angulo));

  // El centro del barril debe estar del lado superior de la punta (entrando por la punta, no desde abajo del collarín)
  const vectorPuntaCentroY = barril.y - ptsMango.puntaY;
  const entrandoDesdeArribaDeEspiga = vectorPuntaCentroY <= 14 * escalaVisual;

  // Velocidad relativa vertical entre el barril y el mango (el barril cae sobre la punta o la punta sube hacia el barril que ya está arriba)
  const velRelativaY = barril.vy - mango.vy;

  if (
    barril.paloDesnudo &&
    barril.superoPunta &&
    entrandoDesdeArribaDeEspiga &&
    velRelativaY > -40 &&
    distHoyitoPunta <= radioMax &&
    difAngular <= anguloMax
  ) {
    const fueInvertido = barril.vy < -35 && mango.vy < -180;
    barril.ensartado = true;
    barril.tiempoEnsartado = 0;
    barril.paloDesnudo = false;
    barril.superoPunta = false;
    if (!barril.enVuelo) {
      barril.tiempoVuelo = 0.6;
    }
    evaluarTrucoYPremiar(fueInvertido);
    barril.enVuelo = false;
    return;
  }

  // Rebote / Malabar si el cuerpo del barril golpea la punta sin ensartarse
  const distCentroPunta = Math.hypot(barril.x - ptsMango.puntaX, barril.y - ptsMango.puntaY);
  if (barril.paloDesnudo && distCentroPunta < barril.radio + 10 * escalaVisual && barril.enfriamientoRebote <= 0) {
    barril.enfriamientoRebote = 0.24;
    const nx = (barril.x - ptsMango.puntaX) / Math.max(1, distCentroPunta);
    const ny = (barril.y - ptsMango.puntaY) / Math.max(1, distCentroPunta);
    barril.vx = nx * 230 * escalaVisual + mango.vx * 0.4;
    barril.vy = Math.min(-240 * escalaVisual, ny * 250 * escalaVisual + mango.vy * 0.5);
    barril.vAngulo += azar(-5, 5);
    if (barril.enVuelo) {
      barril.rebotesPalito++;
    }
    vibrar(12);
    sonarMadera(390, 0.05, 0.18);
    mostrarTextoFlotante(barril.x, barril.y - 20, '¡Toing!', 'Rebote en la punta');
  }
}

function registrarTiroFallido() {
  barril.enVuelo = false;
  barril.superoPunta = false;

  if (estado.racha > 0) {
    estado.racha = 0;
    estado.multiplicadorRacha = 1.0;
  }

  if (estado.dificultadId !== 'libre') {
    estado.tirosRestantes = Math.max(0, estado.tirosRestantes - 1);
    mostrarTextoFlotante(barril.x, barril.y - 10, '¡Casi!', `Quedan ${estado.tirosRestantes} tiros`);

    if (estado.tirosRestantes <= 0 && estado.puntosRonda < estado.metaRonda) {
      actualizarHUD();
      setTimeout(() => {
        if (estado.puntosRonda < estado.metaRonda && !estado.pausadoPorModal) {
          mostrarPantallaFinal(false);
        }
      }, 450);
      return;
    }
  }

  actualizarHUD();
}

function actualizarCuerdaVisual(ptsMango, ptsBarril, dt) {
  nodosCuerda[0].x = ptsMango.amarreX;
  nodosCuerda[0].y = ptsMango.amarreY;
  nodosCuerda[SEGMENTOS_CUERDA].x = ptsBarril.coronaX;
  nodosCuerda[SEGMENTOS_CUERDA].y = ptsBarril.coronaY;

  for (let i = 1; i < SEGMENTOS_CUERDA; i++) {
    const n = nodosCuerda[i];
    n.vy += gravedadActual * 0.45 * dt;
    n.vx += vientoActual * 0.4 * dt;
    n.vx *= 0.92;
    n.vy *= 0.92;
    n.x += n.vx * dt;
    n.y += n.vy * dt;
  }

  const segLen = largoCuerdaActual / SEGMENTOS_CUERDA;
  for (let iter = 0; iter < 5; iter++) {
    nodosCuerda[0].x = ptsMango.amarreX;
    nodosCuerda[0].y = ptsMango.amarreY;
    nodosCuerda[SEGMENTOS_CUERDA].x = ptsBarril.coronaX;
    nodosCuerda[SEGMENTOS_CUERDA].y = ptsBarril.coronaY;

    for (let i = 0; i < SEGMENTOS_CUERDA; i++) {
      const a = nodosCuerda[i];
      const b = nodosCuerda[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.001;
      const diff = (d - segLen) / d;
      const factor = 0.5;
      if (i > 0) {
        a.x += dx * diff * factor;
        a.y += dy * diff * factor;
      }
      if (i + 1 < SEGMENTOS_CUERDA) {
        b.x -= dx * diff * factor;
        b.y -= dy * diff * factor;
      }
    }
  }
}

function actualizarEstela() {
  const vel = Math.hypot(barril.vx, barril.vy);
  if (vel > 260 && !barril.ensartado) {
    barril.estela.push({ x: barril.x, y: barril.y, vida: 0.22 });
  }
  for (const e of barril.estela) {
    e.vida -= 0.016;
  }
  barril.estela = barril.estela.filter((e) => e.vida > 0);
}

// ===== Renderizado Artesanal en Canvas 2D =====
function dibujarEscena(dt) {
  ctx.clearRect(0, 0, ancho, alto);

  const ptsMango = obtenerPuntosMango();
  const ptsBarril = obtenerPuntosBarril();

  for (const e of barril.estela) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, e.vida * 1.4);
    ctx.fillStyle = COLORES_BALERO.franja2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 11 * escalaVisual * (e.vida / 0.22), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Halo indicador en la punta:
  // Sólo se enciende en verde/rosa cuando el palo superior está libre ("desnudo") Y el barril ya superó la altura de la punta
  if (!barril.ensartado && barril.paloDesnudo && barril.superoPunta) {
    const dist = Math.hypot(ptsBarril.hoyitoX - ptsMango.puntaX, ptsBarril.hoyitoY - ptsMango.puntaY);
    const maxDist = 125 * escalaVisual;
    if (dist < maxDist) {
      const alpha = 0.25 + (1 - dist / maxDist) * 0.55;
      ctx.save();
      ctx.strokeStyle = `rgba(46, 147, 60, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(ptsMango.puntaX, ptsMango.puntaY, 20 * escalaVisual, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Dibujar cuerda
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const trazarCurvaCuerda = () => {
    ctx.beginPath();
    ctx.moveTo(nodosCuerda[0].x, nodosCuerda[0].y);
    for (let i = 1; i < nodosCuerda.length - 1; i++) {
      const xc = (nodosCuerda[i].x + nodosCuerda[i + 1].x) / 2;
      const yc = (nodosCuerda[i].y + nodosCuerda[i + 1].y) / 2;
      ctx.quadraticCurveTo(nodosCuerda[i].x, nodosCuerda[i].y, xc, yc);
    }
    const ult = nodosCuerda[nodosCuerda.length - 1];
    ctx.lineTo(ult.x, ult.y);
  };

  trazarCurvaCuerda();
  ctx.strokeStyle = COLORES_BALERO.tinta;
  ctx.lineWidth = 6.5 * escalaVisual;
  ctx.stroke();

  trazarCurvaCuerda();
  ctx.strokeStyle = obtenerEscenarioActual().id === 'liga' ? '#FF7A1A' : COLORES_BALERO.cuerda;
  ctx.lineWidth = 3.2 * escalaVisual;
  ctx.stroke();
  ctx.restore();

  dibujarMango();
  dibujarBarril();

  for (const p of particulas) {
    p.vy += 650 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.giro += p.vGiro * dt;
    p.vida -= dt;

    if (p.vida > 0) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.giro);
      ctx.globalAlpha = Math.min(1, p.vida * 1.5);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.tam / 2, -p.tam / 2, p.tam, p.tam * 1.3);
      ctx.strokeStyle = COLORES_BALERO.tinta;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-p.tam / 2, -p.tam / 2, p.tam, p.tam * 1.3);
      ctx.restore();
    }
  }
  particulas = particulas.filter((p) => p.vida > 0);
}

function dibujarMango() {
  const s = escalaVisual;
  ctx.save();
  ctx.translate(mango.x, mango.y);
  ctx.rotate(mango.angulo);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = COLORES_BALERO.tinta;
  ctx.lineWidth = 3 * s;

  // Espiga / Palo superior donde entra el barril
  ctx.fillStyle = COLORES_BALERO.maderaClara;
  ctx.beginPath();
  ctx.roundRect(-5.5 * s, -mango.largoPunta, 11 * s, mango.largoPunta - 8 * s, 5 * s);
  ctx.fill();
  ctx.stroke();

  // Indicador luminoso en la punta de la espiga:
  // Verde brillante cuando el tiro ya superó la punta con el palo desnudo (listo para ensartar),
  // Turquesa/Amarillo en reposo.
  if (!barril.ensartado && barril.paloDesnudo && barril.superoPunta) {
    ctx.fillStyle = '#2E933C';
  } else {
    ctx.fillStyle = estado.reliquias.has('iman') ? '#00A6A6' : '#FFC21A';
  }
  ctx.beginPath();
  ctx.arc(0, -mango.largoPunta + 5 * s, 4.2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Collarín / Tope donde descansa el barril
  ctx.fillStyle = COLORES_BALERO.franja1;
  ctx.beginPath();
  ctx.roundRect(-14 * s, -12 * s, 28 * s, 12 * s, 6 * s);
  ctx.fill();
  ctx.stroke();

  // Empuñadura torneada de madera
  ctx.fillStyle = COLORES_BALERO.madera;
  ctx.beginPath();
  ctx.roundRect(-9 * s, 0, 18 * s, 48 * s, 8 * s);
  ctx.fill();
  ctx.stroke();

  // Anillo decorativo donde se amarra la cuerda
  ctx.fillStyle = COLORES_BALERO.franja2;
  ctx.fillRect(-9 * s, 16 * s, 18 * s, 8 * s);
  ctx.strokeRect(-9 * s, 16 * s, 18 * s, 8 * s);

  // Pomito inferior del mango
  ctx.fillStyle = COLORES_BALERO.maderaOscura;
  ctx.beginPath();
  ctx.arc(0, 52 * s, 11 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function dibujarBarril() {
  const s = escalaVisual;
  ctx.save();
  ctx.translate(barril.x, barril.y);
  ctx.rotate(barril.angulo);
  ctx.strokeStyle = COLORES_BALERO.tinta;
  ctx.lineWidth = 3.2 * s;
  ctx.lineJoin = 'round';

  const w = barril.radio * 2;
  const h = barril.alto;

  ctx.fillStyle = COLORES_BALERO.madera;
  ctx.beginPath();
  ctx.moveTo(-w * 0.36, -h * 0.48);
  ctx.bezierCurveTo(-w * 0.58, -h * 0.22, -w * 0.58, h * 0.22, -w * 0.38, h * 0.48);
  ctx.lineTo(w * 0.38, h * 0.48);
  ctx.bezierCurveTo(w * 0.58, h * 0.22, w * 0.58, -h * 0.22, w * 0.36, -h * 0.48);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.clip();

  ctx.fillStyle = COLORES_BALERO.franja1;
  ctx.fillRect(-w, -h * 0.24, w * 2, h * 0.15);

  ctx.fillStyle = COLORES_BALERO.franja2;
  ctx.fillRect(-w, -h * 0.06, w * 2, h * 0.12);

  ctx.fillStyle = COLORES_BALERO.franja3;
  ctx.fillRect(-w, h * 0.09, w * 2, h * 0.15);

  ctx.fillStyle = 'rgba(43, 29, 20, 0.16)';
  ctx.fillRect(w * 0.18, -h, w * 0.5, h * 2);

  ctx.fillStyle = 'rgba(255, 253, 249, 0.24)';
  ctx.fillRect(-w * 0.36, -h, w * 0.14, h * 2);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(-w * 0.36, -h * 0.48);
  ctx.bezierCurveTo(-w * 0.58, -h * 0.22, -w * 0.58, h * 0.22, -w * 0.38, h * 0.48);
  ctx.lineTo(w * 0.38, h * 0.48);
  ctx.bezierCurveTo(w * 0.58, h * 0.22, w * 0.58, -h * 0.22, w * 0.36, -h * 0.48);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = COLORES_BALERO.franja2;
  ctx.beginPath();
  ctx.ellipse(0, h * 0.45, 13.5 * s, 6.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = COLORES_BALERO.tinta;
  ctx.beginPath();
  ctx.ellipse(0, h * 0.45, 8.5 * s, 4.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORES_BALERO.maderaClara;
  ctx.beginPath();
  ctx.arc(0, -h * 0.48, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// ===== Bucle Principal =====
let ultimoTiempo = performance.now();

function bucle(ahora) {
  const dt = Math.min(0.035, Math.max(0.001, (ahora - ultimoTiempo) / 1000));
  ultimoTiempo = ahora;

  actualizarFisica(dt);
  dibujarEscena(dt);

  requestAnimationFrame(bucle);
}

ajustarTamanoLienzo();
iniciarNuevaPartida();
requestAnimationFrame(bucle);
