'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabaseClient';

export default function MiniMapPreview() {
  const [points, setPoints] = useState([]);
  const [shownCount, setShownCount] = useState(0);

  useEffect(() => {
    supabase
      .from('properties')
      .select('id, latitude, longitude')
      .eq('status', 'ativo')
      .not('latitude', 'is', null)
      .limit(80)
      .then(({ data }) => setPoints(data || []));
  }, []);

  useEffect(() => {
    if (points.length === 0) return;
    setShownCount(0);
    const interval = setInterval(() => {
      setShownCount((c) => {
        if (c >= points.length) { clearInterval(interval); return c; }
        return c + 1;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [points]);

  if (points.length === 0) return null;

  return (
    <div style={{ height: 260, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)' }}>
      <MapContainer
        center={[39.5, -8.0]}
        zoom={6}
        minZoom={5}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        maxBounds={[[29.0, -32.0], [43.5, -5.5]]}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        {points.slice(0, shownCount).map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.latitude, p.longitude]}
            radius={5}
            pathOptions={{ color: '#5A6B49', fillColor: '#7E8F6A', fillOpacity: 0.85 }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
