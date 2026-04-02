import React from 'react'
import { Modal, Form, Input, Button, Space } from 'antd'
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'

export default function PollCreator({ open, onSend, onCancel }) {
  const [form] = Form.useForm()

  const handleOk = () => {
    form.validateFields().then(vals => {
      const opciones = (vals.opciones || []).map(o => o?.texto).filter(Boolean)
      onSend({ pregunta: vals.pregunta, opciones })
      form.resetFields()
    })
  }

  return (
    <Modal title="Crear encuesta" open={open} onCancel={onCancel} onOk={handleOk} okText="Enviar">
      <Form form={form} layout="vertical">
        <Form.Item name="pregunta" label="Pregunta" rules={[{ required: true, message: 'Requerido' }]}>
          <Input placeholder="¿Cuál es tu pregunta?" />
        </Form.Item>
        <Form.List name="opciones" initialValue={[{ texto: '' }, { texto: '' }]}
          rules={[{
            validator: async (_, items) => {
              const filled = (items || []).filter(i => i?.texto)
              if (filled.length < 2) return Promise.reject('Mínimo 2 opciones')
            }
          }]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map(field => (
                <Form.Item key={field.key} label={`Opción ${field.name + 1}`}>
                  <Space>
                    <Form.Item {...field} name={[field.name, 'texto']} noStyle rules={[{ required: true, message: 'Requerido' }]}>
                      <Input placeholder={`Opción ${field.name + 1}`} />
                    </Form.Item>
                    {fields.length > 2 && (
                      <MinusCircleOutlined onClick={() => remove(field.name)} style={{ color: '#ff4d4f' }} />
                    )}
                  </Space>
                </Form.Item>
              ))}
              <Form.ErrorList errors={errors} />
              {fields.length < 12 && (
                <Button type="dashed" onClick={() => add({ texto: '' })} icon={<PlusOutlined />} block>
                  Agregar opción
                </Button>
              )}
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  )
}
