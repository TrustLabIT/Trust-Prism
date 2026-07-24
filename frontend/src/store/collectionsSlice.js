import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../api/client";

export const fetchCollections = createAsyncThunk("collections/fetch", async () => {
  const { collections } = await api.get("/collections?limit=100");
  return collections;
});

export const addCollection = createAsyncThunk("collections/add", async (payload) => {
  const { collection } = await api.post("/collections", payload);
  return collection;
});

const collectionsSlice = createSlice({
  name: "collections",
  initialState: { items: [], status: "idle", error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchCollections.pending, (s) => { s.status = "loading"; });
    b.addCase(fetchCollections.fulfilled, (s, a) => { s.status = "idle"; s.items = a.payload; });
    b.addCase(fetchCollections.rejected, (s, a) => { s.status = "failed"; s.error = a.error.message; });
    b.addCase(addCollection.fulfilled, (s, a) => { s.items.unshift(a.payload); });
  },
});

export default collectionsSlice.reducer;
