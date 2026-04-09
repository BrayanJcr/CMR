import React, { useState, useEffect } from 'react'
import {
  Card, Tabs, Button, Form, Input, Select, Tag, Space, Spin, Alert,
  Typography, Table, Modal, DatePicker, message, Row, Col, Descriptions
} from 'antd'
import { ArrowLeftOutlined, MessageOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { formatDate, formatDateTime } from '../../utils/format'
import WaAvatar from '../../components/WaAvatar'
import { getPrioridadColor, getPrioridadLabel } from '../../utils/prioridad'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

export default function ContactoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contacto, setContacto] = useState(null)
  const [oportunidades, setOportunidades] = useState([])
  const [actividades, setActividades] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [etiquetas, setEtiquetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actividadModal, setActividadModal] = useState(false)
  const [form] = Form.useForm()
  const [actForm] = Form.useForm()

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        const [cRes, empRes, etRes] = await Promise.all([
          api.get(`/Contacto/${id}`),
          api.get('/Empresa'),
          api.get('/Etiqueta')
        ])
        setContacto(cRes.data)
        setEmpresas(Array.isArray(empRes.data) ? empRes.data : (empRes.data?.items || []))
        setEtiquetas(Array.isArray(etRes.data) ? etRes.data : (etRes.data?.items || []))
        try {
          const opRes = await api.get(`/Oportunidad?idContacto=${id}`)
          setOportunidades(Array.isArray(opRes.data) ? opRes.data : (opRes.data?.items || []))
        } catch {}
        try {
          const actRes = await api.get(`/Actividad?idContacto=${id}`)
          setActividades(Array.isArray(actRes.data) ? actRes.data : (actRes.data?.items || []))
        } catch {}
      } catch {
        setError('Error al cargar el contacto')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [id])

  useEffect(() => {
    if (contacto && editing) {
      const c = contacto
      form.setFieldsValue({
        nombres: c.nombres || c.Nombres || '',
        apellidos: c.apellidos || c.Apellidos || '',
        numeroWhatsApp: c.numeroWhatsApp || c.NumeroWhatsApp || '',
        email: c.email || c.Email || '',
        cargo: c.cargo || c.Cargo || '',
        idEmpresa: c.idEmpresa || c.IdEmpresa || c.empresa?.id || null,
        idEtiquetas: (c.etiquetas || c.Etiquetas || []).map(e => e.id || e.Id),
        notas: c.notas || c.Notas || ''
      })
    }
  }, [editing, contacto, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const updated = await api.put(`/Contacto/${id}`, values)
      setContacto(updated.data || { ...contacto, ...values })
      message.success('Contacto actualizado')
      setEditing(false)
    } catch (err) {
      if (!err?.errorFields) message.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveActividad = async () => {
    try {
      const values = await actForm.validateFields()
      const { estado, fecha, ...rest } = values
      const payload = {
        ...rest,
        idContacto: parseInt(id),
        estadoActividad: estado ?? 'pendiente',
        fechaActividad: fecha ? fecha.toISOString() : null
      }
      await api.post('/Actividad', payload)
      message.success('Actividad creada')
      setActividadModal(false)
      actForm.resetFields()
      const res = await api.get(`/Actividad?idContacto=${id}`)
      setActividades(Array.isArray(res.data) ? res.data : (res.data?.items || []))
    } catch (err) {
      if (!err?.errorFields) message.error('Error al crear actividad')
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (error) return <Alert message={error} type="error" showIcon />
  if (!contacto) return <Alert message="Contacto no encontrado" type="warning" showIcon />

  const nombre = `${contacto.nombres || contacto.Nombres || ''} ${contacto.apellidos || contacto.Apellidos || ''}`.trim()
  const phone = contacto.numeroWhatsApp || contacto.NumeroWhatsApp || ''

  const opColumns = [
    { title: 'Título', dataIndex: 'titulo', key: 'titulo', render: (_, r) => r.titulo || r.Titulo || '-' },
    { title: 'Etapa', key: 'etapa', render: (_, r) => r.etapa?.nombre || r.Etapa?.Nombre || '-' },
    { title: 'Monto', key: 'monto', render: (_, r) => `$${(r.monto || r.Monto || 0).toLocaleString()}` },
    {
      title: 'Prioridad', key: 'prioridad',
      render: (_, r) => {
        const p = r.prioridad || r.Prioridad
        return <Tag color={getPrioridadColor(p)}>{getPrioridadLabel(p)}</Tag>
      }
    },
    {
      title: 'Acciones', key: 'acc',
      render: (_, r) => <Button size="small" onClick={() => navigate(`/oportunidades/${r.id || r.Id}`)}>Ver</Button>
    }
  ]

  const actColumns = [
    { title: 'Tipo', key: 'tipo', render: (_, r) => r.tipo || r.Tipo || '-' },
    { title: 'Título', key: 'titulo', render: (_, r) => r.titulo || r.Titulo || '-' },
    { title: 'Fecha', key: 'fecha', render: (_, r) => formatDateTime(r.fecha || r.Fecha) },
    {
      title: 'Estado', key: 'estado',
      render: (_, r) => {
        const e = r.estado || r.Estado
        const color = e === 'completada' ? 'green' : e === 'pendiente' ? 'orange' : 'blue'
        return <Tag color={color}>{e || '-'}</Tag>
      }
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/contactos')} style={{ marginRight: 12 }}>
          Volver
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <WaAvatar numero={phone} nombre={nombre} size={64} style={{ flexShrink: 0, borderRadius: '50%' }} />
            <div>
            <Title level={3} style={{ marginBottom: 8 }}>{nombre || 'Sin nombre'}</Title>
            <Space wrap>
              {phone && <Tag icon={<MessageOutlined />} color="green">{phone}</Tag>}
              {(contacto.cargo || contacto.Cargo) && <Tag>{contacto.cargo || contacto.Cargo}</Tag>}
              {(contacto.etiquetas || contacto.Etiquetas || []).map((et, i) => (
                <Tag key={i} color={et.color || et.Color || 'blue'}>{et.nombre || et.Nombre}</Tag>
              ))}
            </Space>
            </div>
          </div>
          <Space>
            {phone && (
              <Button
                type="primary"
                icon={<MessageOutlined />}
                onClick={() => navigate(`/chat/${phone}`)}
              >
                Ir al Chat
              </Button>
            )}
            {!editing
              ? <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>Editar</Button>
              : (
                <Space>
                  <Button onClick={() => setEditing(false)}>Cancelar</Button>
                  <Button type="primary" onClick={handleSave} loading={saving}>Guardar</Button>
                </Space>
              )
            }
          </Space>
        </div>
      </Card>

      <Card>
        <Tabs
          items={[
            {
              key: 'info',
              label: 'Información',
              children: editing ? (
                <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Nombres" name="nombres" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Apellidos" name="apellidos">
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="WhatsApp" name="numeroWhatsApp" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Email" name="email">
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Cargo" name="cargo">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Empresa" name="idEmpresa">
                        <Select allowClear showSearch optionFilterProp="children">
                          {empresas.map(e => <Option key={e.id || e.Id} value={e.id || e.Id}>{e.nombre || e.Nombre}</Option>)}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="Etiquetas" name="idEtiquetas">
                    <Select mode="multiple" allowClear>
                      {etiquetas.map(e => <Option key={e.id || e.Id} value={e.id || e.Id}>{e.nombre || e.Nombre}</Option>)}
                    </Select>
                  </Form.Item>
                  <Form.Item label="Notas" name="notas">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                </Form>
              ) : (
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="Nombres">{contacto.nombres || contacto.Nombres || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Apellidos">{contacto.apellidos || contacto.Apellidos || '-'}</Descriptions.Item>
                  <Descriptions.Item label="WhatsApp">{contacto.numeroWhatsApp || contacto.NumeroWhatsApp || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Email">{contacto.email || contacto.Email || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Cargo">{contacto.cargo || contacto.Cargo || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Empresa">{contacto.empresa?.nombre || contacto.Empresa?.Nombre || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Notas" span={2}>{contacto.notas || contacto.Notas || '-'}</Descriptions.Item>
                </Descriptions>
              )
            },
            {
              key: 'oportunidades',
              label: `Oportunidades (${oportunidades.length})`,
              children: (
                <Table
                  dataSource={oportunidades}
                  columns={opColumns}
                  rowKey={r => r.id || r.Id}
                  size="small"
                  pagination={false}
                />
              )
            },
            {
              key: 'actividades',
              label: `Actividades (${actividades.length})`,
              children: (
                <div>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{ marginBottom: 16 }}
                    onClick={() => { actForm.resetFields(); setActividadModal(true) }}
                  >
                    Nueva Actividad
                  </Button>
                  <Table
                    dataSource={actividades}
                    columns={actColumns}
                    rowKey={r => r.id || r.Id}
                    size="small"
                    pagination={false}
                  />
                </div>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title="Nueva Actividad"
        open={actividadModal}
        onOk={handleSaveActividad}
        onCancel={() => setActividadModal(false)}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={actForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Tipo" name="tipo" rules={[{ required: true }]}>
            <Select>
              <Option value="llamada">Llamada</Option>
              <Option value="reunion">Reunión</Option>
              <Option value="email">Email</Option>
              <Option value="tarea">Tarea</Option>
              <Option value="nota">Nota</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Título" name="titulo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Descripción" name="descripcion">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Fecha" name="fecha">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Estado" name="estado" initialValue="pendiente">
            <Select>
              <Option value="pendiente">Pendiente</Option>
              <Option value="en_progreso">En Progreso</Option>
              <Option value="completada">Completada</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
