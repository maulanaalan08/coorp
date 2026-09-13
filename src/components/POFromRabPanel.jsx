import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Plus, Package, AlertCircle, Truck } from 'lucide-react';
import { poService } from '../services/poService';
import toast from 'react-hot-toast';
import styles from '../styles/POFromRabPanel.module.css';

const fmtRp = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const fmtVol = (n) => {
  const num = Number(n || 0);
  return isNaN(num) ? '0' : parseFloat(num.toFixed(2)).toString();
};

/**
 * Rencana PO turunan RAB. Item kebutuhan material yang belum terpenuhi
 * dikelompokkan per supplier, tiap grup bisa langsung dibuatkan PO.
 */
const POFromRabPanel = ({ projectId, onCreatePO }) => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [checked, setChecked] = useState({});

  const load = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const data = await poService.getPOPlan(projectId);
      setPlan(data);
      const init = {};
      (data?.suppliers || []).forEach((g) => {
        init[g.supplierId] = true;
      });
      setOpenGroups(init);
      setChecked({});
    } catch (err) {
      toast.error('Gagal memuat rencana PO dari RAB');
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const toggleGroup = (id) =>
    setOpenGroups((p) => ({ ...p, [id]: !p[id] }));

  const toggleItem = (key) =>
    setChecked((p) => ({ ...p, [key]: !p[key] }));

  const toggleAllGroup = (group, on) => {
    setChecked((p) => {
      const next = { ...p };
      group.items.forEach((it) => {
        next[`${group.supplierId}::${it.mrItemId}`] = on;
      });
      return next;
    });
  };

  const checkedCount = useMemo(
    () => Object.values(checked).filter(Boolean).length,
    [checked],
  );

  const groupedSelection = useMemo(() => {
    if (!plan?.suppliers) return [];
    const bySupplier = [];
    plan.suppliers.forEach((g) => {
      const picked = g.items.filter(
        (it) => checked[`${g.supplierId}::${it.mrItemId}`],
      );
      if (picked.length > 0) bySupplier.push({ ...g, picked });
    });
    return bySupplier;
  }, [plan, checked]);

  const handleCreate = () => {
    if (groupedSelection.length === 0) {
      toast.error('Pilih minimal 1 item dulu');
      return;
    }
    if (groupedSelection.length > 1) {
      toast.error(
        `Item terpilih berasal dari ${groupedSelection.length} supplier. Satu PO hanya untuk satu supplier — buat satu per satu.`,
      );
      return;
    }
    const g = groupedSelection[0];
    const selectedItems = g.picked.map((it) => ({
      mrItemId: it.mrItemId,
      id: it.mrItemId,
      itemName: it.itemName,
      unit: it.unit,
      estimatedVolume: it.estimatedVolume,
      orderedQty: it.orderedVolume,
      pricePerUnit: it.hargaSupplier || it.pricePerUnit,
      supplierId: g.supplierId,
    }));
    onCreatePO?.({ supplierId: g.supplierId, supplierName: g.supplierName, items: selectedItems });
  };

  if (!projectId) {
    return (
      <div className={styles.empty}>
        <Package size={40} className={styles.emptyIcon} />
        <h3>Pilih Project Terlebih Dahulu</h3>
        <p>Rencana PO disusun dari data RAB project.</p>
      </div>
    );
  }

  if (loading) return <p className={styles.loading}>⏳ Menyusun rencana PO dari RAB...</p>;

  if (!plan) return <p className={styles.loading}>Belum ada data rencana PO.</p>;

  const adaIsi = (plan.suppliers || []).length > 0 || (plan.belumAdaSupplier || []).length > 0;

  if (!adaIsi) {
    return (
      <div className={styles.empty}>
        <Package size={40} className={styles.emptyIcon} />
        <h3>Tidak Ada Kebutuhan Tertunda</h3>
        <p>Semua item material sudah terpenuhi PO-nya.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div>
          <h3 className={styles.title}>PO dari RAB — per Supplier</h3>
          <p className={styles.sub}>
            {plan.totalItemBelumTerpenuhi} item belum terpenuhi · {plan.jmlSupplier} supplier siap PO
            {plan.belumAdaSupplier?.length
              ? ` · ${plan.belumAdaSupplier.length} item belum punya supplier`
              : ''}
          </p>
        </div>
        <button
          type="button"
          className={styles.createBtn}
          onClick={handleCreate}
          style={checkedCount === 0 ? { opacity: 0.5 } : {}}
        >
          <Plus size={16} /> Buat PO ({checkedCount} item)
        </button>
      </div>

      {(plan.suppliers || []).map((g) => {
        const open = !!openGroups[g.supplierId];
        const allChecked = g.items.every(
          (it) => checked[`${g.supplierId}::${it.mrItemId}`],
        );
        return (
          <div key={g.supplierId} className={styles.group}>
            <div className={styles.groupHead}>
              <button
                type="button"
                className={styles.groupToggle}
                onClick={() => toggleGroup(g.supplierId)}
              >
                <ChevronRight
                  size={16}
                  className={styles.chev}
                  style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                />
                <Truck size={15} className={styles.truckIcon} />
                <span className={styles.supplierName}>{g.supplierName}</span>
                <span className={styles.pillGroup}>{g.items.length} item</span>
              </button>
              <div className={styles.groupRight}>
                <span className={styles.groupTotal}>{fmtRp(g.subTotal)}</span>
                <label className={styles.checkAll}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => toggleAllGroup(g, e.target.checked)}
                  />
                  pilih semua
                </label>
              </div>
            </div>

            {open && (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '34px' }} />
                      <th>ITEM</th>
                      <th>GRUP / PEKERJAAN</th>
                      <th className={styles.right}>SISA</th>
                      <th className={styles.right}>HARGA</th>
                      <th className={styles.right}>ESTIMASI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((it) => {
                      const key = `${g.supplierId}::${it.mrItemId}`;
                      return (
                        <tr key={it.mrItemId}>
                          <td>
                            <input
                              type="checkbox"
                              checked={!!checked[key]}
                              onChange={() => toggleItem(key)}
                            />
                          </td>
                          <td className={styles.itemName}>
                            {it.itemName}
                            {it.variantName ? (
                              <span className={styles.variant}> — {it.variantName}</span>
                            ) : null}
                          </td>
                          <td className={styles.groupCell}>
                            {[it.groupName, it.jobName].filter(Boolean).join(' ▸ ') || '-'}
                          </td>
                          <td className={styles.right}>
                            {fmtVol(it.sisa)} {it.unit}
                          </td>
                          <td className={styles.right}>{fmtRp(it.hargaSupplier)}</td>
                          <td className={styles.right}>{fmtRp(it.estimasiTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {(plan.belumAdaSupplier || []).length > 0 && (
        <div className={styles.warnBox}>
          <div className={styles.warnHead}>
            <AlertCircle size={15} /> {plan.belumAdaSupplier.length} item belum punya supplier
          </div>
          <p className={styles.warnSub}>
            Petakan item ini ke Master Supplier dulu supaya bisa masuk rencana PO.
          </p>
          <ul className={styles.warnList}>
            {plan.belumAdaSupplier.slice(0, 12).map((it) => (
              <li key={it.mrItemId}>
                {it.itemName} — {fmtVol(it.sisa)} {it.unit}
              </li>
            ))}
            {plan.belumAdaSupplier.length > 12 && (
              <li className={styles.more}>
                +{plan.belumAdaSupplier.length - 12} item lain
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default POFromRabPanel;
