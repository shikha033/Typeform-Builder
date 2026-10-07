// API client — uses NEXT_PUBLIC_BACKEND_URL env var

const BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch {}
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export const api = {
  // Forms
  listForms: () => request<any[]>("/forms"),
  getForm: (id: string) => request<any>(`/forms/${id}`),
  createForm: (payload: { title?: string; description?: string }) =>
    request<any>("/forms", { method: "POST", body: JSON.stringify(payload) }),
  updateForm: (id: string, payload: any) =>
    request<any>(`/forms/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteForm: (id: string) => request<void>(`/forms/${id}`, { method: "DELETE" }),
  duplicateForm: (id: string) => request<any>(`/forms/${id}/duplicate`, { method: "POST" }),
  publishForm: (id: string) => request<any>(`/forms/${id}/publish`, { method: "POST" }),
  unpublishForm: (id: string) => request<any>(`/forms/${id}/unpublish`, { method: "POST" }),
  listResponses: (id: string) => request<any[]>(`/forms/${id}/responses`),
  getResponse: (id: string, rid: string) => request<any>(`/forms/${id}/responses/${rid}`),
  getStats: (id: string) => request<any>(`/forms/${id}/stats`),

  // Public
  getPublicForm: (slug: string) => request<any>(`/public/forms/${slug}`),
  submitResponse: (slug: string, payload: { answers: any[] }) =>
    request<any>(`/public/forms/${slug}/responses`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // CSV download URL (used directly by <a href>)
  csvUrl: (id: string) => `${BASE}/api/forms/${id}/responses.csv`,
};
