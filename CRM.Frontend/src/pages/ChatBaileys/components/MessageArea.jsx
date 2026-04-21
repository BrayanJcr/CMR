import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Spin, Tooltip, Popover } from 'antd'
import { EditOutlined, DeleteOutlined, ClockCircleOutlined,
         AudioOutlined, EnvironmentOutlined, FileOutlined,
         PictureOutlined, VideoCameraOutlined, SmileOutlined,
         StarOutlined, StarFilled } from '@ant-design/icons'
import dayjs from 'dayjs'
import AudioPlayer from '../../Chat/components/AudioPlayer'
import baileys from '../../../api/baileys'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

// CSS: botón visible solo al hover de la burbuja
if (typeof document !== 'undefined' && !document.getElementById('msg-react-css')) {
  const s = document.createElement('style')
  s.id = 'msg-react-css'
  s.textContent = `
    .baileys-bubble .react-trigger { opacity: 0; transition: opacity 0.12s; }
    .baileys-bubble:hover .react-trigger { opacity: 1; }
    .react-panel button:hover { background: #2a3942 !important; transform: scale(1.15); }
  `
  document.head.appendChild(s)
}

function ReactionButton({ isOut, numero, whatsAppId, msgId }) {
  const [open, setOpen] = useState(false)
  const [starred, setStarred] = useState(false)

  const handleReaction = useCallback((emoji) => {
    setOpen(false)
    baileys.sendReaction(numero, whatsAppId, emoji)
  }, [numero, whatsAppId])

  const handleStar = useCallback(() => {
    const next = !starred
    setStarred(next)
    setOpen(false)
    baileys.starMessage(numero, whatsAppId || msgId, next)
  }, [starred, numero, whatsAppId, msgId])

  const panel = (
    <div className="react-panel" style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 2 }}>
      {QUICK_EMOJIS.map(emoji => (
        <button key={emoji} type="button" onClick={() => handleReaction(emoji)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '4px 5px',
                   borderRadius: 6, lineHeight: 1, transition: 'all 0.1s' }}>
          {emoji}
        </button>
      ))}
      <div style={{ width: 1, height: 20, background: '#2a3942', margin: '0 2px' }} />
      <button type="button" onClick={handleStar}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px 5px',
                 borderRadius: 6, color: starred ? '#f5c842' : '#8696a0', display: 'flex', alignItems: 'center',
                 transition: 'all 0.1s' }}>
        {starred ? <StarFilled /> : <StarOutlined />}
      </button>
    </div>
  )

  return (
    <Popover content={panel} trigger="click" open={open} onOpenChange={setOpen}
      placement={isOut ? 'leftTop' : 'rightTop'} arrow={false}
      overlayStyle={{ zIndex: 1060 }}
      styles={{ body: { background: '#1f2c34', border: '1px solid #2a3942', padding: 4 } }}>
      <button type="button" className="react-trigger"
        style={{
          position: 'absolute', top: 4,
          [isOut ? 'left' : 'right']: -32,
          background: '#1f2c34', border: '1px solid #2a3942', borderRadius: '50%',
          width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#8696a0', fontSize: 13, zIndex: 5,
          opacity: open ? 1 : undefined,
        }}>
        <SmileOutlined />
      </button>
    </Popover>
  )
}

// Mapeo ACK del sistema:
// 0 = pendiente, 1/2 = enviado (✓ gris), 3 = recibido (✓✓ gris), 4 = leído (✓✓ azul)
function AckTick({ ack }) {
  if (ack === null || ack === undefined) return null
  if (ack === 0) return <span style={{ color: '#8696a0', fontSize: 12, lineHeight: 1 }}>🕐</span>

  const color = ack >= 4 ? '#53bdeb' : '#8696a0'
  const sw = { stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }

  if (ack <= 2) {
    // Enviado — check simple
    return (
      <svg width="14" height="11" viewBox="0 0 11 9" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
        <polyline points="1,4.5 4,7.5 10,1.5" {...sw} />
      </svg>
    )
  }

  // ack=3 recibido (gris) / ack=4 leído (azul) — doble palomita
  return (
    <svg width="18" height="11" viewBox="0 0 17 9" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <polyline points="1,4.5 4,7.5 10,1.5" {...sw} />
      <polyline points="7,4.5 10,7.5 16,1.5" {...sw} />
    </svg>
  )
}

