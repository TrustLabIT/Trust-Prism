// Thin facade over the Redux store so existing components keep the same API
// (useApp). All state now lives in Redux Toolkit slices; this hook just wires
// selectors + dispatch. New auth/asset actions are exposed here too.
import { useSelector, useDispatch } from "react-redux";
import {
  setSearchTerm, openDrawer, closeDrawer, setDrawerTab,
  openModal, closeModal, closeAllModals, toast as toastThunk,
} from "../store/uiSlice";
import {
  fetchCollections as fetchCollectionsThunk, addCollection as addCollectionThunk,
} from "../store/collectionsSlice";
import {
  fetchShares as fetchSharesThunk, addShare as addShareThunk, removeShare as removeShareThunk,
} from "../store/sharesSlice";
import {
  fetchTemplates as fetchTemplatesThunk, addTemplate as addTemplateThunk,
} from "../store/templatesSlice";
import {
  fetchBrandKit as fetchBrandKitThunk, updateBrandKit as updateBrandKitThunk,
  uploadLogo as uploadLogoThunk, removeLogo as removeLogoThunk,
  fetchBrandDocs as fetchBrandDocsThunk, uploadBrandDoc as uploadBrandDocThunk,
  renameBrandDoc as renameBrandDocThunk, deleteBrandDoc as deleteBrandDocThunk,
} from "../store/brandKitSlice";
import { api } from "../api/client";
import {
  fetchUsers as fetchUsersThunk, addUser as addUserThunk,
  toggleScope as toggleScopeThunk, removeUser as removeUserThunk,
  setPassword as setPasswordThunk, updateUser as updateUserThunk,
} from "../store/usersSlice";
import {
  fetchAssets as fetchAssetsThunk, fetchAssetStats as fetchAssetStatsThunk,
  fetchApprovals as fetchApprovalsThunk, fetchAnalytics as fetchAnalyticsThunk,
  uploadImage, confirmUpload as confirmUploadThunk,
  lodgeOutcome as lodgeThunk, removeOutcome as removeOutcomeThunk, updateStatus as updateStatusThunk,
  updateAsset as updateAssetThunk, replaceAssetFile as replaceAssetFileThunk, addComment as addCommentThunk,
  downloadAsset as downloadAssetThunk, deleteAsset,
} from "../store/assetsSlice";
import { login as loginThunk, logout as logoutAction } from "../store/authSlice";

const GUEST = { name: "", role: "", org: "Internal", scope: "all", type: "Internal" };

