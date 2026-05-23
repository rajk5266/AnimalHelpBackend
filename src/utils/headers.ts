export const toWebHeaders = (reqHeaders: any): Headers => {
  const headers = new Headers();

  for (const key in reqHeaders) {
    const value = reqHeaders[key];
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(",") : value);
    }
  }

  return headers;
};