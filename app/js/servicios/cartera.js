/**
 * ServicioCartera: corte mensual de cartera (SCRUM-13, HU-05).
 * Implementa los nodos 1 a 18 del grafo de flujo del RTF3 (seccion 5.1.5).
 *
 * Dependencias inyectadas (para poder sustituirlas por dobles de prueba):
 *  - repo:            { contratosEn(estados), facturaDelPeriodo(contrato, fechaCorte),
 *                       crearOrdenRetiro(contrato, fechaLimite), guardar() }
 *  - controladorRed:  { suspender(contrato): Promise<{estado}> }   (IControladorRed)
 *  - notificador:     { enviar(contrato, plantilla) }               (INotificador)
 *  - auditoria:       { registrar(accion, detalle) }
 *  - config:          { diasGracia: number, ultimoCorte: string|null }
 *
 * La logica se divide en tres funciones para mantener la complejidad
 * ciclomatica de cada una por debajo de 10 (CA-17, regla `complexity` de ESLint).
 */
import {
  normalizarContador, addDias, ESTADOS, MAX_PERIODOS_DEUDA,
} from '../dominio/reglas.js';

const sinPago = (f) => f !== null && f !== undefined && f.estado !== 'Pagada';

export function crearServicioCartera({ repo, controladorRed, notificador, auditoria, config }) {
  /** Nodos 12-14: suspension en el router dentro de try/catch. */
  async function suspenderEnRed(c, reporte) {
    try {
      await controladorRed.suspender(c);
    } catch (e) {
      c.redPendiente = 'desconectar';
      reporte.erroresRed++;
      const tipo = e && e.tipo ? e.tipo : 'DESCONOCIDO';
      auditoria.registrar('Error de red en corte', `${c.num}: ${tipo}`);
    }
  }

  /** Nodos 8-15: aplica la mora a un contrato con factura vencida fuera de la gracia. */
  async function aplicarMora(c, deudaActual, fechaCorte, reporte) {
    const deuda = deudaActual + 1;
    c.periodosDeuda = Math.min(deuda, MAX_PERIODOS_DEUDA);
    const esBaja = deuda >= MAX_PERIODOS_DEUDA;
    if (esBaja) {
      c.estado = ESTADOS.CANCELADO;
      repo.crearOrdenRetiro(c, addDias(fechaCorte, 15));
      reporte.cancelados++;
    } else {
      c.estado = ESTADOS.SUSPENDIDO;
      reporte.suspendidos++;
    }
    await suspenderEnRed(c, reporte);
    notificador.enviar(c, esBaja ? 'baja' : 'suspension');
  }

  /** Nodos 4-7 y 16: evalua un contrato. */
  async function evaluarContrato(c, fechaCorte, reporte) {
    const { valor, anomalia } = normalizarContador(c.periodosDeuda);
    if (anomalia) {
      reporte.anomalias++;
      auditoria.registrar('Contador de deuda normalizado', `${c.num}: ${String(c.periodosDeuda)} → ${valor}`);
    }
    const f = repo.facturaDelPeriodo(c, fechaCorte);
    if (!sinPago(f)) {
      c.periodosDeuda = 0;
    } else if (fechaCorte > addDias(f.vence, config.diasGracia)) {
      await aplicarMora(c, valor, fechaCorte, reporte);
    } else {
      c.periodosDeuda = valor;
    }
    auditoria.registrar('Corte de cartera', `${c.num}: ${c.estado} (deuda ${c.periodosDeuda})`);
    reporte.evaluados++;
  }

  /** Nodos 1-3, 17 y 18. */
  async function ejecutarCorteMensual(fechaCorte) {
    const periodo = fechaCorte.slice(0, 7);
    const reporte = { periodo, evaluados: 0, suspendidos: 0, cancelados: 0, erroresRed: 0, anomalias: 0 };
    if (config.ultimoCorte === periodo) {
      return { ...reporte, yaEjecutado: true };
    }
    const contratos = repo.contratosEn([ESTADOS.ACTIVO, ESTADOS.SUSPENDIDO]);
    for (const c of contratos) {
      await evaluarContrato(c, fechaCorte, reporte);
    }
    config.ultimoCorte = periodo;
    await repo.guardar();
    return reporte;
  }

  return { ejecutarCorteMensual };
}
