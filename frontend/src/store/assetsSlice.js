import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../api/client";

const qs = (params) => {
  const p = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "all") p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : "";
};

// Library list — paginated + filtered. append=true keeps existing items (infinite scroll).
export const fetchAssets = createAsyncThunk("assets/fetch", async (params = {}) => {
  const { append, ...q } = params;
  const data = await api.get(`/assets${qs(q)}`);
  return { ...data, append: !!append };
});

export const fetchAssetStats = createAsyncThunk("assets/stats", async () => api.get("/assets/stats"));

export const fetchApprovals = createAsyncThunk("assets/approvals", async () => {
  const { assets } = await api.get("/assets?status=pending&limit=100");
  return assets;
});

export const fetchAnalytics = createAsyncThunk("assets/analytics", async () => api.get("/assets/analytics"));

export const uploadImage = createAsyncThunk("assets/upload", async (formData, thunkAPI) => {
  const { asset } = await api.postForm("/assets", formData);
  thunkAPI.dispatch(fetchAssetStats());
  thunkAPI.dispatch(fetchApprovals());
  return asset;
});

export const confirmUpload = createAsyncThunk("assets/confirmUpload", async (payload, thunkAPI) => {
  const { asset } = await api.confirm(payload);
  thunkAPI.dispatch(fetchAssetStats());
  thunkAPI.dispatch(fetchApprovals());
  return asset;
});

export const lodgeOutcome = createAsyncThunk("assets/lodge", async ({ id, outcome }) => {
  const { asset } = await api.post(`/assets/${id}/outcomes`, outcome);
  return asset;
});

export const removeOutcome = createAsyncThunk("assets/removeOutcome", async ({ id, index }) => {
  const path = index === undefined || index === null ? `/assets/${id}/outcomes` : `/assets/${id}/outcomes/${index}`;
  const { asset } = await api.del(path);
  return asset;
});

export const updateStatus = createAsyncThunk("assets/updateStatus", async ({ id, status }, thunkAPI) => {
  const { asset } = await api.patch(`/assets/${id}/status`, { status });
  thunkAPI.dispatch(fetchAssetStats());
  thunkAPI.dispatch(fetchApprovals());
  return asset;
});

export const updateAsset = createAsyncThunk("assets/update", async ({ id, patch }) => {
  const { asset } = await api.patch(`/assets/${id}`, patch);
  return asset;
});

export const replaceAssetFile = createAsyncThunk("assets/replaceFile", async ({ id, formData }) => {
  const { asset, reapproval } = await api.postForm(`/assets/${id}/file`, formData);
  return { asset, reapproval };
});

export const addComment = createAsyncThunk("assets/comment", async ({ id, text }) => {
  const { asset } = await api.post(`/assets/${id}/comments`, { text });
  return asset;
});

export const downloadAsset = createAsyncThunk("assets/download", async ({ id, reason }) => {
  const { url, asset } = await api.get(`/assets/${id}/url?reason=${encodeURIComponent(reason || "")}`);
  return { url, asset };
});

export const deleteAsset = createAsyncThunk("assets/delete", async (id, thunkAPI) => {
  await api.del(`/assets/${id}`);
  thunkAPI.dispatch(fetchAssetStats());
  return id;
});

const replaceIn = (list, asset) => {
  const i = list.findIndex((a) => a.id === asset.id);
  if (i !== -1) list[i] = asset;
};

// A stable key for a library query — used to skip refetching the same view
export const keyOf = (p = {}) =>
  [p.cat || "all", p.sub || "all", p.year || "all", p.search || "", p.collection || ""].join("|");

const assetsSlice = createSlice({
  name: "assets",
  initialState: {
    items: [], total: 0, page: 1, hasMore: false, status: "idle", error: null,
    lastKey: null,
    stats: { total: 0, pending: 0 },
    approvals: [],
    analytics: { total: 0, top: [], downloads30d: 0, downloadsDeltaPct: null, activeUsers: 0, avgApprovalDays: null, topDownloaded: [], staleCount: 0, taggedPct: 0, pending: 0 },
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchAssets.pending, (s) => { s.status = "loading"; });
    b.addCase(fetchAssets.fulfilled, (s, a) => {
      s.status = "idle";
      s.items = a.payload.append ? s.items.concat(a.payload.assets) : a.payload.assets;
      s.total = a.payload.total; s.page = a.payload.page; s.hasMore = a.payload.hasMore;
      if (!a.payload.append) s.lastKey = keyOf(a.meta.arg);
    });
    b.addCase(fetchAssets.rejected, (s, a) => { s.status = "failed"; s.error = a.error.message; });
    b.addCase(fetchAssetStats.fulfilled, (s, a) => { s.stats = a.payload; });
    b.addCase(fetchApprovals.fulfilled, (s, a) => { s.approvals = a.payload; });
    b.addCase(fetchAnalytics.fulfilled, (s, a) => { s.analytics = a.payload; });
    b.addCase(uploadImage.fulfilled, (s, a) => { s.items.unshift(a.payload); s.total += 1; });
    b.addCase(confirmUpload.fulfilled, (s, a) => { s.items.unshift(a.payload); s.total += 1; });
    b.addCase(lodgeOutcome.fulfilled, (s, a) => { replaceIn(s.items, a.payload); replaceIn(s.approvals, a.payload); });
    b.addCase(removeOutcome.fulfilled, (s, a) => { replaceIn(s.items, a.payload); replaceIn(s.approvals, a.payload); });
    b.addCase(updateStatus.fulfilled, (s, a) => { replaceIn(s.items, a.payload); });
    b.addCase(updateAsset.fulfilled, (s, a) => { replaceIn(s.items, a.payload); replaceIn(s.approvals, a.payload); });
    b.addCase(replaceAssetFile.fulfilled, (s, a) => { replaceIn(s.items, a.payload.asset); replaceIn(s.approvals, a.payload.asset); });
    b.addCase(downloadAsset.fulfilled, (s, a) => { if (a.payload.asset) replaceIn(s.items, a.payload.asset); });
    b.addCase(addComment.fulfilled, (s, a) => { replaceIn(s.items, a.payload); replaceIn(s.approvals, a.payload); });
    b.addCase(deleteAsset.fulfilled, (s, a) => { s.items = s.items.filter((x) => x.id !== a.payload); s.total = Math.max(0, s.total - 1); });
  },
});

export default assetsSlice.reducer;
