import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../api/client";

export const fetchTemplates = createAsyncThunk("templates/fetch", async () => {
  const { templates } = await api.get("/templates?limit=100");
  return templates;
});

export const addTemplate = createAsyncThunk("templates/add", async (payload) => {
  const { template } = await api.post("/templates", payload);
  return template;
});

const templatesSlice = createSlice({
  name: "templates",
  initialState: { items: [], status: "idle", error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchTemplates.pending, (s) => { s.status = "loading"; });
    b.addCase(fetchTemplates.fulfilled, (s, a) => { s.status = "idle"; s.items = a.payload; });
    b.addCase(fetchTemplates.rejected, (s, a) => { s.status = "failed"; s.error = a.error.message; });
    b.addCase(addTemplate.fulfilled, (s, a) => { s.items.unshift(a.payload); });
  },
});

export default templatesSlice.reducer;
