import React, { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Input, Modal, Form, Tag, Space, Popconfirm,
  Typography, message, Alert, Row, Col, Tooltip
} from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'

const { Title } = Typography

export default function EmpresasList() {
  const navigate = useNavigate()
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const fetchEmpresas = useCallback(async (busqueda = '') => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/Empresa${busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : ''}`)
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.data || [])
      setEmpresas(data)
    } catch {
      setError('Error al cargar empresas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmpresas()
  }, [fetchEmpresas])

  useEffect(() => {
    const timer = setTimeout(() => fetchEmpresas(search), 400)
    return () => clearTimeout(timer)
  }, [search, fetchEmpresas])

  const openCreate = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditingId(record.id || record.Id)
    form.setFieldsValue({
      nombre: record.nombre || record.Nombre || '',
      ruc: record.ruc || record.Ruc || record.RUC || '',
      sector: record.sector || record.Sector || '',
      tamano: record.tamano || record.Tamano || record.tamaño || '',
      web: record.web || record.Web || '',
      direccion: record.direccion || record.Direccion || record.dirección || '',
      notas: record.notas || record.Notas || ''
    })
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/Empresa/${id}`)
      message.success('Empresa eliminada')
      fetchEmpresas(search)
    } catch {
      message.error('Error al eliminar la empresa')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      if (editingId) {
        await api.put(`/Empresa/${editingId}`, values)
        message.success('Empresa actualizada')
      } else {
        await api.post('/Empresa', values)
        message.success('Empresa creada')
      }
      setModalOpen(false)
      fetchEmpresas(search)
    } catch (err) {
      if (err?.errorFields) return
      message.error('Error al guardar la empresa')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: 'Nombre',
      key: 'nombre',
      render: (_, r) => <strong>{r.nombre || r.Nombre || '-'}</strong>
    },
    {
      title: 'RUC',
      key: 'ruc',
      render: (_, r) => r.ruc || r.Ruc || r.RUC || '-'
    },
    {
      title: 'Sector',
      key: 'sector',
      render: (_, r) => r.sector || r.Sector ? <Tag>{r.sector || r.Sector}</Tag> : '-'
    },
    {
      title: 'Web',
      key: 'web',
      render: (_, r) => {
        const web = r.web || r.Web
        return web ? <a href={web.startsWith('http') ? web : `https://${web}`} target="_blank" rel="noreferrer">{web}</a> : '-'
      }
    },
    {
      title: 'Contactos',
      key: 'contactos',
      render: (_, r) => r.cantidadContactos || r.CantidadContactos || r.contactos?.length || 0
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
              <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/empresas/${id}`)} />
            </Tooltip>
            <Tooltip title="Editar">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
            </Tooltip>
            <Popconfirm title="¿Eliminar esta empresa?" onConfirm={() => handleDelete(id)} okText="Sí" cancelText="No">
              <Tooltip title="Eliminar">
                <Button size="small" icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  if (error) return <Alert message={error} type="error" showIcon action={<Button onClick={() => fetchEmpresas()}>Reintentar</Button>} />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Empresas</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Nueva Empresa
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Buscar empresa..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 320 }}
        />
      </div>

      <Table
        dataSource={empresas}
        columns={columns}
        rowKey={r => r.id || r.Id}
        loading={loading}
        pagination={{ pageSize: 20, showTotal: (total) => `Total: ${total} empresas` }}
        size="middle"
      />

      <Modal
        title={editingId ? 'Editar Empresa' : 'Nueva Empresa'}
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
              <Form.Item label="Nombre" name="nombre" rules={[{ required: true, message: 'Requerido' }]}>
                <Input placeholder="Nombre de la empresa" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item label="RUC" name="ruc">
                <Input placeholder="RUC / NIT" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Sector" name="sector">
                <Input placeholder="Ej: Tecnología, Salud..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Tamaño" name="tamano">
                <Input placeholder="Ej: Pequeña, Mediana..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Sitio Web" name="web">
                <Input placeholder="www.empresa.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Dirección" name="direccion">
                <Input placeholder="Dirección" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Notas" name="notas">
            <Input.TextArea rows={3} placeholder="Notas adicionales..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