function MessageBubble({ msg, numero }) {
  const isOut      = !(msg.esEntrante ?? msg.EsEntrante ?? true)
  const isSys      = msg.sistema || msg.tipo === 'sistema'
  const body       = msg.cuerpo        || msg.Cuerpo        || ''
  const tipo       = (msg.tipo         || msg.Tipo          || 'texto').toLowerCase()
  const mediaUrl   = msg.urlMedia      || msg.UrlMedia      || ''
  const fileName   = msg.nombreArchivo || msg.NombreArchivo || ''
  const mimeType   = msg.mimeType      || msg.MimeType      || ''
  const ack     = msg.ack !== undefined ? msg.ack : (msg.Ack !== undefined ? msg.Ack : null)
  const ts      = msg.fechaRecepcion || msg.FechaRecepcion || msg.fechaEnvio || msg.FechaEnvio
  const timeLabel = ts ? dayjs(ts).format('HH:mm') : ''
  const edited  = msg.esEditado || msg.EsEditado
  const deleted = msg.eliminado
  const efimero = msg.esEfimero || msg.EsEfimero
  const reacciones = msg.reacciones || []

  if (isSys) {
    return (
      <div style={{ textAlign: 'center', margin: '6px 0' }}>
        <span style={{ background: '#1f2c34', color: '#8696a0', fontSize: 11, padding: '3px 10px', borderRadius: 8 }}>
          {body}
        </span>
      </div>
    )
  }

  // ── Nota interna ──────────────────────────────────────────────────────────
  if (tipo === 'nota' || msg.esNotaInterna) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3px 16px' }}>
        <div style={{
          background: '#2a2310', border: '1px solid #534f2a', borderRadius: 8,
          padding: '7px 12px', maxWidth: '72%', width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 12 }}>🔒</span>
            <span style={{ color: '#c5b350', fontSize: 11, fontWeight: 600 }}>Nota interna</span>
            {(msg.usuario || msg.Usuario) && (
              <span style={{ color: '#8696a0', fontSize: 11 }}>· {msg.usuario || msg.Usuario}</span>
            )}
            <span style={{ marginLeft: 'auto', color: '#8696a0', fontSize: 10 }}>{timeLabel}</span>
          </div>
          <p style={{ color: '#e9d97a', fontSize: 13, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {body}
          </p>
        </div>
      </div>
    )
  }

  const bubbleStyle = {
    padding: '7px 10px',
    borderRadius: isOut ? '8px 0 8px 8px' : '0 8px 8px 8px',
    background: isOut ? '#005c4b' : '#202c33',
    position: 'relative',
    wordBreak: 'break-word'
  }

  const renderMedia = () => {
    if (!mediaUrl) return null
    if (tipo === 'image') {
      return (
        <img
          src={mediaUrl} alt="img"
          style={{ maxWidth: '100%', maxHeight: 260, objectFit: 'contain', display: 'block', borderRadius: 6, marginBottom: 4 }}
        />
      )
    }
    if (tipo === 'video') {
      return <video src={mediaUrl} controls style={{ maxWidth: '100%', maxHeight: 260, display: 'block', borderRadius: 6, marginBottom: 4 }} />
    }
    if (tipo === 'audio' || tipo === 'ptt') {
      return <AudioPlayer src={mediaUrl} />
    }
    if (tipo === 'document') {
      const ext = (fileName.split('.').pop() || mimeType.split('/').pop() || 'doc').toUpperCase().slice(0, 4)
      const handleDownload = () => {
        const a = document.createElement('a')
        a.href = mediaUrl
        a.download = fileName || 'documento'
        a.click()
      }
      return (
        <div
          onClick={handleDownload}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            background: isOut ? '#004035' : '#182d38',
            borderRadius: 8, padding: '10px 12px', marginBottom: 4,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 8, flexShrink: 0,
            background: '#53bdeb22', border: '1px solid #53bdeb44',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 1,
          }}>
            <FileOutlined style={{ color: '#53bdeb', fontSize: 16 }} />
            <span style={{ color: '#53bdeb', fontSize: 8, fontWeight: 700, letterSpacing: '0.3px' }}>{ext}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#e9edef', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileName || 'Documento'}
            </div>
            <div style={{ color: '#8696a0', fontSize: 11, marginTop: 2 }}>
              Toca para descargar
            </div>
          </div>
        </div>
      )
    }
    if (tipo === 'location') {
      try {
        const loc = JSON.parse(body)
        return (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#53bdeb' }}>
            <EnvironmentOutlined />
            <a href={`https://maps.google.com/?q=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer" style={{ color: '#53bdeb' }}>
              Ver ubicación ({loc.lat?.toFixed(4)}, {loc.lng?.toFixed(4)})
            </a>
          </div>
        )
      } catch { return <span style={{ color: '#8696a0' }}>Ubicación</span> }
    }
    return null
  }

  const renderPoll = () => {
    if (tipo !== 'poll') return null
    try {
      const poll = JSON.parse(body)
      return (
        <div>
          <div style={{ color: '#e9edef', fontWeight: 500, marginBottom: 4 }}>{poll.pregunta}</div>
          {(poll.opciones || []).map((op, i) => (
            <div key={i} style={{ color: '#8696a0', fontSize: 12, padding: '2px 0' }}>◦ {op}</div>
          ))}
        </div>
      )
    } catch { return null }
  }

  // Agrupar reacciones por emoji
  const reaccionesAgrupadas = reacciones.reduce((acc, r) => {
    const emoji = r.reaccion || r.Reaccion || ''
    if (!emoji) return acc
    if (!acc[emoji]) acc[emoji] = []
    acc[emoji].push(r.numero || r.Numero || '')
    return acc
  }, {})
  const hasReacciones = Object.keys(reaccionesAgrupadas).length > 0

  return (
    <div style={{
      display: 'flex',
      justifyContent: isOut ? 'flex-end' : 'flex-start',
      padding: '0 8px',
      marginBottom: hasReacciones ? 24 : 4,
    }}>
      <div className="baileys-bubble" style={{ position: 'relative', maxWidth: '65%' }}>
        <ReactionButton isOut={isOut} numero={numero}
          whatsAppId={msg.whatsAppId || msg.WhatsAppId}
          msgId={msg.id || msg.Id} />
        <div style={bubbleStyle}>
          {efimero && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8696a0', fontSize: 11, marginBottom: 4 }}>
              <ClockCircleOutlined /> Efímero
            </div>
          )}
          {deleted
            ? <span style={{ color: '#8696a0', fontStyle: 'italic', fontSize: 13 }}>🚫 Mensaje eliminado</span>
            : (
              <>
                {renderMedia()}
                {renderPoll()}
                {tipo !== 'location' && tipo !== 'poll' && tipo === 'texto' && body && (
                  <span style={{ color: '#e9edef', fontSize: 13, whiteSpace: 'pre-wrap' }}>{body}</span>
                )}
                {tipo !== 'location' && tipo !== 'poll' && tipo !== 'texto' && body && !body.startsWith('[') && (
                  <span style={{ color: '#e9edef', fontSize: 13, whiteSpace: 'pre-wrap', marginTop: 4, display: 'block' }}>{body}</span>
                )}
              </>
            )
          }
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 3 }}>
            {edited && <EditOutlined style={{ color: '#8696a0', fontSize: 10 }} />}
            <span style={{ color: '#8696a0', fontSize: 11 }}>{timeLabel}</span>
            {isOut && <AckTick ack={ack} />}
          </div>
        </div>

        {/* Reacciones flotando DEBAJO de la burbuja, fuera de ella */}
        {hasReacciones && (
          <div style={{
            position: 'absolute',
            bottom: -20,
            [isOut ? 'right' : 'left']: 4,
            display: 'flex',
            gap: 3,
            zIndex: 2,
          }}>
            {Object.entries(reaccionesAgrupadas).map(([emoji, numeros]) => (
              <Tooltip key={emoji} title={numeros.filter(Boolean).join(', ') || undefined} mouseEnterDelay={0.3}>
                <span style={{
                  background: '#2d3f49',
                  border: '1px solid #3b4e5a',
                  borderRadius: 12,
                  padding: '2px 6px',
                  fontSize: 14,
                  cursor: 'default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  boxShadow: '0 1px 6px rgba(0,0,0,.45)',
                  lineHeight: 1.4,
                  userSelect: 'none',
                }}>
                  {emoji}
                  {numeros.length > 1 && (
                    <span style={{ fontSize: 11, color: '#8696a0', fontWeight: 500 }}>{numeros.length}</span>
                  )}
                </span>
              </Tooltip>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MessageArea({ messages, loading, typingNumbers = [], activeNumber = '' }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="baileys-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px 0', background: '#0b141a' }}>
      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
        : messages.map((m, i) => (
            <MessageBubble key={m.whatsAppId || m.WhatsAppId || m.id || m.Id || `msg-${i}`} msg={m} numero={activeNumber} />
          ))
      }
      {typingNumbers.length > 0 && (
        <div style={{ padding: '4px 16px' }}>
          <span style={{ color: '#00a884', fontSize: 12 }}>
            {typingNumbers.join(', ')} está escribiendo...
          </span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
