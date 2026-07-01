/**
 * Fetches nearby tourist places from Google Places API.
 * Requires GOOGLE_MAPS_API_KEY environment variable on the API server.
 */

export type NearbyPlace = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  distance: number | null;
  rating: number | null;
  source: "google" | "database";
};

const TYPE_TO_CATEGORY: Record<string, string> = {
  tourist_attraction: "tourist_spot",
  museum: "cultural",
  park: "park",
  amusement_park: "adventure",
  shopping_mall: "shopping",
  restaurant: "restaurant",
  cafe: "restaurant",
  natural_feature: "tourist_spot",
  point_of_interest: "tourist_spot",
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function geocodeLocation(query: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: { geometry?: { location?: { lat: number; lng: number } } }[] };
  const loc = data.results?.[0]?.geometry?.location;
  return loc ? { lat: loc.lat, lng: loc.lng } : null;
}

export async function fetchGoogleNearbyPlaces(
  lat: number,
  lng: number,
  apiKey: string,
  category?: string
): Promise<NearbyPlace[]> {
  const types = category && category !== "all"
    ? [category === "tourist_spot" ? "tourist_attraction" : category === "beach" ? "natural_feature" : category]
    : ["tourist_attraction", "museum", "park", "restaurant"];

  const seen = new Set<string>();
  const results: NearbyPlace[] = [];

  for (const type of types) {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=8000&type=${type}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const data = (await res.json()) as {
      results?: {
        place_id: string;
        name: string;
        vicinity?: string;
        formatted_address?: string;
        geometry?: { location?: { lat: number; lng: number } };
        rating?: number;
        types?: string[];
      }[];
    };

    for (const place of data.results || []) {
      if (seen.has(place.place_id)) continue;
      seen.add(place.place_id);
      const plat = place.geometry?.location?.lat ?? null;
      const plng = place.geometry?.location?.lng ?? null;
      const primaryType = place.types?.find((t) => TYPE_TO_CATEGORY[t]) || "point_of_interest";
      results.push({
        id: `google_${place.place_id}`,
        name: place.name,
        category: TYPE_TO_CATEGORY[primaryType] || "tourist_spot",
        description: null,
        address: place.vicinity || place.formatted_address || null,
        latitude: plat,
        longitude: plng,
        distance: plat != null && plng != null ? Math.round(haversineKm(lat, lng, plat, plng) * 10) / 10 : null,
        rating: place.rating ?? null,
        source: "google",
      });
    }
  }

  return results.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
}
