const API_URL = 'https://runaaa0712.weblike.jp/chunithm/targetsup/save.php';

export async function fetchMusicData() {
    return fetch(`${API_URL}?action=getMusic`).then(r => r.json());
}

export async function fetchConstants() {
    return fetch(`${API_URL}?action=getConst`).then(r => r.json());
}

export async function fetchUserScores(userId, password) {
    return fetch(`${API_URL}?userId=${userId}&password=${password}`).then(r => r.json());
}
