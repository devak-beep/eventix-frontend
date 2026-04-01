export const getUser = () => {
  try {
    const str = localStorage.getItem("user");
    return str ? JSON.parse(str) : null;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

export const setUser = (user) => {
  try {
    localStorage.setItem("user", JSON.stringify(user));
  } catch { /* storage full or unavailable */ }
};

export const removeUser = () => localStorage.removeItem("user");
