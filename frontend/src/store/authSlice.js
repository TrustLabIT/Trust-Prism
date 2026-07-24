import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api, getToken, setToken } from "../api/client";

export const login = createAsyncThunk("auth/login", async ({ email, password }) => {
  const { token, user } = await api.login(email, password);
  setToken(token);
  return { token, user };
});

export const fetchMe = createAsyncThunk("auth/fetchMe", async () => {
  const { user } = await api.me();
  return user;
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    token: getToken(),
    status: "idle",     // idle | loading | failed
    error: null,
  },
  reducers: {
    logout(state) {
      setToken(null);
      state.user = null;
      state.token = null;
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(login.pending, (s) => { s.status = "loading"; s.error = null; });
    b.addCase(login.fulfilled, (s, a) => { s.status = "idle"; s.user = a.payload.user; s.token = a.payload.token; });
    b.addCase(login.rejected, (s, a) => { s.status = "failed"; s.error = a.error.message; });
    b.addCase(fetchMe.fulfilled, (s, a) => { s.user = a.payload; });
    b.addCase(fetchMe.rejected, (s) => { setToken(null); s.user = null; s.token = null; });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
