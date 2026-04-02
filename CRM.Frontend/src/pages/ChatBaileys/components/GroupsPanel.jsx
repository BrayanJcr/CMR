import React, { useEffect, useState, useCallback } from 'react'
import {
  Drawer, List, Modal, Input, Button, Tag, Popconfirm, Tooltip,
  Space, Spin, Switch, Typography, Divider, App, Empty
} from 'antd'
import {
  ArrowLeftOutlined, PlusOutlined, TeamOutlined, CopyOutlined,
  UserAddOutlined, UserDeleteOutlined, CrownOutlined, LinkOutlined,
  LogoutOutlined, EditOutlined, LoadingOutlined, ReloadOutlined,
  LockOutlined, SoundOutlined
} from '@ant-design/icons'
import baileys from '../../../api/baileys'

const { Text, Paragraph } = Typography
const { TextArea } = Input

// ── Estilos del tema oscuro WhatsApp ─────────────────────────────────────────
const theme = {
  bg: '#111b21',
  card: '#202c33',
  border: '#2a3942',
  text: '#e9edef',
  textSecondary: '#8696a0',
  accent: '#00a884',
  danger: '#ea4335',
}

const drawerStyles = {
  header: { background: theme.bg, borderBottom: `1px solid ${theme.border}` },
  body: { background: theme.bg, padding: 0 },
  content: { background: theme.bg },
}

