/* ============================================================
   AgroMaíz — asistente.js  (v3 — proxy backend)
   El chat pasa por el backend:
     Frontend → POST /api/chat → Groq (key segura en servidor)
   La API key ya NO se guarda en el navegador.
   El contexto del cultivo lo inyecta el servidor desde la BD.
   ============================================================ */

/* ──────────────────────────────────────────────────────────
   1. ESTADO
   ────────────────────────────────────────────────────────── */
let conversacion    = [];
let estaEscribiendo = false;

/* ──────────────────────────────────────────────────────────
   2. LEER DATOS DEL CULTIVO (sessionStorage — del wizard)
   ────────────────────────────────────────────────────────── */
function leerDatosCultivo() {
  // 1. Intentar sessionStorage (wizard recién completado)
  const raw = sessionStorage.getItem('agromaiz_cultivo');
  if (raw) { try { return JSON.parse(raw); } catch { /* continúa */ } }
  // 2. Intentar localStorage (cacheado por el asistente en sesiones anteriores)
  const cached = localStorage.getItem('agromaiz_cultivo_cache');
  if (cached) { try { return JSON.parse(cached); } catch { /* continúa */ } }
  return null;
}

function calcularDias(fechaSiembra) {
  if (!fechaSiembra) return null;
  const plain = fechaSiembra.length > 10 ? fechaSiembra.slice(0, 10) : fechaSiembra;
  const dias = Math.floor((Date.now() - new Date(plain + 'T12:00:00')) / 86400000);
  return dias >= 0 ? dias : null;
}

function calcularEtapa(fechaSiembra) {
  const dias = calcularDias(fechaSiembra);
  if (dias === null) return 'no determinada';
  if (dias < 10)  return `Siembra y emergencia (días ${dias})`;
  if (dias < 30)  return `Crecimiento vegetativo temprano — V3 a V6 (días ${dias})`;
  if (dias < 50)  return `Crecimiento vegetativo tardío — V6 a V10 (días ${dias})`;
  if (dias < 70)  return `Floración y polinización — VT/R1 (días ${dias})`;
  if (dias < 100) return `Llenado de grano — R2 a R4 (días ${dias})`;
  return `Madurez y cosecha — R5 a R6 (días ${dias})`;
}

/* ──────────────────────────────────────────────────────────
   3. LLAMADA AL BACKEND
   ────────────────────────────────────────────────────────── */
async function enviarMensajeIA(textoUsuario) {
  conversacion.push({ role: 'user', content: textoUsuario });

  // apiFetch (de api.js) adjunta el JWT automáticamente
  const { ok, datos } = await apiFetch('/chat', {
    method: 'POST',
    body: JSON.stringify({ mensajes: conversacion }),
  });

  if (!ok) {
    conversacion.pop(); // revertir si falló
    throw new Error(datos?.mensaje || 'Error del servidor');
  }

  const respuesta = datos.texto || '';
  conversacion.push({ role: 'assistant', content: respuesta });
  return respuesta;
}

/* ──────────────────────────────────────────────────────────
   4. UI — RENDERIZAR MENSAJES
   ────────────────────────────────────────────────────────── */
