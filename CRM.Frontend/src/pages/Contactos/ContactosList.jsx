import React, { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Input, Modal, Form, Select, Tag, Space, Popconfirm,
  Typography, message, Spin, Alert, Row, Col, Tooltip
} from 'antd'
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, MessageOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { formatDate, getInitials } from '../../utils/format'
import WaAvatar from '../../components/WaAvatar'

const { Title } = Typography
const { Option } = Select

export default function ContactosList() {
  const navigate = useNavigate()
  const [contactos, setContactos] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [etiquetas, setEtiquetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [form] = Form.useForm()

  const fetchContactos = useCallback(async (page = 1, busqueda = '') => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/Contacto?pagina=${page}&tamanoPagina=20${busqueda ? `&busqueda=${encodeURIComponent(busqueda)}` : ''}`)
      const data = res.data
      if (Array.isArray(data)) {
        setContactos(data)
        setPagination(p => ({ ...p, total: data.length, current: page }))
      } else {
        setContactos(data.items || data.data || [])
        setPagination(p => ({ ...p, total: data.total || data.Total || 0, current: page }))
      }
    } catch {
      setError('Error al cargar contactos')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchEmpresas = useCallback(async () => {
    try {
      const res = await api.get('/Empresa')
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.data || [])
      setEmpresas(data)
    } catch {}
  }, [])

  const fetchEtiquetas = useCallback(async () => {
    try {
      const res = await api.get('/Etiqueta')
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.data || [])
      setEtiquetas(data)
    } catch {}
  }, [])

  useEffect(() => {
    fetchContactos()
    fetchEmpresas()
    fetchEtiquetas()
  }, [fetchContactos, fetchEmpresas, fetchEtiquetas])

  useEffect(() => {
    const timer = setTimeout(() => fetchContactos(1, search), 400)
    return () => clearTimeout(timer)
  }, [search, fetchContactos])

  const openCreate = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditingId(record.id || record.Id)
    form.setFieldsValue({
      nombres: record.nombres || record.Nombres || '',
      apellidos: record.apellidos || record.Apellidos || '',
      numeroWhatsApp: record.numeroWhatsApp || record.NumeroWhatsApp || '',
      email: record.email || record.Email || '',
      cargo: record.cargo || record.Cargo || '',
      idEmpresa: record.idEmpresa || record.IdEmpresa || record.empresa?.id || null,
      idEtiquetas: (record.etiquetas || record.Etiquetas || []).map(e => e.id || e.Id || e),
      notas: record.notas || record.Notas || ''
    })
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/Contacto/${id}`)
      message.success('Contacto eliminado')
      fetchContactos(pagination.current, search)
    } catch {
      message.error('Error al eliminar el contacto')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      if (editingId) {
        await api.put(`/Contacto/${editingId}`, values)
        message.success('Contacto actualizado')
      } else {
        await api.post('/Contacto', values)
        message.success('Contacto creado')
      }
      setModalOpen(false)
      fetchContactos(pagination.current, search)
    } catch (err) {
      if (err?.errorFields) return
      message.error('Error al guardar el contacto')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: '',
      key: 'avatar',
      width: 52,
      render: (_, r) => {
        const numero = r.numeroWhatsApp || r.NumeroWhatsApp || ''
        const nombre = `${r.nombres || r.Nombres || ''} ${r.apellidos || r.Apellidos || ''}`.trim()
        return <WaAvatar numero={numero} nombre={nombre} size={36} />
      }
    },
    {
      title: 'Nombre Completo',
      key: 'nombre',
      render: (_, r) => {
        const nombre = `${r.nombres || r.Nombres || ''} ${r.apellidos || r.Apellidos || ''}`.trim()
        return <strong>{nombre || 'Sin nombre'}</strong>
      }
    },
    {
      title: 'Teléfono',
      key: 'telefono',
      render: (_, r) => r.numeroWhatsApp || r.NumeroWhatsApp || '-'
    },
    {
      title: 'Email',
      key: 'email',
      render: (_, r) => r.email || r.Email || '-'
    },
    {
      title: 'Empresa',
      key: 'empresa',
      render: (_, r) => r.empresa?.nombre || r.Empresa?.Nombre || r.nombreEmpresa || '-'
    },
    {
      title: 'Etiquetas',
      key: 'etiquetas',
      render: (_, r) => {
        const tags = r.etiquetas || r.Etiquetas || []
        return tags.map((t, i) => (
          <Tag key={i} color={t.color || t.Color || 'blue'} style={{ marginBottom: 2 }}>
            {t.nombre || t.Nombre || t}
          </Tag>
        ))
      }
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 140,
      render: (_, r) => {
        const id = r.id || r.Id
        return (
          <Space>
            <Tooltip title="Ver detalle">
              <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/contactos/${id}`)} />
            </Tooltip>
            <Tooltip title="Editar">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
            </Tooltip>
            <Popconfirm title="¿Eliminar este contacto?" onConfirm={() => handleDelete(id)} okText="Sí" cancelText="No">
              <Tooltip title="Eliminar">
                <Button size="small" icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  if (error) return <Alert message={error} type="error" showIcon action={<Button onClick={() => fetchContactos()}>Reintentar</Button>} />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Contactos</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Nuevo Contacto
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 320 }}
        />
      </div>

      <Table
        dataSource={contactos}
        columns={columns}
        rowKey={r => r.id || r.Id}
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: false,
          showTotal: (total) => `Total: ${total} contactos`,
          onChange: (page) => fetchContactos(page, search)
        }}
        size="middle"
      />

      <Modal
        title={editingId ? 'Editar Contacto' : 'Nuevo Contacto'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="Guardar"
        cancelText="Cancelar"
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Nombres" name="nombres" rules={[{ required: true, message: 'Requerido' }]}>
                <Input placeholder="Nombres" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Apellidos" name="apellidos">
                <Input placeholder="Apellidos" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="WhatsApp" name="numeroWhatsApp" rules={[{ required: true, message: 'Requerido' }]}>
                <Input placeholder="Ej: 51999999999" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Email" name="email">
                <Input placeholder="correo@ejemplo.com" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Cargo" name="cargo">
                <Input placeholder="Cargo o puesto" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Empresa" name="idEmpresa">
                <Select placeholder="Seleccionar empresa" allowClear showSearch optionFilterProp="children">
                  {empresas.map(e => (
                    <Option key={e.id || e.Id} value={e.id || e.Id}>{e.nombre || e.Nombre}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Etiquetas" name="idEtiquetas">
            <Select mode="multiple" placeholder="Seleccionar etiquetas" allowClear optionFilterProp="children">
              {etiquetas.map(e => (
                <Option key={e.id || e.Id} value={e.id || e.Id}>{e.nombre || e.Nombre}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Notas" name="notas">
            <Input.TextArea rows={3} placeholder="Notas adicionales..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