// ── Vista de detalle del grupo ───────────────────────────────────────────────
function GroupDetail({ groupId, onBack, messageApi }) {
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addNumbers, setAddNumbers] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState(null)

  const fetchMetadata = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await baileys.groupMetadata(groupId)
      setMeta(data)
      setNewName(data.subject || '')
      setNewDesc(data.desc || '')
    } catch {
      messageApi.error('Error al obtener metadatos del grupo')
    } finally {
      setLoading(false)
    }
  }, [groupId, messageApi])

  useEffect(() => { fetchMetadata() }, [fetchMetadata])

  const withAction = async (fn, successMsg) => {
    setActionLoading(true)
    try {
      await fn()
      messageApi.success(successMsg)
      await fetchMetadata()
    } catch (err) {
      messageApi.error(err?.response?.data?.message || 'Error al ejecutar la acción')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateName = () =>
    withAction(() => baileys.updateGroupSubject(groupId, newName), 'Nombre actualizado')
      .then(() => setEditingName(false))

  const handleUpdateDesc = () =>
    withAction(() => baileys.updateGroupDescription(groupId, newDesc), 'Descripción actualizada')
      .then(() => setEditingDesc(false))

  const handleAddParticipants = () => {
    const participants = addNumbers
      .split(',')
      .map(n => n.trim())
      .filter(Boolean)
    if (!participants.length) return
    withAction(
      () => baileys.addParticipants(groupId, participants),
      'Participantes agregados'
    ).then(() => {
      setAddModalOpen(false)
      setAddNumbers('')
    })
  }

  const handleRemove = (participantId) =>
    withAction(() => baileys.removeParticipants(groupId, [participantId]), 'Participante eliminado')

  const handlePromote = (participantId) =>
    withAction(() => baileys.promoteParticipants(groupId, [participantId]), 'Promovido a admin')

  const handleDemote = (participantId) =>
    withAction(() => baileys.demoteParticipants(groupId, [participantId]), 'Degradado a miembro')

  const handleGetInviteLink = async () => {
    try {
      const { data } = await baileys.groupInviteLink(groupId)
      setInviteLink(data)
      navigator.clipboard?.writeText(data)
      messageApi.success('Link copiado al portapapeles')
    } catch {
      messageApi.error('Error al obtener link de invitación')
    }
  }

  const handleLeaveGroup = () =>
    withAction(() => baileys.leaveGroup(groupId), 'Saliste del grupo')
      .then(() => onBack())

  const handleToggleSetting = (setting) =>
    withAction(() => baileys.groupSettings(groupId, setting), 'Configuración actualizada')

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: 40 }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 32, color: theme.accent }} />} />
      </div>
    )
  }

  if (!meta) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBack}
          style={{ color: theme.text, marginBottom: 16 }}>
          Volver
        </Button>
        <Empty description={<Text style={{ color: theme.textSecondary }}>No se pudo cargar el grupo</Text>} />
      </div>
    )
  }

  const isAnnounce = meta.announce === true || meta.announce === 'true'
  const isLocked = meta.restrict === true || meta.restrict === 'true'

  return (
    <div style={{ padding: '0 16px 16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 0', borderBottom: `1px solid ${theme.border}`, marginBottom: 16
      }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBack}
          style={{ color: theme.text }} />
        <div style={{ flex: 1 }}>
          <Text strong style={{ color: theme.text, fontSize: 16 }}>{meta.subject}</Text>
          <br />
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            {meta.participants?.length || 0} participantes
          </Text>
        </div>
        <Tooltip title="Recargar">
          <Button icon={<ReloadOutlined />} type="text" onClick={fetchMetadata}
            style={{ color: theme.textSecondary }} />
        </Tooltip>
      </div>

      {/* Nombre */}
      <div style={{
        background: theme.card, borderRadius: 8, padding: 16, marginBottom: 12,
        border: `1px solid ${theme.border}`
      }}>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>NOMBRE DEL GRUPO</Text>
        {editingName ? (
          <Space style={{ width: '100%', marginTop: 8 }}>
            <Input value={newName} onChange={e => setNewName(e.target.value)}
              style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}
              onPressEnter={handleUpdateName} />
            <Button type="primary" size="small" onClick={handleUpdateName}
              loading={actionLoading} style={{ background: theme.accent, borderColor: theme.accent }}>
              OK
            </Button>
            <Button size="small" onClick={() => { setEditingName(false); setNewName(meta.subject || '') }}
              style={{ borderColor: theme.border, color: theme.textSecondary }}>
              ✕
            </Button>
          </Space>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Text style={{ color: theme.text }}>{meta.subject}</Text>
            <Button icon={<EditOutlined />} type="text" size="small"
              onClick={() => setEditingName(true)} style={{ color: theme.accent }} />
          </div>
        )}
      </div>

      {/* Descripción */}
      <div style={{
        background: theme.card, borderRadius: 8, padding: 16, marginBottom: 12,
        border: `1px solid ${theme.border}`
      }}>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>DESCRIPCIÓN</Text>
        {editingDesc ? (
          <div style={{ marginTop: 8 }}>
            <TextArea rows={3} value={newDesc} onChange={e => setNewDesc(e.target.value)}
              style={{ background: theme.bg, borderColor: theme.border, color: theme.text, marginBottom: 8 }} />
            <Space>
              <Button type="primary" size="small" onClick={handleUpdateDesc}
                loading={actionLoading} style={{ background: theme.accent, borderColor: theme.accent }}>
                Guardar
              </Button>
              <Button size="small" onClick={() => { setEditingDesc(false); setNewDesc(meta.desc || '') }}
                style={{ borderColor: theme.border, color: theme.textSecondary }}>
                Cancelar
              </Button>
            </Space>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 4 }}>
            <Paragraph style={{ color: theme.text, margin: 0, flex: 1, whiteSpace: 'pre-wrap' }}>
              {meta.desc || '(sin descripción)'}
            </Paragraph>
            <Button icon={<EditOutlined />} type="text" size="small"
              onClick={() => setEditingDesc(true)} style={{ color: theme.accent }} />
          </div>
        )}
      </div>

      {/* Configuración */}
      <div style={{
        background: theme.card, borderRadius: 8, padding: 16, marginBottom: 12,
        border: `1px solid ${theme.border}`
      }}>
        <Text style={{ color: theme.textSecondary, fontSize: 12, display: 'block', marginBottom: 12 }}>
          CONFIGURACIÓN
        </Text>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Space>
            <SoundOutlined style={{ color: theme.textSecondary }} />
            <Text style={{ color: theme.text }}>Solo admins envían mensajes</Text>
          </Space>
          <Switch size="small" checked={isAnnounce}
            onChange={() => handleToggleSetting('announcement')}
            style={{ backgroundColor: isAnnounce ? theme.accent : undefined }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <LockOutlined style={{ color: theme.textSecondary }} />
            <Text style={{ color: theme.text }}>Solo admins editan info</Text>
          </Space>
          <Switch size="small" checked={isLocked}
            onChange={() => handleToggleSetting('locked')}
            style={{ backgroundColor: isLocked ? theme.accent : undefined }} />
        </div>
      </div>

      {/* Participantes */}
      <div style={{
        background: theme.card, borderRadius: 8, padding: 16, marginBottom: 12,
        border: `1px solid ${theme.border}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            PARTICIPANTES ({meta.participants?.length || 0})
          </Text>
          <Button icon={<UserAddOutlined />} type="text" size="small"
            onClick={() => setAddModalOpen(true)} style={{ color: theme.accent }}>
            Agregar
          </Button>
        </div>
        <List
          dataSource={meta.participants || []}
          size="small"
          renderItem={(p) => {
            const isAdmin = p.admin === 'admin' || p.admin === 'superadmin'
            return (
              <List.Item style={{ borderBottom: `1px solid ${theme.border}`, padding: '8px 0' }}
                actions={[
                  isAdmin ? (
                    <Tooltip title="Degradar a miembro" key="demote">
                      <Button icon={<CrownOutlined />} type="text" size="small"
                        onClick={() => handleDemote(p.id)}
                        style={{ color: '#faad14' }} />
                    </Tooltip>
                  ) : (
                    <Tooltip title="Promover a admin" key="promote">
                      <Button icon={<CrownOutlined />} type="text" size="small"
                        onClick={() => handlePromote(p.id)}
                        style={{ color: theme.textSecondary }} />
                    </Tooltip>
                  ),
                  <Popconfirm key="remove" title="¿Eliminar participante?"
                    onConfirm={() => handleRemove(p.id)}
                    okButtonProps={{ danger: true }} okText="Eliminar" cancelText="No">
                    <Button icon={<UserDeleteOutlined />} type="text" size="small"
                      style={{ color: theme.danger }} />
                  </Popconfirm>
                ]}>
                <List.Item.Meta
                  title={
                    <Space>
                      <Text style={{ color: theme.text }}>{p.id?.replace('@s.whatsapp.net', '')}</Text>
                      {isAdmin && (
                        <Tag color="gold" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                          {p.admin === 'superadmin' ? 'CREADOR' : 'ADMIN'}
                        </Tag>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )
          }}
        />
      </div>

      {/* Acciones */}
      <div style={{
        background: theme.card, borderRadius: 8, padding: 16, marginBottom: 12,
        border: `1px solid ${theme.border}`
      }}>
        <Text style={{ color: theme.textSecondary, fontSize: 12, display: 'block', marginBottom: 12 }}>
          ACCIONES
        </Text>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button icon={<LinkOutlined />} block
            onClick={handleGetInviteLink}
            style={{ background: theme.bg, borderColor: theme.border, color: theme.text, textAlign: 'left' }}>
            Obtener link de invitación
          </Button>
          {inviteLink && (
            <div style={{
              background: theme.bg, borderRadius: 6, padding: '8px 12px',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <Text style={{ color: theme.accent, fontSize: 12, flex: 1, wordBreak: 'break-all' }}>
                {inviteLink}
              </Text>
              <Tooltip title="Copiar">
                <Button icon={<CopyOutlined />} type="text" size="small"
                  onClick={() => { navigator.clipboard?.writeText(inviteLink); messageApi.success('Copiado') }}
                  style={{ color: theme.accent }} />
              </Tooltip>
            </div>
          )}
          <Popconfirm title="¿Seguro que querés salir del grupo?" okText="Salir" cancelText="No"
            okButtonProps={{ danger: true }} onConfirm={handleLeaveGroup}>
            <Button icon={<LogoutOutlined />} danger block
              style={{ background: theme.bg, borderColor: theme.danger, textAlign: 'left' }}>
              Salir del grupo
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {/* Modal agregar participantes */}
      <Modal
        title={<span style={{ color: theme.text, fontWeight: 600 }}>Agregar participantes</span>}
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); setAddNumbers('') }}
        onOk={handleAddParticipants}
        confirmLoading={actionLoading}
        okText="Agregar"
        cancelText="Cancelar"
        closeIcon={<span style={{ color: theme.textSecondary, fontSize: 16, lineHeight: 1 }}>✕</span>}
        okButtonProps={{ style: { background: theme.accent, borderColor: theme.accent } }}
        cancelButtonProps={{ style: { background: 'transparent', borderColor: theme.border, color: theme.textSecondary } }}
        styles={{
          content: { background: theme.card, boxShadow: '0 8px 32px rgba(0,0,0,.6)' },
          header: { background: theme.card, borderBottom: `1px solid ${theme.border}`, paddingBottom: 12 },
          footer: { background: theme.card, borderTop: `1px solid ${theme.border}` },
          body:   { paddingTop: 16 },
        }}
      >
        <Text style={{ color: theme.textSecondary, fontSize: 12, display: 'block', marginBottom: 8 }}>
          Números separados por coma, con código de país.
        </Text>
        <Input.TextArea
          rows={3}
          value={addNumbers}
          onChange={e => setAddNumbers(e.target.value)}
          placeholder="51999888777, 51999666555"
          className="baileys-modal-textarea"
          style={{ background: theme.bg, borderColor: theme.border, color: theme.text, borderRadius: 8 }}
        />
      </Modal>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function GroupsPanel({ open, onClose }) {
  const { message: messageApi } = App.useApp()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('list') // 'list' | 'detail'
  const [selectedGroupId, setSelectedGroupId] = useState(null)

  // Create group modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createParticipants, setCreateParticipants] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await baileys.groups()
      setGroups(Array.isArray(data) ? data : [])
    } catch {
      messageApi.error('Error al cargar los grupos')
    } finally {
      setLoading(false)
    }
  }, [messageApi])

  useEffect(() => {
    if (open) {
      setView('list')
      setSelectedGroupId(null)
      fetchGroups()
    }
  }, [open, fetchGroups])

  const handleCreateGroup = async () => {
    if (!createName.trim()) {
      messageApi.warning('Ingresá un nombre para el grupo')
      return
    }
    const participants = createParticipants
      .split(',')
      .map(n => n.trim())
      .filter(Boolean)
    if (!participants.length) {
      messageApi.warning('Ingresá al menos un participante')
      return
    }
    setCreateLoading(true)
    try {
      await baileys.createGroup(createName.trim(), participants)
      messageApi.success('Grupo creado')
      setCreateOpen(false)
      setCreateName('')
      setCreateParticipants('')
      await fetchGroups()
    } catch (err) {
      messageApi.error(err?.response?.data?.message || 'Error al crear el grupo')
    } finally {
      setCreateLoading(false)
    }
  }

  const openGroupDetail = (groupId) => {
    setSelectedGroupId(groupId)
    setView('detail')
  }

  return (
    <Drawer
      title={
        <Space>
          <TeamOutlined style={{ color: theme.accent }} />
          <span style={{ color: theme.text }}>Grupos de WhatsApp</span>
        </Space>
      }
      placement="right"
      width={420}
      open={open}
      onClose={onClose}
      styles={drawerStyles}
      closeIcon={<span style={{ color: theme.text }}>✕</span>}
    >
      {view === 'detail' && selectedGroupId ? (
        <GroupDetail
          groupId={selectedGroupId}
          onBack={() => { setView('list'); fetchGroups() }}
          messageApi={messageApi}
        />
      ) : (
        <div style={{ padding: 16 }}>
          {/* Botón crear grupo */}
          <Button
            icon={<PlusOutlined />}
            type="primary"
            block
            onClick={() => setCreateOpen(true)}
            style={{
              background: theme.accent, borderColor: theme.accent,
              height: 40, fontWeight: 500, marginBottom: 16
            }}
          >
            Crear grupo
          </Button>

          {/* Lista de grupos */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 28, color: theme.accent }} />} />
            </div>
          ) : groups.length === 0 ? (
            <Empty
              description={<Text style={{ color: theme.textSecondary }}>No se encontraron grupos</Text>}
              style={{ marginTop: 40 }}
            />
          ) : (
            <List
              dataSource={groups}
              renderItem={(group) => (
                <List.Item
                  onClick={() => openGroupDetail(group.id)}
                  style={{
                    cursor: 'pointer',
                    background: theme.card,
                    borderRadius: 8,
                    marginBottom: 8,
                    padding: '12px 16px',
                    border: `1px solid ${theme.border}`,
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = theme.accent}
                  onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: theme.accent + '22', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                      }}>
                        <TeamOutlined style={{ color: theme.accent, fontSize: 18 }} />
                      </div>
                    }
                    title={
                      <Text style={{ color: theme.text }} ellipsis>
                        {group.subject || group.name || group.id}
                      </Text>
                    }
                    description={
                      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                        {group.participants?.length ?? group.size ?? '?'} participantes
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      )}

      {/* Modal crear grupo */}
      <Modal
        title={<span style={{ color: theme.text, fontWeight: 600 }}>Crear grupo</span>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); setCreateName(''); setCreateParticipants('') }}
        onOk={handleCreateGroup}
        confirmLoading={createLoading}
        okText="Crear"
        cancelText="Cancelar"
        closeIcon={<span style={{ color: theme.textSecondary, fontSize: 16, lineHeight: 1 }}>✕</span>}
        okButtonProps={{ style: { background: theme.accent, borderColor: theme.accent } }}
        cancelButtonProps={{ style: { background: 'transparent', borderColor: theme.border, color: theme.textSecondary } }}
        styles={{
          content: { background: theme.card, boxShadow: '0 8px 32px rgba(0,0,0,.6)' },
          header: { background: theme.card, borderBottom: `1px solid ${theme.border}`, paddingBottom: 12 },
          footer: { background: theme.card, borderTop: `1px solid ${theme.border}` },
          body:   { paddingTop: 16 },
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 12, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Nombre del grupo
          </Text>
          <Input
            value={createName}
            onChange={e => setCreateName(e.target.value)}
            placeholder="Ej: Equipo de ventas"
            className="baileys-modal-input"
            style={{ background: theme.bg, borderColor: theme.border, color: theme.text, borderRadius: 8 }}
          />
        </div>
        <div>
          <Text style={{ color: theme.textSecondary, fontSize: 12, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Participantes
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 11, display: 'block', marginBottom: 6 }}>
            Números separados por coma, con código de país. Ej: 51939490460, 51912345678
          </Text>
          <Input.TextArea
            rows={3}
            value={createParticipants}
            onChange={e => setCreateParticipants(e.target.value)}
            placeholder="51999888777, 51999666555"
            className="baileys-modal-textarea"
            style={{ background: theme.bg, borderColor: theme.border, color: theme.text, borderRadius: 8 }}
          />
        </div>
      </Modal>
    </Drawer>
  )
}
