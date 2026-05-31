/* ============================================================
    AgroMaíz — js/cultivo-utils.js
    Utilidades compartidas para calcular la etapa del cultivo
    y personalizar el contenido según los datos registrados.
    Incluir ANTES de los scripts de página.
   ============================================================ */

window.CultivoUtils = (function () {

  /* ── Definición de etapas ─────────────────────────────── */
  const ETAPAS = [
    {
      id: 'siembra',
      nombre: 'Siembra y Emergencia',
      codigo: 'V0',
      diasMin: 0, diasMax: 10,
      emoji: '🌱',
      descripcion: 'El grano germina y emergen las primeras hojas.',
      recomendacion_principal: 'Verifica la humedad del suelo y asegúrate de que la emergencia sea uniforme.',
      tareas: [
        { id: 'riego',       icon: '💧', titulo: 'Revisión de humedad',  desc: 'Verifica que el suelo mantenga humedad suficiente para una buena germinación.' },
        { id: 'malezas',     icon: '🌿', titulo: 'Control temprano de malezas', desc: 'Elimina malezas antes de que compitan con las plántulas emergentes.' },
        { id: 'monitoreo',   icon: '🔍', titulo: 'Inspección de emergencia', desc: 'Comprueba que el porcentaje de emergencia sea superior al 85%.' },
      ],
    },
    {
      id: 'vegetativo_temprano',
      nombre: 'Crecimiento Vegetativo V3–V5',
      codigo: 'V3',
      diasMin: 11, diasMax: 30,
      emoji: '🌿',
      descripcion: 'El maíz desarrolla sus primeras hojas verdaderas.',
      recomendacion_principal: 'Es el momento ideal para la primera fertilización nitrogenada y control de malezas.',
      tareas: [
        { id: 'fertilizacion', icon: '🌱', titulo: 'Fertilización',       desc: 'Primera aplicación de nitrógeno (Urea o DAP). Etapa V3–V4.' },
        { id: 'malezas',       icon: '🌿', titulo: 'Revisión de malezas', desc: 'Controla malezas antes de que superen 10 cm de altura.' },
        { id: 'riego',         icon: '💧', titulo: 'Riego',                desc: 'Mantén humedad óptima para favorecer el desarrollo vegetativo.' },
        { id: 'monitoreo',     icon: '🐞', titulo: 'Monitoreo de plagas', desc: 'Revisa hojas inferiores en busca de gusano cogollero o pulgones.' },
      ],
    },
    {
      id: 'vegetativo_medio',
      nombre: 'Crecimiento Vegetativo V6–V8',
      codigo: 'V6',
      diasMin: 31, diasMax: 45,
      emoji: '🌾',
      descripcion: 'Periodo de crecimiento activo; el maíz desarrolla su estructura principal.',
      recomendacion_principal: 'Aplica riego ligero y monitorea posibles plagas en las hojas.',
      tareas: [
        { id: 'riego',         icon: '💧', titulo: 'Riego',                desc: 'Realizar riego ligero en la tarde para mantener humedad óptima.' },
        { id: 'monitoreo',     icon: '🐞', titulo: 'Monitoreo de plagas', desc: 'Revisar hojas inferiores en busca de plagas comunes.' },
        { id: 'malezas',       icon: '🌿', titulo: 'Revisión de malezas', desc: 'Verificar presencia de malezas y controlarlas si es necesario.' },
        { id: 'fertilizacion', icon: '🌱', titulo: 'Fertilización',        desc: 'Segunda aplicación de nitrógeno si el cultivo lo requiere.' },
      ],
    },
    {
      id: 'prefloracion',
      nombre: 'Pre-floración V9–V12',
      codigo: 'V9',
      diasMin: 46, diasMax: 58,
      emoji: '🌻',
      descripcion: 'El maíz se prepara para la floración; etapa crítica de demanda de agua.',
      recomendacion_principal: 'Garantiza riego suficiente. El déficit hídrico en esta etapa reduce severamente el rendimiento.',
      tareas: [
        { id: 'riego',         icon: '💧', titulo: 'Riego crítico',        desc: 'Agua abundante antes de la floración. No dejes secar el suelo.' },
        { id: 'monitoreo',     icon: '🐞', titulo: 'Monitoreo de plagas', desc: 'Inspección de plagas que puedan afectar las espigas.' },
        { id: 'fertilizacion', icon: '🌱', titulo: 'Fertilización foliar', desc: 'Considera una aplicación foliar si observas carencias nutricionales.' },
      ],
    },
    {
      id: 'floracion',
      nombre: 'Floración y Polinización',
      codigo: 'VT/R1',
      diasMin: 59, diasMax: 72,
      emoji: '🌸',
      descripcion: 'Emisión de espigas y sedas. Etapa más crítica del ciclo.',
      recomendacion_principal: 'Evita cualquier estrés hídrico. El riego es esencial para asegurar la polinización.',
      tareas: [
        { id: 'riego',         icon: '💧', titulo: 'Riego urgente',        desc: 'La floración requiere máxima disponibilidad de agua. Riega a diario si es posible.' },
        { id: 'monitoreo',     icon: '🐞', titulo: 'Monitoreo de plagas', desc: 'Plagas que dañen las espigas o sedas afectan directamente el rendimiento.' },
      ],
    },
    {
      id: 'llenado',
      nombre: 'Llenado de Grano R2–R4',
      codigo: 'R2',
      diasMin: 73, diasMax: 95,
      emoji: '🌽',
      descripcion: 'El grano acumula almidón y toma su forma definitiva.',
      recomendacion_principal: 'Mantén riego regular. Evalúa el estado sanitario del cultivo.',
      tareas: [
        { id: 'riego',       icon: '💧', titulo: 'Riego',                desc: 'Mantén humedad para maximizar el llenado del grano.' },
        { id: 'monitoreo',   icon: '🔍', titulo: 'Revisión sanitaria',   desc: 'Inspecciona mazorcas por hongos o daño de insectos.' },
      ],
    },
    {
      id: 'madurez',
      nombre: 'Madurez Fisiológica R5–R6',
      codigo: 'R5',
      diasMin: 96, diasMax: 130,
      emoji: '🟡',
      descripcion: 'El grano completa su madurez. Preparación para cosecha.',
      recomendacion_principal: 'Reduce el riego. Prepara los equipos y planea la fecha de cosecha.',
      tareas: [
        { id: 'monitoreo', icon: '🔍', titulo: 'Evaluación de cosecha', desc: 'Verifica el punto negro del grano y el nivel de humedad (≤25%).' },
      ],
    },
  ];

  /* ── Calcular días desde siembra ─────────────────────── */
  function diasDesdeSiembra(fechaSiembra) {
    const siembra = new Date(fechaSiembra + 'T00:00:00');
    const hoy     = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((hoy - siembra) / 86400000));
  }

  /* ── Obtener etapa según días ─────────────────────────── */
  function etapaPorDias(dias) {
    for (const e of ETAPAS) {
      if (dias >= e.diasMin && dias <= e.diasMax) return e;
    }
    // Más de 130 días: post-cosecha
    if (dias > 130) return { ...ETAPAS[ETAPAS.length - 1], nombre: 'Post-cosecha / Próximo ciclo', emoji: '✅' };
    return ETAPAS[0];
  }

  /* ── API pública ──────────────────────────────────────── */
  return {
    ETAPAS,
    diasDesdeSiembra,
    etapaPorDias,

    /** Devuelve { dias, etapa } dado un cultivo del backend */
    calcular(cultivo) {
      if (!cultivo || !cultivo.fecha_siembra) return { dias: 0, etapa: ETAPAS[0] };
      const dias  = diasDesdeSiembra(cultivo.fecha_siembra);
      const etapa = etapaPorDias(dias);
      return { dias, etapa };
    },

    /** Fecha de hoy en español: "Miércoles, 15 de mayo" */
    fechaHoyEspanol() {
      return new Date().toLocaleDateString('es-CO', {
        weekday: 'long', day: 'numeric', month: 'long',
      }).replace(/^\w/, c => c.toUpperCase());
    },

    /** Texto de tipo de manejo */
    textoManejo(tipo) {
      return tipo === 'riego' ? 'Con riego' : 'Solo lluvia';
    },
  };
})();