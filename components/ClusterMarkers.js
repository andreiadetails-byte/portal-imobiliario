'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

export default function ClusterMarkers({ properties }) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      iconCreateFunction: (cluster) => L.divIcon({
        html: `<div style="
          background: #5A6B49; color: #fff; border-radius: 50%; width: 38px; height: 38px;
          display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px;
          border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        ">${cluster.getChildCount()}</div>`,
        className: '',
        iconSize: [38, 38],
      }),
    });

    properties.forEach((p) => {
      const marker = L.circleMarker([p.latitude, p.longitude], {
        radius: 7, color: '#5A6B49', fillColor: '#7E8F6A', fillOpacity: 0.9,
      });
      marker.bindPopup(
        `<b>${p.typology} · ${p.address}</b><br/>${Number(p.price).toLocaleString('pt-PT')} €`
      );
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    return () => { map.removeLayer(clusterGroup); };
  }, [map, properties]);

  return null;
}
