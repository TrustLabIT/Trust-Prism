import { BASE_URL } from "../constant";

const API_URL = process.env.REACT_APP_API_URL || BASE_URL;
const TOKEN_KEY = "tp_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

async function request(path, { method = "GET", body, isForm = false } = {}) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const opts = { method, headers };
  if (body !== undefined) {
    if (isForm) {
      opts.body = body; // FormData — let the browser set the Content-Type/boundary
    } else {
      headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_URL}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: "POST", body }),
  put: (p, body) => request(p, { method: "PUT", body }),
  patch: (p, body) => request(p, { method: "PATCH", body }),
  postForm: (p, form) => request(p, { method: "POST", body: form, isForm: true }),
  del: (p) => request(p, { method: "DELETE" }),
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  me: () => request("/auth/me"),
  presign: (filename, contentType) => request("/assets/presign", { method: "POST", body: { filename, contentType } }),
  confirm: (payload) => request("/assets/confirm", { method: "POST", body: payload }),
};

// Direct PUT to a presigned S3 URL (large files / video). Reports upload %.
// NOTE: no auth header, and Content-Type MUST match what the URL was signed with.
export function putToS3(uploadUrl, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("S3 upload network error"));
    xhr.send(file);
  });
}
