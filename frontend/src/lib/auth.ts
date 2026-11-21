const TOKEN_KEY = "cashflow_token";

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export function saveToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}