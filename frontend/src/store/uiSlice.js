import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    search: "",
    libDomain: "all",      // sidebar ↔ library
    libSub: null,
    drawer: { open: false, asset: null },
    toast: { msg: "", show: false },
  },
  reducers: {
    setSearch: (s, a) => { s.search = a.payload; },
    setLibDomain: (s, a) => { s.libDomain = a.payload; s.libSub = null; },
    setLibSub: (s, a) => { s.libSub = a.payload; },
    openDrawer: (s, a) => { s.drawer = { open: true, asset: a.payload }; },
    closeDrawer: (s) => { s.drawer.open = false; },
    setDrawerAsset: (s, a) => { if (s.drawer.asset && a.payload && s.drawer.asset.id === a.payload.id) s.drawer.asset = a.payload; },
    setToast: (s, a) => { s.toast = a.payload; },
  },
});

export const { setSearch, setLibDomain, setLibSub, openDrawer, closeDrawer, setDrawerAsset, setToast } = uiSlice.actions;
export default uiSlice.reducer;
