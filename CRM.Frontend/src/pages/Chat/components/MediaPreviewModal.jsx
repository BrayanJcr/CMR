import { Modal } from 'antd';

export default function MediaPreviewModal({ open, src, mimeType, onClose }) {
  const isVideo = mimeType?.startsWith('video/');
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width="80vw"
      styles={{ body: { padding: 0, display: 'flex', justifyContent: 'center', background: '#000' } }}
    >
      {isVideo
        ? <video src={src} controls style={{ maxWidth: '100%', maxHeight: '80vh' }} />
        : <img src={src} alt="preview" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
      }
    </Modal>
  );
}
