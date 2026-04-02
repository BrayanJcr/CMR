import React, { useState, useRef } from 'react'
import { Input, Button, Tooltip, Popover, Upload, message as antMsg } from 'antd'
import {
  SendOutlined, PaperClipOutlined, SmileOutlined,
  EnvironmentOutlined, PieChartOutlined, AudioOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import AudioRecorder from './AudioRecorder'

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

export default function MessageInput({ onSendText, onSendFile, onSendVoice, onSendLocation,
                                       onSendPoll, onSendEphemeral, disabled, activeNumero }) {
  const [text,         setText]         = useState('')
  const [showEmoji,    setShowEmoji]    = useState(false)
  const [isRecording,  setIsRecording]  = useState(false)
  const [sendingFile,  setSendingFile]  = useState(false)
  const inputRef                        = useRef(null)
  const typingTimerRef                  = useRef(null)

  const handleSend = () => {
    const t = text.trim()
    if (!t) return
    // Limpiar typing antes de enviar
    if (activeNumero) {
      import('../../../api/baileys').then(m => m.default.updatePresence(activeNumero, 'available').catch(() => {}))
    }
    onSendText(t)
    setText('')
    inputRef.current?.focus()
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const notifyTyping = (value) => {
    if (!activeNumero) return
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
  }

  const handleEmoji = (emoji) => {
    setText(prev => prev + emoji)
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  const handleFileUpload = async ({ file }) => {
    // Ant Design UploadFile wrapper — extraer el File nativo
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
      <Button type="text" icon={<EnvironmentOutlined />} style={{ color: '#e9edef', textAlign: 'left' }}
        onClick={onSendLocation}>
        Ubicación
      </Button>
      <Button type="text" icon={<PieChartOutlined />} style={{ color: '#e9edef', textAlign: 'left' }}
        onClick={onSendPoll}>
        Encuesta
      </Button>
      <Button type="text" icon={<ClockCircleOutlined />} style={{ color: '#e9edef', textAlign: 'left' }}
        onClick={onSendEphemeral}>
        Mensaje efímero
      </Button>
    </div>
  )

  if (isRecording) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: '#202c33', gap: 8 }}>
        <AudioRecorder
          onRecorded={async (blob) => {
            setIsRecording(false)
            await onSendVoice(blob)
          }}
          onCancel={() => setIsRecording(false)}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: '#202c33', gap: 8 }}>
      <Popover
        content={<EmojiPicker onSelect={handleEmoji} />}
        trigger="click"
        open={showEmoji}
        onOpenChange={setShowEmoji}
        placement="topLeft"
        overlayStyle={{ zIndex: 1050 }}
        styles={{ body: { background: '#202c33', border: '1px solid #2a3942', padding: 8 } }}
      >
        <Tooltip title="Emojis">
          <Button shape="circle" icon={<SmileOutlined />}
            style={{ background: 'transparent', border: 'none', color: '#8696a0', flexShrink: 0 }} />
        </Tooltip>
      </Popover>

      <Popover content={attachMenu} trigger="click" placement="topLeft"
        overlayStyle={{ zIndex: 1050 }}
        styles={{ body: { background: '#202c33', border: '1px solid #2a3942', padding: 4 } }}>
        <Tooltip title="Adjuntar">
          <Button shape="circle" icon={<PaperClipOutlined />}
            style={{ background: 'transparent', border: 'none', color: '#8696a0', flexShrink: 0 }}
            loading={sendingFile} />
        </Tooltip>
      </Popover>

      <Input.TextArea
        ref={inputRef}
        value={text}
        onChange={e => { setText(e.target.value); notifyTyping(e.target.value) }}
        onKeyDown={handleKey}
        placeholder="Escribe un mensaje"
        autoSize={{ minRows: 1, maxRows: 5 }}
        disabled={disabled}
        className="baileys-msg-textarea"
        style={{ background: '#2a3942', border: 'none', borderRadius: 8, color: '#e9edef',
                 resize: 'none', flex: 1, padding: '8px 12px' }}
      />

      {text.trim()
        ? (
          <Tooltip title="Enviar">
            <Button shape="circle" icon={<SendOutlined />} onClick={handleSend} disabled={disabled}
              style={{ background: '#00a884', border: 'none', color: '#fff', flexShrink: 0 }} />
          </Tooltip>
        ) : (
          <Tooltip title="Nota de voz">
            <Button shape="circle" icon={<AudioOutlined />} onClick={() => setIsRecording(true)} disabled={disabled}
              style={{ background: 'transparent', border: 'none', color: '#8696a0', flexShrink: 0 }} />
          </Tooltip>
        )
      }
    </div>
  )
}
