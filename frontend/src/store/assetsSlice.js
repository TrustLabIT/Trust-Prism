import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../api/client";

const buildQS = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v == null || v === "") return;
    if (Array.isArray(v)) { if (v.length) qs.set(k, v.join(",")); }
    else qs.set(k, v);
  });
  return qs.toString();
};

export const fetchAssets = createAsyncThunk("assets/fetch", async ({ params = {}, append = false } = {}) => {
  const key = buildQS(params);
  const res = await api.get("/assets?" + key);
  return { ...res, append, key };
});

export const fetchCounts = createAsyncThunk("assets/counts", async () => api.get("/assets/counts"));

export const fetchApprovals = createAsyncThunk("assets/approvals", async ({ from = "", to = "", q = "", limit = 20 } = {}) => {
  const qs = buildQS({ from, to, q, limit });
  return api.get("/assets/approvals" + (qs ? "?" + qs : ""));
});

export const confirmUpload = createAsyncThunk("assets/confirm", async (payload) => {
  const { asset } = await api.post("/assets/confirm", payload);
  return asset;
});

export const updateStatus = createAsyncThunk("assets/status", async ({ id, action }, thunkAPI) => {
  const { asset } = await api.patch(`/assets/${id}/status`, { action });
  thunkAPI.dispatch(fetchCounts());
  return asset;
});

export const updateAsset = createAsyncThunk("assets/update", async ({ id, patch }) => {
  const { asset } = await api.patch(`/assets/${id}`, patch);
  return asset;
});

export const deleteAsset = createAsyncThunk("assets/delete", async (id, thunkAPI) => {
  await api.del(`/assets/${id}`);
  thunkAPI.dispatch(fetchCounts());
  return id;
});

export const downloadAsset = createAsyncThunk("assets/download", async (id) => {
  const { url } = await api.get(`/assets/${id}/url`);
  return { id, url };
});

const replaceIn = (arr, a) => { const i = arr.findIndex((x) => x.id === a.id); if (i >= 0) arr[i] = a; };

const assetsSlice = createSlice({
  name: "assets",
  initialState: {
    items: [], page: 1, hasMore: false, total: 0, status: "idle", lastKey: null,
    counts: { total: 0, byDomain: {}, bySub: {}, inReview: 0 },
    approvals: { review: [], drafts: [], approvedDemand: [], flags: [], counts: { review: 0, drafts: 0, approvedDemand: 0, flags: 0 }, hasMore: false }, approvalsStatus: "idle",
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchAssets.pending, (s) => { s.status = "loading"; });
    b.addCase(fetchAssets.fulfilled, (s, a) => {
      s.status = "idle";
      s.items = a.payload.append ? [...s.items, ...a.payload.assets] : a.payload.assets;
      s.page = a.payload.page; s.hasMore = a.payload.hasMore; s.total = a.payload.total; s.lastKey = a.payload.key;
    });
    b.addCase(fetchAssets.rejected, (s) => { s.status = "failed"; });

    b.addCase(fetchCounts.fulfilled, (s, a) => { s.counts = a.payload; });

    b.addCase(fetchApprovals.pending, (s) => { s.approvalsStatus = "loading"; });
    b.addCase(fetchApprovals.fulfilled, (s, a) => { s.approvalsStatus = "idle"; s.approvals = a.payload; });

    b.addCase(confirmUpload.fulfilled, (s, a) => { s.items.unshift(a.payload); s.total += 1; });
    b.addCase(updateStatus.fulfilled, (s, a) => { replaceIn(s.items, a.payload); });
    b.addCase(updateAsset.fulfilled, (s, a) => { replaceIn(s.items, a.payload); });
    b.addCase(deleteAsset.fulfilled, (s, a) => { s.items = s.items.filter((x) => x.id !== a.payload); });
  },
});

export default assetsSlice.reducer;
