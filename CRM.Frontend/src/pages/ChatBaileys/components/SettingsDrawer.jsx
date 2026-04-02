import React, { useState, useEffect, useCallback } from 'react'
import {
  Drawer, Tabs, Input, Button, Select, Avatar, Upload, Switch, Spin, App
} from 'antd'
import {
  UserOutlined, LockOutlined, CameraOutlined, SaveOutlined
} from '@ant-design/icons'
import baileys from '../../../api/baileys'

const { TextArea } = Input

// ── Estilos WhatsApp dark theme ─────────────────────────────────────────────
const theme = {
  bg: '#111b21',
  text: '#e9edef',
  border: '#2a3942',
  accent: '#00a884',
  inputBg: '#2a3942',
  hoverBg: '#182229',
}

const inputStyle = {
  background: theme.inputBg,
  borderColor: theme.border,
  color: theme.text,
}

const labelStyle = {
  color: theme.text,
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 6,
  display: 'block',
}

// ── Privacy settings config ─────────────────────────────────────────────────
const PRIVACY_SETTINGS = [
  {
    key: 'lastSeen',
    label: 'Visto por ultima vez',
    description: 'Quien puede ver cuando estuviste en linea',
    options: [
      { value: 'all', label: 'Todos' },
      { value: 'contacts', label: 'Mis contactos' },
      { value: 'none', label: 'Nadie' },
    ],
  },
  {
    key: 'online',
    label: 'En linea',
    description: 'Quien puede ver cuando estas en linea',
    options: [
      { value: 'all', label: 'Todos' },
      { value: 'match_last_seen', label: 'Igual que visto por ultima vez' },
    ],
  },
  {
    key: 'profilePicture',
    label: 'Foto de perfil',
    description: 'Quien puede ver tu foto de perfil',
    options: [
      { value: 'all', label: 'Todos' },
      { value: 'contacts', label: 'Mis contactos' },
      { value: 'none', label: 'Nadie' },
    ],
  },
  {
    key: 'status',
    label: 'Estados',
    description: 'Quien puede ver tus estados',
    options: [
      { value: 'all', label: 'Todos' },
      { value: 'contacts', label: 'Mis contactos' },
      { value: 'none', label: 'Nadie' },
    ],
  },
  {
    key: 'readReceipts',
    label: 'Confirmacion de lectura',
    description: 'Tildes azules al leer mensajes',
    options: [
      { value: 'all', label: 'Activado' },
      { value: 'none', label: 'Desactivado' },
    ],
  },
  {
    key: 'groupsAdd',
    label: 'Grupos',
    description: 'Quien puede agregarte a grupos',
    options: [
      { value: 'all', label: 'Todos' },
      { value: 'contacts', label: 'Mis contactos' },
      { value: 'none', label: 'Nadie' },
    ],
  },
]

