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
 */
import {
  normalizarContador, addDias, ESTADOS, MAX_PERIODOS_DEUDA,
} from '../dominio/reglas.js';

export function crearServicioCartera({ repo, controladorRed, notificador, auditoria, config }) {
  async function ejecutarCorteMensual(fechaCorte) {
    // Nodo 1
    const periodo = fechaCorte.slice(0, 7);
    const reporte = { periodo, evaluados: 0, suspendidos: 0, cancelados: 0, erroresRed: 0, anomalias: 0 };

    // Nodo 2: idempotencia
    if (config.ultimoCorte === periodo) {
      return { ...reporte, yaEjecutado: true }; // Nodo 18
    }

    const contratos = repo.contratosEn([ESTADOS.ACTIVO, ESTADOS.SUSPENDIDO]);

    // Nodo 3: ciclo
    for (const c of contratos) {
      // Nodo 4
      const { valor, anomalia } = normalizarContador(c.periodosDeuda);
      let deuda = valor;
      if (anomalia) {
        reporte.anomalias++;
        auditoria.registrar('Contador de deuda normalizado', `${c.num}: ${String(c.periodosDeuda)} → ${valor}`);
      }
      const f = repo.facturaDelPeriodo(c, fechaCorte);

      if (f === null || f === undefined || f.estado === 'Pagada') {
        // Nodo 6
        c.periodosDeuda = 0;
      } else if (fechaCorte > addDias(f.vence, config.diasGracia)) {
        // Nodo 8
        deuda += 1;
        c.periodosDeuda = Math.min(deuda, MAX_PERIODOS_DEUDA);

        if (deuda >= MAX_PERIODOS_DEUDA) {
          // Nodo 10
          c.estado = ESTADOS.CANCELADO;
          repo.crearOrdenRetiro(c, addDias(fechaCorte, 15));
          reporte.cancelados++;
        } else {
          // Nodo 11
          c.estado = ESTADOS.SUSPENDIDO;
          reporte.suspendidos++;
        }

        // Nodos 12-14
        try {
          await controladorRed.suspender(c);
        } catch (e) {
          c.redPendiente = 'desconectar';
          reporte.erroresRed++;
          auditoria.registrar('Error de red en corte', `${c.num}: ${e && e.tipo ? e.tipo : 'DESCONOCIDO'}`);
        }
        // Nodo 15
        notificador.enviar(c, deuda >= MAX_PERIODOS_DEUDA ? 'baja' : 'suspension');
      } else {
        // Nodo 7 falso: dentro de la gracia, sin cambios
        c.periodosDeuda = deuda;
      }

      // Nodo 16
      auditoria.registrar('Corte de cartera', `${c.num}: ${c.estado} (deuda ${c.periodosDeuda})`);
      reporte.evaluados++;
    }

    // Nodo 17
    config.ultimoCorte = periodo;
    await repo.guardar();
    return reporte; // Nodo 18
  }

  return { ejecutarCorteMensual };
}
