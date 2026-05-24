/* ============================================================
   AgroMaíz — js/registrar-cultivo.js (v3 — scope corregido)
   ============================================================ */

// ── Variables globales — FUERA del DOMContentLoaded ──────────
console.log('ARCHIVO NUEVO CARGADO v3');
let coordenadas   = { lat: null, lon: null };
let gpsEnProgreso = false;

// ── Función GPS global — FUERA del DOMContentLoaded ──────────
async function obtenerUbicacionGPS() {
  const gpsSpinner = document.getElementById('gps-spinner');
  const gpsText    = document.getElementById('gps-text');
  const btnNext    = document.getElementById('btnNext');

  if (!gpsText) return;

  gpsEnProgreso    = true;
  btnNext.disabled = true;
  if (gpsSpinner) gpsSpinner.style.display = 'block';
  gpsText.innerHTML = '<span style="color:var(--gray-500)">Obteniendo ubicación... por favor espera</span>';

  try {
    // Paso 1: coordenadas del navegador (sin JWT)
    const pos = await ClimaService.obtenerGPS();
    coordenadas.lat = pos.lat;
    coordenadas.lon = pos.lon;
    gpsText.innerHTML = '<span style="color:var(--gray-500)">Identificando lugar...</span>';

    // Paso 2: reverse geocoding
    try {
      const { ok, datos } = await ClimaService.reverseGeocode(pos.lat, pos.lon);
      if (ok && datos.municipio) {
        const lugar = [datos.municipio, datos.departamento].filter(Boolean).join(', ');
        coordenadas.municipioNombre    = datos.municipio    || null;
        coordenadas.departamentoNombre = datos.departamento || null;
        if (gpsSpinner) gpsSpinner.style.display = 'none';
        gpsText.innerHTML = `<span style="color:var(--green-600)">✅ ${lugar}</span>`;
        setFieldValueGlobal('departamento', datos.departamento || '');
        setFieldValueGlobal('municipio',    datos.municipio    || '');
      } else {
        if (gpsSpinner) gpsSpinner.style.display = 'none';
        gpsText.innerHTML = `<span style="color:var(--green-600)">✅ ${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)}</span>`;
      }
    } catch (_) {
      if (gpsSpinner) gpsSpinner.style.display = 'none';
      gpsText.innerHTML = `<span style="color:var(--green-600)">✅ ${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)}</span>`;
    }

  } catch (err) {
    coordenadas.lat = null;
    coordenadas.lon = null;
    if (gpsSpinner) gpsSpinner.style.display = 'none';
    gpsText.innerHTML = `<span style="color:#e53e3e">⚠️ ${err.message}</span>`;
    const manualFields = document.getElementById('manual-location-fields');
    if (manualFields) { manualFields.style.display = 'block'; manualFields.style.opacity = '1'; }
    document.querySelector('input[name="ubicacion"][value="manual"]').checked = true;
    document.querySelector('input[value="gps"]')?.closest('.toggle-btn')?.classList.remove('active');
    document.querySelector('input[value="manual"]')?.closest('.toggle-btn')?.classList.add('active');

  } finally {
    gpsEnProgreso    = false;
    btnNext.disabled = false;
  }
}

// Helper global para setFieldValue (necesario porque lo usa obtenerUbicacionGPS)
function setFieldValueGlobal(name, value) {
  const el = document.querySelector(`[name="${name}"]`);
  if (el) el.value = value;
}

