import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { accessService } from '../services/accessService';
import { ErrorStatusPage } from '../pages/ErrorStatusPage';

const AccessContext = createContext(null);

// Map tab FE -> key modul RBAC.
const TAB_MODULE = {
  'project-board': 'project',
  'data-survey': 'survey',
  bv: 'bv',
  rab: 'rab',
  'spk-client': 'spk_client',
  'spk-subcon': 'spk_subcon',
  finance: 'finance',
  'pengajuan-bayar': 'finance',
  'permintaan-bayar': 'finance',
  'pembayaran-supplier': 'finance',
  'invoice-supplier': 'finance',
  'pembayaran-jasa': 'finance',
  'invoice-jasa': 'finance',
  'pembayaran-finance': 'finance',
  'invoice-penjualan': 'finance',
  'invoice-operasional': 'finance',
  'buku-besar': 'finance',
  'transfer-bank': 'finance',
  'laporan-laba': 'finance',
  'po-material': 'purchasing',
  'habis-pakai': 'purchasing',
  setting: 'setting',
  'activity-log': 'audit',
};

export const AccessProvider = ({ children }) => {
  const [access, setAccess] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setReady(true); return; }
    let cancelled = false;
    accessService.getMyAccess()
      .then((response) => { if (!cancelled) setAccess(response.data || null); })
      .catch(() => { /* gagal muat -> fallback tampil semua, backend tetap menjaga */ })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => {
    const template = access?.template || null;
    const level = (module) => {
      if (!template) return 'MANAGE'; // belum termuat / OWNER / fallback
      return template[module] || 'NONE';
    };
    return {
      ready,
      template,
      projectScope: access?.projectScope ?? null,
      role: access?.role ?? null,
      level,
      can: (module, min = 'READ') => {
        const rank = { NONE: 0, READ: 1, MANAGE: 2 };
        return rank[level(module)] >= rank[min];
      },
      canTab: (tab) => {
        const module = TAB_MODULE[tab];
        if (!module) return true;
        return level(module) !== 'NONE';
      },
    };
  }, [access, ready]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
};

export const useAccess = () => useContext(AccessContext) || {
  ready: true, template: null, projectScope: null, role: null,
  level: () => 'MANAGE', can: () => true, canTab: () => true,
};

// Guard halaman untuk akses URL langsung: blok tab yang tidak punya akses.
const GUARD_MESSAGE = {
  project: 'Project', survey: 'Survey', design: 'Penawaran Desain', bv: 'Back Up Volume',
  rab: 'RAB Budgeting', spk_client: 'SPK Client', spk_subcon: 'SPK Subcon',
  finance: 'Finance', purchasing: 'Purchasing', setting: 'Setting', audit: 'Activity Log',
};

export const PageGuard = ({ tab, children }) => {
  const { ready, canTab } = useAccess();
  if (!ready) {
    return (
      <div className="auth-splash" style={{ height: '100%' }}>
        <div className="splash-logo" style={{ fontSize: '1rem' }}>DIVES CORP.</div>
        <div className="splash-spinner" />
      </div>
    );
  }
  if (!canTab(tab)) {
    return <ErrorStatusPage status={403} pageLabel={GUARD_MESSAGE[tab] || tab} />;
  }
  return children;
};