function formatearTexto(texto) {
  return texto
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^[•\-] (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, s => `<ul>${s}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<)(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}

function horaActual() {
  return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function agregarMensaje(rol, contenido, esError = false) {
  const wrap = document.getElementById('chatMessages');
  if (!wrap) return;

  const div   = document.createElement('div');
  div.className = `msg ${rol}`;
  const emoji = rol === 'bot' ? '🌱' : '👤';

  div.innerHTML = `
    <div class="msg-avatar">${emoji}</div>
    <div class="msg-inner">
      <div class="msg-bubble${esError ? ' error' : ''}">${
        esError ? contenido : formatearTexto(contenido)
      }</div>
      <div class="msg-time">${horaActual()}</div>
    </div>`;

  const indicator = document.getElementById('typingIndicator');
  wrap.insertBefore(div, indicator);
  wrap.scrollTop = wrap.scrollHeight;
}

function mostrarEscribiendo(visible) {
  const el = document.getElementById('typingIndicator');
  if (!el) return;
  el.classList.toggle('visible', visible);
  if (visible) el.parentElement.scrollTop = el.parentElement.scrollHeight;
}

/* ──────────────────────────────────────────────────────────
   5. BANNER DE CONTEXTO DEL CULTIVO
   ────────────────────────────────────────────────────────── */
function renderizarContextoBanner() {
  const container = document.getElementById('contextTags');
  if (!container) return;

  const c    = leerDatosCultivo();
  const dias = c ? calcularDias(c.fecha_siembra) : null;
  container.innerHTML = '';

  if (!c) {
    const tag = document.createElement('span');
    tag.className   = 'context-tag empty';
    tag.textContent = 'Sin cultivo registrado — ve a Mi cultivo';
    container.appendChild(tag);
    return;
  }

  const datos = [
    dias !== null          ? `📅 Día ${dias}`                            : null,
    c.departamento         ? `📍 ${c.departamento}`                      : null,
    c.tipo_suelo           ? `🪨 Suelo ${c.tipo_suelo}`                  : null,
    c.tipo_manejo          ? `💧 ${c.tipo_manejo === 'lluvia' ? 'Secano' : 'Con riego'}` : null,
    c.ph_suelo             ? `⚗️ pH ${c.ph_suelo.replace('lig_', 'lig. ')}` : null,
  ].filter(Boolean);

  if (datos.length === 0) {
    const tag = document.createElement('span');
    tag.className   = 'context-tag empty';
    tag.textContent = 'Cultivo registrado pero sin datos completos';
    container.appendChild(tag);
    return;
  }

  datos.forEach(d => {
    const tag = document.createElement('span');
    tag.className   = 'context-tag';
    tag.textContent = d;
    container.appendChild(tag);
  });
}

/* ──────────────────────────────────────────────────────────
   6. SUGERENCIAS INICIALES
   ────────────────────────────────────────────────────────── */
function sugerenciasContextuales() {
  const c    = leerDatosCultivo();
  const dias = c ? calcularDias(c.fecha_siembra) : null;

  const base = [
    { icono: '🍂', texto: '¿Por qué tienen las hojas manchas amarillas?' },
    { icono: '💧', texto: '¿Cuándo y cuánto debo regar?' },
    { icono: '🐛', texto: '¿Cómo identifico el gusano cogollero?' },
    { icono: '🌱', texto: '¿Qué fertilizante necesito ahora?' },
  ];

  if (dias !== null) {
    if (dias < 30)              base[3].texto = '¿Cuál es la primera fertilización recomendada?';
    else if (dias >= 50 && dias < 75) base[1].texto = '¿Cuánta agua necesita el maíz en floración?';
    else if (dias >= 80)        base[3].texto = '¿Cómo sé si el maíz está listo para cosechar?';
  }
  if (c?.tipo_suelo === 'arenoso') {
    base[1].texto = '¿Cómo compensar la baja retención de agua en suelo arenoso?';
  }
  return base;
}

function renderizarSugerencias() {
  const wrap = document.getElementById('suggestionsRow');
  if (!wrap) return;
  wrap.innerHTML = '';
  sugerenciasContextuales().forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'suggestion-chip';
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>${s.texto}`;
    btn.addEventListener('click', () => procesarEnvio(s.texto));
    wrap.appendChild(btn);
  });
}

