import React, { useState, useEffect, useCallback } from 'react'
import {
  Table, Button, Input, Modal, Form, Select, Switch, Tag, Space, Popconfirm,
  Typography, message, Alert, InputNumber, Row, Col, Tooltip
} from 'antd'
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons'
import api from '../../api/axios'
import { formatMoney } from '../../utils/format'

const { Title } = Typography
const { Option } = Select

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState(null)
  const [filtroActivo, setFiltroActivo] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [catForm] = Form.useForm()
  const [form] = Form.useForm()
  const [savingCat, setSavingCat] = useState(false)
  const [editingCatId, setEditingCatId] = useState(null)

  const fetchProductos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let url = '/Producto?'
      if (search) url += `busqueda=${encodeURIComponent(search)}&`
      if (filtroCategoria) url += `idCategoria=${filtroCategoria}&`
      if (filtroActivo !== null) url += `activo=${filtroActivo}&`
      const res = await api.get(url)
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.data || [])
      setProductos(data)
    } catch {
      setError('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }, [search, filtroCategoria, filtroActivo])

  const fetchCategorias = useCallback(async () => {
    try {
      const res = await api.get('/CategoriasProducto')
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || [])
      setCategorias(data)
    } catch {
      try {
        const res2 = await api.get('/CategoriaProducto')
        const data = Array.isArray(res2.data) ? res2.data : (res2.data?.items || [])
        setCategorias(data)
      } catch {}
    }
  }, [])

  useEffect(() => {
    fetchCategorias()
  }, [fetchCategorias])

  useEffect(() => {
    const timer = setTimeout(fetchProductos, 400)
    return () => clearTimeout(timer)
  }, [fetchProductos])

  const openCreate = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditingId(record.id || record.Id)
    form.setFieldsValue({
      nombre: record.nombre || record.Nombre || '',
      codigo: record.codigo || record.Codigo || '',
      descripcion: record.descripcion || record.Descripcion || '',
      precio: record.precio || record.Precio || 0,
      unidad: record.unidad || record.Unidad || '',
      idCategoria: record.idCategoria || record.IdCategoria || record.categoria?.id || null,
      activo: record.activo !== undefined ? record.activo : record.Activo !== undefined ? record.Activo : true
    })
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/Producto/${id}`)
      message.success('Producto eliminado')
      fetchProductos()
    } catch {
      message.error('Error al eliminar')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      if (editingId) {
        await api.put(`/Producto/${editingId}`, values)
        message.success('Producto actualizado')
      } else {
        await api.post('/Producto', values)
        message.success('Producto creado')
      }
      setModalOpen(false)
      fetchProductos()
    } catch (err) {
      if (!err?.errorFields) message.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCategoria = async () => {
    try {
      const values = await catForm.validateFields()
      setSavingCat(true)
      if (editingCatId) {
        await api.put(`/CategoriasProducto/${editingCatId}`, values)
        message.success('Categoría actualizada')
      } else {
        await api.post('/CategoriasProducto', values)
        message.success('Categoría creada')
      }
      catForm.resetFields()
      setEditingCatId(null)
      fetchCategorias()
    } catch (err) {
      if (!err?.errorFields) message.error('Error al guardar categoría')
    } finally {
      setSavingCat(false)
    }
  }

  const handleDeleteCategoria = async (id) => {
    try {
      await api.delete(`/CategoriasProducto/${id}`)
      message.success('Categoría eliminada')
      fetchCategorias()
    } catch {
      message.error('Error al eliminar categoría')
    }
  }

  const columns = [
    {
      title: 'Nombre',
      key: 'nombre',
      render: (_, r) => <strong>{r.nombre || r.Nombre || '-'}</strong>
    },
    {
      title: 'Código',
      key: 'codigo',
      render: (_, r) => r.codigo || r.Codigo || '-'
    },
    {
      title: 'Precio',
      key: 'precio',
      render: (_, r) => formatMoney(r.precio || r.Precio || 0)
    },
    {
      title: 'Categoría',
      key: 'categoria',
      render: (_, r) => {
        const cat = r.categoria || r.Categoria
        const nombre = cat?.nombre || cat?.Nombre || r.nombreCategoria || '-'
        const color = cat?.color || cat?.Color || 'blue'
        return nombre !== '-' ? <Tag color={color}>{nombre}</Tag> : '-'
      }
    },
    {
      title: 'Estado',
      key: 'activo',
      render: (_, r) => {
        const activo = r.activo !== undefined ? r.activo : r.Activo
        return <Tag color={activo ? 'green' : 'red'}>{activo ? 'Activo' : 'Inactivo'}</Tag>
      }
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 100,
      render: (_, r) => {
        const id = r.id || r.Id
        return (
          <Space>
            <Tooltip title="Editar">
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
            </Tooltip>
            <Popconfirm title="¿Eliminar?" onConfirm={() => handleDelete(id)} okText="Sí" cancelText="No">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  if (error) return <Alert message={error} type="error" showIcon />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Productos</Title>
        <Space>
          <Button onClick={() => { catForm.resetFields(); setEditingCatId(null); setCatModalOpen(true) }}>
            Gestionar Categorías
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nuevo Producto
          </Button>
        </Space>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 260 }}
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
            {categorias.map(c => (
              <Option key={c.id || c.Id} value={c.id || c.Id}>{c.nombre || c.Nombre}</Option>
            ))}
          </Select>
        </Col>
        <Col>
          <Select
            placeholder="Estado"
            allowClear
            style={{ width: 140 }}
            value={filtroActivo}
            onChange={setFiltroActivo}
          >
            <Option value={true}>Activo</Option>
            <Option value={false}>Inactivo</Option>
          </Select>
        </Col>
      </Row>

      <Table
        dataSource={productos}
        columns={columns}
        rowKey={r => r.id || r.Id}
        loading={loading}
        pagination={{ pageSize: 20, showTotal: t => `Total: ${t}` }}
        size="middle"
      />

      <Modal
        title={editingId ? 'Editar Producto' : 'Nuevo Producto'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText="Guardar"
        cancelText="Cancelar"
        width={540}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item label="Nombre" name="nombre" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Código" name="codigo">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Descripción" name="descripcion">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Precio" name="precio" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="$" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Unidad de medida" name="unidad">
                <Input placeholder="Ej: unidad, kg, hora..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item label="Categoría" name="idCategoria">
                <Select allowClear>
                  {categorias.map(c => (
                    <Option key={c.id || c.Id} value={c.id || c.Id}>{c.nombre || c.Nombre}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Activo" name="activo" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Gestionar Categorías"
        open={catModalOpen}
        onCancel={() => setCatModalOpen(false)}
        footer={null}
        width={480}
      >
        <Form form={catForm} layout="inline" style={{ marginBottom: 16 }} onFinish={handleSaveCategoria}>
          <Form.Item name="nombre" rules={[{ required: true, message: 'Requerido' }]}>
            <Input placeholder="Nombre de la categoría" />
          </Form.Item>
          <Form.Item name="color">
            <Input type="color" style={{ width: 48, padding: 2 }} defaultValue="#1677ff" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={savingCat} icon={<PlusOutlined />}>
              {editingCatId ? 'Actualizar' : 'Agregar'}
            </Button>
          </Form.Item>
          {editingCatId && (
            <Form.Item>
              <Button onClick={() => { setEditingCatId(null); catForm.resetFields() }}>Cancelar</Button>
            </Form.Item>
          )}
        </Form>
        <Table
          dataSource={categorias}
          rowKey={r => r.id || r.Id}
          pagination={false}
          size="small"
          columns={[
            {
              title: 'Nombre', key: 'nombre',
              render: (_, r) => (
                <Space>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: r.color || r.Color || '#1677ff' }} />
                  <span>{r.nombre || r.Nombre}</span>
                </Space>
              )
            },
            {
              title: '', key: 'acc', width: 90,
              render: (_, r) => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} onClick={() => {
                    setEditingCatId(r.id || r.Id)
                    catForm.setFieldsValue({ nombre: r.nombre || r.Nombre, color: r.color || r.Color })
                  }} />
                  <Popconfirm title="¿Eliminar?" onConfirm={() => handleDeleteCategoria(r.id || r.Id)} okText="Sí" cancelText="No">
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              )
            }
          ]}
        />
      </Modal>
    </div>
  )
}
