import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../api/client";

export const fetchUsers = createAsyncThunk("users/fetch", async () => {
  const { users } = await api.get("/users?limit=100");
  return users;
});

export const addUser = createAsyncThunk("users/add", async (payload) => {
  // returns { user, tempPassword }
  return api.post("/users", payload);
});

export const toggleScope = createAsyncThunk("users/toggleScope", async (id) => {
  const { user } = await api.patch(`/users/${id}/scope`);
  return user;
});

export const updateUser = createAsyncThunk("users/update", async ({ id, patch }) => {
  const { user } = await api.patch(`/users/${id}`, patch);
  return user;
});

export const setPassword = createAsyncThunk("users/setPassword", async ({ id, password }) => {
  const { user } = await api.patch(`/users/${id}/password`, { password });
  return user;
});

export const removeUser = createAsyncThunk("users/remove", async (id) => {
  await api.del(`/users/${id}`);
  return id;
});

const usersSlice = createSlice({
  name: "users",
  initialState: { items: [], status: "idle", error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchUsers.pending, (s) => { s.status = "loading"; });
    b.addCase(fetchUsers.fulfilled, (s, a) => { s.status = "idle"; s.items = a.payload; });
    b.addCase(fetchUsers.rejected, (s, a) => { s.status = "failed"; s.error = a.error.message; });
    b.addCase(addUser.fulfilled, (s, a) => { s.items.push(a.payload.user); });
    b.addCase(toggleScope.fulfilled, (s, a) => {
      const i = s.items.findIndex((u) => u.id === a.payload.id);
      if (i !== -1) s.items[i] = a.payload;
    });
    b.addCase(updateUser.fulfilled, (s, a) => {
      const i = s.items.findIndex((u) => u.id === a.payload.id);
      if (i !== -1) s.items[i] = a.payload;
    });
    b.addCase(setPassword.fulfilled, (s, a) => {
      const i = s.items.findIndex((u) => u.id === a.payload.id);
      if (i !== -1) s.items[i] = a.payload;
    });
    b.addCase(removeUser.fulfilled, (s, a) => { s.items = s.items.filter((u) => u.id !== a.payload); });
  },
});

export default usersSlice.reducer;