// ── Component ───────────────────────────────────────────────────────────────
export default function SettingsDrawer({ open, onClose, currentNumber }) {
  const { message } = App.useApp()

  // Profile state
  const [profilePic, setProfilePic] = useState(null)
  const [name, setName] = useState('')
  const [statusText, setStatusText] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  // Privacy state
  const [privacy, setPrivacy] = useState({
    lastSeen: 'all',
    online: 'all',
    profilePicture: 'all',
    status: 'all',
    readReceipts: 'all',
    groupsAdd: 'all',
  })
  const [savingPrivacy, setSavingPrivacy] = useState({})

  // ── Load profile pic on open ────────────────────────────────────────────
  const loadProfilePic = useCallback(async () => {
    if (!currentNumber) return
    setLoadingProfile(true)
    try {
      const { data } = await baileys.profilePic(currentNumber)
      setProfilePic(data?.url || data || null)
    } catch {
      setProfilePic(null)
    } finally {
      setLoadingProfile(false)
    }
  }, [currentNumber])

  useEffect(() => {
    if (open) loadProfilePic()
  }, [open, loadProfilePic])

  // ── Profile handlers ────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const promises = []
      if (name.trim()) promises.push(baileys.updateName(name.trim()))
      if (statusText.trim()) promises.push(baileys.updateStatus(statusText.trim()))

      if (promises.length === 0) {
        message.warning('No hay cambios para guardar')
        setSavingProfile(false)
        return
      }

      await Promise.all(promises)
      message.success('Perfil actualizado')
    } catch (err) {
      message.error('Error al actualizar perfil: ' + (err?.response?.data?.message || err.message))
    } finally {
      setSavingProfile(false)
    }
  }

  const handleUploadPic = async (file) => {
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1]
        await baileys.updateProfilePic(base64)
        message.success('Foto de perfil actualizada')
        loadProfilePic()
      } catch (err) {
        message.error('Error al subir foto: ' + (err?.response?.data?.message || err.message))
      }
    }
    reader.readAsDataURL(file)
    return false // prevent default upload
  }

  // ── Privacy handlers ────────────────────────────────────────────────────
  const handlePrivacyChange = async (setting, value) => {
    setSavingPrivacy((prev) => ({ ...prev, [setting]: true }))
    try {
      await baileys.updatePrivacy(setting, value)
      setPrivacy((prev) => ({ ...prev, [setting]: value }))
      message.success(`Privacidad de "${setting}" actualizada`)
    } catch (err) {
      message.error('Error al actualizar privacidad: ' + (err?.response?.data?.message || err.message))
    } finally {
      setSavingPrivacy((prev) => ({ ...prev, [setting]: false }))
    }
  }

  // ── Tab: Perfil ─────────────────────────────────────────────────────────
  const profileTab = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Avatar + Upload */}
      <div style={{ position: 'relative' }}>
        <Spin spinning={loadingProfile}>
          <Avatar
            size={120}
            src={profilePic}
            icon={<UserOutlined />}
            style={{
              border: `3px solid ${theme.accent}`,
              backgroundColor: theme.inputBg,
            }}
          />
        </Spin>
        <Upload
          showUploadList={false}
          accept="image/*"
          beforeUpload={handleUploadPic}
        >
          <Button
            type="primary"
            shape="circle"
            icon={<CameraOutlined />}
            size="small"
            style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              background: theme.accent,
              borderColor: theme.accent,
            }}
          />
        </Upload>
      </div>

      {/* Name */}
      <div style={{ width: '100%' }}>
        <label style={labelStyle}>Nombre</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre en WhatsApp"
          maxLength={25}
          style={inputStyle}
        />
      </div>

      {/* Status */}
      <div style={{ width: '100%' }}>
        <label style={labelStyle}>Estado</label>
        <TextArea
          value={statusText}
          onChange={(e) => setStatusText(e.target.value)}
          placeholder="Info / estado"
          maxLength={139}
          autoSize={{ minRows: 2, maxRows: 4 }}
          style={inputStyle}
        />
      </div>

      {/* Save */}
      <Button
        type="primary"
        icon={<SaveOutlined />}
        loading={savingProfile}
        onClick={handleSaveProfile}
        block
        style={{
          background: theme.accent,
          borderColor: theme.accent,
          height: 40,
          fontWeight: 600,
        }}
      >
        Guardar
      </Button>
    </div>
  )

  // ── Tab: Privacidad ─────────────────────────────────────────────────────
  const privacyTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {PRIVACY_SETTINGS.map(({ key, label, description, options }) => (
        <div
          key={key}
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: theme.hoverBg,
            border: `1px solid ${theme.border}`,
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: theme.text, fontWeight: 500, fontSize: 14 }}>
              {label}
            </span>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={{ color: '#8696a0', fontSize: 12 }}>
              {description}
            </span>
          </div>
          <Select
            value={privacy[key]}
            onChange={(val) => handlePrivacyChange(key, val)}
            loading={savingPrivacy[key]}
            disabled={savingPrivacy[key]}
            options={options}
            style={{ width: '100%' }}
            popupMatchSelectWidth
            dropdownStyle={{ background: theme.bg, borderColor: theme.border }}
          />
        </div>
      ))}
    </div>
  )

  // ── Tabs config ─────────────────────────────────────────────────────────
  const tabItems = [
    {
      key: 'profile',
      label: (
        <span style={{ color: theme.text }}>
          <UserOutlined style={{ marginRight: 6 }} />
          Perfil
        </span>
      ),
      children: profileTab,
    },
    {
      key: 'privacy',
      label: (
        <span style={{ color: theme.text }}>
          <LockOutlined style={{ marginRight: 6 }} />
          Privacidad
        </span>
      ),
      children: privacyTab,
    },
  ]

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Drawer
      title={
        <span style={{ color: theme.text, fontWeight: 600 }}>
          Configuracion
        </span>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width={380}
      styles={{
        header: {
          background: theme.bg,
          borderBottom: `1px solid ${theme.border}`,
        },
        body: {
          background: theme.bg,
          padding: '16px 20px',
        },
      }}
      closeIcon={
        <span style={{ color: theme.text, fontSize: 16 }}>x</span>
      }
    >
      <Tabs
        items={tabItems}
        defaultActiveKey="profile"
        centered
        style={{ color: theme.text }}
      />
    </Drawer>
  )
}
