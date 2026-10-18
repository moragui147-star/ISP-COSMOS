/**
 * Reglas de negocio puras (capa de dominio).
 * No dependen del DOM, de Firestore ni de la red, por lo que se prueban sin dobles.
 */

export const ZONA_HORARIA = 'America/Bogota';
export const MAX_PERIODOS_DEUDA = 2;

/**
 * Normaliza el contador de periodos en deuda de un contrato (SCRUM-12, CA-06).
 * undefined, null, NaN y negativos -> 0; cadena de digitos -> su entero;
 * decimales -> parte entera; mayores que 2 o Infinity -> 2.
 * @param {unknown} v valor leido de Firestore, Excel o memoria
 * @returns {{valor: number, anomalia: boolean}}
 */
export function normalizarContador(v) {
  if (Number.isInteger(v) && v >= 0 && v <= MAX_PERIODOS_DEUDA) {
    return { valor: v, anomalia: false };
  }
  let n;
  if (typeof v === 'string' && /^\s*\d+\s*$/.test(v)) {
    n = parseInt(v, 10);
  } else if (typeof v === 'number') {
    n = v;
  } else {
    n = NaN;
  }
  let valor;
  if (Number.isNaN(n) || n < 0) valor = 0;
  else if (n > MAX_PERIODOS_DEUDA) valor = MAX_PERIODOS_DEUDA;
  else valor = Math.floor(n);
  return { valor, anomalia: true };
}

/**
 * Fecha de hoy (AAAA-MM-DD) en la zona horaria de Bogota (SCRUM-22, H-08).
 * @param {Date} [ahora]
 */
export function hoyBogota(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(ahora);
}

/** Suma n dias a una fecha AAAA-MM-DD sin depender de la zona horaria del equipo. */
export function addDias(fechaStr, n) {
  const [a, m, d] = fechaStr.split('-').map(Number);
  const t = Date.UTC(a, m - 1, d) + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Recargo por mora siempre entero (CA-13). */
export function calcularRecargo(base, porcMora) {
  return Math.round((base * porcMora) / 100);
}

/** Objeto de retorno comun de los servicios. */
export function resultado(esValido, codigo, datos = {}) {
  return { esValido, codigo, datos };
}

export const ESTADOS = Object.freeze({
  PENDIENTE_INSTALACION: 'Pendiente de instalación',
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido por mora',
  CANCELADO: 'Cancelado',
});

/** Error lanzado por un IControladorRed cuando el router no responde. */
export class ErrorRed extends Error {
  constructor(tipo = 'TIMEOUT', mensaje = 'El router no respondió') {
    super(mensaje);
    this.name = 'ErrorRed';
    this.tipo = tipo;
  }
}
