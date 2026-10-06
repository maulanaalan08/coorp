import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Eye, FileDown, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { designQuotationService } from '../services/designQuotationService';
import { useDesignQuotations } from '../hooks/useDesignQuotations';
import styles from '../styles/DataSurvey.module.css';

const today = () => new Date().toISOString().slice(0, 10);

const money = (value) => `Rp ${Math.round(Number(value) || 0).toLocaleString('id-ID')}`;
const number = (value) => Number(value || 0).toLocaleString('id-ID', {
  maximumFractionDigits: 2,
});

const surveyVolume = (survey) => (survey?.areas || []).reduce(
  (areaTotal, area) => areaTotal + (area.dimensions || []).reduce(
    (dimensionTotal, dimension) => dimensionTotal + (Number(dimension.luasan) || 0),
    0,
  ),
  0,
);

const quotationTotal = (quotation) => {
  const subtotal = (Number(quotation.item3dVolume) || 0) * (Number(quotation.item3dPrice) || 0)
    + (Number(quotation.item2dVolume) || 0) * (Number(quotation.item2dPrice) || 0);
  return Math.max(0, subtotal - (Number(quotation.discount) || 0));
};

function DesignQuotationTab({ projectId, surveys = [], projectName = '' }) {
  const { quotations, loading, error, refresh, createQuotation } = useDesignQuotations(projectId);
  const [surveyId, setSurveyId] = useState('');
  const [volume, setVolume] = useState('');
  const [price3d, setPrice3d] = useState('');
  const [price2d, setPrice2d] = useState('');
  const [discount, setDiscount] = useState('0');
  const [quotationDate, setQuotationDate] = useState(today());
  const [saving, setSaving] = useState(false);

  const surveysWithVolume = useMemo(
    () => surveys.map((survey) => ({ ...survey, calculatedVolume: surveyVolume(survey) })),
    [surveys],
  );

  useEffect(() => {
    if (!surveysWithVolume.length) {
      setSurveyId('');
      setVolume('');
      return;
    }
    const current = surveysWithVolume.find((survey) => survey.id === surveyId);
    if (!current) {
      const first = surveysWithVolume[0];
      setSurveyId(first.id);
      setVolume(first.calculatedVolume > 0 ? String(first.calculatedVolume) : '');
    }
  }, [surveysWithVolume, surveyId]);

  const selectedSurvey = surveysWithVolume.find((survey) => survey.id === surveyId);
  const activeVolume = Number(volume) || 0;
  const previewSubtotal = activeVolume * (Number(price3d) || 0) + activeVolume * (Number(price2d) || 0);
  const previewTotal = Math.max(0, previewSubtotal - (Number(discount) || 0));

  const handleSurveyChange = (event) => {
    const nextId = event.target.value;
    const nextSurvey = surveysWithVolume.find((survey) => survey.id === nextId);
    setSurveyId(nextId);
    setVolume(nextSurvey?.calculatedVolume > 0 ? String(nextSurvey.calculatedVolume) : '');
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!projectId || activeVolume <= 0) {
      toast.error('Pilih survey dengan luasan atau isi volume manual.');
      return;
    }
    if ((Number(price3d) || 0) <= 0 || (Number(price2d) || 0) <= 0) {
      toast.error('Harga Design 3D dan DED harus diisi.');
      return;
    }

    setSaving(true);
    try {
      await createQuotation({
        surveyReportId: surveyId || undefined,
        volume: activeVolume,
        item3dPrice: Number(price3d),
        item2dPrice: Number(price2d),
        discount: Number(discount) || 0,
        quotationDate: quotationDate || undefined,
      });
      toast.success('Penawaran desain berhasil dibuat.');
      setPrice3d('');
      setPrice2d('');
      setDiscount('0');
    } catch (err) {
      toast.error(err.message || 'Gagal membuat penawaran desain.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.quotationLayout}>
      <form className={styles.quotationForm} onSubmit={handleCreate}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <div className={styles.titleAccent} />
            <div>
              <h3>Buat Penawaran Desain</h3>
              <p className={styles.quotationHint}>{projectName || 'Project terpilih'}</p>
            </div>
          </div>
        </div>

        <div className={styles.quotationFieldGrid}>
          <label className={styles.quotationField}>
            <span>Sumber Luasan Survey</span>
            <select value={surveyId} onChange={handleSurveyChange}>
              <option value="">Input volume manual</option>
              {surveysWithVolume.map((survey) => (
                <option key={survey.id} value={survey.id}>
                  {new Date(survey.surveyDate).toLocaleDateString('id-ID')} — {number(survey.calculatedVolume)} m²
                </option>
              ))}
            </select>
          </label>

          <label className={styles.quotationField}>
            <span>Volume Desain (m²)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={volume}
              onChange={(event) => setVolume(event.target.value)}
              placeholder="Otomatis dari survey"
            />
            {selectedSurvey && (
              <small>Terbaca dari {selectedSurvey.areas?.length || 0} area survey.</small>
            )}
          </label>

          <label className={styles.quotationField}>
            <span>Harga Design 3D / m²</span>
            <input type="number" min="0" step="1000" value={price3d} onChange={(event) => setPrice3d(event.target.value)} placeholder="Rp 0" required />
          </label>

          <label className={styles.quotationField}>
            <span>Harga DED / m²</span>
            <input type="number" min="0" step="1000" value={price2d} onChange={(event) => setPrice2d(event.target.value)} placeholder="Rp 0" required />
          </label>

          <label className={styles.quotationField}>
            <span>Diskon Nominal</span>
            <input type="number" min="0" step="1000" value={discount} onChange={(event) => setDiscount(event.target.value)} />
          </label>

          <label className={styles.quotationField}>
            <span>Tanggal Penawaran</span>
            <input type="date" value={quotationDate} onChange={(event) => setQuotationDate(event.target.value)} required />
          </label>
        </div>

        <div className={styles.quotationPreview}>
          <div><span>Volume</span><strong>{number(activeVolume)} m²</strong></div>
          <div><span>Subtotal</span><strong>{money(previewSubtotal)}</strong></div>
          <div className={styles.quotationGrandTotal}><span>Total Penawaran</span><strong>{money(previewTotal)}</strong></div>
        </div>

        <div className={styles.quotationOutputNote}>
          <Calculator size={16} /> Output: <strong>Design 3D</strong> dan <strong>DED (Gambar 2D)</strong>. Tidak ada spesifikasi material konstruksi.
        </div>

        <button className={styles.btnGold} type="submit" disabled={saving || !projectId}>
          <Plus size={16} /> {saving ? 'Menyimpan...' : 'Buat Penawaran'}
        </button>
      </form>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <div className={styles.titleAccent} />
            <h3>Riwayat Penawaran Desain</h3>
          </div>
          <button className={styles.btnOutline} type="button" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {error ? <p className={styles.quotationError}>{error}</p> : null}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>TANGGAL</th><th>VOLUME</th><th>HARGA 3D</th><th>HARGA DED</th><th>TOTAL</th><th>AKSI</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className={styles.noData}>Memuat penawaran...</td></tr>
              ) : quotations.length === 0 ? (
                <tr><td colSpan={6} className={styles.noData}>Belum ada penawaran desain.</td></tr>
              ) : quotations.map((quotation) => (
                <tr key={quotation.id}>
                  <td>{new Date(quotation.quotationDate).toLocaleDateString('id-ID')}</td>
                  <td>{number(quotation.item3dVolume)} m²</td>
                  <td>{money(quotation.item3dPrice)}</td>
                  <td>{money(quotation.item2dPrice)}</td>
                  <td style={{ color: '#e8c874', fontWeight: 700 }}>{money(quotationTotal(quotation))}</td>
                  <td><div className={styles.actionsCell}>
                    <a className={styles.btnIcon} href={designQuotationService.getPdfViewUrl(quotation.id)} target="_blank" rel="noopener noreferrer"><Eye size={14} /> PDF</a>
                    <a className={styles.btnGold} href={designQuotationService.getPdfDownloadUrl(quotation.id)} style={{ textDecoration: 'none', padding: '7px 12px', fontSize: '0.78rem' }}><FileDown size={13} /> Unduh</a>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default DesignQuotationTab;
