import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Input, Button, Tooltip, Popover, Upload, message as antMsg } from 'antd'
import {
  SendOutlined, PaperClipOutlined, SmileOutlined,
  EnvironmentOutlined, PieChartOutlined, AudioOutlined,
  ClockCircleOutlined, LockOutlined
} from '@ant-design/icons'
import AudioRecorder from './AudioRecorder'
import api from '../../../api/axios'

const EMOJI_GROUPS = [
  { label: '😀', emojis: ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','😜','😎','🤩','😏','😒','😞','😢','😭','😤','😠','😡','🤬','😳','😱','😨','🤗','🤔','😶','😐','🙄'] },
  { label: '👍', emojis: ['👍','👎','👏','🙌','🤝','✊','👊','✋','👌','✌️','🤞','👈','👉','👆','👇','👋','🤙','💪','❤️','🧡','💛','💚','💙','💜','🖤','💔','💕','💞','💓','💗','💖','💘'] },
  { label: '🐶', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦆','🦅','🦉','🦋','🐛','🐞','🐝','🦗','🐙','🦑','🦐','🐠','🐟','🐬','🐳','🦈'] },
]

function EmojiPicker({ onSelect }) {
  const [grupo, setGrupo] = useState(0)
  return (
    <div style={{ width: 280 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {EMOJI_GROUPS.map((g, i) => (
          <button key={i} onClick={() => setGrupo(i)}
            style={{ background: grupo === i ? '#00a884' : '#2a3942', border: 'none', borderRadius: 6,
              padding: '4px 8px', cursor: 'pointer', color: '#e9edef', fontSize: 12 }}>
            {g.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
        {EMOJI_GROUPS[grupo].emojis.map(e => (
          <button key={e} onClick={() => onSelect(e)}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: 2, borderRadius: 4 }}>
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── QuickReplies: buscador de plantillas que aparece al escribir "/" ─────────
function QuickReplies({ query, onSelect, onClose }) {
  const [plantillas, setPlantillas] = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    api.get('/Plantilla')
      .then(r => setPlantillas(Array.isArray(r.data) ? r.data : (r.data?.data ?? [])))
      .catch(() => setPlantillas([]))
      .finally(() => setLoading(false))
  }, [])

  const q = query.toLowerCase()
  const filtradas = plantillas.filter(p =>
    p.nombre?.toLowerCase().includes(q) ||
    p.contenido?.toLowerCase().includes(q) ||
    p.categoria?.toLowerCase().includes(q)
  ).slice(0, 8)

  if (loading) return <div style={{ padding: '8px 12px', color: '#8696a0', fontSize: 13 }}>Cargando plantillas...</div>
  if (!filtradas.length) return <div style={{ padding: '8px 12px', color: '#8696a0', fontSize: 13 }}>Sin resultados para "<strong>{query}</strong>"</div>

  return (
    <div style={{ width: 320, maxHeight: 280, overflowY: 'auto' }}>
      <div style={{ padding: '6px 12px 4px', color: '#8696a0', fontSize: 11, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
        Plantillas · {filtradas.length}
      </div>
      {filtradas.map(p => (
        <button
          key={p.id}
          onClick={() => onSelect(p.contenido)}
          style={{
            width: '100%', display: 'flex', flexDirection: 'column', gap: 2,
            padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
            textAlign: 'left', borderBottom: '1px solid #1f2d34',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#2a3942'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <span style={{ color: '#e9edef', fontSize: 13, fontWeight: 500 }}>{p.nombre}</span>
          {p.categoria && (
            <span style={{ color: '#00a884', fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>
              {p.categoria}
            </span>
          )}
          <span style={{
            color: '#8696a0', fontSize: 12,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280
          }}>
            {p.contenido}
          </span>
        </button>
      ))}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function MessageInput({
  onSendText, onSendFile, onSendVoice, onSendLocation,
  onSendPoll, onSendEphemeral, onSendNota,
  disabled, activeNumero
}) {
  const [text,          setText]          = useState('')
  const [showEmoji,     setShowEmoji]     = useState(false)
  const [isRecording,   setIsRecording]   = useState(false)
  const [sendingFile,   setSendingFile]   = useState(false)
  const [notaMode,      setNotaMode]      = useState(false)   // 🔒 modo nota interna
  const [showReplies,   setShowReplies]   = useState(false)   // "/" quick replies
  const [repliesQuery,  setRepliesQuery]  = useState('')
  const inputRef       = useRef(null)
  const typingTimerRef = useRef(null)

  // Cerrar quick replies con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setShowReplies(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSend = () => {
    const t = text.trim()
    if (!t) return
    if (activeNumero) {
      import('../../../api/baileys').then(m => m.default.updatePresence(activeNumero, 'available').catch(() => {}))
    }
    if (notaMode) {
      onSendNota?.(t)
    } else {
      onSendText(t)
    }
    setText('')
    setShowReplies(false)
    inputRef.current?.focus()
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Si hay quick replies abiertos, cerrar sin enviar (el click en el item envia)
      if (showReplies) { setShowReplies(false); return }
      handleSend()
    }
  }

  const notifyTyping = useCallback((value) => {
    if (!activeNumero || notaMode) return
    import('../../../api/baileys').then(m => {
      if (value) {
        m.default.updatePresence(activeNumero, 'typing').catch(() => {})
        clearTimeout(typingTimerRef.current)
        typingTimerRef.current = setTimeout(() => {
          m.default.updatePresence(activeNumero, 'available').catch(() => {})
        }, 4000)
      } else {
        clearTimeout(typingTimerRef.current)
        m.default.updatePresence(activeNumero, 'available').catch(() => {})
      }
    })
  }, [activeNumero, notaMode])

  const handleChange = (e) => {
    const val = e.target.value
    setText(val)
    notifyTyping(val)

    // Quick replies: activar cuando el texto empieza con "/"
    if (val.startsWith('/')) {
      setRepliesQuery(val.slice(1))
      setShowReplies(true)
    } else {
      setShowReplies(false)
    }
  }

  const handleEmoji = (emoji) => {
    setText(prev => prev + emoji)
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  const handleSelectTemplate = (contenido) => {
    setText(contenido)
    setShowReplies(false)
    inputRef.current?.focus()
  }

  const handleFileUpload = async ({ file }) => {
    const realFile = file.originFileObj || file
    if (!realFile || sendingFile) return
    setSendingFile(true)
    try {
      await onSendFile(realFile)
    } catch (err) {
      const detail = err?.response?.data?.Mensage || err?.response?.data?.messageResponse || err?.message || 'Error al enviar archivo'
      antMsg.error(detail, 6)
    } finally {
      setSendingFile(false)
    }
  }

  const attachMenu = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: '#202c33', padding: 4, borderRadius: 8 }}>
      <Upload beforeUpload={() => false} onChange={({ file }) => handleFileUpload({ file })} showUploadList={false} accept="image/*,video/*,audio/*,.pdf,.doc,.docx">
        <Button type="text" icon={<PaperClipOutlined />} style={{ color: '#e9edef', width: '100%', textAlign: 'left' }}>
          Archivo
        </Button>
      </Upload>
      <Button type="text" icon={<EnvironmentOutlined />} style={{ color: '#e9edef', textAlign: 'left' }} onClick={onSendLocation}>Ubicación</Button>
      <Button type="text" icon={<PieChartOutlined />}    style={{ color: '#e9edef', textAlign: 'left' }} onClick={onSendPoll}>Encuesta</Button>
      <Button type="text" icon={<ClockCircleOutlined />} style={{ color: '#e9edef', textAlign: 'left' }} onClick={onSendEphemeral}>Mensaje efímero</Button>
    </div>
  )

  if (isRecording) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: '#202c33', gap: 8 }}>
        <AudioRecorder
          onRecorded={async (blob) => { setIsRecording(false); await onSendVoice(blob) }}
          onCancel={() => setIsRecording(false)}
        />
      </div>
    )
  }

  // Color del input según modo
  const inputBg     = notaMode ? '#2a2310' : '#2a3942'
  const inputBorder = notaMode ? '1px solid #534f2a' : 'none'

  return (
    <div style={{ background: '#202c33', borderTop: '1px solid #1f2d34' }}>

      {/* ── Nota mode banner ── */}
      {notaMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 14px', background: '#1e1b0e',
          borderBottom: '1px solid #534f2a',
          color: '#c5b350', fontSize: 12, fontWeight: 500
        }}>
          <LockOutlined />
          Nota interna — solo visible para el equipo, no se envía al cliente
        </div>
      )}

      {/* ── Quick replies dropdown ── */}
      {showReplies && (
        <div style={{
          background: '#202c33', border: '1px solid #2a3942',
          borderBottom: 'none', maxHeight: 280, overflowY: 'auto'
        }}>
          <QuickReplies
            query={repliesQuery}
            onSelect={handleSelectTemplate}
            onClose={() => setShowReplies(false)}
          />
        </div>
      )}

      {/* ── Input row ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8 }}>
        {/* Emoji */}
        <Popover
          content={<EmojiPicker onSelect={handleEmoji} />}
          trigger="click" open={showEmoji} onOpenChange={setShowEmoji}
          placement="topLeft" overlayStyle={{ zIndex: 1050 }}
          styles={{ body: { background: '#202c33', border: '1px solid #2a3942', padding: 8 } }}
        >
          <Tooltip title="Emojis">
            <Button shape="circle" icon={<SmileOutlined />}
              style={{ background: 'transparent', border: 'none', color: '#8696a0', flexShrink: 0 }} />
          </Tooltip>
        </Popover>

        {/* Adjuntar */}
        <Popover content={attachMenu} trigger="click" placement="topLeft"
          overlayStyle={{ zIndex: 1050 }}
          styles={{ body: { background: '#202c33', border: '1px solid #2a3942', padding: 4 } }}>
          <Tooltip title="Adjuntar">
            <Button shape="circle" icon={<PaperClipOutlined />}
              style={{ background: 'transparent', border: 'none', color: '#8696a0', flexShrink: 0 }}
              loading={sendingFile} />
          </Tooltip>
        </Popover>

        {/* TextArea */}
        <Input.TextArea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKey}
          placeholder={notaMode ? '🔒 Escribí una nota interna...' : 'Escribe un mensaje o "/" para plantillas'}
          autoSize={{ minRows: 1, maxRows: 5 }}
          disabled={disabled}
          className="baileys-msg-textarea"
          style={{
            background: inputBg, border: inputBorder, borderRadius: 8,
            color: notaMode ? '#e9d97a' : '#e9edef',
            resize: 'none', flex: 1, padding: '8px 12px'
          }}
        />

        {/* Nota interna toggle */}
        <Tooltip title={notaMode ? 'Salir de modo nota' : 'Nota interna (solo equipo)'}>
          <Button
            shape="circle"
            icon={<LockOutlined />}
            onClick={() => setNotaMode(p => !p)}
            disabled={disabled}
            style={{
              background: notaMode ? '#534f2a' : 'transparent',
              border: notaMode ? '1px solid #c5b350' : 'none',
              color: notaMode ? '#c5b350' : '#8696a0',
              flexShrink: 0
            }}
          />
        </Tooltip>

        {/* Enviar / Mic */}
        {text.trim() ? (
          <Tooltip title={notaMode ? 'Guardar nota' : 'Enviar'}>
            <Button shape="circle" icon={<SendOutlined />} onClick={handleSend} disabled={disabled}
              style={{
                background: notaMode ? '#534f2a' : '#00a884',
                border: 'none', color: notaMode ? '#c5b350' : '#fff', flexShrink: 0
              }} />
          </Tooltip>
        ) : (
          !notaMode && (
            <Tooltip title="Nota de voz">
              <Button shape="circle" icon={<AudioOutlined />} onClick={() => setIsRecording(true)} disabled={disabled}
                style={{ background: 'transparent', border: 'none', color: '#8696a0', flexShrink: 0 }} />
            </Tooltip>
          )
        )}
      </div>
    </div>
  )
}
