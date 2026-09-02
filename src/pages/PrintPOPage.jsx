import React, { useEffect, useState } from 'react';
import { poService } from '../services/poService';
import '../styles/PrintPO.css'; // Memasukkan CSS khusus print

const formatRupiah = (angka) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(angka || 0);
};

const PrintPOPage = ({ poId }) => {
  const [poData, setPoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPO = async () => {
      try {
        setLoading(true);
        const data = await poService.getPOById(poId);
        setPoData(data);
        
        // Auto-print if status is approved (optional)
        if (data && (data.status === 'approve' || data.status === 'APPROVED')) {
          setTimeout(() => {
            window.print();
          }, 1000);
        }
      } catch (err) {
        setError(err.message || 'Gagal mengambil data PO');
      } finally {
        setLoading(false);
      }
    };

    fetchPO();
  }, [poId]);

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: 'white' }}>Memuat data cetak...</div>;
  }

  if (error) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#ff6b6b' }}>Error: {error}</div>;
  }

  if (!poData) {
    return <div style={{ padding: '20px', textAlign: 'center', color: 'white' }}>Data PO tidak ditemukan.</div>;
  }

  // Handle both array of items (if bulk PO implemented later) or single item PO
  const items = poData.items || [
    {
      description: poData.itemName,
      qty: poData.qty,
      unit: poData.unit || '-', // Assuming backend might return unit later, otherwise fallback
      unitPrice: poData.hargaDeal,
      total: Number(poData.qty) * Number(poData.hargaDeal)
    }
  ];

  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="printBody">
      {/* Tombol Melayang untuk Print */}
      <button id="printBtn" onClick={() => window.print()}>
        🖨️ Simpan sebagai PDF / Print
      </button>

      <div className="a4-paper">
        {/* KOP SURAT */}
        <div className="header">
          <div className="logo-container">
            {/* Ganti dengan logo yang ada di public/ */}
            <img
              src="/logo.png"
              alt="Logo PT DIVES JAYA PERKASA"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://via.placeholder.com/200x80?text=LOGO+DIVES";
              }}
            />
          </div>
          <div className="company-info">
            <strong>PT DIVES JAYA PERKASA</strong><br />
            Jl. Pembangunan No. 88, Surabaya<br />
            Telp: (031) 1234567 | Email: finance@divesjaya.co.id
          </div>
        </div>

        <div className="title">PURCHASE ORDER (PO)</div>

        {/* INFO SUPPLIER & PO */}
        <div className="info-grid">
          <div className="info-box">
            <strong>Kepada Yth,</strong><br />
            <span>{poData.supplier?.name || poData.supplierId || "-"}</span><br />
            Alamat: <span>{poData.supplier?.address || "-"}</span><br />
            UP: <span>{poData.supplier?.contactName || "-"}</span>
          </div>
          <div className="info-box">
            <table style={{ border: "none", margin: 0, width: "100%", fontSize: "14px" }}>
              <tbody>
                <tr>
                  <td style={{ border: "none", padding: "2px", width: "40%" }}>
                    <strong>No. PO</strong>
                  </td>
                  <td style={{ border: "none", padding: "2px" }}>
                    : <span>{poData.nomorTransaksi}</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "none", padding: "2px" }}>
                    <strong>Tanggal</strong>
                  </td>
                  <td style={{ border: "none", padding: "2px" }}>
                    : <span>{new Date(poData.tanggalPO).toLocaleDateString("id-ID")}</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "none", padding: "2px" }}>
                    <strong>Status</strong>
                  </td>
                  <td style={{ border: "none", padding: "2px", textTransform: 'uppercase' }}>
                    : <span>{poData.status || "DRAFT"}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* TABEL BARANG */}
        <p style={{ fontSize: "14px" }}>
          Bersama surat ini, kami bermaksud memesan barang dengan rincian sebagai berikut:
        </p>
        <table className="poTable">
          <thead>
            <tr>
              <th width="5%">No</th>
              <th width="40%">Deskripsi Barang</th>
              <th width="10%">Qty</th>
              <th width="10%">Satuan</th>
              <th width="15%">Harga Satuan</th>
              <th width="20%">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="text-center">{index + 1}</td>
                <td>{item.description}</td>
                <td className="text-center">{item.qty}</td>
                <td className="text-center">{item.unit}</td>
                <td className="text-right">{formatRupiah(item.unitPrice)}</td>
                <td className="text-right">{formatRupiah(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="5" className="text-right">
                <strong>TOTAL KESELURUHAN</strong>
              </td>
              <td className="text-right">
                <strong>{formatRupiah(grandTotal)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>

        <p style={{ fontSize: "12px", fontStyle: "italic" }}>
          Catatan: Pembayaran dilakukan sesuai dengan kesepakatan setelah barang diterima di lokasi proyek.
        </p>

        {/* TANDA TANGAN */}
        <div className="signature-container">
          <div className="signature-box">
            Dibuat Oleh,<br /><br /><br />
            <div className="sign-line"></div>
            <strong>Purchasing</strong>
          </div>
          <div className="signature-box">
            Diperiksa Oleh,<br /><br /><br />
            <div className="sign-line"></div>
            <strong>Finance</strong>
          </div>
          <div className="signature-box">
            Disetujui Oleh,<br /><br /><br />
            <div className="sign-line"></div>
            <strong>Direktur Utama</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintPOPage;