// ── DOMContentLoaded ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  let currentStep = 1;
  const totalSteps = 3;

  const stepInfo = {
    1: { title: 'Registrar cultivo',  desc: 'Completa la información de tu cultivo de maíz.' },
    2: { title: 'Tipo de suelo',      desc: 'Identifica el tipo de suelo y nivel de pH de tu cultivo.' },
    3: { title: 'Clima',              desc: 'Obtén el pronóstico de clima para tu zona de siembra.' },
  };

  const btnNext    = document.getElementById('btnNext');
  const btnConnect = document.getElementById('btnConnect');

  // ── Wizard ────────────────────────────────────────────────
  function updateWizard() {
    document.querySelectorAll('.wizard-step').forEach((step, i) => {
      step.classList.toggle('active', i + 1 === currentStep);
    });
    document.querySelectorAll('.step-item').forEach(item => {
      const n = parseInt(item.getAttribute('data-step'));
      item.classList.remove('active', 'completed');
      if (n === currentStep)    item.classList.add('active');
      else if (n < currentStep) item.classList.add('completed');
    });

    document.getElementById('step-title').textContent = stepInfo[currentStep].title;
    document.getElementById('step-desc').textContent  = stepInfo[currentStep].desc;
    btnNext.textContent = currentStep === totalSteps ? 'Finalizar Registro' : 'Continuar →';

    if (currentStep === 3 && coordenadas.lat) {
      cargarPronostico(coordenadas.lat, coordenadas.lon);
    }
  }

  // ── Botón siguiente ───────────────────────────────────────
  btnNext.addEventListener('click', async () => {
    if (gpsEnProgreso) {
      alert('⏳ Espera un momento, estamos obteniendo tu ubicación GPS...');
      return;
    }
    if (currentStep < totalSteps) {
      currentStep++;
      updateWizard();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      await finalizarRegistro();
    }
  });

  // ── Paso 1: Geolocalización ───────────────────────────────
  const manualFields     = document.getElementById('manual-location-fields');
  const municipioInput   = document.getElementById('municipio-input');
  const municipioSuggest = document.getElementById('municipio-suggestions');
  let busquedaTimeout    = null;

  document.querySelectorAll('input[name="ubicacion"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
      if (e.target.value === 'gps') {
        if (manualFields) manualFields.style.display = 'none';
        await obtenerUbicacionGPS();
      } else {
        if (manualFields) {
          manualFields.style.display = 'block';
          manualFields.style.opacity = '0';
          setTimeout(() => { manualFields.style.opacity = '1'; }, 10);
        }
        const estadoGPS = document.getElementById('gps-status');
        if (estadoGPS) estadoGPS.textContent = '';
        coordenadas.lat = null;
        coordenadas.lon = null;
      }
    });
  });

  // Iniciar GPS al cargar
  obtenerUbicacionGPS();

  // ── Autocompletado municipio ──────────────────────────────
  if (municipioInput) {
    municipioInput.addEventListener('input', (e) => {
      clearTimeout(busquedaTimeout);
      const texto = e.target.value.trim();
      if (texto.length < 3) { ocultarSugerencias(); return; }
      busquedaTimeout = setTimeout(() => buscarMunicipio(texto), 400);
    });
    municipioInput.addEventListener('blur', () => {
      setTimeout(ocultarSugerencias, 200);
    });
  }

  async function buscarMunicipio(texto) {
    if (!municipioSuggest) return;
    try {
      const { ok, datos } = await ClimaService.buscarLugar(texto);
      if (!ok || !datos.resultados?.length) { ocultarSugerencias(); return; }

      municipioSuggest.innerHTML = '';
      datos.resultados.slice(0, 5).forEach(r => {
        const li = document.createElement('li');
        li.textContent = r.nombre;
        li.style.cssText = 'padding:.5rem .75rem;cursor:pointer;border-bottom:1px solid var(--gray-100);font-size:.875rem;';
        li.addEventListener('mouseenter', () => li.style.background = 'var(--green-50)');
        li.addEventListener('mouseleave', () => li.style.background = '');
        li.addEventListener('click',      () => seleccionarLugar(r));
        municipioSuggest.appendChild(li);
      });
      municipioSuggest.style.display = 'block';
    } catch (err) {
      console.warn('Error búsqueda municipio:', err);
    }
  }

  function seleccionarLugar(lugar) {
    coordenadas.lat = lugar.lat;
    coordenadas.lon = lugar.lon;
    if (municipioInput) municipioInput.value = lugar.nombre;
    ocultarSugerencias();
    if (currentStep === 3) cargarPronostico(lugar.lat, lugar.lon);
  }

  function ocultarSugerencias() {
    if (municipioSuggest) municipioSuggest.style.display = 'none';
  }

  // Sincronizar departamento desde select manual
  const deptSelect = document.querySelector('select[name="departamento_manual"]');
  if (deptSelect) {
    deptSelect.addEventListener('change', (e) => {
      setFieldValueGlobal('departamento', e.target.value);
    });
  }

  // ── Paso 3: Pronóstico ────────────────────────────────────
  const climaContainer = document.getElementById('clima-forecast');

  async function cargarPronostico(lat, lon) {
    if (!climaContainer) return;
    climaContainer.innerHTML = '<p style="color:var(--gray-500);text-align:center;padding:1rem">⏳ Cargando pronóstico...</p>';

    try {
      const { ok, datos } = await ClimaService.obtenerPronostico(lat, lon);
      if (!ok) {
        climaContainer.innerHTML = '<p style="color:#e53e3e;text-align:center;padding:1rem">⚠️ No se pudo obtener el pronóstico.</p>';
        return;
      }

      const iconoClima = c => {
        if (c === 0)   return '☀️';
        if (c <= 2)    return '🌤️';
        if (c <= 3)    return '☁️';
        if (c <= 48)   return '🌫️';
        if (c <= 55)   return '🌦️';
        if (c <= 65)   return '🌧️';
        return '⛈️';
      };

      const hoy = new Date().toISOString().split('T')[0];
      climaContainer.innerHTML = datos.pronostico.map((dia, i) => {
        const fecha = new Date(dia.fecha + 'T12:00:00');
        const etiq  = i === 0 ? 'Hoy' : fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
        const esHoy = dia.fecha === hoy;
        return `
          <div style="background:${esHoy ? 'var(--green-50)' : 'var(--gray-50)'};
            border:1px solid ${esHoy ? 'var(--green-200)' : 'var(--gray-200)'};
            border-radius:12px;padding:.75rem 1rem;display:flex;align-items:center;
            gap:.75rem;margin-bottom:.5rem;">
            <div style="font-size:1.5rem;min-width:2rem;text-align:center">${iconoClima(dia.codigo_clima)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:.875rem;color:var(--gray-800)">${etiq}</div>
              <div style="font-size:.8rem;color:var(--gray-500)">${dia.descripcion}</div>
            </div>
            <div style="text-align:right;font-size:.8rem">
              <div style="font-weight:700;color:var(--gray-800)">${Math.round(dia.temp_max)}° / ${Math.round(dia.temp_min)}°</div>
              <div style="color:#3182ce">💧 ${dia.prob_lluvia ?? '--'}%</div>
              ${dia.lluvia_mm > 0 ? `<div style="color:#805ad5;font-size:.75rem">${dia.lluvia_mm.toFixed(1)} mm</div>` : ''}
            </div>
          </div>`;
      }).join('');

    } catch (err) {
      climaContainer.innerHTML = '<p style="color:#e53e3e;text-align:center;padding:1rem">⚠️ Error al cargar el pronóstico.</p>';
      console.error('Error clima:', err);
    }
  }

  // Botón conectar clima
  if (btnConnect) {
    btnConnect.addEventListener('click', function () {
      if (this.classList.contains('conectado')) return;
      this.textContent = '⏳ Cargando...';
      this.disabled = true;
      if (coordenadas.lat) {
        cargarPronostico(coordenadas.lat, coordenadas.lon);
        setTimeout(() => {
          this.textContent = '✅ Conectado';
          this.style.background = 'var(--green-600)';
        }, 1000);
      } else {
        this.textContent = '⚠️ Activa la ubicación en el paso 1';
        this.disabled = false;
        setTimeout(() => { this.textContent = '🔄 Reintentar'; this.disabled = false; }, 2000);
      }
      this.classList.add('conectado');
    });
  }

  // ── Finalizar registro ────────────────────────────────────
  async function finalizarRegistro() {
    btnNext.disabled = true;
    btnNext.innerHTML = '<div class="spinner" style="display:inline-block;margin-right:8px;border-top-color:white;border:2px solid rgba(255,255,255,.3);width:16px;height:16px;border-radius:50%;animation:spin 1s linear infinite;"></div> Guardando...';

    const form = document.getElementById('wizardForm');

    const datos = {
      departamento:   coordenadas.departamentoNombre ||
                      document.querySelector('select[name="departamento_manual"]')?.value ||
                      getFieldValue(form, '[name="departamento"]') || null,
      municipio:      coordenadas.municipioNombre ||
                      municipioInput?.value?.trim() || null,
      latitud:        coordenadas.lat,
      longitud:       coordenadas.lon,
      fecha_siembra:  getFieldValue(form, '[name="fecha_siembra"]'),
      tipo_manejo:    getFieldValue(form, '[name="manejo"]:checked'),
      tiene_analisis: getFieldValue(form, '[name="analisis"]:checked') === 'si',
      tipo_suelo:     getFieldValue(form, '[name="tipo_suelo"]:checked'),
      ph_suelo:       getFieldValue(form, '[name="ph"]:checked'),
    };

    console.log('Datos a enviar:', JSON.stringify(datos)); // debug

    if (!datos.fecha_siembra) {
      alert('Por favor selecciona la fecha de siembra antes de continuar.');
      resetBtn();
      return;
    }

    try {
      const { ok, datos: respuesta } = await CultivoService.registrar(datos);
      if (!ok) {
        alert(respuesta.mensaje || 'Error al guardar el cultivo.');
        resetBtn();
        return;
      }

      sessionStorage.setItem('agromaiz_cultivo', JSON.stringify({
        ...datos,
        cultivo_id: respuesta.cultivo?.id,
      }));

      window.location.href = 'que-hacer.html';

    } catch (err) {
      console.error('Error al guardar cultivo:', err);
      alert('No se pudo conectar al servidor. Verifica tu conexión.');
      resetBtn();
    }
  }

  function resetBtn() {
    btnNext.disabled = false;
    btnNext.textContent = 'Finalizar Registro';
  }

  function getFieldValue(form, selector) {
    return form?.querySelector(selector)?.value || '';
  }

  // ── Radio buttons visuales ────────────────────────────────
  function setupSelectionGroup(selectorItem, selectorInput) {
    document.querySelectorAll(selectorItem).forEach(item => {
      const input = item.querySelector(selectorInput);
      if (!input) return;
      input.addEventListener('change', (e) => {
        const name = e.target.name;
        document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
          r.closest(selectorItem)?.classList.remove('active');
        });
        item.classList.add('active');
      });
    });
  }

  setupSelectionGroup('.toggle-btn',     'input[type="radio"]');
  setupSelectionGroup('.toggle-btn-alt', 'input[type="radio"]');
  setupSelectionGroup('.option-card',    'input[type="radio"]');
  setupSelectionGroup('.ph-item',        'input[type="radio"]');

  updateWizard();
});