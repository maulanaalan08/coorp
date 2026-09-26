import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Map, Link2, ExternalLink, Upload, X, Image as ImageIcon, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { surveyService } from '../services/surveyService';
import { compressImage } from '../utils/imageCompression';
import styles from '../styles/DataSurvey.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const STATUS_3D_OPTIONS = [
  { value: 'NOT_STARTED', label: 'Belum Dikerjakan' },
  { value: 'IN_PROGRESS', label: 'Sedang Dikerjakan' },
  { value: 'REVIEW', label: 'Menunggu Review' },
  { value: 'REVISION', label: 'Revisi' },
  { value: 'FINAL', label: 'Final' },
];

const STATUS_3D_LABEL = Object.fromEntries(STATUS_3D_OPTIONS.map((o) => [o.value, o.label]));

const STATUS_3D_COLOR = {
  NOT_STARTED: '#a89c85',
  IN_PROGRESS: '#c9a24b',
  REVIEW: '#7d6733',
  REVISION: '#e8c874',
  FINAL: '#4ade80',
};

const RESOURCE_TYPE_OPTIONS = [
  { value: 'GOOGLE_DRIVE', label: 'Google Drive' },
  { value: 'MODEL_3D', label: 'Model 3D' },
  { value: 'DOCUMENT', label: 'Dokumen' },
  { value: 'OTHER_LINK', label: 'Link Lainnya' },
];

const emptyResource = () => ({
  type: 'GOOGLE_DRIVE',
  title: '',
  url: '',
});

const normalizeLoadedResources = (data) => {
  if (Array.isArray(data.resources) && data.resources.length > 0) {
    return data.resources.map(({ id, type, title, url }) => ({ id, type, title, url }));
  }
  if (data.gdriveUrl) {
    return [{
      type: 'GOOGLE_DRIVE',
      title: 'Model 3D - Google Drive',
      url: data.gdriveUrl,
    }];
  }
  return [];
};

