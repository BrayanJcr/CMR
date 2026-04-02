import React from 'react'
import { Input, Spin } from 'antd'
import { SearchOutlined, AudioOutlined, PictureOutlined,
         VideoCameraOutlined, FileOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import WaAvatar from '../../../components/WaAvatar'
import { formatPhoneNumber } from '../../../utils/format'
import ChatContextMenu from './ChatContextMenu'

// 0=pendiente, 1/2=enviado (✓ gris), 3=recibido (✓✓ gris), 4=leído (✓✓ azul)
function SidebarAckTick({ ack }) {
  if (ack === null || ack === undefined || ack === 0) return null
  const color = ack >= 4 ? '#53bdeb' : '#8696a0'
  const sw = { stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (ack <= 2) {
    return (
      <svg width="13" height="10" viewBox="0 0 11 9" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
        <polyline points="1,4.5 4,7.5 10,1.5" {...sw} />
      </svg>
    )
  }
  return (
    <svg width="17" height="10" viewBox="0 0 17 9" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <polyline points="1,4.5 4,7.5 10,1.5" {...sw} />
      <polyline points="7,4.5 10,7.5 16,1.5" {...sw} />
    </svg>
  )
}

function MediaLabel({ mimeType, tipo }) {
  const t = (tipo || '').toLowerCase()
  const m = (mimeType || '').toLowerCase()
  if (m.startsWith('image')  || t === 'image')    return <><PictureOutlined style={{ fontSize: 12 }} /> Foto</>
  if (m.startsWith('audio')  || t === 'audio' || t === 'ptt') return <><AudioOutlined style={{ fontSize: 12 }} /> Audio</>
  if (m.startsWith('video')  || t === 'video')    return <><VideoCameraOutlined style={{ fontSize: 12 }} /> Video</>
  if (mimeType               || t === 'document') return <><FileOutlined style={{ fontSize: 12 }} /> Archivo</>
  return null
}

function ConversationItem({ conv, isActive, onClick, presenceEstado }) {
  const rawName  = conv.nombreContacto || conv.NombreContacto || ''
  const number   = conv.numeroCliente  || conv.NumeroCliente  || ''
  const formattedNumber = formatPhoneNumber(number)

  const hasRealName    = rawName && rawName !== number
  const displayName    = hasRealName ? rawName : formattedNumber

  const lastTime       = conv.fechaUltimoMensaje || conv.FechaUltimoMensaje
  const unread         = conv.mensajesNoLeidos   || conv.MensajesNoLeidos   || 0
  const lastMsg        = conv.ultimoMensaje       || conv.UltimoMensaje       || ''
  const mimeType       = conv.ultimoMimeType      || conv.UltimoMimeType      || ''
  const tipoMsg        = conv.ultimoTipo          || conv.UltimoTipo          || ''
  const ultimoEntrante = conv.ultimoEsEntrante ?? conv.UltimoEsEntrante ?? true
  const modoBot        = (conv.modoConversacion   || conv.ModoConversacion) === 'bot'
  const ultimoAck      = conv.ultimoAckEstado     ?? conv.UltimoAckEstado ?? null

  const hasUnread  = unread > 0
  const isTyping   = presenceEstado === 'typing'

  const timeLabel = lastTime
    ? (dayjs().isSame(dayjs(lastTime), 'day')
        ? dayjs(lastTime).format('HH:mm')
        : dayjs(lastTime).format('DD/MM'))
    : ''

  // Llamada directa (no JSX) para obtener null real cuando no hay media
  const mediaContent = MediaLabel({ mimeType, tipo: tipoMsg })

  const previewContent = mediaContent
    ?? (lastMsg?.startsWith('{') || lastMsg?.startsWith('[')
        ? (ultimoEntrante ? 'Mensaje' : 'Mensaje enviado')
        : (lastMsg || (ultimoEntrante ? 'Mensaje' : 'Mensaje enviado')))

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px',
        cursor: 'pointer',
        background: isActive ? '#2a3942' : 'transparent',
        borderBottom: '1px solid #1f2d34',
        transition: 'background 0.1s',
      }}
    >
      {/* Avatar con badge de no leídos */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <WaAvatar numero={number} nombre={displayName} />
        {hasUnread && (
          <span style={{
            position: 'absolute', bottom: -2, right: -2,
            background: '#00a884', color: '#fff',
            fontSize: 10, fontWeight: 700, lineHeight: 1,
            minWidth: 16, height: 16,
            borderRadius: 8, padding: '2px 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #111b21',
            boxSizing: 'border-box',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Fila 1: nombre + hora */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <span style={{
            color: '#e9edef',
            fontWeight: hasUnread ? 600 : 500,
            fontSize: 14.5,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1
          }}>
            {displayName}
          </span>
          <span style={{
            color: hasUnread ? '#00a884' : '#8696a0',
            fontSize: 11, flexShrink: 0, marginLeft: 8,
            fontWeight: hasUnread ? 600 : 400,
          }}>
            {timeLabel}
          </span>
        </div>

        {/* Fila 2: preview mensaje */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            overflow: 'hidden', flex: 1,
          }}>
            {isTyping ? (
              <span style={{ color: '#00a884', fontSize: 13, fontStyle: 'italic' }}>escribiendo...</span>
            ) : (
              <span style={{
                color: hasUnread ? '#e9edef' : '#8696a0',
                fontSize: 13,
                fontWeight: hasUnread ? 500 : 400,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {/* Prefijo según dirección */}
                {!ultimoEntrante ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    <SidebarAckTick ack={ultimoAck} />
                    <span style={{ color: hasUnread ? '#e9edef' : '#aebac1', flexShrink: 0 }}>Tú:</span>
                  </span>
                ) : hasUnread ? (
                  <span style={{ color: '#00a884', flexShrink: 0, fontWeight: 600 }}>•</span>
                ) : null}
                {/* Contenido */}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {previewContent}
                </span>
              </span>
            )}
          </div>

          {/* Badges derechos */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
            {modoBot && (
              <span style={{
                background: '#00a88422', color: '#00a884', fontSize: 9,
                padding: '2px 5px', borderRadius: 4, border: '1px solid #00a88444',
                fontWeight: 600, letterSpacing: '0.3px',
              }}>
                BOT
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConversationList({ conversations, activeId, loading, onSelect, onRefresh, presence, searchValue, onSearchChange }) {
  const filtered = searchValue
    ? conversations.filter(c => {
        const name   = (c.nombreContacto || c.NombreContacto || '').toLowerCase()
        const number = (c.numeroCliente  || c.NumeroCliente  || '').toLowerCase()
        const q      = searchValue.toLowerCase()
        return name.includes(q) || number.includes(q)
      })
    : conversations

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#111b21' }}>
      {/* Search */}
      <div style={{ padding: '8px 12px', background: '#111b21', borderBottom: '1px solid #1f2d34' }}>
        <Input
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          prefix={<SearchOutlined style={{ color: '#8696a0', fontSize: 13 }} />}
          placeholder="Buscar conversación"
          className="baileys-search-input"
          style={{ background: '#2a3942', border: 'none', borderRadius: 20, color: '#e9edef', padding: '6px 12px' }}
          allowClear={{ clearIcon: <span style={{ color: '#8696a0' }}>✕</span> }}
        />
      </div>

      {/* Lista */}
      <div className="baileys-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 32, color: '#8696a0' }}>
            <Spin />
            <span style={{ fontSize: 13 }}>Cargando conversaciones...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', color: '#8696a0', gap: 8 }}>
            <SearchOutlined style={{ fontSize: 32, opacity: 0.4 }} />
            <span style={{ fontSize: 13 }}>
              {searchValue ? `Sin resultados para "${searchValue}"` : 'Sin conversaciones'}
            </span>
          </div>
        ) : (
          filtered.map(c => {
            const id     = c.id || c.Id
            const number = c.numeroCliente || c.NumeroCliente || ''
            const pres   = presence[number]?.estado
            return (
              <ChatContextMenu key={id} conversation={c} onActionComplete={onRefresh}>
                <ConversationItem
                  conv={c}
                  isActive={activeId === id}
                  onClick={() => onSelect(c)}
                  presenceEstado={pres}
                />
              </ChatContextMenu>
            )
          })
        )}
      </div>
    </div>
  )
}
