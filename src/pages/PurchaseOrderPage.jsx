import React, { useState, useMemo } from 'react';
import { Search, CheckCircle, Printer, ShoppingCart } from 'lucide-react';
import styles from '../styles/PurchaseOrderPage.module.css';
import Header from '../components/Header';
import { usePO } from '../hooks/usePO';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';

const fmtRp = (n) => 
  "Rp " + Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const PurchaseOrderPage = () => {
  const [search, setSearch] = useState('');
  const { pos, loading, error, approve, printPO } = usePO();

  const handleApprove = async (id) => {
    try {
      await approve(id);
      toast.success('PO berhasil di-approve!');
    } catch (err) {
      toast.error(err.message || 'Gagal menyetujui PO');
    }
  };

  const handlePrint = (id) => {
    poService.printPO(id); // Use direct service call or passed function
  };

  const filteredPOs = useMemo(() => {
    if (!search.trim()) return pos;
    const query = search.toLowerCase();
    return pos.filter(
      (po) =>
        po.nomorTransaksi?.toLowerCase().includes(query) ||
        po.supplier?.name?.toLowerCase().includes(query) ||
        po.itemName?.toLowerCase().includes(query)
    );
  }, [pos, search]);

  return (
    <div className={styles.poWrapper}>
      <Header />
      
      <main className={styles.content}>
        <header className={styles.header}>
          <h2 className={styles.title}>Purchase Orders (PO)</h2>
          <p className={styles.subtitle}>Daftar semua Purchase Order yang telah dibuat dari Finance.</p>
        </header>

        {loading ? (
          <div className={styles.emptyState}>
            <p>Memuat data PO...</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <p style={{ color: "#f87171" }}>{error}</p>
          </div>
        ) : (
          <div className={styles.tableSection}>
            <div className={styles.tableHeader}>
              <h3 className={styles.tableTitle}>Daftar PO</h3>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Cari No. PO, Supplier, Item..."
                  className={styles.searchInput}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.poTable}>
                <thead>
                  <tr>
                    <th>NO. PO</th>
                    <th>TANGGAL</th>
                    <th>TOKO / SUPPLIER</th>
                    <th>ITEM MATERIAL</th>
                    <th className={styles.cellRight}>QTY</th>
                    <th className={styles.cellRight}>HARGA DEAL</th>
                    <th className={styles.cellRight}>SUBTOTAL</th>
                    <th style={{ textAlign: 'center' }}>STATUS</th>
                    <th>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPOs.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#888" }}>
                        Tidak ada data PO ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredPOs.map((po) => {
                      const subTotal = Number(po.qty) * Number(po.hargaDeal);
                      const isApproved = po.status === 'approve' || po.status === 'APPROVED';

                      return (
                        <tr key={po.id}>
                          <td className={styles.cellMono}>{po.nomorTransaksi}</td>
                          <td>{new Date(po.tanggalPO).toLocaleDateString('id-ID')}</td>
                          <td>{po.supplier?.name || po.supplierId}</td>
                          <td>{po.itemName}</td>
                          <td className={`${styles.cellMono} ${styles.cellRight}`}>{po.qty}</td>
                          <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtRp(po.hargaDeal)}</td>
                          <td className={`${styles.cellMono} ${styles.cellRight}`}>{fmtRp(subTotal)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`${styles.statusBadge} ${isApproved ? styles.statusApproved : styles.statusPending}`}>
                              {isApproved ? 'Approved' : 'Belum Approve'}
                            </span>
                          </td>
                          <td>
                            <div className={styles.actionCell}>
                              {!isApproved && (
                                <button 
                                  className={styles.approveBtn}
                                  onClick={() => handleApprove(po.id)}
                                  title="Approve PO"
                                >
                                  <CheckCircle size={16} />
                                </button>
                              )}
                              <button 
                                className={styles.printBtn}
                                onClick={() => handlePrint(po.id)}
                                title="Cetak PDF"
                              >
                                <Printer size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PurchaseOrderPage;
