import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card, Tabs, Button, Input, Select, Form, Table, Modal, Switch, Tag,
  Space, Spin, Alert, Typography, message, Popconfirm, Badge, Row, Col,
  Divider
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  WifiOutlined, DisconnectOutlined
} from '@ant-design/icons'
import api from '../../api/axios'

const { Title, Text } = Typography
const { Option } = Select

export default function Configuracion() {
  const [waStatus, setWaStatus] = useState(null)
  const [waNumero, setWaNumero] = useState(null)
  const [waQr, setWaQr] = useState(null)
  const [waLoading, setWaLoading] = useState(false)
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

  const fetchWaStatus = useCallback(async () => {
    try {
      const res = await api.get('/Configuracion/whatsapp_estado')
      setWaStatus(res.data)
      return res.data
    } catch {
      return null
    }
  }, [])

  const fetchWaNumero = useCallback(async () => {
    try {
      const res = await api.get('/WhatsApp/obtenerNumero')
      setWaNumero(res.data?.numero || res.data?.Numero || null)
    } catch {}
  }, [])

  const fetchWaQr = useCallback(async () => {
    try {
      const res = await api.get('/Configuracion/whatsapp_qr')
      setWaQr(res.data?.qr || res.data?.Qr || res.data || null)
    } catch {
      setWaQr(null)
    }
  }, [])

  const fetchUsuarios = useCallback(async () => {
    try {
      const res = await api.get('/Usuario')
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || [])
      setUsuarios(data)
    } catch {}
  }, [])

  const fetchEtapas = useCallback(async () => {
    try {
      const res = await api.get('/Pipeline/etapas')
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || [])
      setEtapas(data)
    } catch {}
  }, [])

  const fetchEtiquetas = useCallback(async () => {
    try {
      const res = await api.get('/Etiqueta')
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || [])
      setEtiquetas(data)
    } catch {}
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
    } catch {}
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
        fetchConfig()
      ])
      setLoading(false)
    }
    init()
  }, [fetchWaStatus, fetchWaNumero, fetchUsuarios, fetchEtapas, fetchEtiquetas, fetchConfig])

  useEffect(() => {
    const estadoStr = typeof waStatus === 'string' ? waStatus : waStatus?.estado
    if (estadoStr === 'iniciando') {
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
    return () => { if (qrPollRef.current) clearInterval(qrPollRef.current) }
  }, [waStatus, fetchWaQr, fetchWaStatus, fetchWaNumero])

  const handleConectar = async () => {
    setWaLoading(true)
    try {
      await api.post('/WhatsApp/iniciar-cliente')
      message.success('Iniciando WhatsApp...')
      await fetchWaStatus()
    } catch {
      message.error('Error al iniciar WhatsApp')
    } finally {
      setWaLoading(false)
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

  const isConnected = waStatus === 'conectado' || waStatus === true || waStatus?.estado === 'conectado'
  const isStarting = waStatus === 'iniciando' || waStatus?.estado === 'iniciando'

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
      <Title level={4} style={{ marginBottom: 20 }}>Configuración</Title>

      <Tabs
        items={[
          {
            key: 'whatsapp',
            label: 'WhatsApp',
            children: (
              <Card>
                <Row gutter={24}>
                  <Col xs={24} md={12}>
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

                    <Space>
                      <Button
                        type="primary"
                        icon={<WifiOutlined />}
                        onClick={handleConectar}
                        loading={waLoading || isStarting}
                        disabled={isConnected}
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
                    </Space>
                  </Col>
                  {isStarting && waQr && (
                    <Col xs={24} md={12}>
                      <div style={{ textAlign: 'center' }}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                          Escanea este código QR con tu WhatsApp
                        </Text>
                        {waQr.startsWith('data:') ? (
                          <img src={waQr} alt="QR WhatsApp" style={{ maxWidth: 240, border: '1px solid #f0f0f0', borderRadius: 8 }} />
                        ) : (
                          <div style={{ padding: 20, background: '#f5f5f5', borderRadius: 8 }}>
                            <Text code style={{ wordBreak: 'break-all', fontSize: 10 }}>{waQr}</Text>
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
