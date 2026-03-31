import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card, Tabs, Button, Input, Select, Form, Table, Modal, Switch, Tag,
  Space, Spin, Alert, Typography, message, Popconfirm, Badge, Row, Col,
  Divider, Radio
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  WifiOutlined, DisconnectOutlined, QrcodeOutlined
} from '@ant-design/icons'
import api from '../../api/axios'

const { Title, Text } = Typography
const { Option } = Select

export default function Configuracion() {
  // Botón global para limpiar sesión y reiniciar Node
  const limpiarYReiniciarNodeBtn = (
    <Button
      type="dashed"
      style={{ marginLeft: 16 }}
      onClick={async () => {
        let result = ''
        try {
          const clean = await fetch('http://localhost:3000/admin/limpiar-sesion', { method: 'POST' }).then(r => r)
          const restart = await fetch('http://localhost:3000/admin/reiniciar', { method: 'POST' }).then(r => r)
          result = `Sesión limpiada: ${clean.status}\nNode reiniciado: ${restart.status}`
        } catch (err) {
          result = err?.response ? `Status: ${err.response.status}\n${JSON.stringify(err.response.data, null, 2)}` : String(err)
        }
        Modal.info({
          title: 'Resultado limpieza y reinicio Node',
          content: <pre style={{ whiteSpace: 'pre-wrap' }}>{result}</pre>,
          width: 600
        })
      }}
    >
      Limpiar sesión y reiniciar Node
    </Button>
  )
  const [waStatus, setWaStatus] = useState(null)
  const [waNumero, setWaNumero] = useState(null)
  const [waQr, setWaQr] = useState(null)
  const [waLoading, setWaLoading] = useState(false)
  const [waClosing, setWaClosing] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const [proveedor, setProveedor] = useState('wwebjs')
  const [cargandoProveedor, setCargandoProveedor] = useState(false)
  const [numeroPairing, setNumeroPairing] = useState('')
  const [pairingCode, setPairingCode] = useState('')
  const [cargandoPairing, setCargandoPairing] = useState(false)
  const autoConnectRef = useRef(false)
  const waitStatusPollRef = useRef(null)
  const [usuarios, setUsuarios] = useState([])
  const [etapas, setEtapas] = useState([])
  const [etiquetas, setEtiquetas] = useState([])
  const [mensajeBienvenida, setMensajeBienvenida] = useState('')
  const [mensajeFueraHorario, setMensajeFueraHorario] = useState('')
  const [empresaNombre, setEmpresaNombre] = useState('')
  const [monedaDefault, setMonedaDefault] = useState('USD')
  const [loading, setLoading] = useState(true)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [etapaModalOpen, setEtapaModalOpen] = useState(false)
  const [etiquetaModalOpen, setEtiquetaModalOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [editingEtapaId, setEditingEtapaId] = useState(null)
  const [editingEtiquetaId, setEditingEtiquetaId] = useState(null)
  const [savingUser, setSavingUser] = useState(false)
  const [savingEtapa, setSavingEtapa] = useState(false)
  const [savingEtiqueta, setSavingEtiqueta] = useState(false)
  const [userForm] = Form.useForm()
  const [etapaForm] = Form.useForm()
  const [etiquetaForm] = Form.useForm()
  const qrPollRef = useRef(null)
  const normalizedStatus = typeof waStatus === 'string'
    ? waStatus
    : typeof waStatus === 'boolean'
      ? (waStatus ? 'conectado' : 'desconectado')
      : waStatus?.valor || waStatus?.Valor || waStatus?.estado || waStatus?.Estado || null
  const isConnected = normalizedStatus === 'conectado'
  const isStarting = normalizedStatus === 'iniciando'

  const fetchWaStatus = useCallback(async () => {
    try {
      const res = await api.get('/Configuracion/whatsapp_estado')
      const value = res.data?.valor ?? res.data?.Valor ?? res.data?.estado ?? res.data?.Estado ?? res.data ?? null
      setWaStatus(value)
      return value
    } catch {
      setWaStatus(null)
      return null
    }
  }, [])

  const fetchWaNumero = useCallback(async () => {
    try {
      const res = await api.get('/WhatsApp/obtenerNumero')
      setWaNumero(res.data?.numero || res.data?.Numero || null)
    } catch { }
  }, [])

  const fetchWaQr = useCallback(async () => {
    try {
      const res = await api.get('/Configuracion/whatsapp_qr')
      const value = res.data?.valor ?? res.data?.Valor ?? res.data?.qr ?? res.data?.Qr ?? res.data ?? null
      setWaQr(typeof value === 'string' ? value : null)
    } catch {
      setWaQr(null)
    }
  }, [])

  const fetchUsuarios = useCallback(async () => {
    try {
      const res = await api.get('/Usuario')
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || [])
      setUsuarios(data)
    } catch { }
  }, [])

  const fetchEtapas = useCallback(async () => {
    try {
      const res = await api.get('/Pipeline/etapas')
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || [])
      setEtapas(data)
    } catch { }
  }, [])

  const fetchEtiquetas = useCallback(async () => {
    try {
      const res = await api.get('/Etiqueta')
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || [])
      setEtiquetas(data)
    } catch { }
  }, [])

  const fetchConfig = useCallback(async () => {
    try {
      const keys = ['mensaje_bienvenida', 'mensaje_fuera_horario', 'empresa_nombre', 'moneda_default']
      const results = await Promise.allSettled(
        keys.map(k => api.get(`/Configuracion/${k}`))
      )
      if (results[0].status === 'fulfilled') {
        const val = results[0].value.data
        setMensajeBienvenida(typeof val === 'string' ? val : val?.valor || val?.Valor || '')
      }
      if (results[1].status === 'fulfilled') {
        const val = results[1].value.data
        setMensajeFueraHorario(typeof val === 'string' ? val : val?.valor || val?.Valor || '')
      }
      if (results[2].status === 'fulfilled') {
        const val = results[2].value.data
        setEmpresaNombre(typeof val === 'string' ? val : val?.valor || val?.Valor || '')
      }
      if (results[3].status === 'fulfilled') {
        const val = results[3].value.data
        setMonedaDefault(typeof val === 'string' ? val : val?.valor || val?.Valor || 'USD')
      }
    } catch { }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.allSettled([
        fetchWaStatus(),
        fetchWaNumero(),
        fetchUsuarios(),
        fetchEtapas(),
        fetchEtiquetas(),
        fetchConfig(),
        api.get('/Configuracion/whatsapp_proveedor').then(res => {
          setProveedor(res.data?.Valor || 'wwebjs')
        }).catch(() => {})
      ])
      setLoading(false)
    }
    init()
  }, [fetchWaStatus, fetchWaNumero, fetchUsuarios, fetchEtapas, fetchEtiquetas, fetchConfig])

  useEffect(() => {
    if (normalizedStatus === 'iniciando' || normalizedStatus === 'conectado') {
      // Ya tenemos estado → cancelar el polling de espera
      if (waitStatusPollRef.current) {
        clearInterval(waitStatusPollRef.current)
        waitStatusPollRef.current = null
      }
    }
    if (normalizedStatus === 'iniciando') {
      fetchWaQr()
      qrPollRef.current = setInterval(async () => {
        const status = await fetchWaStatus()
        const st = typeof status === 'string' ? status : status?.estado
        if (st !== 'iniciando') {
          clearInterval(qrPollRef.current)
          fetchWaNumero()
          return
        }
        fetchWaQr()
      }, 3000)
    } else {
      if (qrPollRef.current) clearInterval(qrPollRef.current)
    }
    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current)
      if (waitStatusPollRef.current) clearInterval(waitStatusPollRef.current)
    }
  }, [normalizedStatus, fetchWaQr, fetchWaStatus, fetchWaNumero])

  const handleConectar = async () => {
    setWaLoading(true)
    // Limpiar polling anterior si existe
    if (waitStatusPollRef.current) {
      clearInterval(waitStatusPollRef.current)
      waitStatusPollRef.current = null
    }
    try {
      await api.post('/WhatsApp/iniciar-cliente')
      message.success('Iniciando WhatsApp... esperando QR (puede tardar ~30 segundos)')

      // Polling continuo cada 3s hasta detectar "iniciando" o "conectado"
      // Puppeteer tarda 15-30s en arrancar y generar el QR
      let intentos = 0
      const MAX_INTENTOS = 40 // 40 × 3s = 2 minutos máximo
      waitStatusPollRef.current = setInterval(async () => {
        intentos++
        const st = await fetchWaStatus()
        const stNorm = typeof st === 'string' ? st
          : typeof st === 'boolean' ? (st ? 'conectado' : null)
          : st?.valor || st?.estado || null

        if (stNorm === 'iniciando' || stNorm === 'conectado' || intentos >= MAX_INTENTOS) {
          clearInterval(waitStatusPollRef.current)
          waitStatusPollRef.current = null
          if (stNorm === 'iniciando') fetchWaQr()
          if (stNorm === 'conectado') fetchWaNumero()
        }
      }, 3000)
    } catch (err) {
      message.error('Error al iniciar WhatsApp')
    } finally {
      setWaLoading(false)
    }
  }

  // Autodispara la conexión al cargar si no hay sesión activa
  useEffect(() => {
    if (!isConnected && !waLoading && !autoConnectRef.current) {
      autoConnectRef.current = true
      handleConectar()
    }
  }, [isConnected, waLoading])

  const handleCerrarSesion = () => {
    Modal.confirm({
      title: 'Cerrar sesión de WhatsApp',
      content: 'Esto desconectará el cliente actual y requerirá escanear un nuevo QR.',
      okText: 'Cerrar sesión',
      cancelText: 'Cancelar',
      centered: true,
      onOk: async () => {
        setWaClosing(true)
        try {
          await api.post('/WhatsApp/cerrar-sesion', { Numero: waNumero })
          message.success('Sesión cerrada')
          setWaQr(null)
          await Promise.all([fetchWaStatus(), fetchWaNumero()])
        } catch {
          message.error('Error al cerrar sesión')
        } finally {
          setWaClosing(false)
        }
      }
    })
  }

  const handleRefreshQr = async () => {
    setQrLoading(true)
    try {
      await fetchWaQr()
      message.success('QR actualizado')
    } catch {
      message.error('No se pudo obtener el QR')
    } finally {
      setQrLoading(false)
    }
  }

  const handleCambiarProveedor = async (nuevoProveedor) => {
    setCargandoProveedor(true)
    try {
      await api.post('/WhatsApp/cambiar-proveedor', { Proveedor: nuevoProveedor })
      setProveedor(nuevoProveedor)
      setPairingCode('')
      setWaStatus('desconectado')
      setWaNumero('')
      message.success(`Proveedor cambiado a ${nuevoProveedor === 'wwebjs' ? 'WhatsApp-Web.js' : 'Baileys'}`)
    } catch (e) {
      message.error('Error al cambiar proveedor')
    } finally {
      setCargandoProveedor(false)
    }
  }

  const handleSolicitarPairingCode = async () => {
    if (!numeroPairing || numeroPairing.length < 10) {
      message.warning('Ingresá un número válido con código de país (ej: 5491112345678)')
      return
    }
    setCargandoPairing(true)
    try {
      const res = await api.get(`/WhatsApp/solicitar-pairing-code?numero=${numeroPairing}`)
      if (res.data?.Estado) {
        setPairingCode(res.data.Codigo)
        message.success('Código generado. Ingresalo en WhatsApp → Dispositivos vinculados')
      } else {
        message.error(res.data?.Respuesta || 'Error al generar código')
      }
    } catch (e) {
      message.error('Error al solicitar pairing code')
    } finally {
      setCargandoPairing(false)
    }
  }

  const handleSaveConfig = async (key, value) => {
    try {
      await api.put(`/Configuracion/${key}`, { valor: value })
      message.success('Configuración guardada')
    } catch {
      message.error('Error al guardar')
    }
  }

  const handleSaveUser = async () => {
    try {
      const values = await userForm.validateFields()
      setSavingUser(true)
      if (editingUserId) {
        await api.put(`/Usuario/${editingUserId}`, values)
        message.success('Usuario actualizado')
      } else {
        await api.post('/Usuario/create', values)
        message.success('Usuario creado')
      }
      setUserModalOpen(false)
      userForm.resetFields()
      fetchUsuarios()
    } catch (err) {
      if (!err?.errorFields) message.error('Error al guardar usuario')
    } finally {
      setSavingUser(false)
    }
  }

  const handleDeleteUser = async (id) => {
    try {
      await api.delete(`/Usuario/${id}`)
      message.success('Usuario eliminado')
      fetchUsuarios()
    } catch {
      message.error('Error al eliminar')
    }
  }

  const handleSaveEtapa = async () => {
    try {
      const values = await etapaForm.validateFields()
      setSavingEtapa(true)
      if (editingEtapaId) {
        await api.put(`/Pipeline/etapas/${editingEtapaId}`, values)
        message.success('Etapa actualizada')
      } else {
        await api.post('/Pipeline/etapas', values)
        message.success('Etapa creada')
      }
      setEtapaModalOpen(false)
      etapaForm.resetFields()
      setEditingEtapaId(null)
      fetchEtapas()
    } catch (err) {
      if (!err?.errorFields) message.error('Error al guardar etapa')
    } finally {
      setSavingEtapa(false)
    }
  }

  const handleDeleteEtapa = async (id) => {
    try {
      await api.delete(`/Pipeline/etapas/${id}`)
      message.success('Etapa eliminada')
      fetchEtapas()
    } catch {
      message.error('Error al eliminar etapa')
    }
  }

  const handleSaveEtiqueta = async () => {
    try {
      const values = await etiquetaForm.validateFields()
      setSavingEtiqueta(true)
      if (editingEtiquetaId) {
        await api.put(`/Etiqueta/${editingEtiquetaId}`, values)
        message.success('Etiqueta actualizada')
      } else {
        await api.post('/Etiqueta', values)
        message.success('Etiqueta creada')
      }
      setEtiquetaModalOpen(false)
      etiquetaForm.resetFields()
      setEditingEtiquetaId(null)
      fetchEtiquetas()
    } catch (err) {
      if (!err?.errorFields) message.error('Error al guardar etiqueta')
    } finally {
      setSavingEtiqueta(false)
    }
  }

  const handleDeleteEtiqueta = async (id) => {
    try {
      await api.delete(`/Etiqueta/${id}`)
      message.success('Etiqueta eliminada')
      fetchEtiquetas()
    } catch {
      message.error('Error al eliminar etiqueta')
    }
  }

  const userColumns = [
    { title: 'Usuario', key: 'usuario', render: (_, r) => r.nombreUsuario || r.NombreUsuario || '-' },
    { title: 'Nombre', key: 'nombre', render: (_, r) => `${r.nombres || r.Nombres || ''} ${r.apellidoPaterno || r.ApellidoPaterno || ''}`.trim() || '-' },
    { title: 'Rol', key: 'rol', render: (_, r) => <Tag>{r.rol || r.Rol || '-'}</Tag> },
    {
      title: 'Acciones', key: 'acc', width: 100,
      render: (_, r) => {
        const id = r.id || r.Id
        return (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => {
              setEditingUserId(id)
              userForm.setFieldsValue({
                nombres: r.nombres || r.Nombres || '',
                apellidoPaterno: r.apellidoPaterno || r.ApellidoPaterno || '',
                apellidoMaterno: r.apellidoMaterno || r.ApellidoMaterno || '',
                nombreUsuario: r.nombreUsuario || r.NombreUsuario || '',
                rol: r.rol || r.Rol || ''
              })
              setUserModalOpen(true)
            }} />
            <Popconfirm title="¿Eliminar?" onConfirm={() => handleDeleteUser(id)} okText="Sí" cancelText="No">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, flex: 1 }}>Configuración</Title>
        {limpiarYReiniciarNodeBtn}
      </div>

      <Tabs
        items={[
          {
            key: 'whatsapp',
            label: 'WhatsApp',
            children: (
              <Card>
                <Row gutter={24}>
                  <Col xs={24} md={12}>
                    {/* === SELECTOR DE PROVEEDOR === */}
                    <div style={{ marginBottom: 20 }}>
                      <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                        Proveedor de WhatsApp
                      </Typography.Text>
                      <Radio.Group
                        value={proveedor}
                        onChange={(e) => handleCambiarProveedor(e.target.value)}
                        disabled={cargandoProveedor}
                      >
                        <Radio.Button value="wwebjs">
                          <span>WhatsApp-Web.js</span>
                        </Radio.Button>
                        <Radio.Button value="baileys">
                          <span>Baileys</span>
                        </Radio.Button>
                      </Radio.Group>
                      <div style={{ marginTop: 6 }}>
                        {proveedor === 'wwebjs' ? (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            Usa Chrome/Puppeteer. Más estable pero requiere Chrome instalado (~500MB RAM).
                          </Typography.Text>
                        ) : (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            WebSocket directo. Sin Chrome, más liviano (~50MB RAM). Soporta pairing code.
                          </Typography.Text>
                        )}
                      </div>
                    </div>

                    <Divider style={{ margin: '12px 0' }} />

                    {/* === PAIRING CODE (solo Baileys) === */}
                    {proveedor === 'baileys' && (
                      <div style={{ marginBottom: 20, padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
                        <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
                          Vincular por código (alternativa al QR)
                        </Typography.Text>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                          <Input
                            placeholder="Ej: 5491112345678 (sin + ni espacios)"
                            value={numeroPairing}
                            onChange={(e) => setNumeroPairing(e.target.value.replace(/\D/g, ''))}
                            style={{ maxWidth: 240 }}
                            maxLength={15}
                          />
                          <Button
                            type="primary"
                            onClick={handleSolicitarPairingCode}
                            loading={cargandoPairing}
                            style={{ background: '#52c41a', borderColor: '#52c41a' }}
                          >
                            Solicitar código
                          </Button>
                        </div>
                        {pairingCode && (
                          <div style={{ marginTop: 8 }}>
                            <Typography.Text strong style={{ fontSize: 22, letterSpacing: 6, fontFamily: 'monospace', color: '#389e0d' }}>
                              {pairingCode}
                            </Typography.Text>
                            <br />
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              Abrí WhatsApp en tu celular → Configuración → Dispositivos vinculados → Vincular un dispositivo → Vincular con número de teléfono
                            </Typography.Text>
                            <br />
                            <Button
                              size="small"
                              style={{ marginTop: 4 }}
                              onClick={() => { navigator.clipboard.writeText(pairingCode); message.success('Código copiado') }}
                            >
                              Copiar código
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    <Divider style={{ margin: '12px 0' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                      {isConnected
                        ? <Badge status="success" text={<Text strong style={{ color: '#52c41a' }}>Conectado</Text>} />
                        : isStarting
                          ? <Badge status="processing" text={<Text strong style={{ color: '#1677ff' }}>Iniciando...</Text>} />
                          : <Badge status="error" text={<Text strong style={{ color: '#ff4d4f' }}>Desconectado</Text>} />
                      }
                    </div>

                    {waNumero && (
                      <div style={{ marginBottom: 16 }}>
                        <Text type="secondary">Número activo: </Text>
                        <Text strong>{waNumero}</Text>
                      </div>
                    )}

                    <Space wrap>
                      <Button
                        type="primary"
                        icon={<WifiOutlined />}
                        onClick={handleConectar}
                        loading={waLoading || isStarting}
                        disabled={isConnected || waClosing}
                      >
                        {isConnected ? 'Conectado' : 'Conectar WhatsApp'}
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={async () => {
                          await fetchWaStatus()
                          await fetchWaNumero()
                        }}
                      >
                        Actualizar estado
                      </Button>
                      <Button
                        icon={<QrcodeOutlined />}
                        onClick={handleRefreshQr}
                        disabled={isConnected}
                        loading={qrLoading}
                      >
                        Obtener QR
                      </Button>
                      <Button
                        danger
                        icon={<DisconnectOutlined />}
                        onClick={handleCerrarSesion}
                        disabled={waClosing || (!isConnected && !waNumero)}
                        loading={waClosing}
                      >
                        Cerrar sesión
                      </Button>
                      <Button
                        danger
                        style={{ marginLeft: 8 }}
                        onClick={async () => {
                          let result = ''
                          try {
                            const resp = await api.post('/WhatsApp/cerrar-sesion', { numero: waNumero })
                            result = `Status: ${resp.status}\n${JSON.stringify(resp.data, null, 2)}`
                            await fetchWaStatus()
                            await fetchWaQr()
                          } catch (err) {
                            result = err?.response ? `Status: ${err.response.status}\n${JSON.stringify(err.response.data, null, 2)}` : String(err)
                          }
                          Modal.info({
                            title: 'Resultado cerrar-sesion',
                            content: <pre style={{ whiteSpace: 'pre-wrap' }}>{result}</pre>,
                            width: 600
                          })
                        }}
                      >
                        Forzar cerrar sesión
                      </Button>
                      <Button
                        style={{ marginLeft: 8 }}
                        onClick={async () => {
                          let result = ''
                          try {
                            const resp = await api.post('/WhatsApp/iniciar-cliente')
                            result = `Status: ${resp.status}\n${JSON.stringify(resp.data, null, 2)}`
                          } catch (err) {
                            result = err?.response ? `Status: ${err.response.status}\n${JSON.stringify(err.response.data, null, 2)}` : String(err)
                          }
                          Modal.info({
                            title: 'Resultado iniciar-cliente',
                            content: <pre style={{ whiteSpace: 'pre-wrap' }}>{result}</pre>,
                            width: 600
                          })
                        }}
                      >
                        Test iniciar-cliente
                      </Button>
                    </Space>
                  </Col>
                  {waQr && (
                    <Col xs={24} md={12}>
                      <div style={{ textAlign: 'center' }}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                          Escanea este código QR con tu WhatsApp
                        </Text>
                        {typeof waQr === 'string' && waQr.startsWith('data:') ? (
                          <img src={waQr} alt="QR WhatsApp" style={{ maxWidth: 240, border: '1px solid #f0f0f0', borderRadius: 8 }} />
                        ) : (
                          <div style={{ padding: 20, background: '#f5f5f5', borderRadius: 8 }}>
                            <Text code style={{ wordBreak: 'break-all', fontSize: 10 }}>{waQr || 'QR no disponible'}</Text>
                          </div>
                        )}
                      </div>
                    </Col>
                  )}
                </Row>
              </Card>
            )
          },
          {
            key: 'usuarios',
            label: 'Usuarios',
            children: (
              <Card extra={
                <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => {
                  setEditingUserId(null)
                  userForm.resetFields()
                  setUserModalOpen(true)
                }}>
                  Nuevo Usuario
                </Button>
              }>
                <Table
                  dataSource={usuarios}
                  columns={userColumns}
                  rowKey={r => r.id || r.Id}
                  size="small"
                  pagination={false}
                />
              </Card>
            )
          },
          {
            key: 'pipeline',
            label: 'Pipeline',
            children: (
              <Card extra={
                <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => {
                  setEditingEtapaId(null)
                  etapaForm.resetFields()
                  setEtapaModalOpen(true)
                }}>
                  Nueva Etapa
                </Button>
              }>
                <Table
                  dataSource={etapas}
                  rowKey={r => r.id || r.Id}
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: 'Etapa', key: 'nombre',
                      render: (_, r) => (
                        <Space>
                          <div style={{ width: 14, height: 14, borderRadius: 3, background: r.color || r.Color || '#1677ff' }} />
                          <span>{r.nombre || r.Nombre}</span>
                        </Space>
                      )
                    },
                    { title: 'Orden', key: 'orden', render: (_, r) => r.orden || r.Orden || '-' },
                    {
                      title: 'Acciones', key: 'acc', width: 100,
                      render: (_, r) => {
                        const id = r.id || r.Id
                        return (
                          <Space>
                            <Button size="small" icon={<EditOutlined />} onClick={() => {
                              setEditingEtapaId(id)
                              etapaForm.setFieldsValue({ nombre: r.nombre || r.Nombre, color: r.color || r.Color || '#1677ff', orden: r.orden || r.Orden })
                              setEtapaModalOpen(true)
                            }} />
                            <Popconfirm title="¿Eliminar etapa?" onConfirm={() => handleDeleteEtapa(id)} okText="Sí" cancelText="No">
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        )
                      }
                    }
                  ]}
                />
              </Card>
            )
          },
          {
            key: 'etiquetas',
            label: 'Etiquetas',
            children: (
              <Card extra={
                <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => {
                  setEditingEtiquetaId(null)
                  etiquetaForm.resetFields()
                  setEtiquetaModalOpen(true)
                }}>
                  Nueva Etiqueta
                </Button>
              }>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: 8 }}>
                  {etiquetas.map(et => {
                    const id = et.id || et.Id
                    const nombre = et.nombre || et.Nombre
                    const color = et.color || et.Color || '#1677ff'
                    return (
                      <Space key={id}>
                        <Tag color={color} style={{ fontSize: 13, padding: '4px 10px' }}>{nombre}</Tag>
                        <Button size="small" icon={<EditOutlined />} onClick={() => {
                          setEditingEtiquetaId(id)
                          etiquetaForm.setFieldsValue({ nombre, color })
                          setEtiquetaModalOpen(true)
                        }} />
                        <Popconfirm title="¿Eliminar?" onConfirm={() => handleDeleteEtiqueta(id)} okText="Sí" cancelText="No">
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    )
                  })}
                  {etiquetas.length === 0 && (
                    <Text type="secondary">Sin etiquetas configuradas</Text>
                  )}
                </div>
              </Card>
            )
          },
          {
            key: 'mensajes',
            label: 'Mensajes Auto',
            children: (
              <Card>
                <Form layout="vertical" style={{ maxWidth: 600 }}>
                  <Form.Item label="Mensaje de Bienvenida">
                    <Input.TextArea
                      rows={4}
                      value={mensajeBienvenida}
                      onChange={e => setMensajeBienvenida(e.target.value)}
                      placeholder="Hola {{nombre}}, bienvenido..."
                    />
                    <Button
                      type="primary"
                      size="small"
                      style={{ marginTop: 8 }}
                      onClick={() => handleSaveConfig('mensaje_bienvenida', mensajeBienvenida)}
                    >
                      Guardar
                    </Button>
                  </Form.Item>
                  <Divider />
                  <Form.Item label="Mensaje Fuera de Horario">
                    <Input.TextArea
                      rows={4}
                      value={mensajeFueraHorario}
                      onChange={e => setMensajeFueraHorario(e.target.value)}
                      placeholder="Estamos fuera de horario. Te responderemos pronto..."
                    />
                    <Button
                      type="primary"
                      size="small"
                      style={{ marginTop: 8 }}
                      onClick={() => handleSaveConfig('mensaje_fuera_horario', mensajeFueraHorario)}
                    >
                      Guardar
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            )
          },
          {
            key: 'general',
            label: 'General',
            children: (
              <Card>
                <Form layout="vertical" style={{ maxWidth: 500 }}>
                  <Form.Item label="Nombre de la Empresa">
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        value={empresaNombre}
                        onChange={e => setEmpresaNombre(e.target.value)}
                        placeholder="Nombre de tu empresa"
                      />
                      <Button type="primary" onClick={() => handleSaveConfig('empresa_nombre', empresaNombre)}>
                        Guardar
                      </Button>
                    </Space.Compact>
                  </Form.Item>
                  <Form.Item label="Moneda por Defecto">
                    <Space.Compact style={{ width: '100%' }}>
                      <Select
                        value={monedaDefault}
                        onChange={setMonedaDefault}
                        style={{ width: '100%' }}
                      >
                        <Option value="USD">USD - Dólar Americano</Option>
                        <Option value="PEN">PEN - Sol Peruano</Option>
                        <Option value="EUR">EUR - Euro</Option>
                        <Option value="COP">COP - Peso Colombiano</Option>
                        <Option value="MXN">MXN - Peso Mexicano</Option>
                        <Option value="ARS">ARS - Peso Argentino</Option>
                        <Option value="CLP">CLP - Peso Chileno</Option>
                      </Select>
                      <Button type="primary" onClick={() => handleSaveConfig('moneda_default', monedaDefault)}>
                        Guardar
                      </Button>
                    </Space.Compact>
                  </Form.Item>
                </Form>
              </Card>
            )
          }
        ]}
      />

      <Modal
        title={editingUserId ? 'Editar Usuario' : 'Nuevo Usuario'}
        open={userModalOpen}
        onOk={handleSaveUser}
        onCancel={() => { setUserModalOpen(false); userForm.resetFields() }}
        confirmLoading={savingUser}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={userForm} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Nombres" name="nombres" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Apellido Paterno" name="apellidoPaterno" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Apellido Materno" name="apellidoMaterno">
            <Input />
          </Form.Item>
          <Form.Item label="Nombre de Usuario" name="nombreUsuario" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {!editingUserId && (
            <Form.Item label="Contraseña" name="clave" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item label="Rol" name="rol" rules={[{ required: true }]}>
            <Select>
              <Option value="admin">Administrador</Option>
              <Option value="agente">Agente</Option>
              <Option value="supervisor">Supervisor</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingEtapaId ? 'Editar Etapa' : 'Nueva Etapa'}
        open={etapaModalOpen}
        onOk={handleSaveEtapa}
        onCancel={() => { setEtapaModalOpen(false); etapaForm.resetFields(); setEditingEtapaId(null) }}
        confirmLoading={savingEtapa}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={etapaForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
            <Input placeholder="Nombre de la etapa" />
          </Form.Item>
          <Form.Item label="Color" name="color">
            <Input type="color" style={{ width: 80, height: 36 }} />
          </Form.Item>
          <Form.Item label="Orden" name="orden">
            <Input type="number" min={1} placeholder="Posición en el pipeline" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingEtiquetaId ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
        open={etiquetaModalOpen}
        onOk={handleSaveEtiqueta}
        onCancel={() => { setEtiquetaModalOpen(false); etiquetaForm.resetFields(); setEditingEtiquetaId(null) }}
        confirmLoading={savingEtiqueta}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={etiquetaForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
            <Input placeholder="Nombre de la etiqueta" />
          </Form.Item>
          <Form.Item label="Color" name="color">
            <Input type="color" style={{ width: 80, height: 36 }} defaultValue="#1677ff" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
