import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Input, Spin, Badge, Tooltip, Modal, Form, Tag, Divider, Space, Popover,
  message as antMsg
} from 'antd'
import {
  SendOutlined, UserOutlined, PlusOutlined,
  FileOutlined, AudioOutlined, VideoCameraOutlined, PictureOutlined,
  DeleteOutlined, PhoneOutlined, SearchOutlined,
  CloseCircleOutlined, EditOutlined, EnvironmentOutlined, PaperClipOutlined,
  SmileOutlined, ArrowLeftOutlined
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { getInitials } from '../../utils/format'
import useHubConnection from '../../hooks/useHubConnection'
import dayjs from 'dayjs'
import AudioPlayer from './components/AudioPlayer'
import MediaPreviewModal from './components/MediaPreviewModal'
import MessageReactions from './components/MessageReactions'
import WaAvatar from '../../components/WaAvatar'

// === ACK map ===
const ACK_ICONS = {
  0: { icon: '🕐', color: '#8696a0', title: 'Pendiente' },
  1: { icon: '✓',  color: '#8696a0', title: 'Enviado al servidor' },
  2: { icon: '✓✓', color: '#8696a0', title: 'Entregado' },
  3: { icon: '✓✓', color: '#53bdeb', title: 'Leído' },
  4: { icon: '✓✓', color: '#53bdeb', title: 'Reproducido' },
}

// === Emojis agrupados ===
const EMOJI_GROUPS = [
  { label: '😀 Gestos', emojis: ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','🙃','😉','😍','🥰','😘','😜','😎','🤩','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','😱','😨','😰','😥','😓','🤗','🤔','🤭','😶','😐','😑','🙄','😬','🤐','🤫'] },
  { label: '👍 Gestos', emojis: ['👍','👎','👏','🙌','🤝','🤜','🤛','✊','👊','🤚','✋','🖐','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','👈','👉','👆','👇','☝️','👋','🤙','💪','🦾','🫶','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'] },
  { label: '🐶 Animales', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐝','🦋','🐛','🐌','🐞','🐜','🦗','🦟','🦕','🦖','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🦍','🦧'] },
  { label: '🍎 Comida', emojis: ['🍎','🍊','🍋','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥝','🍅','🥑','🥦','🥕','🌽','🌶','🥒','🍆','🧅','🧄','🥔','🍠','🫘','🌰','🍞','🥐','🥖','🫓','🥨','🥯','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫔','🌮','🌯','🥙','🧆','🥚','🍜','🍝','🍛','🍣','🍱'] },
  { label: '⚽ Deporte', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🥅','⛳','🎿','🛷','🥌','🎯','🎮','🕹','🎲','🧩','🎭','🎨','🖌','🎤','🎧','🎼','🎵','🎶','🎹','🥁','🎸','🎺','🎻','🎷','🪕','🎙','📻','📺','📱','💻','⌨️','🖥','🖨','🖱','💾','💿','📷','📸','📹','🎬'] },
]

// === Picker de emojis ===
function EmojiPicker({ onSelect }) {
  const [grupo, setGrupo] = useState(0)
  return (
    <div style={{ width: 280 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {EMOJI_GROUPS.map((g, i) => (
          <button key={i} onClick={() => setGrupo(i)}
            style={{ background: grupo === i ? '#00a884' : '#2a3942', border: 'none', borderRadius: 6,
              padding: '4px 8px', cursor: 'pointer', color: '#e9edef', fontSize: 12 }}>
            {g.label.split(' ')[0]}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
        {EMOJI_GROUPS[grupo].emojis.map(e => (
          <button key={e} onClick={() => onSelect(e)}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
              padding: '2px', borderRadius: 4, lineHeight: 1 }}
            title={e}>
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}

// === Icono media para preview de conversación ===
function MediaIcon({ tipo, mimeType }) {
  const t = (tipo || '').toLowerCase()
  const m = (mimeType || '').toLowerCase()
  if (t === 'image' || m.startsWith('image')) return <PictureOutlined style={{ fontSize: 11, marginRight: 3 }} />
  if (t === 'audio' || t === 'ptt' || m.startsWith('audio')) return <AudioOutlined style={{ fontSize: 11, marginRight: 3 }} />
  if (t === 'video' || m.startsWith('video')) return <VideoCameraOutlined style={{ fontSize: 11, marginRight: 3 }} />
  if (t === 'document' || t === 'sticker') return <FileOutlined style={{ fontSize: 11, marginRight: 3 }} />
  return null
}

// === Ítem de conversación (sidebar) ===
function ConversationItem({ conv, isActive, onClick }) {
  const name = conv.nombreContacto || conv.NombreContacto || conv.numeroCliente || conv.NumeroCliente || 'Desconocido'
  const number = conv.numeroCliente || conv.NumeroCliente || ''
  const lastTime = conv.fechaUltimoMensaje || conv.FechaUltimoMensaje
  const unread = conv.mensajesNoLeidos || conv.MensajesNoLeidos || 0
  const lastMsg = conv.ultimoMensaje || conv.UltimoMensaje || ''
  const mimeType = conv.ultimoMimeType || conv.UltimoMimeType || ''
  const tipoMsg = conv.ultimoTipo || conv.UltimoTipo || ''

  const timeLabel = lastTime
    ? (dayjs().isSame(dayjs(lastTime), 'day') ? dayjs(lastTime).format('HH:mm') : dayjs(lastTime).format('DD/MM'))
    : ''

  return (
    <div
      onClick={onClick}
      className={`wa-conv-item${isActive ? ' active' : ''}`}
    >
      <WaAvatar numero={number} nombre={name} />
      <div className="wa-conv-info">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="wa-conv-name">{name}</span>
          <span className="wa-conv-time" style={{ color: unread > 0 ? '#25d366' : undefined }}>
            {timeLabel}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <span className="wa-conv-preview">
            {(mimeType || tipoMsg) && <MediaIcon tipo={tipoMsg} mimeType={mimeType} />}
            {lastMsg || number}
          </span>
          {unread > 0 && <span className="wa-badge">{unread}</span>}
        </div>
      </div>
    </div>
  )
}

// === Componente principal ===
export default function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  // ── Estados existentes ──
  const [conversations, setConversations]   = useState([])
  const [messages, setMessages]             = useState([])
  const [contactInfo, setContactInfo]       = useState(null)
  const [searchText, setSearchText]         = useState('')
  const [newMessage, setNewMessage]         = useState('')
  const [sendingMsg, setSendingMsg]         = useState(false)
  const [loadingConvs, setLoadingConvs]     = useState(true)
  const [loadingMsgs, setLoadingMsgs]       = useState(false)
  const [activeNumber, setActiveNumber]     = useState(null)
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [savingContact, setSavingContact]   = useState(false)
  const [contactForm]                       = Form.useForm()
  const messagesEndRef                      = useRef(null)

  // ── Estados nuevos (WhatsApp UI) ──
  const [reactions, setReactions]               = useState({})
  const [mediaPreview, setMediaPreview]         = useState(null)
  const [ackMap, setAckMap]                     = useState({})
  const [llamadaEntrante, setLlamadaEntrante]   = useState(null)
  const [emojiOpen, setEmojiOpen]               = useState(false)
  const [sendingFile, setSendingFile]           = useState(false)
  const fileInputRef                            = useRef(null)

  // ── Grabación de voz ──
  const [isRecording, setIsRecording]           = useState(false)
  const [recordingTime, setRecordingTime]       = useState(0)
  const mediaRecorderRef                        = useRef(null)
  const recordingIntervalRef                    = useRef(null)
  const cancelRecordingRef                      = useRef(false)

  // ── Mobile responsive ──
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [isMobile, setIsMobile]             = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Refs para SignalR (evitar stale closures)
  const activeNumberRef = useRef(null)
  const idRef           = useRef(id)
  useEffect(() => { activeNumberRef.current = activeNumber }, [activeNumber])
  useEffect(() => { idRef.current = id }, [id])

  // ── API: cargar número activo ──
  const fetchActiveNumber = useCallback(async () => {
    try {
      const res = await api.get('/WhatsApp/obtenerNumero')
      const num = res.data?.numero || res.data?.Numero || null
      if (num) { setActiveNumber(num); return }
    } catch { }
    try {
      const res = await api.get('/Configuracion/whatsapp_numero')
      const num = res.data?.valor || res.data?.Valor || null
      if (num) setActiveNumber(num)
    } catch { }
  }, [])

  // ── API: cargar lista de conversaciones ──
  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.post('/Conversacion/ObtenerResumen', { NumeroCuenta: null, NumeroCliente: null })
      const data = Array.isArray(res.data) ? res.data : (res.data?.conversaciones || res.data?.data || [])
      setConversations(data)
    } catch {
      // silent poll error
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  // ── API: cargar mensajes de la conversación activa ──
  const fetchMessages = useCallback(async (numero) => {
    if (!numero) return
    try {
      const res = await api.post('/Conversacion/ObtenerDetalle', {
        NumeroCuenta: activeNumberRef.current || null,
        NumeroCliente: numero,
        FechaInicio: null,
        FechaFin: null
      })
      const data = Array.isArray(res.data) ? res.data : (res.data?.mensajes || res.data?.data || [])
      setMessages(data)
    } catch {
      // silent
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  // ── API: cargar info del contacto ──
  const fetchContactInfo = useCallback(async (numero) => {
    try {
      const res = await api.get(`/Contacto?busqueda=${encodeURIComponent(numero)}`)
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || [])
      setContactInfo(data.length > 0 ? data[0] : null)
    } catch {
      setContactInfo(null)
    }
  }, [])

  // ── Efectos de carga inicial ──
  useEffect(() => {
    fetchActiveNumber()
    fetchConversations()
    const interval = setInterval(fetchConversations, 20000)
    return () => clearInterval(interval)
  }, [fetchConversations, fetchActiveNumber])

  useEffect(() => {
    if (id) {
      setLoadingMsgs(true)
      fetchMessages(id)
      fetchContactInfo(id)
    }
  }, [id, fetchMessages, fetchContactInfo])

  // ── SignalR: tiempo real ──
  useHubConnection('/hub-chat', {
    NuevoMensaje: (payloadStr) => {
      try {
        const data = JSON.parse(payloadStr)
        const numCliente = data.NumeroCliente || data.numeroCliente
        if (numCliente && numCliente === idRef.current) {
          fetchMessages(idRef.current)
        }
        fetchConversations()
      } catch { }
    },
    AckActualizado: (whatsAppId, ackEstado) => {
      setAckMap(prev => ({ ...prev, [whatsAppId]: ackEstado }))
    },
    NuevaReaccion: (whatsAppId, emoji, senderId) => {
      setReactions(prev => ({
        ...prev,
        [whatsAppId]: [...(prev[whatsAppId] || []), { emoji, senderId }]
      }))
    },
    LlamadaEntrante: (from, isVideo) => {
      setLlamadaEntrante({ from, isVideo })
      setTimeout(() => setLlamadaEntrante(null), 10000)
    }
  })

  // ── Scroll al final cuando llegan mensajes ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Enviar mensaje ──
  const handleSend = async () => {
    if (!newMessage.trim() || !id) return
    setSendingMsg(true)
    try {
      await api.post('/WhatsApp/agendar', {
        NumeroOrigen: activeNumber,
        NumeroDestino: id,
        Mensage: newMessage.trim()
      })
      setNewMessage('')
      await fetchMessages(id)
    } catch {
      antMsg.error('No se pudo enviar el mensaje')
    } finally {
      setSendingMsg(false)
    }
  }

  // ── Enviar archivo adjunto ──
  const resolveMimeType = (file) => {
    if (file.type) return file.type
    const ext = file.name.split('.').pop()?.toLowerCase()
    const mimeMap = {
      doc:  'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls:  'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf:  'application/pdf',
      txt:  'text/plain',
    }
    return mimeMap[ext] || 'application/octet-stream'
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setSendingFile(true)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await api.post('/WhatsApp/agendar', {
        NumeroOrigen: activeNumber,
        NumeroDestino: id,
        Mensage: null,
        AdjuntoBase64: base64,
        NombreArchivo: file.name,
        MimeType: resolveMimeType(file),
        NroByte: file.size,
      })
      await fetchMessages(id)
    } catch {
      antMsg.error('No se pudo enviar el archivo')
    } finally {
      setSendingFile(false)
      e.target.value = ''
    }
  }

  // ── Grabación de voz ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm'

      const mr = new MediaRecorder(stream, { mimeType })
      const chunks = []
      cancelRecordingRef.current = false

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (cancelRecordingRef.current) return
        try {
          const blob = new Blob(chunks, { type: mimeType })
          const reader = new FileReader()
          reader.onload = async () => {
            const base64 = reader.result.split(',')[1]
            await api.post('/WhatsApp/agendar', {
              NumeroOrigen: activeNumber,
              NumeroDestino: id,
              Mensage: null,
              AdjuntoBase64: base64,
              NombreArchivo: 'audio.webm',
              MimeType: mimeType,
              NroByte: blob.size,
            })
            await fetchMessages(id)
          }
          reader.readAsDataURL(blob)
        } catch {
          antMsg.error('No se pudo enviar el audio')
        }
      }

      mr.start(200)
      mediaRecorderRef.current = mr
      setIsRecording(true)
      setRecordingTime(0)

      const start = Date.now()
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - start) / 1000))
      }, 500)
    } catch {
      antMsg.error('No se pudo acceder al micrófono')
    }
  }

  const stopRecording = () => {
    clearInterval(recordingIntervalRef.current)
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    setRecordingTime(0)
  }

  const cancelRecording = () => {
    cancelRecordingRef.current = true
    clearInterval(recordingIntervalRef.current)
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    setRecordingTime(0)
  }

  const formatRecTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ── Guardar / editar contacto ──
  const handleSaveContact = async () => {
    try {
      const values = await contactForm.validateFields()
      setSavingContact(true)
      await api.post('/Contacto', {
        Nombres: values.nombres,
        Apellidos: values.apellidos || '',
        NumeroWhatsApp: values.numeroWhatsApp,
        Email: values.email || '',
        Cargo: values.cargo || ''
      })
      antMsg.success('Contacto guardado')
      setAddContactOpen(false)
      contactForm.resetFields()
      if (id) fetchContactInfo(id)
    } catch (err) {
      if (!err?.errorFields) antMsg.error('Error al guardar contacto')
    } finally {
      setSavingContact(false)
    }
  }

  // ── Datos derivados ──
  const filteredConvs = conversations.filter(c => {
    const name = c.nombreContacto || c.NombreContacto || c.numeroCliente || c.NumeroCliente || ''
    return name.toLowerCase().includes(searchText.toLowerCase())
  })

  const selectedConv = conversations.find(c =>
    (c.numeroCliente || c.NumeroCliente) === id
  )

  const contactName = contactInfo
    ? `${contactInfo.nombres || contactInfo.Nombres || ''} ${contactInfo.apellidos || contactInfo.Apellidos || ''}`.trim()
    : (selectedConv?.nombreContacto || selectedConv?.NombreContacto || id || '')

  // ── Render de cada burbuja ──
  const renderMensaje = (msg, idx) => {
    const isIncoming = msg.IdMensajeEntrante != null || msg.idMensajeEntrante != null
    const isNota     = msg.esNota || msg.EsNota || false
    const isDeleted  = msg.eliminado || msg.Eliminado || msg.fueEliminado || msg.FueEliminado || false
    const isEdited   = msg.editado || msg.Editado || false
    const text       = msg.Mensaje || msg.mensaje || msg.contenido || msg.Contenido || ''
    const time       = msg.FechaEnvio || msg.fechaEnvio || msg.Fecha || msg.fecha
    const mimeType   = msg.MimeType || msg.mimeType || ''
    const nombreArchivo = msg.NombreArchivo || msg.nombreArchivo || ''
    const whatsAppId = msg.WhatsAppId || msg.whatsAppId || msg.Id || msg.id || idx
    const whatsAppTipo = (msg.WhatsAppTipo || msg.whatsAppTipo || '').toLowerCase()

    const ack = ackMap[whatsAppId] ?? (msg.AckEstado ?? msg.ackEstado ?? (isIncoming ? null : 1))

    const msgReactions = reactions[whatsAppId] || []

    // Clasificar tipo de contenido
    const esGif       = mimeType === 'image/gif'
                        || (msg.EsGif || msg.esGif || false)
                        || nombreArchivo?.toLowerCase().endsWith('.gif')
    const tieneFoto   = mimeType.startsWith('image/')
    const tieneVideo  = mimeType.startsWith('video/')
    const tieneAudio  = mimeType.startsWith('audio/') || whatsAppTipo === 'ptt'
    const tieneDoc    = !!mimeType && !tieneFoto && !tieneVideo && !tieneAudio
    const tieneMapa   = whatsAppTipo === 'location'

    const base64Src = (msg.adjuntoBase64 || msg.AdjuntoBase64)
      ? `data:${mimeType};base64,${msg.adjuntoBase64 || msg.AdjuntoBase64}`
      : (msg.urlArchivo || msg.UrlArchivo || null)

    // Nota interna: clase especial
    if (isNota) {
      return (
        <div key={whatsAppId} className="wa-msg-wrapper" style={{ alignItems: 'center' }}>
          <div className="wa-bubble" style={{ background: '#fff9c4', border: '1px dashed #f0ad4e', borderRadius: 8, maxWidth: '80%' }}>
            {isDeleted ? (
              <span className="wa-deleted"><DeleteOutlined /> Mensaje eliminado</span>
            ) : (
              <span className="wa-text" style={{ color: '#7a6000', fontStyle: 'italic' }}>{text}</span>
            )}
            <div className="wa-msg-footer">
              <span className="wa-time">{time ? dayjs(time).format('HH:mm') : ''}</span>
              <span style={{ fontSize: 10, color: '#b8860b', marginLeft: 4 }}>Nota</span>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div key={whatsAppId} className={`wa-msg-wrapper ${isIncoming ? 'wa-msg-in' : 'wa-msg-out'}`}>
        <div className="wa-bubble">
          {/* Mensaje eliminado */}
          {isDeleted && (
            <span className="wa-deleted">
              <CloseCircleOutlined style={{ marginRight: 4 }} />
              Este mensaje fue eliminado
            </span>
          )}

          {/* Imagen */}
          {!isDeleted && tieneFoto && base64Src && (
            <img
              src={base64Src}
              className="wa-img-preview"
              onClick={() => setMediaPreview({ src: base64Src, mimeType })}
              alt={nombreArchivo || 'imagen'}
            />
          )}

          {/* Video / GIF-video */}
          {!isDeleted && tieneVideo && base64Src && (
            <video
              src={base64Src}
              className="wa-video-preview"
              autoPlay
              loop
              muted
              playsInline
              onClick={() => setMediaPreview({ src: base64Src, mimeType })}
            />
          )}

          {/* Audio */}
          {!isDeleted && tieneAudio && base64Src && (
            <AudioPlayer src={base64Src} isIncoming={isIncoming} />
          )}

          {/* Documento */}
          {!isDeleted && tieneDoc && (
            <a
              href={base64Src || undefined}
              download={base64Src ? (nombreArchivo || 'archivo') : undefined}
              className="wa-doc-chip"
              style={{ textDecoration: 'none', cursor: base64Src ? 'pointer' : 'default' }}
            >
              <FileOutlined className="wa-doc-icon" />
              <span className="wa-doc-name">{nombreArchivo || mimeType || 'archivo'}</span>
            </a>
          )}

          {/* Ubicación */}
          {!isDeleted && tieneMapa && (
            <div className="wa-location">
              <EnvironmentOutlined />
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(text)}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#53bdeb' }}
              >
                Ver ubicación
              </a>
            </div>
          )}

          {/* Texto */}
          {!isDeleted && text && (
            <span className="wa-text">
              {text}
              {isEdited && <span className="wa-edited"> (editado)</span>}
            </span>
          )}

          {/* Footer: hora + ACK */}
          <div className="wa-msg-footer">
            <span className="wa-time">
              {time ? dayjs(time).format('HH:mm') : ''}
            </span>
            {!isIncoming && ack !== null && (
              <Tooltip title={ACK_ICONS[ack]?.title}>
                <span className="wa-ack" style={{ color: ACK_ICONS[ack]?.color }}>
                  {ACK_ICONS[ack]?.icon}
                </span>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Reacciones */}
        <MessageReactions reactions={msgReactions} />
      </div>
    )
  }

  return (
    <div className="wa-container">

      {/* ── Notificación llamada entrante ── */}
      {llamadaEntrante && (
        <div className="wa-call-notification">
          {llamadaEntrante.isVideo ? <VideoCameraOutlined /> : <PhoneOutlined />}
          <span>Llamada entrante de {llamadaEntrante.from}</span>
          <button onClick={() => setLlamadaEntrante(null)}>Ignorar</button>
        </div>
      )}

      {/* ════════════════════ SIDEBAR ════════════════════ */}
      <div className={`wa-sidebar${isMobile && mobileShowChat ? ' mobile-hidden' : ''}`}>
        <div className="wa-sidebar-header">
          <div className="wa-avatar wa-avatar-user" style={{ marginRight: 0 }}>
            {activeNumber ? getInitials(activeNumber) : '?'}
          </div>
          <span style={{ color: '#8696a0', fontSize: 12, flex: 1, marginLeft: 10 }}>
            {activeNumber || 'Sin número'}
          </span>
        </div>

        <div className="wa-search">
          <Input
            placeholder="Buscar conversación..."
            prefix={<SearchOutlined style={{ color: '#8696a0' }} />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
            className="wa-search-input"
          />
        </div>

        <div className="wa-conversations-list">
          {loadingConvs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Spin />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#8696a0' }}>
              Sin conversaciones
            </div>
          ) : (
            filteredConvs.map((conv, idx) => {
              const key = conv.numeroCliente || conv.NumeroCliente || idx
              return (
                <ConversationItem
                  key={key}
                  conv={conv}
                  isActive={key === id}
                  onClick={() => {
                    navigate(`/chat/${key}`)
                    if (isMobile) setMobileShowChat(true)
                  }}
                />
              )
            })
          )}
        </div>
      </div>

      {/* ════════════════════ PANEL PRINCIPAL ════════════════════ */}
      <div className={`wa-chat-main${isMobile && !mobileShowChat ? ' mobile-hidden' : ''}`}>
        {!id ? (
          /* Estado vacío */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#0b141a', color: '#8696a0'
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: '#202c33', display: 'flex',
              alignItems: 'center', justifyContent: 'center', marginBottom: 16
            }}>
              <SendOutlined style={{ fontSize: 36, color: '#00a884' }} />
            </div>
            <span style={{ fontSize: 15 }}>Seleccioná una conversación para chatear</span>
          </div>
        ) : (
          <>
            {/* Header del chat */}
            <div className="wa-chat-header">
              {isMobile && (
                <ArrowLeftOutlined
                  onClick={() => setMobileShowChat(false)}
                  style={{ color: '#e9edef', fontSize: 20, cursor: 'pointer', marginRight: 8, flexShrink: 0 }}
                />
              )}
              <WaAvatar numero={id} nombre={contactName} style={{ marginRight: 0 }} />
              <div className="wa-chat-header-info">
                <div className="wa-chat-name">{contactName || id}</div>
                <div className="wa-chat-number">{id}</div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginLeft: 'auto' }}>
                <Tooltip title="Llamadas no disponibles — whatsapp-web.js no soporta iniciar llamadas">
                  <PhoneOutlined style={{ color: '#3b4a54', fontSize: 20, cursor: 'not-allowed', opacity: 0.4 }} />
                </Tooltip>
                <Tooltip title="Videollamadas no disponibles — whatsapp-web.js no soporta iniciar llamadas">
                  <VideoCameraOutlined style={{ color: '#3b4a54', fontSize: 20, cursor: 'not-allowed', opacity: 0.4 }} />
                </Tooltip>
              </div>
            </div>

            {/* Área de mensajes */}
            <div className="wa-messages-area">
              {loadingMsgs && messages.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <Spin />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: '#8696a0' }}>
                  Sin mensajes
                </div>
              ) : (
                messages.map((msg, idx) => renderMensaje(msg, idx))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de envío */}
            <div className="wa-input-area">
              {isRecording ? (
                /* ── Modo grabación ── */
                <>
                  <Tooltip title="Cancelar grabación">
                    <button className="wa-btn-cancel-rec" type="button" onClick={cancelRecording}>✕</button>
                  </Tooltip>
                  <div className="wa-recording-area">
                    <div className="wa-recording-dot" />
                    <div className="wa-recording-waves">
                      {[8,14,10,18,12,16,10].map((h, i) => (
                        <div key={i} className="wa-recording-wave-bar" style={{ height: `${h}px` }} />
                      ))}
                    </div>
                    <span className="wa-recording-time">{formatRecTime(recordingTime)}</span>
                  </div>
                  <Tooltip title="Enviar audio">
                    <button className="wa-btn-mic recording" type="button" onClick={stopRecording}>
                      <SendOutlined />
                    </button>
                  </Tooltip>
                </>
              ) : (
                /* ── Modo normal ── */
                <>
                  {/* Emoji picker */}
                  <Popover
                    open={emojiOpen}
                    onOpenChange={setEmojiOpen}
                    trigger="click"
                    placement="topLeft"
                    overlayInnerStyle={{ background: '#202c33', padding: 10, borderRadius: 10 }}
                    content={
                      <EmojiPicker onSelect={emoji => {
                        setNewMessage(prev => prev + emoji)
                        setEmojiOpen(false)
                      }} />
                    }
                  >
                    <Tooltip title="Emojis">
                      <button className="wa-btn-emoji" type="button" aria-label="Emoji">
                        <SmileOutlined />
                      </button>
                    </Tooltip>
                  </Popover>

                  {/* Adjuntar archivo */}
                  <Tooltip title="Adjuntar archivo">
                    <button
                      className="wa-btn-attach"
                      type="button"
                      disabled={sendingFile}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {sendingFile ? <Spin size="small" /> : <PaperClipOutlined />}
                    </button>
                  </Tooltip>
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={handleFileChange}
                  />

                  <Input.TextArea
                    className="wa-text-input"
                    style={{ flex: 1 }}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onPressEnter={e => {
                      if (!e.shiftKey) { e.preventDefault(); handleSend() }
                    }}
                    placeholder="Escribe un mensaje..."
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    disabled={sendingMsg}
                  />

                  {/* Enviar texto O grabar voz — según si hay texto */}
                  {newMessage.trim() ? (
                    <Tooltip title="Enviar">
                      <button
                        className="wa-btn-send"
                        type="button"
                        onClick={handleSend}
                        disabled={sendingMsg}
                      >
                        {sendingMsg ? <Spin size="small" style={{ color: '#fff' }} /> : <SendOutlined />}
                      </button>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Grabar mensaje de voz">
                      <button className="wa-btn-mic" type="button" onClick={startRecording}>
                        <AudioOutlined />
                      </button>
                    </Tooltip>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ════════════════════ PANEL DERECHO: INFO CONTACTO ════════════════════ */}
      {id && !isMobile && (
        <div style={{
          width: 280, borderLeft: '1px solid #222e35',
          display: 'flex', flexDirection: 'column',
          background: '#111b21'
        }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid #222e35',
            color: '#e9edef', fontWeight: 600, fontSize: 15
          }}>
            Contacto
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {contactInfo ? (
              <Space direction="vertical" style={{ width: '100%' }} size={10}>
                <div style={{ textAlign: 'center', paddingBottom: 8 }}>
                  <WaAvatar numero={id} nombre={contactName} size={64} style={{ margin: '0 auto' }} />
                  <div style={{ marginTop: 8, color: '#e9edef', fontWeight: 600 }}>{contactName}</div>
                  {(contactInfo.cargo || contactInfo.Cargo) && (
                    <div style={{ color: '#8696a0', fontSize: 12 }}>
                      {contactInfo.cargo || contactInfo.Cargo}
                    </div>
                  )}
                </div>

                <Divider style={{ margin: '4px 0', borderColor: '#222e35' }} />

                <div>
                  <div style={{ color: '#8696a0', fontSize: 11 }}>WhatsApp</div>
                  <div style={{ color: '#e9edef', fontSize: 13 }}>
                    {contactInfo.numeroWhatsApp || contactInfo.NumeroWhatsApp || id}
                  </div>
                </div>

                {(contactInfo.email || contactInfo.Email) && (
                  <div>
                    <div style={{ color: '#8696a0', fontSize: 11 }}>Email</div>
                    <div style={{ color: '#e9edef', fontSize: 13 }}>
                      {contactInfo.email || contactInfo.Email}
                    </div>
                  </div>
                )}

                {(contactInfo.empresa?.nombre || contactInfo.Empresa?.Nombre ||
                  contactInfo.nombreEmpresa || contactInfo.NombreEmpresa) && (
                  <div>
                    <div style={{ color: '#8696a0', fontSize: 11 }}>Empresa</div>
                    <div style={{ color: '#e9edef', fontSize: 13 }}>
                      {contactInfo.empresa?.nombre || contactInfo.Empresa?.Nombre ||
                       contactInfo.nombreEmpresa || contactInfo.NombreEmpresa}
                    </div>
                  </div>
                )}

                {(contactInfo.etiquetas?.length > 0 || contactInfo.Etiquetas?.length > 0) && (
                  <div>
                    <div style={{ color: '#8696a0', fontSize: 11, marginBottom: 4 }}>Etiquetas</div>
                    {(contactInfo.etiquetas || contactInfo.Etiquetas || []).map((et, i) => (
                      <Tag key={i} color={et.color || et.Color || 'blue'} style={{ marginBottom: 4 }}>
                        {et.nombre || et.Nombre || et}
                      </Tag>
                    ))}
                  </div>
                )}

                {(contactInfo.notas || contactInfo.Notas) && (
                  <div>
                    <div style={{ color: '#8696a0', fontSize: 11 }}>Notas</div>
                    <div style={{ fontSize: 12, color: '#8696a0', marginTop: 2, background: '#202c33', padding: '6px 8px', borderRadius: 6 }}>
                      {contactInfo.notas || contactInfo.Notas}
                    </div>
                  </div>
                )}
              </Space>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: '#202c33',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px'
                }}>
                  <UserOutlined style={{ fontSize: 28, color: '#8696a0' }} />
                </div>
                <div style={{ color: '#8696a0', fontSize: 14 }}>Sin contacto registrado</div>
                <div style={{ color: '#8696a0', fontSize: 12, marginTop: 4 }}>{id}</div>
              </div>
            )}
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid #222e35' }}>
            <button
              type="button"
              onClick={() => {
                contactForm.setFieldsValue({ numeroWhatsApp: id })
                setAddContactOpen(true)
              }}
              style={{
                width: '100%', background: '#00a884', border: 'none',
                borderRadius: 8, color: '#fff', padding: '8px 0',
                cursor: 'pointer', fontWeight: 600, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              {contactInfo ? <EditOutlined /> : <PlusOutlined />}
              {contactInfo ? 'Editar Contacto' : 'Agregar Contacto'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal agregar / editar contacto ── */}
      <Modal
        title={contactInfo ? 'Editar Contacto' : 'Agregar Contacto'}
        open={addContactOpen}
        onOk={handleSaveContact}
        onCancel={() => { setAddContactOpen(false); contactForm.resetFields() }}
        confirmLoading={savingContact}
        okText="Guardar"
        cancelText="Cancelar"
        okButtonProps={{ style: { background: '#00a884', borderColor: '#00a884' } }}
        destroyOnClose
      >
        <Form form={contactForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item label="Nombres" name="nombres" rules={[{ required: true, message: 'Ingresa el nombre' }]}>
            <Input placeholder="Nombre del contacto" />
          </Form.Item>
          <Form.Item label="Apellidos" name="apellidos">
            <Input placeholder="Apellidos" />
          </Form.Item>
          <Form.Item label="Número WhatsApp" name="numeroWhatsApp" rules={[{ required: true }]}>
            <Input placeholder="51XXXXXXXXX" />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input placeholder="correo@ejemplo.com" />
          </Form.Item>
          <Form.Item label="Cargo" name="cargo">
            <Input placeholder="Ej: Gerente, Cliente, Proveedor..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Modal preview multimedia ── */}
      <MediaPreviewModal
        open={!!mediaPreview}
        src={mediaPreview?.src}
        mimeType={mediaPreview?.mimeType}
        onClose={() => setMediaPreview(null)}
      />
    </div>
  )
}
