/**
 * Commute Time Evaluation Service
 * Interfaces with Google Maps Distance Matrix API for research-grade accuracy.
 */
import axios from 'axios';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'dummy-api-key';
const COMMUTE_PROXY_URL = import.meta.env.VITE_COMMUTE_PROXY_URL || '';

/**
 * Calculates commute data using Google Maps Distance Matrix API.
 * Falls back to Haversine calculation if API fails or for demo mode.
 * 
 * @param {Object} origin - { lat, lng }
 * @param {Object} destination - { lat, lng }
 * @returns {Object} commute analytics
 */
export async function getCommuteData(origin, destination) {
  const originLat = Number(origin?.lat);
  const originLng = Number(origin?.lng);
  const destinationLat = Number(destination?.lat);
  const destinationLng = Number(destination?.lng);

  if (![originLat, originLng, destinationLat, destinationLng].every(Number.isFinite)) {
    return null;
  }

  const originStr = `${originLat},${originLng}`;
  const destStr = `${destinationLat},${destinationLng}`;

  try {
    // 1. Preferred: backend proxy for stable production behavior.
    if (COMMUTE_PROXY_URL) {
      const proxyResponse = await axios.get(COMMUTE_PROXY_URL, {
        params: { origins: originStr, destinations: destStr, mode: 'transit' },
        timeout: 6000
      });
      const normalized = normalizeDistanceMatrixResponse(proxyResponse.data);
      if (normalized) return normalized;
    }

    // 2. Fallback: direct browser call (works only with compatible key restrictions).
    const mode = "transit";
    const isDemo = GOOGLE_MAPS_API_KEY === 'dummy-api-key';

    if (!isDemo) {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/distancematrix/json`,
        {
          params: {
            origins: originStr,
            destinations: destStr,
            mode: mode,
            key: GOOGLE_MAPS_API_KEY
          },
          timeout: 6000
        }
      );

      const normalized = normalizeDistanceMatrixResponse(response.data);
      if (normalized) return normalized;
    }

    // 3. Guaranteed fallback: geospatial estimate always returns.
    return getHaversineCommute(
      { lat: originLat, lng: originLng },
      { lat: destinationLat, lng: destinationLng }
    );

  } catch (error) {
    console.warn("Google Maps API Error, falling back to Haversine:", error);
    return getHaversineCommute(
      { lat: originLat, lng: originLng },
      { lat: destinationLat, lng: destinationLng }
    );
  }
}

function normalizeDistanceMatrixResponse(payload) {
  if (!payload || payload.status !== "OK") return null;
  const element = payload.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") return null;

  const distanceKm = element.distance.value / 1000;
  const transitMinutes = Math.max(1, Math.round(element.duration.value / 60));

  return {
    distance: parseFloat(distanceKm.toFixed(1)),
    durationText: element.duration.text,
    distanceText: element.distance.text,
    modes: {
      walking: Math.max(1, Math.round(distanceKm * 12)),
      cycling: Math.max(1, Math.round(distanceKm * 4)),
      transit: transitMinutes,
      driving: Math.max(1, Math.round(distanceKm * 3 + 2))
    },
    rating: getCommuteRating(transitMinutes),
    source: 'Google Maps API'
  };
}

function getHaversineCommute(origin, destination) {
  const distanceKm = calculateHaversineDistance(
    origin.lat, origin.lng, 
    destination.lat, destination.lng
  );

  const walkingTime = Math.round(distanceKm * 12);
  const transitTime = Math.round(distanceKm * 6 + 4);

  return {
    distance: parseFloat(distanceKm.toFixed(1)),
    durationText: `${transitTime} mins`,
    distanceText: `${distanceKm.toFixed(1)} km`,
    modes: {
      walking: walkingTime,
      cycling: Math.round(distanceKm * 3.5),
      transit: transitTime,
      driving: Math.round(distanceKm * 2.5 + 3)
    },
    rating: getCommuteRating(transitTime),
    source: 'Haversine Model'
  };
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getCommuteRating(timeMinutes) {
  if (timeMinutes <= 15) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50' };
  if (timeMinutes <= 30) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (timeMinutes <= 45) return { label: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-50' };
  return { label: 'Long', color: 'text-red-600', bg: 'bg-red-50' };
}

/**
 * Saves computed commute results to Firebase Firestore.
 * Stored under users/{userId}/commuteCache/{propertyId}
 * This avoids re-calculating or re-calling the Google Maps API for the same pair.
 *
 * @param {string} userId - Firebase Auth UID
 * @param {string} propertyId - ID of the property
 * @param {Object} commuteResult - The result from getCommuteData()
 * @param {Object} origin - { lat, lng } of the property
 * @param {Object} destination - { lat, lng } of the campus
 */
export async function saveCommuteToFirebase(userId, propertyId, commuteResult, origin, destination) {
  if (!userId || !propertyId || !commuteResult) return;
  try {
    const cacheRef = doc(db, `users/${userId}/commuteCache`, propertyId);
    await setDoc(cacheRef, {
      propertyId,
      origin,
      destination,
      distance: commuteResult.distance,
      distanceText: commuteResult.distanceText,
      durationText: commuteResult.durationText,
      transitMinutes: commuteResult.modes?.transit,
      walkingMinutes: commuteResult.modes?.walking,
      cyclingMinutes: commuteResult.modes?.cycling,
      drivingMinutes: commuteResult.modes?.driving,
      rating: commuteResult.rating?.label,
      source: commuteResult.source,
      cachedAt: new Date()
    }, { merge: true });
  } catch (e) {
    console.warn("Could not save commute data to Firebase:", e);
  }
}