export function useApp() {
  const dispatch = useDispatch();

  const assets = useSelector((s) => s.assets.items);
  const assetsStatus = useSelector((s) => s.assets.status);
  const hasMore = useSelector((s) => s.assets.hasMore);
  const assetPage = useSelector((s) => s.assets.page);
  const assetsKey = useSelector((s) => s.assets.lastKey);
  const assetStats = useSelector((s) => s.assets.stats);
  const approvals = useSelector((s) => s.assets.approvals);
  const analytics = useSelector((s) => s.assets.analytics);
  const collections = useSelector((s) => s.collections.items);
  const users = useSelector((s) => s.users.items);
  const shares = useSelector((s) => s.shares.items);
  const templates = useSelector((s) => s.templates.items);
  const brandKit = useSelector((s) => s.brandKit.kit);
  const brandCanEdit = useSelector((s) => s.brandKit.canEdit);
  const brandDocs = useSelector((s) => s.brandKit.docs);
  const brandDocsHasMore = useSelector((s) => s.brandKit.docsHasMore);
  const brandDocsTotal = useSelector((s) => s.brandKit.docsTotal);
  const brandDocsPage = useSelector((s) => s.brandKit.docsPage);
  const brandDocsStatus = useSelector((s) => s.brandKit.docsStatus);
  // agencies = distinct external orgs, derived from the users list
  const agencies = [...new Set(users.filter((u) => u.type === "External").map((u) => u.org))];
  const currentUser = useSelector((s) => s.auth.user) || GUEST;
  const authStatus = useSelector((s) => s.auth.status);
  const authError = useSelector((s) => s.auth.error);
  const searchTerm = useSelector((s) => s.ui.searchTerm);
  const drawer = useSelector((s) => s.ui.drawer);
  const modals = useSelector((s) => s.ui.modals);
  const modalData = useSelector((s) => s.ui.modalData);
  const toastState = useSelector((s) => s.ui.toast);

  const isSuperAdmin = currentUser.role === "Super Admin";
  const canSeeAll = currentUser.scope === "all";
  const canSee = (org) => canSeeAll || org === currentUser.org;

  return {
    // data
    assets, assetsStatus, hasMore, assetPage, assetsKey, assetStats, approvals, analytics,
    collections, users, shares, templates, agencies,
    // access
    currentUser, isSuperAdmin, canSeeAll, canSee,
    // search
    searchTerm, setSearchTerm: (v) => dispatch(setSearchTerm(v)),
    // toast
    toast: (m) => dispatch(toastThunk(m)), toastMsg: toastState.msg, toastShow: toastState.show,
    // drawer
    drawer,
    openDrawer: (asset, tab) => dispatch(openDrawer({ asset, tab })),
    closeDrawer: () => dispatch(closeDrawer()),
    setDrawerTab: (t) => dispatch(setDrawerTab(t)),
    // modals
    modals, modalData,
    openModal: (name, data) => dispatch(openModal({ name, data })),
    closeModal: (name) => dispatch(closeModal(name)),
    closeAllModals: () => dispatch(closeAllModals()),
    // asset mutations + loading (API-backed)
    lodgeOutcome: (id, rec) => dispatch(lodgeThunk({ id, outcome: rec })).unwrap(),
    removeOutcome: (id, index) => dispatch(removeOutcomeThunk({ id, index })).unwrap(),
    uploadImage: (form) => dispatch(uploadImage(form)).unwrap(),
    confirmUpload: (payload) => dispatch(confirmUploadThunk(payload)).unwrap(),
    updateStatus: (id, status) => dispatch(updateStatusThunk({ id, status })).unwrap(),
    updateAsset: (id, patch) => dispatch(updateAssetThunk({ id, patch })).unwrap(),
    replaceAssetFile: (id, formData) => dispatch(replaceAssetFileThunk({ id, formData })).unwrap(),
    addComment: (id, text) => dispatch(addCommentThunk({ id, text })).unwrap(),
    downloadAsset: (id, reason) => dispatch(downloadAssetThunk({ id, reason })).unwrap(),
    deleteAsset: (id) => dispatch(deleteAsset(id)).unwrap(),
    fetchAssets: (params) => dispatch(fetchAssetsThunk(params)),
    fetchAssetStats: () => dispatch(fetchAssetStatsThunk()),
    fetchApprovals: () => dispatch(fetchApprovalsThunk()),
    fetchAnalytics: () => dispatch(fetchAnalyticsThunk()),
    // collections (API-backed)
    fetchCollections: () => dispatch(fetchCollectionsThunk()),
    addCollection: (payload) => dispatch(addCollectionThunk(payload)).unwrap(),
    // users (API-backed)
    fetchUsers: () => dispatch(fetchUsersThunk()),
    addUser: (payload) => dispatch(addUserThunk(payload)).unwrap(),
    updateUser: (id, patch) => dispatch(updateUserThunk({ id, patch })).unwrap(),
    setUserPassword: (id, password) => dispatch(setPasswordThunk({ id, password })).unwrap(),
    toggleScope: (id) => dispatch(toggleScopeThunk(id)).unwrap(),
    removeUser: (id) => dispatch(removeUserThunk(id)).unwrap(),
    // shares (API-backed)
    fetchShares: () => dispatch(fetchSharesThunk()),
    addShare: (payload) => dispatch(addShareThunk(payload)).unwrap(),
    removeShare: (id) => dispatch(removeShareThunk(id)).unwrap(),
    // templates (API-backed)
    fetchTemplates: () => dispatch(fetchTemplatesThunk()),
    addTemplate: (payload) => dispatch(addTemplateThunk(payload)).unwrap(),
    // brand kit (API-backed)
    brandKit, brandCanEdit,
    fetchBrandKit: () => dispatch(fetchBrandKitThunk()),
    updateBrandKit: (payload) => dispatch(updateBrandKitThunk(payload)).unwrap(),
    uploadLogo: (form) => dispatch(uploadLogoThunk(form)).unwrap(),
    removeLogo: (key) => dispatch(removeLogoThunk(key)).unwrap(),
    // brand documents (S3 + pagination + CRUD)
    brandDocs, brandDocsHasMore, brandDocsTotal, brandDocsPage, brandDocsStatus,
    fetchBrandDocs: (opts) => dispatch(fetchBrandDocsThunk(opts)).unwrap(),
    uploadBrandDoc: (form) => dispatch(uploadBrandDocThunk(form)).unwrap(),
    renameBrandDoc: (id, name) => dispatch(renameBrandDocThunk({ id, name })).unwrap(),
    deleteBrandDoc: (id) => dispatch(deleteBrandDocThunk(id)).unwrap(),
    getBrandDocUrl: (id, download) => api.get(`/brandkit/docs/${id}/url${download ? "?download=1" : ""}`).then((r) => r.url),
    // auth
    authStatus, authError,
    login: (email, password) => dispatch(loginThunk({ email, password })).unwrap(),
    logout: () => dispatch(logoutAction()),
  };
}
