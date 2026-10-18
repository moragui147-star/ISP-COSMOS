// Puente entre los módulos ES (dominio y servicios) y el código clásico de index.html.
// Los scripts type="module" se ejecutan antes de window.onload.
import { normalizarContador, hoyBogota, addDias, ESTADOS, ErrorRed } from './dominio/reglas.js';
import { crearServicioCartera } from './servicios/cartera.js';

window.ISP = { normalizarContador, hoyBogota, addDias, ESTADOS, ErrorRed, crearServicioCartera };