const Survey3DTab = ({ projectId }) => {
  const { user } = useAuth();
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'PERENCANA';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('NOT_STARTED');
  const [resources, setResources] = useState([]);
  const [notes, setNotes] = useState('');
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [newCaptions, setNewCaptions] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      setStatus('NOT_STARTED');
      setResources([]);
      setNotes('');
      setExistingImages([]);
      setNewFiles([]);
      setNewCaptions([]);
      return undefined;
    }
    setLoading(true);
    surveyService.get3dResult(projectId)
      .then((data) => {
        if (cancelled) return;
        setStatus(data.status || 'NOT_STARTED');
        setResources(normalizeLoadedResources(data));
        setNotes(data.notes || '');
        setExistingImages(Array.isArray(data.images) ? data.images : []);
        setNewFiles([]);
        setNewCaptions([]);
      })
      .catch(() => toast.error('Gagal memuat hasil desain 3D.'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const handleSelectNew = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (existingImages.length + newFiles.length + files.length > 20) {
      toast.error('Maksimal 20 gambar untuk satu hasil desain.');
      return;
    }
    setNewFiles((prev) => [...prev, ...files]);
    setNewCaptions((prev) => [...prev, ...files.map(() => '')]);
  };

  const handleRemoveNew = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewCaptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExisting = (id) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleAddResource = () => {
    if (resources.length >= 20) {
      toast.error('Maksimal 20 data pendukung untuk satu hasil desain.');
      return;
    }
    setResources((prev) => [...prev, emptyResource()]);
  };

  const handleUpdateResource = (index, field, value) => {
    setResources((prev) => prev.map((resource, resourceIndex) => (
      resourceIndex === index ? { ...resource, [field]: value } : resource
    )));
  };

  const handleRemoveResource = (index) => {
    setResources((prev) => prev.filter((_, resourceIndex) => resourceIndex !== index));
  };

  const handleSave = async () => {
    if (!projectId) return;
    const formData = new FormData();
    formData.append('survey3dData', JSON.stringify({
      status,
      notes: notes.trim() || '',
      resources: resources.map((resource) => ({
        type: resource.type,
        title: resource.title.trim(),
        url: resource.url.trim(),
      })),
      existingImages: existingImages.map((img) => ({ id: img.id, caption: img.caption || '' })),
    }));
    for (let i = 0; i < newFiles.length; i++) {
      try {
        const compressed = await compressImage(newFiles[i]);
        formData.append('images', compressed);
      } catch {
        formData.append('images', newFiles[i]);
      }
      formData.append(`caption_${i}`, newCaptions[i] || '');
    }
    setSaving(true);
    toast.promise(surveyService.save3dResult(projectId, formData), {
      loading: 'Menyimpan hasil desain 3D...',
      success: 'Hasil desain 3D tersimpan!',
      error: 'Gagal menyimpan hasil desain 3D.',
    }).then((data) => {
      setStatus(data.status || 'NOT_STARTED');
      setResources(normalizeLoadedResources(data));
      setNotes(data.notes || '');
      setExistingImages(Array.isArray(data.images) ? data.images : []);
      setNewFiles([]);
      setNewCaptions([]);
    }).catch(() => {}).finally(() => setSaving(false));
  };

  if (!projectId) {
    return (
      <div className={styles.section}>
        <p className={styles.noData}>Pilih project untuk melihat hasil desain 3D.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.section}>
        <p className={styles.noData}>
          <RefreshCw size={16} style={{ display: 'inline', marginRight: 8 }} />
          Memuat hasil desain 3D...
        </p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          <div className={styles.titleAccent} />
          <h3>Hasil Desain 3D</h3>
          <span
            className={styles.areaBadge}
            style={{ color: STATUS_3D_COLOR[status], borderColor: STATUS_3D_COLOR[status] }}
          >
            {STATUS_3D_LABEL[status] || status}
          </span>
        </div>
        {canEdit && (
          <button
            type="button"
            className={styles.btnGold}
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? <><RefreshCw size={14} className="button-spinner" /> Menyimpan...</>
              : <><Map size={14} /> Simpan Perubahan</>}
          </button>
        )}
      </div>

      <div className={styles.form3dRow}>
        <div className={styles.formGroup}>
          <label>Status Pengerjaan</label>
          {canEdit ? (
            <select
              className={styles.select3d}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_3D_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : (
            <div className={styles.select3d} style={{ opacity: 0.7 }}>{STATUS_3D_LABEL[status] || status}</div>
          )}
        </div>
        <div className={styles.formGroup}>
          <label>Catatan Desain</label>
          {canEdit ? (
            <textarea
              className={styles.input3d}
              rows={2}
              placeholder="Catatan untuk tim terkait hasil desain 3D..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          ) : (
            <div className={styles.select3d} style={{ opacity: 0.7, whiteSpace: 'pre-wrap' }}>{notes || '-'}</div>
          )}
        </div>
      </div>

      <div className={styles.resource3dSection}>
        <div className={styles.resource3dHeader}>
          <div>
            <span className={styles.resource3dEyebrow}>DATA PENDUKUNG ({resources.length}/20)</span>
            <p className={styles.resource3dHint}>Google Drive, file model 3D, dokumen, dan link lainnya.</p>
          </div>
          {canEdit && (
            <button type="button" className={styles.btnIcon} onClick={handleAddResource}>
              <Plus size={13} /> Tambah Data
            </button>
          )}
        </div>

        {resources.length > 0 ? (
          <div className={styles.resource3dList}>
            {resources.map((resource, index) => (
              <div key={resource.id || `resource-${index}`} className={styles.resource3dItem}>
                {canEdit ? (
                  <>
                    <span className={styles.resource3dNumber}>{index + 1}</span>
                    <select
                      className={styles.select3d}
                      value={resource.type}
                      aria-label={`Jenis data pendukung ${index + 1}`}
                      onChange={(e) => handleUpdateResource(index, 'type', e.target.value)}
                    >
                      {RESOURCE_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <input
                      className={styles.input3d}
                      value={resource.title}
                      maxLength={150}
                      placeholder="Judul data"
                      aria-label={`Judul data pendukung ${index + 1}`}
                      onChange={(e) => handleUpdateResource(index, 'title', e.target.value)}
                    />
                    <input
                      type="url"
                      className={styles.input3d}
                      value={resource.url}
                      placeholder="https://..."
                      aria-label={`URL data pendukung ${index + 1}`}
                      onChange={(e) => handleUpdateResource(index, 'url', e.target.value)}
                    />
                    {resource.url && (
                      <a
                        className={styles.resource3dOpen}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Buka link"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button
                      type="button"
                      className={styles.resource3dDelete}
                      onClick={() => handleRemoveResource(index)}
                      title="Hapus data"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className={styles.resource3dNumber}>{index + 1}</span>
                    <span className={styles.resource3dType}>
                      {RESOURCE_TYPE_OPTIONS.find((option) => option.value === resource.type)?.label || resource.type}
                    </span>
                    <div className={styles.resource3dReadOnly}>
                      <strong>{resource.title}</strong>
                      <span>{resource.url}</span>
                    </div>
                    <a
                      className={styles.resource3dOpen}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Buka link"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.resource3dEmpty}>
            <Link2 size={20} />
            <span>Belum ada data pendukung hasil desain 3D.</span>
          </div>
        )}
      </div>

      <div className={styles.formGroup} style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.72rem', color: '#7d6733', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em' }}>
            SCREENSHOT / RENDER 3D ({existingImages.length + newFiles.length}/20)
          </span>
          {canEdit && (
            <button type="button" className={styles.btnIcon} onClick={() => fileInputRef.current?.click()} style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
              <Upload size={12} /> Tambah Gambar
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleSelectNew}
        />
        {(existingImages.length > 0 || newFiles.length > 0) ? (
          <div className={styles.gallery3d}>
            {existingImages.map((img) => (
              <figure key={img.id} className={styles.gallery3dItem}>
                <div className={styles.gallery3dThumbWrap}>
                  <img
                    src={`${API_BASE}${img.url}`}
                    alt={img.caption || 'Screenshot 3D'}
                    className={styles.photoThumb}
                    onClick={() => setLightbox(`${API_BASE}${img.url}`)}
                  />
                  {canEdit && (
                    <button
                      type="button"
                      className={styles.gallery3dRemove}
                      title="Hapus gambar ini"
                      onClick={() => handleRemoveExisting(img.id)}
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
                {canEdit ? (
                  <input
                    className={styles.gallery3dCaptionInput}
                    value={img.caption || ''}
                    placeholder="Judul gambar"
                    onChange={(e) => setExistingImages((prev) => prev.map((item) => (
                      item.id === img.id ? { ...item, caption: e.target.value } : item
                    )))}
                  />
                ) : (
                  <figcaption className={styles.gallery3dCaption}>{img.caption || 'Tanpa judul'}</figcaption>
                )}
              </figure>
            ))}
            {newFiles.map((file, index) => (
              <figure key={`new-${index}`} className={styles.gallery3dItem}>
                <div className={styles.gallery3dThumbWrap}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className={styles.photoThumb}
                    onClick={() => setLightbox(URL.createObjectURL(file))}
                  />
                  <button
                    type="button"
                    className={styles.gallery3dRemove}
                    title="Batal tambah gambar ini"
                    onClick={() => handleRemoveNew(index)}
                  >
                    <X size={11} />
                  </button>
                </div>
                <input
                  className={styles.gallery3dCaptionInput}
                  value={newCaptions[index] || ''}
                  placeholder="Judul gambar"
                  onChange={(e) => setNewCaptions((prev) => prev.map((caption, i) => (
                    i === index ? e.target.value : caption
                  )))}
                />
              </figure>
            ))}
          </div>
        ) : (
          <div className={styles.gallery3dEmpty}>
            <ImageIcon size={22} />
            <span>Belum ada screenshot hasil desain 3D.</span>
          </div>
        )}
      </div>

      {lightbox && (
        <div className={styles.lightbox3d} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Screenshot 3D diperbesar" />
        </div>
      )}
    </div>
  );
};

export default Survey3DTab;
