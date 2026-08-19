import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../store/authSlice";
import assetsReducer from "../store/assetsSlice";
import sharesReducer from "../store/sharesSlice";
import usersReducer from "../store/usersSlice";
import taxonomyReducer from "../store/taxonomySlice";
import uiReducer from "../store/uiSlice";

// TrustMark scope: auth, assets, shares, users and UI. The Collections/Templates/Brand Kit
// slices remain on disk but are no longer wired in.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    assets: assetsReducer,
    shares: sharesReducer,
    users: usersReducer,
    taxonomy: taxonomyReducer,
    ui: uiReducer,
  },
});
