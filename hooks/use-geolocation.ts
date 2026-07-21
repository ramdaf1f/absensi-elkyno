import { useEffect, useState } from 'react'

type GeoState = {
  loading: boolean
  error: string | null
  latitude: number | null
  longitude: number | null
  accuracy: number | null
}

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({
    loading: true,
    error: null,
    latitude: null,
    longitude: null,
    accuracy: null,
  })

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ loading: false, error: 'unavailable', latitude: null, longitude: null, accuracy: null })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          loading: false,
          error: null,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (error) => {
        setState({
          loading: false,
          error: error.code === error.PERMISSION_DENIED ? 'permission_denied' : 'unavailable',
          latitude: null,
          longitude: null,
          accuracy: null,
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }, [])

  return state
}
