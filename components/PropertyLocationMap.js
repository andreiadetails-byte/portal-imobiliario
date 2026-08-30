'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function PropertyLocationMap({ latitude, longitude, address }) {
  if (!latitude && !longitude && !address) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <h3 className="display" style={{ fontSize: 18, margin: 0 }}>Localização</h3>
        {address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12.5, color: 'var(--telha)', fontWeight: 600 }}
          >
            Ver no Google Maps ↗
          </a>
        )}
      </div>
      {latitude && longitude && (
        <div style={{ height: 260, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
          <MapContainer
            center={[latitude, longitude]}
            zoom={15}
            minZoom={5}
            maxBounds={[[29.0, -32.0], [43.5, -5.5]]}
            maxBoundsViscosity={1.0}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <CircleMarker center={[latitude, longitude]} radius={10} pathOptions={{ color: '#5A6B49', fillColor: '#7E8F6A', fillOpacity: 0.9 }}>
              <Popup>{address}</Popup>
            </CircleMarker>
          </MapContainer>
        </div>
      )}
    </div>
  );
}
