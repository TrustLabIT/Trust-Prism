// Thin facade over the Redux store for TrustMark. Components call useApp().
import { useSelector, useDispatch } from "react-redux";
import {
  fetchAssets as fetchAssetsThunk, fetchCounts as fetchCountsThunk,
  fetchApprovals as fetchApprovalsThunk, confirmUpload as confirmUploadThunk,
  updateStatus as updateStatusThunk, updateAsset as updateAssetThunk,
  deleteAsset as deleteAssetThunk, downloadAsset as downloadAssetThunk,
} from "../store/assetsSlice";
import {
  setSearch, setLibDomain, setLibSub, openDrawer, closeDrawer, setToast,
} from "../store/uiSlice";
import { fetchShares as fetchSharesThunk, addShare as addShareThunk, updateShare as updateShareThunk, removeShare as removeShareThunk } from "../store/sharesSlice";
import {
  fetchUsers as fetchUsersThunk, addUser as addUserThunk, updateUser as updateUserThunk,
  toggleScope as toggleScopeThunk, setPassword as setPasswordThunk, removeUser as removeUserThunk,
} from "../store/usersSlice";
import { fetchTaxonomy as fetchTaxonomyThunk, saveTaxonomy as saveTaxonomyThunk } from "../store/taxonomySlice";
import { login as loginThunk, logout as logoutAction } from "../store/authSlice";

const APPROVER_ROLES = ["Super Admin", "Brand Manager", "Reviewer"];
const LIBRARY_STATUS_FILTER = ["Live", "Approved", "Archived"];   // Draft/In review/Expired have their own places

const GUEST = { name: "", role: "", org: "Internal", scope: "all" };

export function useApp() {
  const dispatch = useDispatch();

  const user = useSelector((s) => s.auth.user) || GUEST;
  const authStatus = useSelector((s) => s.auth.status);
  const assets = useSelector((s) => s.assets.items);
  const assetsStatus = useSelector((s) => s.assets.status);
  const hasMore = useSelector((s) => s.assets.hasMore);
  const page = useSelector((s) => s.assets.page);
  const total = useSelector((s) => s.assets.total);
  const lastKey = useSelector((s) => s.assets.lastKey);
  const counts = useSelector((s) => s.assets.counts);
  const approvals = useSelector((s) => s.assets.approvals);
  const approvalsStatus = useSelector((s) => s.assets.approvalsStatus);

  const shares = useSelector((s) => s.shares.items);
  const sharesPage = useSelector((s) => s.shares.page);
  const sharesHasMore = useSelector((s) => s.shares.hasMore);
  const sharesTotal = useSelector((s) => s.shares.total);
  const sharesStatus = useSelector((s) => s.shares.status);
  const users = useSelector((s) => s.users.items);
  const usersPage = useSelector((s) => s.users.page);
  const usersHasMore = useSelector((s) => s.users.hasMore);
  const usersTotal = useSelector((s) => s.users.total);
  const usersStatus = useSelector((s) => s.users.status);
  const taxState = useSelector((s) => s.taxonomy);
  const search = useSelector((s) => s.ui.search);

  // live taxonomy + helpers (components read everything through this)
  const domById = (id) => (taxState.domains || []).find((d) => d.id === id) || null;
  const subById = (d, s) => { const D = domById(d); return D ? (D.subs || []).find((x) => x.id === s) || null : null; };
  const tax = {
    ...taxState,
    dom: domById,
    subOf: subById,
    pathOf: (a) => `${domById(a.domain)?.name || a.domain} › ${subById(a.domain, a.sub)?.name || a.sub} › ${a.type}`,
    FACETS: [
      ["status", "Status", LIBRARY_STATUS_FILTER],
      ["dist", "Distribution", taxState.dists],
      ["channel", "Channel", taxState.channels],
      ["audience", "Audience", taxState.audiences],
      ["campaign", "Campaign", taxState.campaigns],
      ["service", "Service line", taxState.services],
      ["geo", "Geography", taxState.geos],
      ["lang", "Language", taxState.langs],
    ],
  };

  // role-based permissions
  const role = user.role || "";
  const perms = {
    isSuperAdmin: role === "Super Admin",
    isApprover: APPROVER_ROLES.includes(role),
    canUpload: role !== "Viewer" && !!role,
    canManageUsers: role === "Super Admin",
    canManageSettings: role === "Super Admin",   // taxonomy + users share "settings access"
  };
  const libDomain = useSelector((s) => s.ui.libDomain);
  const libSub = useSelector((s) => s.ui.libSub);
  const drawer = useSelector((s) => s.ui.drawer);

  const toast = (msg) => {
    dispatch(setToast({ msg, show: true }));
    setTimeout(() => dispatch(setToast({ msg: "", show: false })), 2400);
  };

  return {
    user, authStatus, perms, tax,
    assets, assetsStatus, hasMore, page, total, lastKey, counts, approvals, approvalsStatus,
    shares, sharesPage, sharesHasMore, sharesTotal, sharesStatus, users, usersPage, usersHasMore, usersTotal, usersStatus, search, libDomain, libSub, drawer,

    // data
    fetchAssets: (opts) => dispatch(fetchAssetsThunk(opts)),
    fetchCounts: () => dispatch(fetchCountsThunk()),
    fetchApprovals: (r) => dispatch(fetchApprovalsThunk(r)),
    confirmUpload: (payload) => dispatch(confirmUploadThunk(payload)).unwrap(),
    updateStatus: (id, action) => dispatch(updateStatusThunk({ id, action })).unwrap(),
    updateAsset: (id, patch) => dispatch(updateAssetThunk({ id, patch })).unwrap(),
    deleteAsset: (id) => dispatch(deleteAssetThunk(id)).unwrap(),
    downloadAsset: (id) => dispatch(downloadAssetThunk(id)).unwrap(),

    // shared links
    fetchShares: (opts) => dispatch(fetchSharesThunk(opts)),
    addShare: (payload) => dispatch(addShareThunk(payload)).unwrap(),
    updateShare: (id, patch) => dispatch(updateShareThunk({ id, patch })).unwrap(),
    removeShare: (id) => dispatch(removeShareThunk(id)).unwrap(),

    // taxonomy (editable in Settings)
    fetchTaxonomy: () => dispatch(fetchTaxonomyThunk()),
    saveTaxonomy: (payload) => dispatch(saveTaxonomyThunk(payload)).unwrap(),

    // users (Super Admin only)
    fetchUsers: (opts) => dispatch(fetchUsersThunk(opts)),
    addUser: (payload) => dispatch(addUserThunk(payload)).unwrap(),
    updateUser: (id, patch) => dispatch(updateUserThunk({ id, patch })).unwrap(),
    toggleScope: (id) => dispatch(toggleScopeThunk(id)).unwrap(),
    setUserPassword: (id, password) => dispatch(setPasswordThunk({ id, password })).unwrap(),
    removeUser: (id) => dispatch(removeUserThunk(id)).unwrap(),

    // ui
    setSearch: (v) => dispatch(setSearch(v)),
    setLibDomain: (v) => dispatch(setLibDomain(v)),
    setLibSub: (v) => dispatch(setLibSub(v)),
    openDrawer: (asset) => dispatch(openDrawer(asset)),
    closeDrawer: () => dispatch(closeDrawer()),
    toast,

    // auth
    login: (email, password) => dispatch(loginThunk({ email, password })).unwrap(),
    logout: () => dispatch(logoutAction()),
  };
}
