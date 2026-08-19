import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../api/client";
import * as def from "../data/taxonomy";

// Seeded with the bundled defaults so the UI works before the live copy loads.
const initial = {
  domains: def.DOMAINS, statuses: def.STATUSES,
  channels: def.CHANNELS, dists: def.DISTS, audiences: def.AUDIENCES, campaigns: def.CAMPAIGNS,
  services: def.SERVICES, geos: def.GEOS, langs: def.LANGS, specs: def.SPECS,
  loaded: false,
};

export const fetchTaxonomy = createAsyncThunk("taxonomy/fetch", async () => api.get("/taxonomy"));
export const saveTaxonomy = createAsyncThunk("taxonomy/save", async (payload) => api.put("/taxonomy", payload));

const taxonomySlice = createSlice({
  name: "taxonomy",
  initialState: initial,
  reducers: {},
  extraReducers: (b) => {
    const apply = (s, a) => { Object.assign(s, a.payload); s.loaded = true; };
    b.addCase(fetchTaxonomy.fulfilled, apply);
    b.addCase(saveTaxonomy.fulfilled, apply);
  },
});

export default taxonomySlice.reducer;
