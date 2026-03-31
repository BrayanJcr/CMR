import { useState, useEffect } from 'react'
import api from '../api/axios'

// Cache y deduplicación a nivel de módulo (persiste toda la sesión)
const cache = {}
const inFlight = {}

export function useProfilePic(numero) {
  const [url, setUrl] = useState(() => (numero in cache ? cache[numero] : null))

  useEffect(() => {
    if (!numero) return
    if (numero in cache) {
      setUrl(cache[numero])
      return
    }

    if (!inFlight[numero]) {
      inFlight[numero] = api
        .get(`/WhatsApp/foto-perfil?numero=${encodeURIComponent(numero)}`)
        .then(res => res.data?.url || null)
        .catch(() => null)
        .then(photoUrl => {
          if (photoUrl) cache[numero] = photoUrl   // solo cachea éxitos
          delete inFlight[numero]
          return photoUrl
        })
    }

    inFlight[numero].then(photoUrl => setUrl(photoUrl))
  }, [numero])

  return url
}
