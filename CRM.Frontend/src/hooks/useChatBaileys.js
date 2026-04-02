import { useState, useCallback, useRef } from 'react'
import api from '../api/axios'
import useHubConnection from './useHubConnection'

/**
 * Hook principal para Chat Baileys.
 * Maneja conversaciones, mensajes y todos los eventos SignalR del hub-chat.
 */
export default function useChatBaileys() {
  const [conversations, setConversations]   = useState([])
  const [activeId, setActiveId]             = useState(null)
  const [messages, setMessages]             = useState([])
  const [loadingConvs, setLoadingConvs]     = useState(false)
  const [loadingMsgs, setLoadingMsgs]       = useState(false)
  const [presence, setPresence]             = useState({}) // { [numero]: { estado, ts } }
  const [callNotification, setCallNotif]    = useState(null)
  const activeIdRef                         = useRef(null)
  const pendingNumsRef                      = useRef(new Set())
  const reloadTimerRef                      = useRef(null)

  // Mantener ref sincronizado + suscribir presencia al abrir chat
  const selectConversation = useCallback((id, numero) => {
    activeIdRef.current = id
    setActiveId(id)
    if (numero) {
      api.post('/WhatsApp/baileys/proxy/subscribe-presence', { chatId: numero })
        .catch(() => {})
    }
  }, [])

  // ── Cargar conversaciones (retorna los datos para usarlos inline) ──────
  const loadConversations = useCallback(async () => {
    setLoadingConvs(true)
    try {
      const { data } = await api.get('/Conversacion')
      const convs = Array.isArray(data) ? data : (data.data ?? [])
      setConversations(convs)
      return convs
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  // ── Cargar mensajes de una conversación ────────────────────────────────
  const loadMessages = useCallback(async (conversacionId) => {
    setLoadingMsgs(true)
    try {
      const { data } = await api.get(`/Conversacion/${conversacionId}/mensajes`)
      setMessages(Array.isArray(data) ? data : (data.data ?? []))
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  // ── Handlers SignalR ───────────────────────────────────────────────────
  const handlers = {
    NuevoMensaje: (rawMsg) => {
      const msg = typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg
      const numCliente = msg.NumeroCliente || msg.numeroCliente

      // Acumular números con mensajes nuevos y debounce (200ms)
      // Múltiples mensajes rápidos = 1 sola recarga, no N paralelas
      pendingNumsRef.current.add(numCliente)
      clearTimeout(reloadTimerRef.current)
      reloadTimerRef.current = setTimeout(async () => {
        const nums = new Set(pendingNumsRef.current)
        pendingNumsRef.current.clear()

        // Cargar conversaciones y esperar resultado para hacer match correcto
        const convs = await loadConversations()

        if (activeIdRef.current && convs) {
          const activeConv = convs.find(c => (c.id || c.Id) === activeIdRef.current)
          const activeNum  = activeConv?.numeroCliente || activeConv?.NumeroCliente
          if (activeNum && nums.has(activeNum)) {
            loadMessages(activeIdRef.current)
          }
        }
      }, 200)
    },

    AckActualizado: (payload) => {
      const waId = payload.whatsAppId || payload.WhatsAppId
      const newAck = payload.ack

      // 1. Actualizar burbuja en el chat activo
      setMessages(prev => prev.map(m =>
        (m.whatsAppId === waId || m.WhatsAppId === waId)
          ? { ...m, ack: newAck, Ack: newAck }
          : m
      ))

      // 2. Actualizar tick en el sidebar (ultimoAckEstado de la conversación activa)
      if (activeIdRef.current) {
        setConversations(prev => prev.map(c => {
          if ((c.id || c.Id) !== activeIdRef.current) return c
          const current = c.ultimoAckEstado ?? c.UltimoAckEstado ?? 0
          if (newAck <= current) return c
          return { ...c, ultimoAckEstado: newAck, UltimoAckEstado: newAck }
        }))
      }
    },

    NuevaReaccion: (payload) => {
      const waId = payload.whatsAppId || payload.WhatsAppId
      setMessages(prev => prev.map(m =>
        (m.whatsAppId === waId || m.WhatsAppId === waId)
          ? { ...m, reacciones: [...(m.reacciones || []), { reaccion: payload.emoji, numero: payload.senderId }] }
          : m
      ))
    },

    MensajeEditado: (payload) => {
      const waId = payload.whatsAppId || payload.WhatsAppId
      const nuevoTexto = payload.mensajeNuevo || payload.nuevoTexto || ''
      setMessages(prev => prev.map(m =>
        (m.whatsAppId === waId || m.WhatsAppId === waId)
          ? { ...m, cuerpo: nuevoTexto, Cuerpo: nuevoTexto, esEditado: true }
          : m
      ))
    },

    MensajeEliminado: (payload) => {
      const waId = payload.whatsAppId || payload.WhatsAppId
      setMessages(prev => prev.map(m =>
        (m.whatsAppId === waId || m.WhatsAppId === waId)
          ? { ...m, eliminado: true }
          : m
      ))
    },

    PresenciaActualizada: (payload) => {
      setPresence(prev => ({
        ...prev,
        [payload.numero || payload.Numero]: {
          estado: payload.estado || payload.Estado,
          ts: Date.now()
        }
      }))
    },

    GrupoEventoRecibido: (payload) => {
      if (activeIdRef.current && payload.conversacionId === activeIdRef.current) {
        const systemMsg = {
          id: `sys-${Date.now()}`,
          cuerpo: payload.descripcion || payload.Descripcion || 'Evento de grupo',
          tipo: 'sistema',
          fechaRecepcion: new Date().toISOString(),
          esEntrante: false,
          sistema: true
        }
        setMessages(prev => [...prev, systemMsg])
      }
    },

    LlamadaEntrante: (payload) => {
      setCallNotif(payload)
      // Auto-dismiss after 30s
      setTimeout(() => setCallNotif(null), 30000)
    }
  }

  useHubConnection('/hub-chat', handlers)

  return {
    conversations, loadConversations, loadingConvs,
    activeId, selectConversation,
    messages, loadMessages, loadingMsgs, setMessages,
    presence, callNotification, dismissCall: () => setCallNotif(null)
  }
}
