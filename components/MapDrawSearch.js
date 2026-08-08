'use client';

import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMapEvents, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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

export default function MapDrawSearch({ properties, onFilter, height = 260 }) {
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);

  const withCoords = useMemo(
    () => properties.filter((p) => p.latitude != null && p.longitude != null),
    [properties]
  );

  function startDrawing() {
    setPoints([]);
    setDrawing(true);
    onFilter(null);
  }

  function finishDrawing() {
    if (points.length < 3) return;
    setDrawing(false);
    const matchingIds = withCoords
      .filter((p) => pointInPolygon([p.latitude, p.longitude], points))
      .map((p) => p.id);
    onFilter(matchingIds);
  }

  function clearDrawing() {
    setPoints([]);
    setDrawing(false);
    onFilter(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {!drawing ? (
          <button type="button" onClick={startDrawing} className="btn" style={{ fontSize: 13 }}>
            ✏️ Desenhar zona no mapa
          </button>
        ) : (
          <>
            <button type="button" onClick={finishDrawing} className="btn btn-primary" style={{ fontSize: 13 }} disabled={points.length < 3}>
              Concluir zona ({points.length} pontos)
            </button>
            <button type="button" onClick={clearDrawing} className="btn" style={{ fontSize: 13 }}>
              Cancelar
            </button>
          </>
        )}
        {!drawing && points.length > 0 && (
          <button type="button" onClick={clearDrawing} className="btn" style={{ fontSize: 13 }}>
            ✕ Limpar zona
          </button>
        )}
      </div>

      {drawing && (
        <p style={{ fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 8 }}>
          Clique no mapa para marcar os cantos da zona (mínimo 3 pontos), depois clique em "Concluir zona".
        </p>
      )}

      <div style={{ height, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
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

          {points.length > 0 && (
            <Polygon positions={points} pathOptions={{ color: '#5A6B49', fillColor: '#7E8F6A', fillOpacity: 0.25 }} />
          )}

          {withCoords.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.latitude, p.longitude]}
              radius={7}
              pathOptions={{ color: '#5A6B49', fillColor: '#7E8F6A', fillOpacity: 0.9 }}
            >
              <Popup>
                {p.typology} · {p.address}<br />
                {Number(p.price).toLocaleString('pt-PT')} €
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
