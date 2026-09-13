import { createContext, useContext } from "react";

/**
 * NavContext — jalur pintas navigasi dari mana saja (mis. notifikasi bell)
 * ke halaman tujuan, tanpa perlu prop-drilling lewat tiap halaman.
 * Provider dipasang di App, Header tinggal pakai useNav().
 */
export const NavContext = createContext(null);

export const useNav = () => {
  const nav = useContext(NavContext);
  // fallback aman: Header dipakai di luar App (harusnya tidak, tapi jaga-jaga)
  return nav || ((tab, projectId) => {
    if (tab) window.location.hash = tab;
  });
};
