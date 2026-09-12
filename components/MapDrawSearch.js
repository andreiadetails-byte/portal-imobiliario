'use client';

import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ClusterMarkers from './ClusterMarkers';

// Corrige o mapa quando se chega a esta página sem recarregar o site
// (navegação entre páginas), em que o Leaflet às vezes não sabe logo o tamanho certo.
function FixMapSize() {
  const map = useMap();
  useEffect(() => {
    const timers = [100, 300, 600].map((ms) => setTimeout(() => map.invalidateSize(), ms));
    return () => timers.forEach(clearTimeout);
  }, [map]);
  return null;
}

// Algoritmo simples de "ponto dentro do polígono" (ray casting)
function pointInPolygon(point, polygon) {
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    const intersects =
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (intersects) inside = !inside;
  }
  return inside;
}

function DrawClickHandler({ drawing, onPoint }) {
  useMapEvents({
    click(e) {
      if (drawing) onPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function MapInner({ drawing, points, setPoints, withCoords }) {
  return (
    <MapContainer
      center={[39.5, -8.0]}
      zoom={7}
      minZoom={5}
      maxBounds={[[29.0, -32.0], [43.5, -5.5]]}
      maxBoundsViscosity={1.0}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <DrawClickHandler drawing={drawing} onPoint={(pt) => setPoints((cur) => [...cur, pt])} />
      <FixMapSize />

      {points.length > 0 && (
        <Polygon positions={points} pathOptions={{ color: '#5A6B49', fillColor: '#7E8F6A', fillOpacity: 0.25 }} />
      )}

      {withCoords.length > 0 && !drawing && <ClusterMarkers properties={withCoords} />}
    </MapContainer>
  );
}

export default function MapDrawSearch({ properties, onFilter, fetchAllWithCoords, height = 260, autoStart = false }) {
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [searching, setSearching] = useState(false);

  const withCoords = useMemo(
    () => properties.filter((p) => p.latitude != null && p.longitude != null),
    [properties]
  );

  function startDrawing() {
    setPoints([]);
    setDrawing(true);
    onFilter(null);
    if (typeof document !== 'undefined') document.body.style.overflow = 'hidden';
  }

  useEffect(() => {
    if (autoStart) startDrawing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    // Garante que o scroll da página volta ao normal, mesmo que o componente desapareça a meio.
    return () => { if (typeof document !== 'undefined') document.body.style.overflow = ''; };
  }, []);

  async function finishDrawing() {
    if (points.length < 3) return;
    setSearching(true);

    // Procura em TODOS os imóveis com coordenadas (não só nos que já estavam à vista nesta página).
    const allWithCoords = fetchAllWithCoords ? await fetchAllWithCoords() : withCoords;

    const matchingIds = allWithCoords
      .filter((p) => p.latitude != null && p.longitude != null && pointInPolygon([p.latitude, p.longitude], points))
      .map((p) => p.id);

    setSearching(false);
    setDrawing(false);
    document.body.style.overflow = '';
    onFilter(matchingIds);
  }

  function clearDrawing() {
    setPoints([]);
    setDrawing(false);
    document.body.style.overflow = '';
    onFilter(null);
  }

  // Enquanto se está a desenhar, o mapa aparece numa janela grande por cima de tudo —
  // assim nunca é preciso subir/descer a página para chegar lá.
  if (drawing) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(30,26,18,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
        <div style={{
          background: 'var(--paper)', borderRadius: 10, padding: 16, width: '100%', maxWidth: 900,
          height: '85vh', maxHeight: 700, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: 0 }}>
              Clique no mapa para marcar os cantos da zona (mínimo 3 pontos).
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={finishDrawing} className="btn btn-primary" style={{ fontSize: 13 }} disabled={points.length < 3 || searching}>
                {searching ? 'A procurar...' : `Concluir zona (${points.length} pontos)`}
              </button>
              <button type="button" onClick={clearDrawing} className="btn" style={{ fontSize: 13 }}>
                Cancelar
              </button>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-soft)', margin: '0 0 10px' }}>
            💡 Rode a roda do rato sobre o mapa para aproximar e ver as freguesias com mais detalhe.
          </p>
          <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
            <MapInner drawing={drawing} points={points} setPoints={setPoints} withCoords={withCoords} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={startDrawing} className="btn" style={{ fontSize: 13 }}>
          ✏️ Desenhar zona no mapa
        </button>
        {points.length > 0 && (
          <button type="button" onClick={clearDrawing} className="btn" style={{ fontSize: 13 }}>
            ✕ Limpar zona
          </button>
        )}
      </div>

      <p style={{ fontSize: 11.5, color: 'var(--text-soft)', marginBottom: 8 }}>
        Mapa opcional para desenhar uma zona de pesquisa. Se preferir, pode filtrar por localidade, preço e características diretamente no formulário, sem usar o mapa.
      </p>

      <div style={{ height, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }} role="img" aria-label="Mapa de Portugal com os imóveis desta pesquisa">
        <MapInner drawing={drawing} points={points} setPoints={setPoints} withCoords={withCoords} />
      </div>
    </div>
  );
}
