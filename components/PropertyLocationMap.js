'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function PropertyLocationMap({ latitude, longitude, address }) {
  if (!latitude || !longitude) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <h3 className="display" style={{ fontSize: 18, marginBottom: 10 }}>Localização</h3>
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
    </div>
  );
}
