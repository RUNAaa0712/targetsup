const API_URL = 'https://runaaa0712.weblike.jp/chunithm/targetsup/save.php';

export async function login(userId, password) {
    const body = { userId, password };
    const res = await fetch(`${API_URL}?action=login`, {
        method: 'POST',
        body: JSON.stringify(body)
    }).then(r => r.json());

    if (res.status === 'success') {
        return { success: true, user: body };
    } else {
        return { success: false, message: res.message };
    }
}

export async function register(userId, password) {
    const body = { userId, password };
    const res = await fetch(`${API_URL}?action=register`, {
        method: 'POST',
        body: JSON.stringify(body)
    }).then(r => r.json());

    if (res.status === 'success') {
        return { success: true, message: "登録完了" };
    } else {
        return { success: false, message: res.message };
    }
}

export function getStoredAuth() {
    const auth = localStorage.getItem('chuni_auth');
    return auth ? JSON.parse(auth) : null;
}

export function storeAuth(auth) {
    localStorage.setItem('chuni_auth', JSON.stringify(auth));
}

export function clearAuth() {
    localStorage.removeItem('chuni_auth');
}
