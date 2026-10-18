import { describe, test, expect } from '@jest/globals';
import {
  normalizarContador, hoyBogota, addDias, calcularRecargo, resultado, ErrorRed,
} from '../../app/js/dominio/reglas.js';

describe('normalizarContador() – SCRUM-12 / CA-06 (Tabla de tipos anómalos del RTF3)', () => {
  test.each([
    [0, 0, false],
    [1, 1, false],
    [2, 2, false],
    [undefined, 0, true],
    [null, 0, true],
    [NaN, 0, true],
    ['1', 1, true],
    [' 2 ', 2, true],
    ['abc', 0, true],
    [1.5, 1, true],
    [-1, 0, true],
    [5, 2, true],
    [Infinity, 2, true],
    [Number.MAX_SAFE_INTEGER, 2, true],
    [{}, 0, true],
  ])('entrada %p -> %p (anomalía: %p)', (entrada, esperado, anomalia) => {
    const r = normalizarContador(entrada);
    expect(r.valor).toBe(esperado);
    expect(Number.isInteger(r.valor)).toBe(true);
    expect(r.anomalia).toBe(anomalia);
  });

  test('evita la concatenación "1" + 1 = "11"', () => {
    const { valor } = normalizarContador('1');
    expect(valor + 1).toBe(2);
  });
});

describe('hoyBogota() – SCRUM-22 / CA-14', () => {
  test('a las 19:30 de Bogotá (00:30 UTC del día siguiente) sigue siendo el mismo día', () => {
    expect(hoyBogota(new Date('2026-10-10T00:30:00Z'))).toBe('2026-10-09');
  });
  test('a las 18:59 y 23:59 de Bogotá', () => {
    expect(hoyBogota(new Date('2026-10-09T23:59:00Z'))).toBe('2026-10-09');
    expect(hoyBogota(new Date('2026-10-10T04:59:00Z'))).toBe('2026-10-09');
  });
  test('sin argumento usa el reloj actual (formato AAAA-MM-DD)', () => {
    expect(hoyBogota()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  test('a las 00:00 de Bogotá cambia de día', () => {
    expect(hoyBogota(new Date('2026-10-10T05:00:00Z'))).toBe('2026-10-10');
  });
});

describe('addDias(), calcularRecargo() y resultado()', () => {
  test('addDias cruza fin de mes y de año', () => {
    expect(addDias('2026-10-06', 15)).toBe('2026-10-21');
    expect(addDias('2026-12-25', 10)).toBe('2027-01-04');
    expect(addDias('2026-10-04', -3)).toBe('2026-10-01');
  });
  test('recargo siempre entero', () => {
    expect(calcularRecargo(60000, 5)).toBe(3000);
    expect(calcularRecargo(45001, 5)).toBe(2250);
    expect(Number.isInteger(calcularRecargo(30001, 7))).toBe(true);
  });
  test('resultado() y ErrorRed', () => {
    expect(resultado(false, 'X')).toEqual({ esValido: false, codigo: 'X', datos: {} });
    const e = new ErrorRed();
    expect(e.tipo).toBe('TIMEOUT');
    expect(e).toBeInstanceOf(Error);
  });
});
