import { createSlice } from "@reduxjs/toolkit";
import { lodgeOutcome, updateStatus, updateAsset } from "./assetsSlice";

const CLOSED_MODALS = {
  upload: false, collection: false, editor: false,
  user: false, share: false, download: false, editAsset: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    searchTerm: "",
    drawer: { open: false, asset: null, tab: "details" },
    modals: { ...CLOSED_MODALS },
    modalData: {},
    toast: { msg: "", show: false },
  },
  reducers: {
    setSearchTerm: (s, a) => { s.searchTerm = a.payload; },
    openDrawer: (s, a) => { s.drawer = { open: true, asset: a.payload.asset, tab: a.payload.tab || "details" }; },
    closeDrawer: (s) => { s.drawer.open = false; },
    setDrawerTab: (s, a) => { s.drawer.tab = a.payload; },
    openModal: (s, a) => { s.modalData = a.payload.data || {}; s.modals = { ...CLOSED_MODALS, [a.payload.name]: true }; },
    closeModal: (s, a) => { s.modals[a.payload] = false; },
    closeAllModals: (s) => { s.modals = { ...CLOSED_MODALS }; },
    setToast: (s, a) => { s.toast = a.payload; },
  },
  extraReducers: (b) => {
    // keep the open drawer's asset fresh after a mutation
    const refresh = (s, a) => { if (s.drawer.asset && s.drawer.asset.id === a.payload.id) s.drawer.asset = a.payload; };
    b.addCase(lodgeOutcome.fulfilled, refresh);
    b.addCase(updateStatus.fulfilled, refresh);
    b.addCase(updateAsset.fulfilled, refresh);
  },
});

export const {
  setSearchTerm, openDrawer, closeDrawer, setDrawerTab,
  openModal, closeModal, closeAllModals, setToast,
} = uiSlice.actions;

// Toast with auto-dismiss (thunk so the timer lives outside the reducer)
let toastTimer;
export const toast = (msg) => (dispatch) => {
  dispatch(setToast({ msg, show: true }));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dispatch(setToast({ msg, show: false })), 2200);
};

export default uiSlice.reducer;
