import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../store/authSlice";
import assetsReducer from "../store/assetsSlice";
import collectionsReducer from "../store/collectionsSlice";
import usersReducer from "../store/usersSlice";
import sharesReducer from "../store/sharesSlice";
import templatesReducer from "../store/templatesSlice";
import brandKitReducer from "../store/brandKitSlice";
import uiReducer from "../store/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    assets: assetsReducer,
    collections: collectionsReducer,
    users: usersReducer,
    shares: sharesReducer,
    templates: templatesReducer,
    brandKit: brandKitReducer,
    ui: uiReducer,
  },
});
