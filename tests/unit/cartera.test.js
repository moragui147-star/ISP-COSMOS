/**
 * Pruebas de caja blanca de ServicioCartera.ejecutarCorteMensual() – SCRUM-34.
 * Un test por camino básico (C1–C7, Tabla de caminos del RTF3) y casos CP-35 a CP-43.
 */
import { describe, test, expect, jest } from '@jest/globals';
import { crearServicioCartera } from '../../app/js/servicios/cartera.js';
import { ErrorRed } from '../../app/js/dominio/reglas.js';

const FECHA_CORTE = '2026-10-06';

function contrato(over = {}) {
  return { id: 1, num: 'CT-007', estado: 'Activo', periodosDeuda: 0, ...over };
}

function armar({ contratos = [], facturas = {}, config = {}, red } = {}) {
  const ordenes = [];
  const repo = {
    contratosEn: jest.fn((estados) => contratos.filter((c) => estados.includes(c.estado))),
    facturaDelPeriodo: jest.fn((c) => (c.id in facturas ? facturas[c.id] : null)),
    crearOrdenRetiro: jest.fn((c, fechaLimite) => ordenes.push({ cId: c.id, fechaLimite })),
    guardar: jest.fn(async () => {}),
  };
  const controladorRed = red || { suspender: jest.fn(async () => ({ estado: 'CONFIRMADA' })) };
  const notificador = { enviar: jest.fn() };
  const auditoria = { registrar: jest.fn() };
  const cfg = { diasGracia: 3, ultimoCorte: null, ...config };
  const servicio = crearServicioCartera({ repo, controladorRed, notificador, auditoria, config: cfg });
  return { servicio, repo, controladorRed, notificador, auditoria, cfg, ordenes, contratos };
}


describe('ejecutarCorteMensual() – caminos básicos', () => {
  test('C1 / CP-35: periodo ya procesado → no cambia nada (idempotencia, CA-10)', async () => {
    const c = contrato({ periodosDeuda: 1 });
    const t = armar({ contratos: [c], facturas: { 1: { estado: 'Pendiente', vence: '2026-10-01' } }, config: { ultimoCorte: '2026-10' } });
    const r = await t.servicio.ejecutarCorteMensual(FECHA_CORTE);
    expect(r.evaluados).toBe(0);
    expect(r.yaEjecutado).toBe(true);
    expect(c.periodosDeuda).toBe(1);
    expect(t.repo.guardar).not.toHaveBeenCalled();
  });

  test('C2 / CP-36: sin contratos activos o suspendidos', async () => {
    const t = armar({ contratos: [contrato({ estado: 'Cancelado' })] });
    const r = await t.servicio.ejecutarCorteMensual(FECHA_CORTE);
    expect(r).toMatchObject({ evaluados: 0, suspendidos: 0, cancelados: 0, erroresRed: 0 });
    expect(t.cfg.ultimoCorte).toBe('2026-10');
    expect(t.repo.guardar).toHaveBeenCalledTimes(1);
  });

  test('C3 / CP-37: contrato al día → reinicia periodosDeuda a 0', async () => {
    const c = contrato({ periodosDeuda: 1 });
    const t = armar({ contratos: [c], facturas: { 1: { estado: 'Pagada', vence: '2026-10-01' } } });
    await t.servicio.ejecutarCorteMensual(FECHA_CORTE);
    expect(c.periodosDeuda).toBe(0);
    expect(c.estado).toBe('Activo');
    expect(t.controladorRed.suspender).not.toHaveBeenCalled();
  });

  test('C3 (rama f === null): contrato sin factura vencible', async () => {
    const c = contrato({ periodosDeuda: 1 });
    const t = armar({ contratos: [c] });
    await t.servicio.ejecutarCorteMensual(FECHA_CORTE);
    expect(c.periodosDeuda).toBe(0);
  });

  test('C4 / CP-38: sin pago pero dentro de la gracia → sin cambios', async () => {
    const c = contrato();
    const t = armar({ contratos: [c], facturas: { 1: { estado: 'Pendiente', vence: '2026-10-05' } } });
    await t.servicio.ejecutarCorteMensual(FECHA_CORTE);
    expect(c.periodosDeuda).toBe(0);
    expect(c.estado).toBe('Activo');
    expect(t.controladorRed.suspender).not.toHaveBeenCalled();
  });

  test('C5 / CP-39: primer periodo vencido → suspensión (CA-08)', async () => {
    const c = contrato();
    const t = armar({ contratos: [c], facturas: { 1: { estado: 'Vencida', vence: '2026-10-01' } } });
    const r = await t.servicio.ejecutarCorteMensual(FECHA_CORTE);
    expect(c.periodosDeuda).toBe(1);
    expect(c.estado).toBe('Suspendido por mora');
    expect(t.controladorRed.suspender).toHaveBeenCalledTimes(1);
    expect(t.controladorRed.suspender).toHaveBeenCalledWith(c);
    expect(t.notificador.enviar).toHaveBeenCalledWith(c, 'suspension');
    expect(r.suspendidos).toBe(1);
  });

  test('C6 / CP-40: segundo periodo vencido → baja y orden de retiro a 15 días (CA-08)', async () => {
    const c = contrato({ estado: 'Suspendido por mora', periodosDeuda: 1 });
    const t = armar({ contratos: [c], facturas: { 1: { estado: 'Vencida', vence: '2026-10-01' } } });
    const r = await t.servicio.ejecutarCorteMensual(FECHA_CORTE);
    expect(c.periodosDeuda).toBe(2);
    expect(c.estado).toBe('Cancelado');
    expect(t.ordenes).toEqual([{ cId: 1, fechaLimite: '2026-10-21' }]);
    expect(t.notificador.enviar).toHaveBeenCalledWith(c, 'baja');
    expect(r.cancelados).toBe(1);
  });

  test('C7 / CP-41: timeout del router no detiene el ciclo (CA-09)', async () => {
    const c1 = contrato({ id: 1, num: 'CT-001' });
    const c2 = contrato({ id: 2, num: 'CT-002' });
    const red = {
      suspender: jest.fn()
        .mockRejectedValueOnce(new ErrorRed('TIMEOUT'))
        .mockResolvedValue({ estado: 'CONFIRMADA' }),
    };
    const venc = { estado: 'Vencida', vence: '2026-10-01' };
    const t = armar({ contratos: [c1, c2], facturas: { 1: venc, 2: venc }, red });
    const r = await t.servicio.ejecutarCorteMensual(FECHA_CORTE);
    expect(c1.redPendiente).toBe('desconectar');
    expect(c2.redPendiente).toBeUndefined();
    expect(r.erroresRed).toBe(1);
    expect(r.evaluados).toBe(2);
    expect(red.suspender).toHaveBeenCalledTimes(2);
  });

  test('C7 (excepción sin tipo): registra DESCONOCIDO', async () => {
    const c = contrato();
    const red = { suspender: jest.fn().mockRejectedValue(new Error('x')) };
    const t = armar({ contratos: [c], facturas: { 1: { estado: 'Vencida', vence: '2026-10-01' } }, red });
    await t.servicio.ejecutarCorteMensual(FECHA_CORTE);
    expect(t.auditoria.registrar).toHaveBeenCalledWith('Error de red en corte', 'CT-007: DESCONOCIDO');
  });
});
