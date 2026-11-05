"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const icon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

type Day = {
  day: number;
  title: string;
  location: string;
  lat: number;
  lng: number;
};

export function ItineraryMap({
  days,
  activeDay,
  onDayClick,
}: {
  days: Day[];
  activeDay: number | null;
  onDayClick: (i: number) => void;
}) {
  if (!days.length) return null;

  const positions: [number, number][] = days.map((d) => [d.lat, d.lng]);
  const center = positions[activeDay ?? 0] ?? positions[0];

  return (
    <MapContainer
      center={center}
      zoom={8}
      scrollWheelZoom={false}
      style={{ height: 300, width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={positions} color="#0d9488" weight={2} dashArray="6" />
      {days.map((day, i) => (
        <Marker
          key={i}
          position={[day.lat, day.lng]}
          icon={icon}
          eventHandlers={{ click: () => onDayClick(i) }}
        >
          <Popup>
            <strong>Day {day.day}:</strong> {day.title}
            <br />
            <span className="text-xs">{day.location}</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
