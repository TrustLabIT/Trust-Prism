import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../api/client";

export const fetchShares = createAsyncThunk("shares/fetch", async ({ params = {}, append = false } = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "" && v !== "any") qs.set(k, v); });
  const res = await api.get("/shares?" + qs.toString());
  return { ...res, append };
});

export const addShare = createAsyncThunk("shares/add", async (payload) => {
  const { share } = await api.post("/shares", payload);
  return share;
});

export const updateShare = createAsyncThunk("shares/update", async ({ id, patch }) => {
  const { share } = await api.patch(`/shares/${id}`, patch);
  return share;
});

export const removeShare = createAsyncThunk("shares/remove", async (id) => {
  await api.del(`/shares/${id}`);
  return id;
});

const sharesSlice = createSlice({
  name: "shares",
  initialState: { items: [], page: 1, hasMore: false, total: 0, status: "idle", error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchShares.pending, (s) => { s.status = "loading"; });
    b.addCase(fetchShares.fulfilled, (s, a) => {
      s.status = "idle";
      s.items = a.payload.append ? [...s.items, ...a.payload.shares] : a.payload.shares;
      s.page = a.payload.page; s.hasMore = a.payload.hasMore; s.total = a.payload.total;
    });
    b.addCase(fetchShares.rejected, (s, a) => { s.status = "failed"; s.error = a.error.message; });
    b.addCase(addShare.fulfilled, (s, a) => { s.items.unshift(a.payload); s.total += 1; });
    b.addCase(updateShare.fulfilled, (s, a) => { const i = s.items.findIndex((x) => x.id === a.payload.id); if (i >= 0) s.items[i] = a.payload; });
    b.addCase(removeShare.fulfilled, (s, a) => { s.items = s.items.filter((x) => x.id !== a.payload); s.total = Math.max(0, s.total - 1); });
  },
});

export default sharesSlice.reducer;