function renderizarSugerenciasBottom() {
  const wrap = document.getElementById('suggestionsRowBottom');
  const container = document.getElementById('suggestionsBottom');
  if (!wrap || !container) return;
  wrap.innerHTML = '';
  sugerenciasContextuales().forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'suggestion-chip';
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>${s.texto}`;
    btn.addEventListener('click', () => procesarEnvio(s.texto));
    wrap.appendChild(btn);
  });
  container.style.display = 'block';
}

/* ──────────────────────────────────────────────────────────
   7. BADGE DEL PROVEEDOR (ahora solo muestra "Groq · Backend")
   ────────────────────────────────────────────────────────── */
function actualizarBadgeProveedor() {
  const badge = document.getElementById('providerBadge');
  if (!badge) return;
  badge.innerHTML = `<span class="pb-dot" style="background:#10b981"></span> Groq · Backend seguro`;
  badge.style.cursor = 'default';
  badge.onclick = null;
}

/* ──────────────────────────────────────────────────────────
   8. FLUJO PRINCIPAL DE CHAT
   ────────────────────────────────────────────────────────── */
async function procesarEnvio(texto) {
  texto = texto.trim();
  if (!texto || estaEscribiendo) return;

  // Ocultar sugerencias iniciales (top) tras el primer mensaje
  const sugsWrap = document.getElementById('suggestionsWrap');
  if (sugsWrap) sugsWrap.style.display = 'none';

  // Ocultar sugerencias del fondo mientras se espera respuesta
  const sugsBottom = document.getElementById('suggestionsBottom');
  if (sugsBottom) sugsBottom.style.display = 'none';

  agregarMensaje('user', texto);
  limpiarInput();

  estaEscribiendo = true;
  mostrarEscribiendo(true);
  actualizarBotonEnvio(true);

  try {
    const respuesta = await enviarMensajeIA(texto);
    mostrarEscribiendo(false);
    agregarMensaje('bot', respuesta);
    renderizarSugerenciasBottom();
  } catch (err) {
    mostrarEscribiendo(false);
    let msg = '⚠️ No se pudo conectar con el asistente.';

    if (err.message.includes('configurado')) {
      msg = '⚙️ El servidor no tiene la clave de Groq configurada. Agrega GROQ_API_KEY al archivo .env del backend.';
    } else if (err.message.includes('429') || err.message.toLowerCase().includes('rate')) {
      msg = '⏱️ Límite de Groq alcanzado. Espera 1 minuto e intenta de nuevo.';
    } else if (err.message.includes('503')) {
      msg = '🌐 El servicio de IA no está disponible en este momento. Intenta en unos minutos.';
    } else {
      msg += `<br><small style="opacity:.7">${err.message}</small>`;
    }
    agregarMensaje('bot', msg, true);
    renderizarSugerenciasBottom();
  } finally {
    estaEscribiendo = false;
    actualizarBotonEnvio(false);
  }
}

function limpiarInput() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  input.value      = '';
  input.style.height = 'auto';
}

function actualizarBotonEnvio(deshabilitado) {
  const btn = document.getElementById('sendBtn');
  if (btn) btn.disabled = deshabilitado;
}

/* ──────────────────────────────────────────────────────────
   9. CARGAR HISTORIAL DESDE EL BACKEND
   ────────────────────────────────────────────────────────── */
async function cargarHistorialBackend() {
  try {
    const { ok, datos } = await apiFetch('/chat/historial');
    if (!ok || !datos.mensajes?.length) return;

    datos.mensajes.forEach(m => {
      conversacion.push({ role: m.rol, content: m.contenido });
    });

    // Mostrar últimos 10 en UI
    datos.mensajes.slice(-10).forEach(m => {
      agregarMensaje(m.rol === 'user' ? 'user' : 'bot', m.contenido);
    });
  } catch (_) {
    // No crítico — el chat funciona sin historial
  }
}

/* ──────────────────────────────────────────────────────────
   10. INICIALIZACIÓN
   ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {

  // Textarea auto-resize
  const input = document.getElementById('chatInput');
  if (input) {
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        procesarEnvio(input.value);
      }
    });
  }

  // Botón enviar
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.addEventListener('click', () => procesarEnvio(input?.value || ''));

  // Actualizar badge de proveedor
  actualizarBadgeProveedor();

  // Cargar cultivo desde el API y cachear en localStorage para que
  // leerDatosCultivo() lo encuentre en esta y futuras sesiones
  try {
    const { ok, datos } = await CultivoService.obtener();
    if (ok && datos?.cultivo) {
      localStorage.setItem('agromaiz_cultivo_cache', JSON.stringify(datos.cultivo));
      // Sincronizar también en sessionStorage para compatibilidad con el resto del código
      sessionStorage.setItem('agromaiz_cultivo', JSON.stringify(datos.cultivo));
    }
  } catch (_) { /* Si falla, usamos el caché anterior si existe */ }

  // Render inicial (ya con datos del cultivo disponibles)
  renderizarContextoBanner();
  renderizarSugerencias();

  // Cargar historial
  cargarHistorialBackend();

  // Mensaje de bienvenida (solo si no hay historial)
  const c    = leerDatosCultivo();
  const dias = c ? calcularDias(c.fecha_siembra) : null;
  const u    = Auth.getUsuario();
  const nombre = u?.nombre?.split(' ')[0] || 'productor';

  let bienvenida = `¡Hola, ${nombre}! Soy **AgroBot** 🌱, tu asistente agronómico.\n\n`;
  if (c && dias !== null) {
    bienvenida += `Veo que tu maíz lleva **${dias} días** desde la siembra — estás en la etapa de **${calcularEtapa(c.fecha_siembra)}**.\n\nPuedo ayudarte con riegos, fertilización, plagas, malezas y mucho más. ¿Qué necesitas saber hoy?`;
  } else {
    bienvenida += 'Puedo ayudarte con riegos, fertilización, plagas, malezas y cualquier duda sobre tu cultivo de maíz.\n\nSi registras tu cultivo en **Mi cultivo**, mis respuestas serán aún más precisas. ¿Qué necesitas saber?';
  }

  agregarMensaje('bot', bienvenida);

  const consultaPendiente = sessionStorage.getItem('agrobot_consulta_pendiente');
  if (consultaPendiente) {
    sessionStorage.removeItem('agrobot_consulta_pendiente');
    // Esperar un momento para que el mensaje de bienvenida se vea primero
    setTimeout(() => procesarEnvio(consultaPendiente), 800);
  }
});