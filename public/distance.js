export function straightDistance(a, b) {
  const rad = value => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function formatDistance(meters) {
  return meters < 1000 ? `${Math.round(meters).toLocaleString('ko-KR')} m` : `${(meters / 1000).toLocaleString('ko-KR', { maximumFractionDigits: 2 })} km`;
}
export function mapUrl(a, b, mode) {
  if (mode === 'driving') return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${a.lat}%2C${a.lon}%3B${b.lat}%2C${b.lon}`;
  const params = new URLSearchParams({ bbox: `${Math.min(a.lon,b.lon)-0.005},${Math.min(a.lat,b.lat)-0.005},${Math.max(a.lon,b.lon)+0.005},${Math.max(a.lat,b.lat)+0.005}` });
  return `https://www.openstreetmap.org/?${params}`;
}
