import React, { useState, useEffect, useCallback } from 'react'
import {
  Card, Button, Input, Modal, Form, Select, Tag, Space,
  Typography, message, Alert, Spin, Row, Col, Popconfirm, Tooltip
} from 'antd'
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons'
import api from '../../api/axios'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

const CATEGORIAS_DEFAULT = [
  'Bienvenida', 'Seguimiento', 'Propuesta', 'Recordatorio', 'Marketing', 'Soporte', 'Otros'
]

function extractVariables(content) {
  if (!content) return []
  const regex = /\{\{([^}]+)\}\}/g
  const vars = new Set()
  let match
  while ((match = regex.exec(content)) !== null) {
    vars.add(match[1].trim())
  }
  return Array.from(vars)
}

function ContentPreview({ content }) {
  if (!content) return <Text type="secondary">Sin contenido</Text>
  const parts = content.split(/(\{\{[^}]+\}\})/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.match(/^\{\{[^}]+\}\}$/)) {
          return (
            <Tag key={i} color="blue" style={{ margin: '0 2px', fontSize: 12 }}>
              {part}
            </Tag>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

export default function Plantillas() {
  const [plantillas, setPlantillas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [form] = Form.useForm()

  const fetchPlantillas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/Plantilla')
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.data || [])
      setPlantillas(data)
    } catch {
      setError('Error al cargar plantillas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlantillas()
  }, [fetchPlantillas])

  const filteredPlantillas = plantillas.filter(p => {
    const nombre = p.nombre || p.Nombre || ''
    const categoria = p.categoria || p.Categoria || ''
    const matchSearch = nombre.toLowerCase().includes(search.toLowerCase()) ||
      categoria.toLowerCase().includes(search.toLowerCase())
    const matchCategoria = !filtroCategoria || categoria === filtroCategoria
    return matchSearch && matchCategoria
  })

  const openCreate = () => {
    setEditingId(null)
    form.resetFields()
    setPreviewContent('')
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditingId(record.id || record.Id)
    const contenido = record.contenido || record.Contenido || ''
    form.setFieldsValue({
      nombre: record.nombre || record.Nombre || '',
      categoria: record.categoria || record.Categoria || '',
      contenido
    })
    setPreviewContent(contenido)
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/Plantilla/${id}`)
      message.success('Plantilla eliminada')
      fetchPlantillas()
    } catch {
      message.error('Error al eliminar')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const variables = extractVariables(values.contenido)
      const payload = { ...values, variables }
      if (editingId) {
        await api.put(`/Plantilla/${editingId}`, payload)
        message.success('Plantilla actualizada')
      } else {
        await api.post('/Plantilla', payload)
        message.success('Plantilla creada')
      }
      setModalOpen(false)
      fetchPlantillas()
    } catch (err) {
      if (!err?.errorFields) message.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (error) return <Alert message={error} type="error" showIcon />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Plantillas de Mensajes</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Nueva Plantilla
        </Button>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Buscar por nombre o categoría..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
        </Col>
        <Col>
          <Select
            placeholder="Categoría"
            allowClear
            style={{ width: 180 }}
            value={filtroCategoria}
            onChange={setFiltroCategoria}
          >
            {CATEGORIAS_DEFAULT.map(c => <Option key={c} value={c}>{c}</Option>)}
          </Select>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {filteredPlantillas.length === 0 ? (
          <Col span={24}>
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Text type="secondary">No se encontraron plantillas</Text>
            </div>
          </Col>
        ) : filteredPlantillas.map(p => {
          const id = p.id || p.Id
          const nombre = p.nombre || p.Nombre || 'Sin nombre'
          const categoria = p.categoria || p.Categoria
          const contenido = p.contenido || p.Contenido || ''
          const variables = extractVariables(contenido)

          return (
            <Col xs={24} sm={12} xl={8} key={id}>
              <Card
                size="small"
                title={nombre}
                extra={
                  <Space>
                    <Tooltip title="Editar">
                      <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(p)} />
                    </Tooltip>
                    <Popconfirm title="¿Eliminar?" onConfirm={() => handleDelete(id)} okText="Sí" cancelText="No">
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                }
                style={{ height: '100%' }}
              >
                {categoria && (
                  <div style={{ marginBottom: 8 }}>
                    <Tag color="green">{categoria}</Tag>
                  </div>
                )}
                <div style={{
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  borderRadius: 4,
                  padding: '8px 10px',
                  fontSize: 13,
                  minHeight: 60,
                  marginBottom: 8,
                  lineHeight: 1.6
                }}>
                  <ContentPreview content={contenido} />
                </div>
                {variables.length > 0 && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Variables: </Text>
                    {variables.map(v => (
                      <Tag key={v} color="blue" style={{ fontSize: 11, margin: '2px' }}>
                        {`{{${v}}}`}
                      </Tag>
                    ))}
                  </div>
                )}
              </Card>
            </Col>
          )
        })}
      </Row>

      <Modal
        title={editingId ? 'Editar Plantilla' : 'Nueva Plantilla'}
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
            <Col span={14}>
              <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
                <Input placeholder="Nombre de la plantilla" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="Categoría" name="categoria">
                <Select showSearch allowClear>
                  {CATEGORIAS_DEFAULT.map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="Contenido"
            name="contenido"
            rules={[{ required: true }]}
            extra="Usa {{variable}} para insertar variables dinámicas"
          >
            <TextArea
              rows={5}
              placeholder="Hola {{nombre}}, te contactamos de {{empresa}}..."
              onChange={e => setPreviewContent(e.target.value)}
            />
          </Form.Item>
          {previewContent && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Vista previa:</Text>
              <div style={{
                background: '#dcf8c6',
                borderRadius: 8,
                padding: '10px 14px',
                marginTop: 6,
                fontSize: 14,
                lineHeight: 1.6
              }}>
                <ContentPreview content={previewContent} />
              </div>
              {extractVariables(previewContent).length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Variables detectadas: </Text>
                  {extractVariables(previewContent).map(v => (
                    <Tag key={v} color="blue" style={{ margin: '2px' }}>{`{{${v}}}`}</Tag>
                  ))}
                </div>
              )}
            </div>
          )}
        </Form>
      </Modal>
    </div>
  )
}
