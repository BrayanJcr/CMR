import React, { useState } from 'react'
import { Modal, Form, InputNumber, Button, Space } from 'antd'
import { AimOutlined } from '@ant-design/icons'

export default function LocationPicker({ open, onSend, onCancel }) {
  const [form]       = Form.useForm()
  const [detecting,  setDetecting] = useState(false)

  const detect = () => {
    setDetecting(true)
    navigator.geolocation?.getCurrentPosition(
      pos => {
        form.setFieldsValue({ lat: parseFloat(pos.coords.latitude.toFixed(6)), lng: parseFloat(pos.coords.longitude.toFixed(6)) })
        setDetecting(false)
      },
      () => setDetecting(false)
    )
  }

  const handleOk = () => {
    form.validateFields().then(vals => {
      onSend({ lat: vals.lat, lng: vals.lng })
      form.resetFields()
    })
  }

  return (
    <Modal
      title="Enviar ubicación"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Enviar"
    >
      <Form form={form} layout="vertical">
        <Space style={{ marginBottom: 12 }}>
          <Button icon={<AimOutlined />} onClick={detect} loading={detecting}>
            Usar mi ubicación
          </Button>
        </Space>
        <Form.Item name="lat" label="Latitud" rules={[{ required: true, message: 'Requerido' }]}>
          <InputNumber style={{ width: '100%' }} step={0.000001} />
        </Form.Item>
        <Form.Item name="lng" label="Longitud" rules={[{ required: true, message: 'Requerido' }]}>
          <InputNumber style={{ width: '100%' }} step={0.000001} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
