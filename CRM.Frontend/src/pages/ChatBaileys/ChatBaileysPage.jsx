import React, { useState, useEffect, useCallback } from 'react'
import { Button, Tooltip, Badge, Switch, Modal, Input, Spin, Typography, Form, App, Tag } from 'antd'
import {
  RobotOutlined, PhoneOutlined, VideoCameraOutlined,
  UserOutlined, ArrowLeftOutlined, InfoCircleOutlined, PlusOutlined,
  TeamOutlined, SettingOutlined, ContactsOutlined, BellOutlined,
  SearchOutlined, BarChartOutlined
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { formatPhoneNumber } from '../../utils/format'
import useChatBaileys from '../../hooks/useChatBaileys'
import useBotReglas from '../../hooks/useBotReglas'
import ConversationList from './components/ConversationList'
import MessageArea from './components/MessageArea'
import MessageInput from './components/MessageInput'
import LocationPicker from './components/LocationPicker'
import PollCreator from './components/PollCreator'
import BotRulesPanel from './components/BotRulesPanel'
import BaileysConnect from './components/BaileysConnect'
import ContactPanel from './components/ContactPanel'
import ConvTagsSelector from './components/ConvTagsSelector'
import RemindersDrawer from './components/RemindersDrawer'
import GlobalSearchModal from './components/GlobalSearchModal'
import MetricsDrawer from './components/MetricsDrawer'
import WaAvatar from '../../components/WaAvatar'
import SettingsDrawer from './components/SettingsDrawer'
import GroupsPanel from './components/GroupsPanel'
import baileys from '../../api/baileys'

const { Text } = Typography

export default function ChatBaileysPage() {
  const { notification } = App.useApp()
  const { id: paramId }  = useParams()
  const navigate         = useNavigate()

  const {
    conversations, loadConversations, loadingConvs,
    activeId, selectConversation,
    messages, loadMessages, loadingMsgs, setMessages,
    presence, callNotification, dismissCall
  } = useChatBaileys()

  const {
    reglas, loading: loadingReglas, saving: savingReglas,
    loadReglas, createRegla, updateRegla, deleteRegla, toggleRegla, toggleModo,
    getModoGlobal, activarBotGlobal, desactivarBotGlobal
  } = useBotReglas()

  // UI state
  const [search,        setSearch]        = useState('')
  const [activeConv,    setActiveConv]    = useState(null)
  const [modoBot,       setModoBot]       = useState(false)
  const [botPanel,      setBotPanel]      = useState(false)
  const [locationModal, setLocationModal] = useState(false)
  const [pollModal,     setPollModal]     = useState(false)
  const [ephemeralModal, setEphemeralModal] = useState(false)
  const [ephemeralText, setEphemeralText] = useState('')
  const [isMobile,      setIsMobile]      = useState(window.innerWidth < 768)
  const [nuevaConvModal, setNuevaConvModal] = useState(false)
  const [nuevaConvLoading, setNuevaConvLoading] = useState(false)
  const [nuevaConvForm] = Form.useForm()
  const [baileysConectado, setBaileysConectado] = useState(null)  // null = cargando
  const [settingsPanel,  setSettingsPanel]  = useState(false)
  const [groupsPanel,    setGroupsPanel]    = useState(false)
  const [contactPanel,   setContactPanel]   = useState(false)
  const [remindersPanel, setRemindersPanel] = useState(false)
  const [remindersBadge, setRemindersBadge] = useState(0)
  const [metricsPanel,   setMetricsPanel]   = useState(false)
  const [searchOpen,     setSearchOpen]     = useState(false)
  const [waNumero,       setWaNumero]       = useState('')

  // ── Init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/WhatsApp/baileys/status')
      .then(res => {
        const st = res.data?.estado ?? res.data?.Estado ?? 'desconectado'
        setBaileysConectado(st === 'conectado')
        if (st === 'conectado') {
          loadConversations()
          setWaNumero(res.data?.Numero || res.data?.numero || '')
        }
      })
      .catch(() => setBaileysConectado(false))

    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)

    // Ctrl+K / Cmd+K para búsqueda global
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)

    // Polling recordatorios vencidos cada 60s
    const checkReminders = () => {
      api.get('/Recordatorio').then(r => {
        const vencidos = Array.isArray(r.data) ? r.data.filter(x => x.vencido).length : 0
        setRemindersBadge(vencidos)
      }).catch(() => {})
    }
    checkReminders()
    const reminderInterval = setInterval(checkReminders, 60_000)

    return () => {
      window.removeEventListener('resize', fn)
      window.removeEventListener('keydown', onKey)
      clearInterval(reminderInterval)
    }
  }, [])

  // Abrir conv desde URL param
  useEffect(() => {
    if (paramId && conversations.length) {
      const c = conversations.find(x => String(x.id || x.Id) === String(paramId))
      if (c) handleSelectConv(c)
    }
  }, [paramId, conversations.length])

  // Notificación de llamada
  useEffect(() => {
    if (callNotification) {
      notification.info({
        message: `Llamada entrante${callNotification.esVideo ? ' (video)' : ''}`,
        description: callNotification.numeroDesde || callNotification.NumeroDesde,
        icon: callNotification.esVideo ? <VideoCameraOutlined /> : <PhoneOutlined />,
        duration: 30,
        onClose: dismissCall
      })
    }
  }, [callNotification])

  // ── Seleccionar conversación ──────────────────────────────────────────
  const handleSelectConv = useCallback((conv) => {
    const id     = conv.id || conv.Id
    const numero = conv.numeroCliente || conv.NumeroCliente
    selectConversation(id, numero)
    setActiveConv(conv)
    setModoBot((conv.modoConversacion || conv.ModoConversacion) === 'bot')
    loadMessages(id)
    if (paramId !== String(id)) navigate(`/chat-baileys/${id}`, { replace: true })
    const chatId = conv.numeroCliente || conv.NumeroCliente
    if (chatId) baileys.markSeen(chatId).catch(() => {})
  }, [])

  // ── Callbacks del ContactPanel ───────────────────────────────────────────
  const handleEstadoConvChange = useCallback((id, nuevoEstado) => {
    setActiveConv(prev => prev ? { ...prev, estadoConversacion: nuevoEstado } : prev)
  }, [])

  const handleNombreConvChange = useCallback((id, nuevoNombre) => {
    setActiveConv(prev => prev ? { ...prev, nombreContacto: nuevoNombre } : prev)
    loadConversations()
  }, [loadConversations])

  const handleEtiquetasChange = useCallback((nuevasEtiquetas) => {
    setActiveConv(prev => prev ? { ...prev, etiquetas: nuevasEtiquetas } : prev)
  }, [])

  // ── Toggle modo bot ──────────────────────────────────────────────────
  const handleToggleModo = async (checked) => {
    if (!activeId) return
    try {
      const nuevoModo = await toggleModo(activeId)
      setModoBot(nuevoModo === 'bot' || nuevoModo?.modo === 'bot')
    } catch {
      // revert
      setModoBot(!checked)
    }
  }

  // ── Enviar nota interna ───────────────────────────────────────────────────
  const handleSendNota = async (texto) => {
    if (!activeId || !texto.trim()) return
    const tempId = `nota-temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId, cuerpo: texto, esNotaInterna: true, tipo: 'nota',
      fechaEnvio: new Date().toISOString(), usuario: 'Tú', _temp: true
    }])
    try {
      await api.post(`/Conversacion/${activeId}/notas`, { nota: texto })
      if (activeId) loadMessages(activeId)
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      notification.error({ message: 'No se pudo guardar la nota interna' })
    }
  }

  // ── Enviar texto ──────────────────────────────────────────────────────
  const handleSendText = async (texto) => {
    if (!activeConv) return
    const numero = activeConv.numeroCliente || activeConv.NumeroCliente

    // Optimistic update: mensaje aparece de inmediato en la UI
    const tempId = `temp-${Date.now()}`
    const tempMsg = {
      id:          tempId,
      cuerpo:      texto,
      esEntrante:  false,
      tipo:        'texto',
      fechaEnvio:  new Date().toISOString(),
      ack:         0,
      _temp:       true
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      await api.post('/WhatsApp/send-message', { numero, mensaje: texto })
      // Recargar mensajes reales de la DB para reemplazar el temporal
      if (activeId) loadMessages(activeId)
    } catch (err) {
      // Revertir si el envío falló
      setMessages(prev => prev.filter(m => m.id !== tempId))
      const detalle = err?.response?.data?.Mensage || err?.response?.data?.messageResponse || 'Revisá que Baileys esté conectado'
      notification.error({ message: 'Error al enviar mensaje', description: detalle })
    }
  }

  // ── Enviar archivo ────────────────────────────────────────────────────
  const handleSendFile = async (file) => {
    if (!activeConv) return
    const numero = activeConv.numeroCliente || activeConv.NumeroCliente
    const b64 = await toBase64(file)
    const res = await api.post('/WhatsApp/send-multimedia-message', {
      numero,
      base64: b64,
      nombreArchivo: file.name,
      mimeType: file.type
    })
    if (res?.data?.Estado === false) {
      throw new Error(res.data.Mensage || 'El archivo no se pudo enviar a WhatsApp')
    }
    if (activeId) loadMessages(activeId)
  }

  // ── Enviar voz ────────────────────────────────────────────────────────
  const handleSendVoice = async (blob) => {
    if (!activeConv) return
    const numero = activeConv.numeroCliente || activeConv.NumeroCliente
    const b64 = await toBase64(blob)
    await api.post('/WhatsApp/send-voice', { numero, audioBase64: b64 })
    if (activeId) loadMessages(activeId)
  }

  // ── Enviar ubicación ─────────────────────────────────────────────────
  const handleSendLocation = async ({ lat, lng }) => {
    if (!activeConv) return
    const numero = activeConv.numeroCliente || activeConv.NumeroCliente
    await api.post('/WhatsApp/send-location', { numero, latitud: lat, longitud: lng })
    setLocationModal(false)
  }

  // ── Enviar poll ───────────────────────────────────────────────────────
  const handleSendPoll = async ({ pregunta, opciones }) => {
    if (!activeConv) return
    const numero = activeConv.numeroCliente || activeConv.NumeroCliente
    await api.post('/WhatsApp/send-poll', { numero, pregunta, opciones })
    setPollModal(false)
  }

  // ── Enviar efímero ────────────────────────────────────────────────────
  const handleSendEphemeral = async () => {
    if (!activeConv || !ephemeralText.trim()) return
    const numero = activeConv.numeroCliente || activeConv.NumeroCliente
    await api.post('/WhatsApp/send-ephemeral', {
      numero,
      mensaje: ephemeralText.trim(),
      duracionSegundos: 86400 // 24h
    })
    setEphemeralText('')
    setEphemeralModal(false)
  }

  // ── Nueva conversación ────────────────────────────────────────────────
  const handleNuevaConv = async () => {
    try {
      const values = await nuevaConvForm.validateFields()
      setNuevaConvLoading(true)
      await api.post('/WhatsApp/send-message', {
        numero: values.numero.trim(),
        mensaje: values.mensaje.trim()
      })
      notification.success({ message: 'Mensaje enviado', description: `Conversación iniciada con ${values.numero.trim()}` })
      nuevaConvForm.resetFields()
      setNuevaConvModal(false)
      loadConversations()
    } catch (err) {
      if (err?.errorFields) return // validation error, no notification needed
      notification.error({ message: 'Error al enviar mensaje', description: err?.response?.data?.message || 'Revisá el número e intentá de nuevo' })
    } finally {
      setNuevaConvLoading(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  const toBase64 = (blob) => new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result.split(',')[1])
    r.onerror = rej
    r.readAsDataURL(blob)
  })

  // ── Presencia de la conv activa ───────────────────────────────────────
  const activeNumber = activeConv?.numeroCliente || activeConv?.NumeroCliente || ''
  const activePres   = presence[activeNumber]
  const typingNumbers = Object.entries(presence)
    .filter(([, v]) => v.estado === 'composing' || v.estado === 'typing')
    .map(([k]) => k)
    .filter(n => !activeNumber || n === activeNumber)

  const presLabel = activePres?.estado === 'composing' ? 'escribiendo...'
    : activePres?.estado === 'available' ? 'en línea' : ''

  const activeConvRawName = activeConv
    ? (activeConv.nombreContacto || activeConv.NombreContacto || '')
    : ''
  const activeConvHasName = activeConvRawName && activeConvRawName !== activeNumber
  const activeConvName    = activeConvHasName
    ? activeConvRawName
    : formatPhoneNumber(activeNumber) || activeNumber

  // ── Layout ────────────────────────────────────────────────────────────
  const showList = !isMobile || !activeId
  const showChat = !isMobile || !!activeId

  // Pantalla de conexión mientras Baileys no esté listo
  if (baileysConectado === null) {
    return (
      <div style={{ display: 'flex', height: '100%', background: '#0b141a', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Verificando conexión..." />
      </div>
    )
  }

  if (baileysConectado === false) {
    return (
      <div style={{ display: 'flex', height: '100%', background: '#111b21', overflow: 'hidden' }}>
        <BaileysConnect onConectado={() => { setBaileysConectado(true); loadConversations() }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#111b21', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      {/* NOTE: ContactPanel is rendered inside the chat area flex container (see below) */}
      {showList && (
        <div className="baileys-sidebar">
          {/* Header sidebar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#202c33' }}>
            <Text strong style={{ color: '#e9edef', fontSize: 16 }}>Chat Baileys</Text>
            <div style={{ display: 'flex', gap: 6 }}>
              <Tooltip title="Buscar (Ctrl+K)">
                <Button shape="circle" icon={<SearchOutlined />}
                  style={{ background: '#2a3942', border: 'none', color: '#8696a0' }}
                  onClick={() => setSearchOpen(true)} />
              </Tooltip>
              <Tooltip title="Métricas">
                <Button shape="circle" icon={<BarChartOutlined />}
                  style={{ background: '#2a3942', border: 'none', color: '#8696a0' }}
                  onClick={() => setMetricsPanel(true)} />
              </Tooltip>
              <Tooltip title="Nueva conversación">
                <Button shape="circle" icon={<PlusOutlined />}
                  style={{ background: '#2a3942', border: 'none', color: '#8696a0' }}
                  onClick={() => { nuevaConvForm.resetFields(); setNuevaConvModal(true) }} />
              </Tooltip>
              <Tooltip title="Grupos">
                <Button shape="circle" icon={<TeamOutlined />}
                  style={{ background: '#2a3942', border: 'none', color: '#8696a0' }}
                  onClick={() => setGroupsPanel(true)} />
              </Tooltip>
              <Tooltip title="Reglas del Chatbot">
                <Button shape="circle" icon={<RobotOutlined />}
                  style={{ background: '#2a3942', border: 'none', color: '#8696a0' }}
                  onClick={() => setBotPanel(true)} />
              </Tooltip>
              <Tooltip title="Recordatorios pendientes">
                <Badge count={remindersBadge} size="small" offset={[-2, 2]}>
                  <Button shape="circle" icon={<BellOutlined />}
                    style={{ background: '#2a3942', border: 'none', color: remindersBadge > 0 ? '#fa8c16' : '#8696a0' }}
                    onClick={() => setRemindersPanel(true)} />
                </Badge>
              </Tooltip>
              <Tooltip title="Configuración">
                <Button shape="circle" icon={<SettingOutlined />}
                  style={{ background: '#2a3942', border: 'none', color: '#8696a0' }}
                  onClick={() => setSettingsPanel(true)} />
              </Tooltip>
            </div>
          </div>
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            loading={loadingConvs}
            onSelect={handleSelectConv}
            onRefresh={loadConversations}
            presence={presence}
            searchValue={search}
            onSearchChange={setSearch}
          />
        </div>
      )}

      {/* ── Chat Area + Contact Panel ── */}
      {showChat && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0b141a' }}>
          {activeConv ? (
            <>
              {/* Header chat */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: '#202c33', borderBottom: '1px solid #2a3942' }}>
                {isMobile && (
                  <Button shape="circle" icon={<ArrowLeftOutlined />}
                    style={{ background: 'transparent', border: 'none', color: '#e9edef' }}
                    onClick={() => { selectConversation(null); setActiveConv(null); navigate('/chat-baileys') }} />
                )}
                <WaAvatar numero={activeNumber} nombre={activeConvName} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#e9edef', fontWeight: 500, fontSize: 14, lineHeight: '18px' }}>{activeConvName}</div>
                  {activeConvHasName && (
                    <div style={{ color: '#8696a0', fontSize: 11, lineHeight: '15px' }}>
                      {formatPhoneNumber(activeNumber)}
                    </div>
                  )}
                  {presLabel && <div style={{ color: '#00a884', fontSize: 12 }}>{presLabel}</div>}
                </div>
                <Tooltip title={modoBot ? 'Modo Bot activo — click para desactivar' : 'Activar modo Bot'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RobotOutlined style={{ color: modoBot ? '#00a884' : '#8696a0' }} />
                    <Switch size="small" checked={modoBot} onChange={handleToggleModo} />
                  </div>
                </Tooltip>
                <Tooltip title="Información del contacto">
                  <Button shape="circle" icon={<ContactsOutlined />}
                    onClick={() => setContactPanel(p => !p)}
                    style={{
                      background: contactPanel ? '#00a884' : 'transparent',
                      border: 'none',
                      color: contactPanel ? '#fff' : '#8696a0'
                    }} />
                </Tooltip>
              </div>

              {/* Etiquetas rápidas */}
              <div style={{ padding: '4px 14px', background: '#202c33', borderBottom: '1px solid #1f2d34', display: 'flex', alignItems: 'center', gap: 6, minHeight: 32 }}>
                <ConvTagsSelector
                  convId={activeId}
                  tags={activeConv.etiquetas || []}
                  onChange={handleEtiquetasChange}
                />
              </div>

              {/* Mensajes */}
              <MessageArea messages={messages} loading={loadingMsgs} typingNumbers={typingNumbers} activeNumber={activeNumber} />

              {/* Input */}
              <MessageInput
                onSendText={handleSendText}
                onSendFile={handleSendFile}
                onSendVoice={handleSendVoice}
                onSendLocation={() => setLocationModal(true)}
                onSendPoll={() => setPollModal(true)}
                onSendEphemeral={() => setEphemeralModal(true)}
                onSendNota={handleSendNota}
                activeNumero={activeNumber}
              />
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8696a0' }}>
              <InfoCircleOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <Text style={{ color: '#8696a0', fontSize: 15 }}>Seleccioná una conversación para comenzar</Text>
            </div>
          )}
        </div>

        {/* ── Panel de contacto (derecha) ── */}
        {contactPanel && activeConv && (
          <ContactPanel
            conv={activeConv}
            onEstadoChange={handleEstadoConvChange}
            onNombreChange={handleNombreConvChange}
            onClose={() => setContactPanel(false)}
          />
        )}
        </div>
      )}

      {/* ── Modales ── */}
      <LocationPicker open={locationModal} onSend={handleSendLocation} onCancel={() => setLocationModal(false)} />
      <PollCreator    open={pollModal}     onSend={handleSendPoll}     onCancel={() => setPollModal(false)} />

      <Modal
        title="Enviar mensaje efímero (24h)"
        open={ephemeralModal}
        onCancel={() => setEphemeralModal(false)}
        onOk={handleSendEphemeral}
        okText="Enviar"
        okButtonProps={{ disabled: !ephemeralText.trim() }}
      >
        <Input.TextArea
          rows={3}
          value={ephemeralText}
          onChange={e => setEphemeralText(e.target.value)}
          placeholder="Mensaje que desaparecerá en 24 horas..."
        />
      </Modal>

      {/* ── Panel Bot Rules ── */}
      <BotRulesPanel
        open={botPanel}
        onClose={() => setBotPanel(false)}
        reglas={reglas}
        loading={loadingReglas}
        saving={savingReglas}
        onLoad={loadReglas}
        onCreate={createRegla}
        onUpdate={updateRegla}
        onDelete={deleteRegla}
        onToggle={toggleRegla}
        onGetModoGlobal={getModoGlobal}
        onActivarGlobal={async () => { await activarBotGlobal(); await loadConversations() }}
        onDesactivarGlobal={async () => { await desactivarBotGlobal(); await loadConversations() }}
      />

      {/* ── Settings & Groups ── */}
      <SettingsDrawer open={settingsPanel} onClose={() => setSettingsPanel(false)} currentNumber={waNumero} />
      <GroupsPanel open={groupsPanel} onClose={() => setGroupsPanel(false)} />

      {/* ── Búsqueda global ── */}
      <GlobalSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(conv) => {
          const found = conversations.find(c => (c.id || c.Id) === conv.id)
          if (found) handleSelectConv(found)
          else if (conv.id) {
            // Conversación no cargada aún — cargamos y navegamos
            loadConversations().then(convs => {
              const c = (convs || conversations).find(x => (x.id || x.Id) === conv.id)
              if (c) handleSelectConv(c)
            })
          }
        }}
      />

      {/* ── Métricas ── */}
      <MetricsDrawer open={metricsPanel} onClose={() => setMetricsPanel(false)} />

      {/* ── Recordatorios globales ── */}
      <RemindersDrawer
        open={remindersPanel}
        onClose={() => {
          setRemindersPanel(false)
          api.get('/Recordatorio').then(r => {
            setRemindersBadge(Array.isArray(r.data) ? r.data.filter(x => x.vencido).length : 0)
          }).catch(() => {})
        }}
      />

      {/* ── Nueva Conversación ── */}
      <Modal
        title="Nueva conversación"
        open={nuevaConvModal}
        onCancel={() => setNuevaConvModal(false)}
        onOk={handleNuevaConv}
        okText="Enviar mensaje"
        confirmLoading={nuevaConvLoading}
        destroyOnHidden
      >
        <Form form={nuevaConvForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="numero"
            label="Número de teléfono"
            rules={[
              { required: true, message: 'Ingresá el número' },
              { pattern: /^\d{7,15}$/, message: 'Solo dígitos, sin espacios ni +. Ej: 51939490460' }
            ]}
            extra="Sin el + ni espacios. Incluí el código de país. Ej: 51939490460"
          >
            <Input placeholder="51939490460" maxLength={15} />
          </Form.Item>
          <Form.Item
            name="mensaje"
            label="Primer mensaje"
            rules={[{ required: true, message: 'Escribí el mensaje' }]}
          >
            <Input.TextArea rows={3} placeholder="Hola, ¿en qué te puedo ayudar?" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
