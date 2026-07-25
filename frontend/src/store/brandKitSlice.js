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

// ----- Brand documents (guideline PDFs) -----
export const fetchBrandDocs = createAsyncThunk("brandKit/fetchDocs", async ({ page = 1, append = false } = {}) => {
  const res = await api.get(`/brandkit/docs?page=${page}&limit=8`);
  return { ...res, append };
});

export const uploadBrandDoc = createAsyncThunk("brandKit/uploadDoc", async (formData) => {
  const { doc } = await api.postForm("/brandkit/docs", formData);
  return doc;
});

export const renameBrandDoc = createAsyncThunk("brandKit/renameDoc", async ({ id, name }) => {
  const { doc } = await api.patch(`/brandkit/docs/${id}`, { name });
  return doc;
});

export const deleteBrandDoc = createAsyncThunk("brandKit/deleteDoc", async (id) => {
  await api.del(`/brandkit/docs/${id}`);
  return id;
});

const empty = { colors: [], fonts: { heading: "", body: "" }, logos: [] };

const brandKitSlice = createSlice({
  name: "brandKit",
  initialState: {
    kit: empty, canEdit: false, status: "idle", error: null,
    docs: [], docsPage: 1, docsHasMore: false, docsTotal: 0, docsStatus: "idle",
  },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchBrandKit.pending, (s) => { s.status = "loading"; });
    b.addCase(fetchBrandKit.fulfilled, (s, a) => { s.status = "idle"; s.kit = a.payload.brandKit; s.canEdit = a.payload.canEdit; });
    b.addCase(fetchBrandKit.rejected, (s, a) => { s.status = "failed"; s.error = a.error.message; });
    b.addCase(updateBrandKit.fulfilled, (s, a) => { s.kit = a.payload; });
    b.addCase(uploadLogo.fulfilled, (s, a) => { s.kit = a.payload; });
    b.addCase(removeLogo.fulfilled, (s, a) => { s.kit = a.payload; });

    b.addCase(fetchBrandDocs.pending, (s) => { s.docsStatus = "loading"; });
    b.addCase(fetchBrandDocs.fulfilled, (s, a) => {
      s.docsStatus = "idle";
      s.docs = a.payload.append ? [...s.docs, ...a.payload.docs] : a.payload.docs;
      s.docsPage = a.payload.page; s.docsHasMore = a.payload.hasMore; s.docsTotal = a.payload.total;
      if (typeof a.payload.canEdit === "boolean") s.canEdit = a.payload.canEdit;
    });
    b.addCase(fetchBrandDocs.rejected, (s, a) => { s.docsStatus = "failed"; s.error = a.error.message; });
    b.addCase(uploadBrandDoc.fulfilled, (s, a) => { s.docs.unshift(a.payload); s.docsTotal += 1; });
    b.addCase(renameBrandDoc.fulfilled, (s, a) => { s.docs = s.docs.map((d) => (d.id === a.payload.id ? a.payload : d)); });
    b.addCase(deleteBrandDoc.fulfilled, (s, a) => { s.docs = s.docs.filter((d) => d.id !== a.payload); s.docsTotal = Math.max(0, s.docsTotal - 1); });
  },
});

export default brandKitSlice.reducer;
