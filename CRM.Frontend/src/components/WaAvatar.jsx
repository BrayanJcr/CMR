import React, { useState, useEffect } from 'react'
import { useProfilePic } from '../hooks/useProfilePic'
import { getInitials } from '../utils/format'

/**
 * Avatar de contacto WhatsApp.
 * Muestra la foto de perfil si está disponible, o las iniciales como fallback.
 *
 * Props:
 *   numero    — número de WhatsApp (ej: 51999999999)
 *   nombre    — nombre completo para calcular iniciales
 *   size      — tamaño en px (sobrescribe el default del className)
 *   className — clase CSS (default: 'wa-avatar')
 *   style     — estilos adicionales
 */
export default function WaAvatar({ numero, nombre, size, className = 'wa-avatar', style = {} }) {
  const photoUrl = useProfilePic(numero)
  const [imgError, setImgError] = useState(false)

  useEffect(() => { setImgError(false) }, [numero])

  const sizeStyles = size
    ? { width: size, height: size, minWidth: size, fontSize: Math.round(size * 0.35) }
    : {}

  return (
    <div className={className} style={{ ...sizeStyles, ...style, overflow: 'hidden' }}>
      {photoUrl && !imgError ? (
        <img
          src={photoUrl}
          alt={nombre || numero || ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setImgError(true)}
        />
      ) : (
        getInitials(nombre || numero || '?')
      )}
    </div>
  )
}
