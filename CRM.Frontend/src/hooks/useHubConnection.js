import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'

/**
 * Hook que mantiene una conexión SignalR activa con reconexión automática.
 * @param {string} hubUrl  - URL del hub (ej. '/hub-chat')
 * @param {object} handlers - { EventName: (payload) => void }
 */
export default function useHubConnection(hubUrl, handlers) {
  // Ref siempre actualizado con los handlers más recientes sin recrear la conexión
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    // Registrar wrappers estables que delegan al handler actual
    Object.keys(handlers).forEach(event => {
      connection.on(event, (...args) => handlersRef.current[event]?.(...args))
    })

    connection.start().catch(err =>
      console.warn(`[SignalR] No se pudo conectar a ${hubUrl}:`, err?.message)
    )

    return () => { connection.stop() }
  }, [hubUrl]) // solo se reconecta si cambia la URL
}
