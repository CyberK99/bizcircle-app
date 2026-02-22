interface GeocodeResult {
  county_fips: string;
  county_name: string;
  state_code: string;
  state_name: string;
  latitude: number;
  longitude: number;
}

/**
 * Census Geocoder API — free, no API key needed.
 * Resolves a street address to county FIPS code.
 */
export async function geocodeAddress(
  street: string,
  city: string,
  state: string,
  zip: string
): Promise<GeocodeResult | null> {
  try {
    const params = new URLSearchParams({
      street,
      city,
      state,
      zip,
      benchmark: 'Public_AR_Current',
      vintage: 'Current_Current',
      format: 'json',
    });

    const response = await fetch(
      `https://geocoding.geo.census.gov/geocoder/geographies/address?${params}`
    );
    const data = await response.json();

    const matches = data?.result?.addressMatches;
    if (!matches || matches.length === 0) {
      // Fallback to FCC API
      return geocodeByLatLng(null, null, street, city, state, zip);
    }

    const match = matches[0];
    const geographies = match.geographies?.Counties;
    if (!geographies || geographies.length === 0) return null;

    const county = geographies[0];
    return {
      county_fips: county.STATE + county.COUNTY,
      county_name: county.NAME,
      state_code: match.addressComponents.state,
      state_name: county.STATENAME || '',
      latitude: match.coordinates.y,
      longitude: match.coordinates.x,
    };
  } catch (error) {
    console.error('Census geocoder error:', error);
    return null;
  }
}

/**
 * FCC Area API fallback — resolves lat/lng to county FIPS.
 */
async function geocodeByLatLng(
  lat: number | null,
  lng: number | null,
  _street?: string,
  _city?: string,
  _state?: string,
  _zip?: string
): Promise<GeocodeResult | null> {
  if (!lat || !lng) return null;

  try {
    const response = await fetch(
      `https://geo.fcc.gov/api/census/area?lat=${lat}&lon=${lng}&format=json`
    );
    const data = await response.json();

    if (!data?.results || data.results.length === 0) return null;

    const result = data.results[0];
    return {
      county_fips: result.county_fips,
      county_name: result.county_name,
      state_code: result.state_code,
      state_name: result.state_name,
      latitude: lat,
      longitude: lng,
    };
  } catch (error) {
    console.error('FCC geocoder error:', error);
    return null;
  }
}
