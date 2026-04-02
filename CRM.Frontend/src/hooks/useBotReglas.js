import { useState, useCallback } from 'react'
import api from '../api/axios'

export default function useBotReglas() {
  const [reglas, setReglas]   = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)

  const loadReglas = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/Bot/reglas')
      setReglas(Array.isArray(data) ? data : (data.data ?? []))
    } finally {
      setLoading(false)
    }
  }, [])

  const createRegla = useCallback(async (payload) => {
    setSaving(true)
    try {
      const { data } = await api.post('/Bot/reglas', payload)
      setReglas(prev => [...prev, data])
      return data
    } finally {
      setSaving(false)
    }
  }, [])

  const updateRegla = useCallback(async (id, payload) => {
    setSaving(true)
    try {
      const { data } = await api.put(`/Bot/reglas/${id}`, payload)
      setReglas(prev => prev.map(r => (r.id === id || r.Id === id) ? data : r))
      return data
    } finally {
      setSaving(false)
    }
  }, [])

  const deleteRegla = useCallback(async (id) => {
    await api.delete(`/Bot/reglas/${id}`)
    setReglas(prev => prev.filter(r => r.id !== id && r.Id !== id))
  }, [])

  const toggleRegla = useCallback(async (id) => {
    const { data } = await api.put(`/Bot/reglas/${id}/toggle-modo`)
    setReglas(prev => prev.map(r => (r.id === id || r.Id === id) ? data : r))
    return data
  }, [])

  // Cambia el modo de la conversación individual entre 'bot' y 'agente'
  const toggleModo = useCallback(async (conversacionId) => {
    const { data } = await api.post(`/Conversacion/${conversacionId}/toggle-modo`)
    return data
  }, [])

  // Estado del modo global
  const getModoGlobal = useCallback(async () => {
    const { data } = await api.get('/Bot/modo-global')
    return data
  }, [])

  const activarBotGlobal = useCallback(async () => {
    const { data } = await api.post('/Bot/activar-global')
    return data
  }, [])

  const desactivarBotGlobal = useCallback(async () => {
    const { data } = await api.post('/Bot/desactivar-global')
    return data
  }, [])

  return {
    reglas, loading, saving,
    loadReglas, createRegla, updateRegla, deleteRegla, toggleRegla, toggleModo,
    getModoGlobal, activarBotGlobal, desactivarBotGlobal
  }
}
