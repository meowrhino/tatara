/* ============================================================
   validar.mjs — el que diu schema/<tipus>.json, comprovat també
   aquí: el que VS Code subratlla en vermell, i la
   revisió (npm run check, i la publicació) ho atura. No toca el disc.
   ------------------------------------------------------------
   De JAMstack (oriol, amb patternProperties d'almarbra i la
   "description" al "falta" de quienNoCorre), en català. Només el que
   fan servir aquests esquemes (type, enum, pattern, required,
   properties, additionalProperties, items, maxItems, minimum, anyOf
   i $ref als seus $defs): quaranta línies en lloc d'una dependència.
   Torna els errors, o [] si està bé.
   ============================================================ */
export function validar(dada, esquema, fitxer) {
  const TIPUS = { string: 'un text entre cometes', number: 'un número', boolean: 'true o false',
                  array: 'una llista [ … ]', object: 'un bloc { … }', null: 'null' };
  const tipus = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  // un $ref porta al seu $defs; el que hi ha al costat (la description) mana
  const def = s => (s.$ref ? { ...esquema.$defs[s.$ref.split('/').pop()], ...s, $ref: undefined } : s);
  const tipusOk = (v, s) => !s.type || [].concat(s.type).includes(tipus(v));
  function mirar(v, s, cami) {
    s = def(s);
    const on = cami.length ? `"${cami.join(' → ')}"` : 'el fitxer';
    const pista = s.description ? ` (${s.description})` : '';
    if (s.anyOf) {
      const opcions = s.anyOf.map(def);
      if (opcions.some(o => !mirar(v, o, cami).length)) return [];
      const seva = opcions.find(o => tipusOk(v, o));
      return seva ? mirar(v, seva, cami) : [`${on} no val així${pista}`];
    }
    if (!tipusOk(v, s)) return [`${on} ha de ser ${[].concat(s.type).map(t => TIPUS[t]).join(' o ')}${pista}`];
    const e = [];
    if (s.enum && !s.enum.includes(v)) e.push(`${on}: "${v}" no val; ha de ser ${s.enum.map(x => `"${x}"`).join(', ')}`);
    if (s.pattern && typeof v === 'string' && !new RegExp(s.pattern).test(v)) e.push(`${on}: "${v}" no té la forma que toca${pista}`);
    if (s.minimum != null && typeof v === 'number' && v < s.minimum) e.push(`${on} ha de ser ${s.minimum} o més`);
    if (Array.isArray(v)) {
      if (s.maxItems != null && v.length > s.maxItems) e.push(`${on}: com a molt ${s.maxItems}`);
      if (s.items) v.forEach((x, i) => e.push(...mirar(x, s.items, [...cami, String(i + 1)])));
    } else if (tipus(v) === 'object') {
      for (const r of s.required || []) if (!(r in v)) e.push(`falta "${r}"${cami.length ? ` a ${on}` : ''}${s.properties?.[r]?.description ? ` (${s.properties[r].description})` : ''}`);
      for (const [k, x] of Object.entries(v)) {
        const patro = Object.entries(s.patternProperties || {}).find(([p]) => new RegExp(p).test(k));
        if (s.properties?.[k]) e.push(...mirar(x, s.properties[k], [...cami, k]));
        else if (patro) e.push(...mirar(x, patro[1], [...cami, k]));
        else if (typeof s.additionalProperties === 'object') e.push(...mirar(x, s.additionalProperties, [...cami, k]));
        else if (s.additionalProperties === false) {
          const hi = Object.keys(s.properties || {}).filter(p => p !== '$schema' && p !== '_');
          e.push(`"${[...cami, k].join(' → ')}" no és un camp d'aquí (mal escrit?). Els que hi ha: ${hi.join(', ')}`);
        }
      }
    }
    return e;
  }
  return mirar(dada, esquema, []).map(m => `${fitxer}: ${m}`);
}
