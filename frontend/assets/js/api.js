const API_BASE_URL = "http://localhost:4000/api";

async function apiGet(path) {
  const res = await fetch(API_BASE_URL + path);
  if (!res.ok) throw new Error("Lỗi API GET");
  return res.json();
}

async function apiPost(path, data) {
  const res = await fetch(API_BASE_URL + path, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Lỗi API POST");
  return res.json();
}
