import React, { useState, useEffect } from 'react'
import {
  Card, Row, Col, Button, Form, Input, Select, DatePicker, InputNumber,
  Slider, Tag, Space, Spin, Alert, Typography, Table, Modal, message,
  Timeline, Descriptions
} from 'antd'
import {
  ArrowLeftOutlined, MessageOutlined, EditOutlined, PlusOutlined,
  DeleteOutlined, DollarOutlined
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { formatMoney, formatDate, formatDateTime } from '../../utils/format'
import { getPrioridadColor, getPrioridadLabel } from '../../utils/prioridad'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select

export default function OportunidadDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [oportunidad, setOportunidad] = useState(null)
  const [etapas, setEtapas] = useState([])
  const [productos, setProductos] = useState([])
  const [contactos, setContactos] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [productModal, setProductModal] = useState(false)
  const [addingProduct, setAddingProduct] = useState(false)
  const [actividadModal, setActividadModal] = useState(false)
  const [form] = Form.useForm()
  const [prodForm] = Form.useForm()
  const [actForm] = Form.useForm()

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      setError(null)
      try {
        const [opRes, etRes, prodRes] = await Promise.all([
          api.get(`/Oportunidad/${id}`),
          api.get('/Pipeline/etapas'),
          api.get('/Producto')
        ])
        setOportunidad(opRes.data)
        setEtapas(Array.isArray(etRes.data) ? etRes.data : (etRes.data?.items || []))
        setProductos(Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data?.items || []))
        try {
          const [cRes, eRes] = await Promise.all([api.get('/Contacto'), api.get('/Empresa')])
          setContactos(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.items || []))
          setEmpresas(Array.isArray(eRes.data) ? eRes.data : (eRes.data?.items || []))
        } catch {}
      } catch {
        setError('Error al cargar la oportunidad')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [id])

  useEffect(() => {
    if (oportunidad && editing) {
      const o = oportunidad
      form.setFieldsValue({
        titulo: o.titulo || o.Titulo || '',
        idEtapa: o.idEtapa || o.IdEtapa || o.etapa?.id || o.Etapa?.Id,
        monto: o.monto || o.Monto || 0,
        prioridad: o.prioridad || o.Prioridad || '',
        probabilidad: o.probabilidad || o.Probabilidad || 0,
        origen: o.origen || o.Origen || '',
        idContacto: o.idContacto || o.IdContacto || o.contacto?.id || null,
        idEmpresa: o.idEmpresa || o.IdEmpresa || o.empresa?.id || null,
        fechaCierre: o.fechaCierre || o.FechaCierre ? dayjs(o.fechaCierre || o.FechaCierre) : null,
        descripcion: o.descripcion || o.Descripcion || '',
        notas: o.notas || o.Notas || ''
      })
    }
  }, [editing, oportunidad, form])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload = {
        ...values,
        fechaCierre: values.fechaCierre ? values.fechaCierre.toISOString() : null
      }
      const res = await api.put(`/Oportunidad/${id}`, payload)
      setOportunidad(res.data || { ...oportunidad, ...values })
      message.success('Oportunidad actualizada')
      setEditing(false)
    } catch (err) {
      if (!err?.errorFields) message.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleAddProduct = async () => {
    try {
      const values = await prodForm.validateFields()
      setAddingProduct(true)
      await api.post(`/Oportunidad/${id}/productos`, values)
      message.success('Producto agregado')
      setProductModal(false)
      prodForm.resetFields()
      const res = await api.get(`/Oportunidad/${id}`)
      setOportunidad(res.data)
    } catch (err) {
      if (!err?.errorFields) message.error('Error al agregar producto')
    } finally {
      setAddingProduct(false)
    }
  }

  const handleRemoveProduct = async (idProd) => {
    try {
      await api.delete(`/Oportunidad/${id}/productos/${idProd}`)
      message.success('Producto eliminado')
      const res = await api.get(`/Oportunidad/${id}`)
      setOportunidad(res.data)
    } catch {
      message.error('Error al eliminar producto')
    }
  }

  const handleSaveActividad = async () => {
    try {
      const values = await actForm.validateFields()
      const payload = {
        ...values,
        idOportunidad: parseInt(id),
        fecha: values.fecha ? values.fecha.toISOString() : null
      }
      await api.post('/Actividad', payload)
      message.success('Actividad creada')
      setActividadModal(false)
      actForm.resetFields()
      const res = await api.get(`/Oportunidad/${id}`)
      setOportunidad(res.data)
    } catch (err) {
      if (!err?.errorFields) message.error('Error al crear actividad')
    }
  }

  const handleEtapaChange = async (idEtapa) => {
    try {
      await api.put(`/Oportunidad/${id}/etapa`, { idEtapa })
      setOportunidad(prev => ({ ...prev, idEtapa, etapa: etapas.find(e => (e.id || e.Id) === idEtapa) }))
      message.success('Etapa actualizada')
    } catch {
      message.error('Error al actualizar etapa')
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (error) return <Alert message={error} type="error" showIcon />
  if (!oportunidad) return <Alert message="Oportunidad no encontrada" type="warning" showIcon />

  const o = oportunidad
  const titulo = o.titulo || o.Titulo || 'Sin título'
  const prioridad = o.prioridad || o.Prioridad
  const monto = o.monto || o.Monto || 0
  const etapa = o.etapa || o.Etapa
  const contacto = o.contacto || o.Contacto
  const empresa = o.empresa || o.Empresa
  const productosOp = o.productos || o.Productos || []
  const actividades = o.actividades || o.Actividades || []
  const phone = contacto?.numeroWhatsApp || contacto?.NumeroWhatsApp

  const prodColumns = [
    { title: 'Producto', key: 'nombre', render: (_, r) => r.nombre || r.Nombre || r.producto?.nombre || '-' },
    { title: 'Cantidad', key: 'cantidad', render: (_, r) => r.cantidad || r.Cantidad || 1 },
    { title: 'Precio Unit.', key: 'precio', render: (_, r) => formatMoney(r.precioUnitario || r.PrecioUnitario || r.precio || 0) },
    { title: 'Total', key: 'total', render: (_, r) => formatMoney((r.cantidad || r.Cantidad || 1) * (r.precioUnitario || r.PrecioUnitario || r.precio || 0)) },
    {
      title: '', key: 'acc',
      render: (_, r) => (
        <Button size="small" danger icon={<DeleteOutlined />}
          onClick={() => handleRemoveProduct(r.id || r.Id)}
        />
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/pipeline')}>
          Volver al Pipeline
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={3} style={{ marginBottom: 8 }}>{titulo}</Title>
            <Space wrap>
              {etapa && <Tag color="blue">{etapa.nombre || etapa.Nombre}</Tag>}
              {prioridad && <Tag color={getPrioridadColor(prioridad)}>{getPrioridadLabel(prioridad)}</Tag>}
              <Text strong style={{ color: '#25D366', fontSize: 18 }}>{formatMoney(monto)}</Text>
            </Space>
          </div>
          <Space>
            {phone && (
              <Button icon={<MessageOutlined />} onClick={() => navigate(`/chat/${phone}`)}>
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

      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Card title="Productos" extra={
            <Button size="small" icon={<PlusOutlined />} onClick={() => { prodForm.resetFields(); setProductModal(true) }}>
              Agregar
            </Button>
          } style={{ marginBottom: 16 }}>
            <Table
              dataSource={productosOp}
              columns={prodColumns}
              rowKey={r => r.id || r.Id}
              size="small"
              pagination={false}
              summary={data => {
                const total = data.reduce((acc, r) => acc + (r.cantidad || r.Cantidad || 1) * (r.precioUnitario || r.PrecioUnitario || r.precio || 0), 0)
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}><strong>Total</strong></Table.Summary.Cell>
                    <Table.Summary.Cell index={3}><strong>{formatMoney(total)}</strong></Table.Summary.Cell>
                    <Table.Summary.Cell index={4} />
                  </Table.Summary.Row>
                )
              }}
            />
          </Card>

          <Card title="Actividades" extra={
            <Button size="small" icon={<PlusOutlined />} onClick={() => { actForm.resetFields(); setActividadModal(true) }}>
              Nueva
            </Button>
          } style={{ marginBottom: 16 }}>
            {actividades.length > 0 ? (
              <Timeline
                items={actividades.map((a, i) => ({
                  key: a.id || a.Id || i,
                  color: a.estado === 'completada' ? 'green' : 'blue',
                  children: (
                    <div>
                      <Text strong>{a.titulo || a.Titulo}</Text>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>{formatDateTime(a.fecha || a.Fecha)}</Text></div>
                      {(a.descripcion || a.Descripcion) && <div style={{ fontSize: 12 }}>{a.descripcion || a.Descripcion}</div>}
                    </div>
                  )
                }))}
              />
            ) : (
              <Text type="secondary">Sin actividades</Text>
            )}
          </Card>

          <Card title="Notas">
            {editing ? (
              <Form form={form}>
                <Form.Item name="notas" noStyle>
                  <Input.TextArea rows={4} />
                </Form.Item>
              </Form>
            ) : (
              <Text>{o.notas || o.Notas || 'Sin notas'}</Text>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Detalles" style={{ marginBottom: 16 }}>
            {editing ? (
              <Form form={form} layout="vertical">
                <Form.Item label="Etapa" name="idEtapa">
                  <Select onChange={handleEtapaChange}>
                    {etapas.map(e => <Option key={e.id || e.Id} value={e.id || e.Id}>{e.nombre || e.Nombre}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item label="Monto" name="monto">
                  <InputNumber style={{ width: '100%' }} prefix={<DollarOutlined />} min={0} />
                </Form.Item>
                <Form.Item label="Prioridad" name="prioridad">
                  <Select>
                    <Option value="baja">Baja</Option>
                    <Option value="media">Media</Option>
                    <Option value="alta">Alta</Option>
                    <Option value="urgente">Urgente</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Probabilidad (%)" name="probabilidad">
                  <Slider min={0} max={100} />
                </Form.Item>
                <Form.Item label="Contacto" name="idContacto">
                  <Select showSearch optionFilterProp="children" allowClear>
                    {contactos.map(c => {
                      const n = `${c.nombres || c.Nombres || ''} ${c.apellidos || c.Apellidos || ''}`.trim()
                      return <Option key={c.id || c.Id} value={c.id || c.Id}>{n}</Option>
                    })}
                  </Select>
                </Form.Item>
                <Form.Item label="Empresa" name="idEmpresa">
                  <Select showSearch optionFilterProp="children" allowClear>
                    {empresas.map(e => <Option key={e.id || e.Id} value={e.id || e.Id}>{e.nombre || e.Nombre}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item label="Fecha de cierre" name="fechaCierre">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label="Origen" name="origen">
                  <Input />
                </Form.Item>
              </Form>
            ) : (
              <Descriptions column={1} size="small" layout="vertical">
                {contacto && (
                  <Descriptions.Item label="Contacto">
                    <Button type="link" size="small" style={{ padding: 0 }}
                      onClick={() => navigate(`/contactos/${contacto.id || contacto.Id}`)}>
                      {`${contacto.nombres || contacto.Nombres || ''} ${contacto.apellidos || contacto.Apellidos || ''}`.trim()}
                    </Button>
                  </Descriptions.Item>
                )}
                {empresa && (
                  <Descriptions.Item label="Empresa">
                    <Button type="link" size="small" style={{ padding: 0 }}
                      onClick={() => navigate(`/empresas/${empresa.id || empresa.Id}`)}>
                      {empresa.nombre || empresa.Nombre}
                    </Button>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Probabilidad">
                  {o.probabilidad || o.Probabilidad || 0}%
                </Descriptions.Item>
                <Descriptions.Item label="Origen">{o.origen || o.Origen || '-'}</Descriptions.Item>
                <Descriptions.Item label="Fecha de cierre">
                  {formatDate(o.fechaCierre || o.FechaCierre) || '-'}
                </Descriptions.Item>
              </Descriptions>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="Agregar Producto"
        open={productModal}
        onOk={handleAddProduct}
        onCancel={() => setProductModal(false)}
        confirmLoading={addingProduct}
        okText="Agregar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={prodForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Producto" name="idProducto" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
              {productos.map(p => (
                <Option key={p.id || p.Id} value={p.id || p.Id}>{p.nombre || p.Nombre}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Cantidad" name="cantidad" initialValue={1}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Precio Unitario" name="precioUnitario">
            <InputNumber min={0} style={{ width: '100%' }} prefix={<DollarOutlined />} />
          </Form.Item>
        </Form>
      </Modal>

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
