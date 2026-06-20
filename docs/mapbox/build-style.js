/*
 * Toma el template de Mapbox Navigation Night v1 y lo transforma a la paleta
 * verde-oliva del diseno Home v2 (designs/home-v2.pen).
 *
 * Estrategia: shift global de matiz a verde (H=120, S=20%) preservando la
 * lightness relativa, luego overrides explicitos por capa para water, land,
 * buildings, etiquetas y POIs (escondidos).
 *
 * Uso: node docs/mapbox/build-style.js
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, 'template-navigation-night-v1.json');
const OUTPUT = path.join(__dirname, 'roadtrip-night.style.json');

const PENCIL = {
  bg: '#0A1A0A', // land base
  landParks: '#0E1A0E', // parks/landcover
  water: '#0D1117', // water (tinte navy del horizonte)
  building: '#0F1A0F', // edificios 3D
  roadStreet: '#1A2A1A',
  roadCasing: '#152015',
  roadPrimary: '#1F2F1F',
  roadMotorway: '#2A3A2A',
  labelMain: 'hsla(0, 0%, 100%, 0.7)',
  labelSecondary: 'hsla(0, 0%, 100%, 0.45)',
  labelHalo: '#0A1A0A',
};

/**
 * Transforma un string de color HSL/HSLA al esquema verde-oliva.
 * - Colores de trafico (rojo/naranja/amarillo) se preservan.
 * - Blancos puros (L>=90) se mantienen blancos.
 * - Resto: H=120, S=20% (verde muteado), L preservada.
 */
function transformColor(value) {
  if (typeof value !== 'string') return value;
  const re = /hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)/g;
  return value.replace(re, (_m, h, s, l, a) => {
    h = Number(h);
    s = Number(s);
    l = Number(l);
    const alpha = a !== undefined ? Number(a) : null;

    // Preserva trafico (naranja/rojo vibrantes)
    const isTraffic = (h <= 60 || h >= 330) && s >= 40;
    if (isTraffic) {
      return alpha !== null
        ? `hsla(${h}, ${s}%, ${l}%, ${alpha})`
        : `hsl(${h}, ${s}%, ${l}%)`;
    }

    // Preserva blancos/casi-blancos (etiquetas, halos claros)
    if (l >= 85) {
      return alpha !== null ? `hsla(0, 0%, 100%, ${alpha})` : `hsl(0, 0%, 100%)`;
    }

    // Resto: olive shift
    const newH = 120;
    const newS = 20;
    const newL = Math.max(6, Math.min(60, l)); // clamp a rango razonable
    return alpha !== null
      ? `hsla(${newH}, ${newS}%, ${newL}%, ${alpha})`
      : `hsl(${newH}, ${newS}%, ${newL}%)`;
  });
}

function deepTransform(node) {
  if (node === null || node === undefined) return node;
  if (typeof node === 'string') return transformColor(node);
  if (Array.isArray(node)) return node.map(deepTransform);
  if (typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = deepTransform(v);
    return out;
  }
  return node;
}

/**
 * Aplica overrides explicitos por id de capa.
 * Esto va DESPUES del transform global, para fijar los colores criticos
 * exactamente a la paleta del Pencil sin depender del HSL convertido.
 */
function applyLayerOverrides(layers) {
  const overrides = {
    land: { paint: { 'background-color': PENCIL.bg } },
    landcover: { paint: { 'fill-color': PENCIL.landParks } },
    'national-park': { paint: { 'fill-color': PENCIL.landParks } },
    landuse: { paint: { 'fill-color': PENCIL.landParks } },
    water: { paint: { 'fill-color': PENCIL.water } },
    waterway: { paint: { 'line-color': PENCIL.water } },
    building: { paint: { 'fill-color': PENCIL.building, 'fill-opacity': 0.7 } },
    'building-outline': { paint: { 'line-color': PENCIL.roadCasing } },
    'aeroway-polygon': { paint: { 'fill-color': PENCIL.bg } },
    'aeroway-line': { paint: { 'line-color': PENCIL.roadCasing } },
  };

  // Carreteras: family-based override segun nombre de capa
  for (const layer of layers) {
    const id = layer.id;
    if (id in overrides) {
      Object.assign((layer.paint = layer.paint || {}), overrides[id].paint);
    }

    if (!layer.paint) continue;

    // Motorway / Trunk (autopistas)
    if (/motorway|trunk/.test(id) && !/case|shield|label/.test(id)) {
      if ('line-color' in layer.paint) layer.paint['line-color'] = PENCIL.roadMotorway;
    }
    // Casing layers (perfilado)
    if (/-case/.test(id)) {
      if ('line-color' in layer.paint) layer.paint['line-color'] = PENCIL.roadCasing;
    }
    // Primary / Secondary / Tertiary
    if (/primary|secondary|tertiary/.test(id) && !/case|shield|label/.test(id)) {
      if ('line-color' in layer.paint) layer.paint['line-color'] = PENCIL.roadPrimary;
    }
    // Street / minor
    if (/street|minor/.test(id) && !/case|shield|label/.test(id)) {
      if ('line-color' in layer.paint) layer.paint['line-color'] = PENCIL.roadStreet;
    }

    // Labels: blanco translucido con halo oscuro
    if (layer.type === 'symbol' && /label/.test(id)) {
      if (layer.paint['text-color']) {
        const isMain = /country|state|settlement-major/.test(id);
        layer.paint['text-color'] = isMain ? PENCIL.labelMain : PENCIL.labelSecondary;
      }
      if (layer.paint['text-halo-color'])
        layer.paint['text-halo-color'] = PENCIL.labelHalo;
      if (layer.paint['text-halo-width'] === undefined)
        layer.paint['text-halo-width'] = 1.5;
    }
  }

  // Esconder capas ruidosas (POIs, aeropuertos, intersecciones, naturals)
  // Los gas stations los dibuja la app encima como overlay propio.
  const hideIds = new Set([
    'poi-label',
    'airport-label',
    'natural-line-label',
    'natural-point-label',
    'water-line-label',
    'water-point-label',
    'waterway-label',
    'road-intersection',
    'road-number-shield-navigation',
    'road-exit-shield-navigation',
    'ferry-aerialway-label',
    'admin-1-boundary',
    'admin-0-boundary-disputed',
    'pitch-outline',
  ]);
  for (const layer of layers) {
    if (hideIds.has(layer.id)) {
      layer.layout = layer.layout || {};
      layer.layout.visibility = 'none';
    }
  }
}

const tpl = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const transformed = deepTransform(tpl);
applyLayerOverrides(transformed.layers);
transformed.name = 'roadtrip-night';
transformed.metadata = {
  ...(transformed.metadata || {}),
  'mapbox:autocomposite': true,
  'mapbox:type': 'default',
  'mapbox:origin': 'roadtrip-pencil-home-v2',
};

fs.writeFileSync(OUTPUT, JSON.stringify(transformed, null, 2));
console.log(`Wrote ${OUTPUT} (${fs.statSync(OUTPUT).size} bytes)`);
console.log(`Layers: ${transformed.layers.length}`);
