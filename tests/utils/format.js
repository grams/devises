"use strict";

// Reproduit exactement les fonctions de formatage de index.html, afin de
// calculer les valeurs attendues dans les tests sans dupliquer les nombres
// à la main (et donc sans divergence d'arrondi/séparateur avec l'app).

function fmt(n) {
  if (!isFinite(n)) return "—";
  const a = Math.abs(n);
  const d = a >= 1000 ? 0 : a >= 1 ? 2 : a > 0 ? 4 : 0;
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: d }).format(n);
}

function groupThousands(intStr) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(intStr || "0"));
}

function prettyExpr(s) {
  s = s || "";
  if (!s) return "0";
  const withGrouping = s.replace(/\d+\.?\d*|\.\d+/g, (m) => {
    const dot = m.indexOf(".");
    if (dot === -1) return groupThousands(m);
    const intPart = m.slice(0, dot);
    const frac = m.slice(dot + 1);
    return groupThousands(intPart) + "," + frac;
  });
  return withGrouping.replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−");
}

module.exports = { fmt, prettyExpr };
