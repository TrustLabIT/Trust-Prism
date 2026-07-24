import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../api/client";

export const fetchBrandKit = createAsyncThunk("brandKit/fetch", async () => {
  return api.get("/brandkit"); // { brandKit, canEdit }
});

export const updateBrandKit = createAsyncThunk("brandKit/update", async (payload) => {
  const { brandKit } = await api.put("/brandkit", payload);
  return brandKit;
});

export const uploadLogo = createAsyncThunk("brandKit/uploadLogo", async (formData) => {
  const { brandKit } = await api.postForm("/brandkit/logo", formData);
  return brandKit;
});

export const removeLogo = createAsyncThunk("brandKit/removeLogo", async (key) => {
  const { brandKit } = await api.del(`/brandkit/logo?key=${encodeURIComponent(key)}`);
  return brandKit;
});

const empty = { colors: [], fonts: { heading: "", body: "" }, logos: [] };

const brandKitSlice = createSlice({
  name: "brandKit",
  initialState: { kit: empty, canEdit: false, status: "idle", error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchBrandKit.pending, (s) => { s.status = "loading"; });
    b.addCase(fetchBrandKit.fulfilled, (s, a) => { s.status = "idle"; s.kit = a.payload.brandKit; s.canEdit = a.payload.canEdit; });
    b.addCase(fetchBrandKit.rejected, (s, a) => { s.status = "failed"; s.error = a.error.message; });
    b.addCase(updateBrandKit.fulfilled, (s, a) => { s.kit = a.payload; });
    b.addCase(uploadLogo.fulfilled, (s, a) => { s.kit = a.payload; });
    b.addCase(removeLogo.fulfilled, (s, a) => { s.kit = a.payload; });
  },
});

export default brandKitSlice.reducer;
