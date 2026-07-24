import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../api/client";

export const fetchShares = createAsyncThunk("shares/fetch", async () => {
  const { shares } = await api.get("/shares?limit=100");
  return shares;
});

export const addShare = createAsyncThunk("shares/add", async (payload) => {
  const { share } = await api.post("/shares", payload);
  return share;
});

const sharesSlice = createSlice({
  name: "shares",
  initialState: { items: [], status: "idle", error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchShares.pending, (s) => { s.status = "loading"; });
    b.addCase(fetchShares.fulfilled, (s, a) => { s.status = "idle"; s.items = a.payload; });
    b.addCase(fetchShares.rejected, (s, a) => { s.status = "failed"; s.error = a.error.message; });
    b.addCase(addShare.fulfilled, (s, a) => { s.items.unshift(a.payload); });
  },
});

export default sharesSlice.reducer;
