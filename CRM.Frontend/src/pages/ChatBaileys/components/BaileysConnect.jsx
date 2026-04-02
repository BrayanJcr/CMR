import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Button, Spin, Typography, Space, Tag, Input,
  Divider, App, Card
} from 'antd'
import {
  WifiOutlined, DisconnectOutlined, QrcodeOutlined, ReloadOutlined,
  CheckCircleOutlined, LoadingOutlined, PhoneOutlined, DeleteOutlined,
  LogoutOutlined, WarningOutlined, InfoCircleOutlined
} from '@ant-design/icons'
import api from '../../../api/axios'

const { Text, Title } = Typography

export default function BaileysConnect({ onConectado }) {
  const { message, modal } = App.useApp()

  // ── Estado de conexión ───────────────────────────────────────────────────
  const [estado,    setEstado]    = useState('desconectado')
  const [numero,    setNumero]    = useState(null)
  const [qr,        setQr]        = useState(null)
  const [loadingInit, setLoadingInit] = useState(true)

  // ── Acciones ─────────────────────────────────────────────────────────────
  const [startingQr,      setStartingQr]      = useState(false)
  const [startingPairing, setStartingPairing] = useState(false)
  const [pairingCode,     setPairingCode]      = useState(null)
  const [phoneInput,      setPhoneInput]       = useState('')
  const [loggingOut,      setLoggingOut]       = useState(false)
  const [cleaning,        setCleaning]         = useState(false)
  const [activeTab,       setActiveTab]        = useState('qr')

  const pollRef = useRef(null)

  // ── Helpers ──────────────────────────────────────────────────────────────
  const stopPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/WhatsApp/baileys/status')
      const st  = res.data?.estado ?? res.data?.Estado ?? 'desconectado'
      const num = res.data?.numero ?? res.data?.Numero ?? null
      setEstado(st)
      setNumero(num || null)
      return st
    } catch {
      setEstado('desconectado')
      return 'desconectado'
    }
  }, [])

  const fetchQr = useCallback(async () => {
    try {
      const res = await api.get('/Configuracion/whatsapp_qr')
      const val = res.data?.valor ?? res.data?.Valor ?? null
      setQr(typeof val === 'string' && val.length > 30 ? val : null)
    } catch {
      setQr(null)
    }
  }, [])

  const startPoll = (onConnected) => {
    let intentos = 0
    pollRef.current = setInterval(async () => {
      intentos++
      const st = await fetchStatus()
      await fetchQr()
      if (st === 'conectado') {
        stopPoll()
        setQr(null)
        setPairingCode(null)
        onConnected?.()
      }
      if (intentos >= 60) stopPoll() // timeout 3 min
    }, 3000)
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStatus().finally(() => setLoadingInit(false))
    return stopPoll
  }, [])

  useEffect(() => {
    if (estado === 'conectado' && onConectado) {
      stopPoll()
      onConectado()
    }
  }, [estado])

  // ── Acción: Conectar con QR ───────────────────────────────────────────────
  const handleConectarQr = async () => {
    setStartingQr(true)
    setQr(null)
    setPairingCode(null)
    stopPoll()
    try {
      await api.put('/Configuracion/whatsapp_qr', { valor: '', clave: 'whatsapp_qr' }).catch(() => {})
      await api.post('/WhatsApp/baileys/iniciar')
      setEstado('iniciando')
      message.info('Iniciando... el QR aparecerá en segundos')
      await new Promise(r => setTimeout(r, 4000))
      startPoll()
    } catch {
      message.error('Error al iniciar Baileys')
      setEstado('desconectado')
    } finally {
      setStartingQr(false)
    }
  }

  // ── Acción: Conectar con pairing code ────────────────────────────────────
  const handleConectarPairing = async () => {
    const num = phoneInput.trim().replace(/\D/g, '')
    if (!num) { message.warning('Ingresá el número de teléfono'); return }
    setStartingPairing(true)
    setPairingCode(null)
    stopPoll()
    try {
      await api.post('/WhatsApp/baileys/iniciar')
      setEstado('iniciando')
      await new Promise(r => setTimeout(r, 3000))
      const res = await api.get(`/WhatsApp/baileys/pairing-code?numero=${num}`)
      const code = res.data?.pairingCode ?? res.data?.codigo ?? res.data?.PairingCode ?? null
      if (code) {
        setPairingCode(code)
        message.success('Código generado. Ingresalo en WhatsApp → Dispositivos vinculados')
        startPoll()
      } else {
        message.error('No se pudo obtener el código de emparejamiento')
      }
    } catch (err) {
      message.error(err?.response?.data?.Respuesta || 'Error al solicitar pairing code')
      setEstado('desconectado')
    } finally {
      setStartingPairing(false)
    }
  }

  // ── Acción: Desconectar (logout) ─────────────────────────────────────────
  const handleLogout = () => {
    modal.confirm({
      title: 'Cerrar sesión de WhatsApp',
      content: 'Esto desconectará el número activo. Necesitarás escanear el QR de nuevo para reconectar.',
      icon: <LogoutOutlined style={{ color: '#fa8c16' }} />,
      okText: 'Cerrar sesión', cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: async () => {
        setLoggingOut(true)
        stopPoll()
        try {
          await api.post('/WhatsApp/baileys/cerrar-sesion')
          message.success('Sesión cerrada')
          setEstado('desconectado')
          setNumero(null)
          setQr(null)
        } catch {
          message.error('Error al cerrar sesión')
        } finally {
          setLoggingOut(false)
        }
      }
    })
  }

  // ── Acción: Limpiar sesión ────────────────────────────────────────────────
  const handleLimpiarSesion = () => {
    modal.confirm({
      title: 'Limpiar sesión corrupta',
      content: 'Esto borrará todos los archivos de sesión guardados. Usalo solo si Baileys no puede reconectar automáticamente.',
      icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
      okText: 'Limpiar sesión', cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: async () => {
        setCleaning(true)
        stopPoll()
        try {
          await api.delete('/WhatsApp/baileys/limpiar-sesion')
          message.success('Sesión limpiada. Ya podés reconectar.')
          setEstado('desconectado')
          setNumero(null)
          setQr(null)
        } catch {
          message.error('Error al limpiar sesión')
        } finally {
          setCleaning(false)
        }
      }
    })
  }

  // ── Reintentar (cancel polling) ───────────────────────────────────────────
  const handleCancelar = () => {
    stopPoll()
    setQr(null)
    setPairingCode(null)
    setEstado('desconectado')
  }

  // ── Loading inicial ───────────────────────────────────────────────────────
  if (loadingInit) {
    return (
      <div style={S.center}>
        <Spin size="large" />
        <Text style={{ color: '#8696a0', marginTop: 12 }}>Verificando conexión...</Text>
      </div>
    )
  }

  // ── Pantalla: CONECTADO ───────────────────────────────────────────────────
  if (estado === 'conectado') {
    return (
      <div style={S.center}>
        <CheckCircleOutlined style={{ fontSize: 56, color: '#52c41a', marginBottom: 12 }} />
        <Title level={4} style={{ color: '#e9edef', marginBottom: 4 }}>WhatsApp conectado</Title>
        {numero && <Text style={{ color: '#8696a0', marginBottom: 20, display: 'block' }}>Número: <strong style={{ color: '#e9edef' }}>{numero}</strong></Text>}
        <Spin size="large" />
        <Text style={{ color: '#8696a0', marginTop: 8, display: 'block' }}>Cargando conversaciones...</Text>
      </div>
    )
  }

  // ── Pantalla: INICIANDO (esperando QR o pairing code) ────────────────────
  const estaIniciando = estado === 'iniciando' || startingQr || startingPairing

  if (estaIniciando || qr || pairingCode) {
    return (
      <div style={S.center}>
        <Tag color="processing" icon={<LoadingOutlined />} style={S.tag}>
          Conectando...
        </Tag>

        {/* QR */}
        {qr && (
          <div style={S.qrBox}>
            <img src={qr} alt="QR WhatsApp" style={{ width: 230, height: 230 }} />
          </div>
        )}

        {/* Pairing code */}
        {pairingCode && !qr && (
          <Card style={S.codeCard} styles={{ body: { padding: '20px 32px', textAlign: 'center' } }}>
            <Text style={{ color: '#8696a0', fontSize: 13, display: 'block', marginBottom: 8 }}>
              Ingresá este código en WhatsApp
            </Text>
            <div style={{ letterSpacing: 8, fontSize: 36, fontWeight: 700, color: '#00a884', fontFamily: 'monospace' }}>
              {pairingCode}
            </div>
            <Text style={{ color: '#8696a0', fontSize: 11, marginTop: 8, display: 'block' }}>
              WhatsApp → Ajustes → Dispositivos vinculados → Vincular con número de teléfono
            </Text>
          </Card>
        )}

        {/* Spinner de espera */}
        {!qr && !pairingCode && (
          <div style={S.waiting}>
            <Spin size="large" />
            <Text style={{ color: '#8696a0', marginTop: 12 }}>
              {startingQr || startingPairing ? 'Iniciando conexión...' : 'Generando código QR...'}
            </Text>
            <Text style={{ color: '#8696a0', fontSize: 11, marginTop: 4 }}>Puede tardar hasta 30 segundos</Text>
          </div>
        )}

        <Space style={{ marginTop: 20 }} direction="vertical" align="center">
          {qr && (
            <Text style={{ color: '#8696a0', fontSize: 12, textAlign: 'center', maxWidth: 280, display: 'block' }}>
              Abrí WhatsApp → <strong>Dispositivos vinculados</strong> → <strong>Vincular un dispositivo</strong>
            </Text>
          )}
          <Button icon={<ReloadOutlined />} onClick={handleCancelar}
            style={{ background: '#2a3942', border: 'none', color: '#8696a0' }}>
            Cancelar
          </Button>
        </Space>
      </div>
    )
  }

  // ── Pantalla: DESCONECTADO ────────────────────────────────────────────────
  const QR_STEPS = [
    'Clic en "Conectar con QR"',
    'Abrí WhatsApp en tu celular',
    'Tocá los 3 puntos → Dispositivos vinculados',
    'Escaneá el código que aparece aquí'
  ]

  return (
    <div style={{ ...S.center, justifyContent: 'flex-start', padding: '40px 32px 32px', overflowY: 'auto' }}>

      {/* Header */}
      <DisconnectOutlined style={{ fontSize: 44, color: '#3b4a54', marginBottom: 12 }} />
      <Title level={4} style={{ color: '#e9edef', marginBottom: 4 }}>WhatsApp no conectado</Title>
      <Text style={{ color: '#8696a0', textAlign: 'center', maxWidth: 340, display: 'block', marginBottom: 28 }}>
        Vinculá tu cuenta de WhatsApp para empezar a chatear.
      </Text>

      {/* Panel de conexión */}
      <div className="baileys-connect-inner" style={{ width: '100%', maxWidth: 420 }}>

        {/* ── Selector de método (custom dark) ── */}
        <div style={{ display: 'flex', background: '#182229', borderRadius: 10, padding: 4, marginBottom: 20, border: '1px solid #2a3942' }}>
          {[
            { key: 'qr',      icon: <QrcodeOutlined />, label: 'Código QR' },
            { key: 'pairing', icon: <PhoneOutlined />,  label: 'Código de teléfono' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 0', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                fontWeight: activeTab === tab.key ? 600 : 400,
                background: activeTab === tab.key ? '#00a884' : 'transparent',
                color: activeTab === tab.key ? '#fff' : '#8696a0',
                transition: 'all 0.2s'
              }}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ── Contenido pestaña QR ── */}
        {activeTab === 'qr' && (
          <div style={S.tabContent}>
            <div style={{ marginBottom: 20 }}>
              {QR_STEPS.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? '#00a884' : '#2a3942',
                    color: i === 0 ? '#fff' : '#8696a0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700
                  }}>
                    {i + 1}
                  </div>
                  <Text style={{ color: i === 0 ? '#e9edef' : '#8696a0', fontSize: 13 }}>{step}</Text>
                </div>
              ))}
            </div>
            <Button type="primary" block size="large" icon={<QrcodeOutlined />}
              loading={startingQr} onClick={handleConectarQr}
              style={{ background: '#00a884', border: 'none', height: 44 }}>
              Conectar con QR
            </Button>
          </div>
        )}

        {/* ── Contenido pestaña Pairing ── */}
        {activeTab === 'pairing' && (
          <div style={S.tabContent}>
            <Text style={{ color: '#8696a0', fontSize: 13, display: 'block', marginBottom: 14 }}>
              Ingresá tu número y WhatsApp te dará un código de 8 dígitos para vincular sin escanear QR.
            </Text>
            <Input
              size="large"
              placeholder="Ej: 51939490460 (sin + ni espacios)"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value.replace(/\D/g, ''))}
              onPressEnter={handleConectarPairing}
              prefix={<PhoneOutlined style={{ color: '#8696a0' }} />}
              className="baileys-phone-input"
              style={{ marginBottom: 12, background: '#2a3942', border: '1px solid #3b4a54', color: '#e9edef' }}
              maxLength={15}
            />
            <Button type="primary" block size="large" icon={<PhoneOutlined />}
              loading={startingPairing} onClick={handleConectarPairing}
              style={{ background: '#00a884', border: 'none', height: 44 }}>
              Obtener código de emparejamiento
            </Button>
          </div>
        )}

        {/* ── Sesión activa ── */}
        <Divider style={{ borderColor: '#2a3942', margin: '24px 0 14px' }}>
          <Text style={{ color: '#8696a0', fontSize: 12, letterSpacing: 0.5 }}>Sesión activa</Text>
        </Divider>

        <Space style={{ width: '100%', justifyContent: 'center' }} wrap>
          <Button icon={<LogoutOutlined />} loading={loggingOut} onClick={handleLogout}
            style={{ background: '#2a3942', border: '1px solid #3b4a54', color: '#fa8c16' }}>
            Cerrar sesión
          </Button>
          <Button icon={<DeleteOutlined />} loading={cleaning} onClick={handleLimpiarSesion}
            style={{ background: '#2a3942', border: '1px solid #3b4a54', color: '#ff4d4f' }}>
            Limpiar sesión corrupta
          </Button>
        </Space>

        {/* ── Nota informativa ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 16, padding: '10px 12px', background: '#182229', border: '1px solid #2a3942', borderRadius: 8 }}>
          <InfoCircleOutlined style={{ color: '#00a884', fontSize: 14, marginTop: 1, flexShrink: 0 }} />
          <Text style={{ color: '#8696a0', fontSize: 12, lineHeight: 1.5 }}>
            La sesión se guarda automáticamente. La próxima vez que abras el chat se reconectará solo.
          </Text>
        </div>
      </div>
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const S = {
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0b141a',
    padding: 32,
    minHeight: '100%'
  },
  tag: {
    fontSize: 13,
    padding: '4px 12px',
    marginBottom: 24
  },
  qrBox: {
    background: '#fff',
    padding: 14,
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    marginBottom: 8
  },
  codeCard: {
    background: '#182229',
    border: '1px solid #2a3942',
    borderRadius: 12,
    marginBottom: 8
  },
  waiting: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 240,
    height: 200,
    background: '#182229',
    borderRadius: 12,
    border: '1px solid #2a3942',
    marginBottom: 8
  },
  tabContent: {
    padding: '12px 4px 4px'
  }
}
