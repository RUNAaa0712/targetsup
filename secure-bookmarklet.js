(async () => {
  const API_URL = "https://runaaa0712.weblike.jp/chunithm/targetsup/save.php";

  /* 保存された認証情報の取得 */
  let auth = JSON.parse(localStorage.getItem("chuni_pwa_auth") || "null");

  /* UIオーバーレイ作成関数 */
  const createOverlay = (contentHtml) => {
    const old = document.getElementById("pwa-sync-overlay");
    if (old) old.remove();
    const div = document.createElement("div");
    div.id = "pwa-sync-overlay";
    div.style =
      "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(5,8,12,0.95);color:#00e5ff;z-index:999999;display:flex;flex-direction:column;justify-content:center;align-items:center;font-family:sans-serif;text-align:center;";
    div.innerHTML = `<div style="border:1px solid #00e5ff;padding:30px;background:#101721;border-radius:15px;box-shadow:0 0 30px rgba(0,229,255,0.4);width:320px;">${contentHtml}</div>`;
    document.body.appendChild(div);
    return div;
  };

  /* 認証バリデーション */
  const validate = (uid, pass) => {
    if (!uid || !pass) return "IDとパスワードを入力してください";
    if (!/^[a-zA-Z0-9]+$/.test(uid)) return "IDは半角英数字のみ使用可能です";
    return null;
  };

  /* ログイン画面の表示 */
  if (!auth) {
    const loginHtml = `
            <div style="font-weight:bold;margin-bottom:15px;letter-spacing:2px;font-size:18px;">SYSTEM AUTH</div>
            <input id="sync-uid" type="text" placeholder="ユーザーID" style="width:100%;padding:10px;margin-bottom:10px;background:#000;border:1px solid #00e5ff;color:#fff;border-radius:5px;">
            <input id="sync-pass" type="password" placeholder="パスワード" style="width:100%;padding:10px;margin-bottom:15px;background:#000;border:1px solid #00e5ff;color:#fff;border-radius:5px;">
            <div id="sync-err" style="color:#ff5555;font-size:11px;margin-bottom:10px;"></div>
            <button id="sync-login-btn" style="width:100%;padding:12px;background:#00e5ff;color:#000;border:none;border-radius:5px;font-weight:bold;cursor:pointer;">ログイン & 同期開始</button>
        `;
    const overlay = createOverlay(loginHtml);

    return new Promise((resolve) => {
      document.getElementById("sync-login-btn").onclick = async () => {
        const uid = document.getElementById("sync-uid").value;
        const pass = document.getElementById("sync-pass").value;
        const err = validate(uid, pass);
        if (err) {
          document.getElementById("sync-err").innerText = err;
          return;
        }

        // サーバーで認証確認
        const res = await fetch(`${API_URL}?action=login`, {
          method: "POST",
          body: JSON.stringify({ userId: uid, password: pass }),
        }).then((r) => r.json());

        if (res.status === "success") {
          auth = { userId: uid, password: pass };
          localStorage.setItem("chuni_pwa_auth", JSON.stringify(auth));
          startSync(auth, overlay);
        } else {
          document.getElementById("sync-err").innerText = res.message;
        }
      };
    });
  } else {
    const overlay = createOverlay(
      `<div style="font-weight:bold;">認証情報を確認中...</div>`
    );
    startSync(auth, overlay);
  }

  /* 同期メイン処理 */
  async function startSync(authInfo, overlay) {
    const updateUI = (txt, percent) => {
      overlay.innerHTML = `
                <div style="border:1px solid #00e5ff;padding:30px;background:#101721;border-radius:15px;width:320px;">
                    <div style="font-weight:bold;margin-bottom:15px;color:#00e5ff;">同期実行中: ${authInfo.userId}</div>
                    <div style="color:#fff;font-size:13px;margin-bottom:10px;">${txt}</div>
                    <div style="width:100%;height:6px;background:#1a232e;border-radius:3px;overflow:hidden;margin-bottom:10px;">
                        <div style="width:${percent}%;height:100%;background:#00e5ff;transition:width 0.3s;"></div>
                    </div>
                </div>
            `;
    };

    const diffs = ["basic", "advanced", "expert", "master", "ultima"];
    const results = {};

    try {
      for (let i = 0; i < diffs.length; i++) {
        const d = diffs[i];
        updateUI(
          `${d.toUpperCase()} ページ解析中...`,
          (i / diffs.length) * 100
        );

        const res = await fetch(
          `https://new.chunithm-net.com/chuni-mobile/html/mobile/record/musicGenre/${d}`
        );
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const pageData = [];
        doc.querySelectorAll(".musiclist_box").forEach((el) => {
          const title = el.querySelector(".music_title")?.textContent.trim();
          const score =
            parseInt(
              el
                .querySelector(".play_musicdata_highscore")
                ?.textContent.replace(/[^0-9]/g, "")
            ) || 0;
          const icons = Array.from(el.querySelectorAll("img")).map(
            (img) => img.src
          );
          const lamp = icons.some((src) =>
            src.includes("icon_alljustice_critical")
          )
            ? "AJC"
            : icons.some((src) => src.includes("icon_alljustice"))
            ? "AJ"
            : icons.some((src) => src.includes("icon_fullcombo"))
            ? "FC"
            : "CLEAR";
          if (title)
            pageData.push({ title, score, lamp, level: d.toUpperCase() });
        });
        results[d] = pageData;
        await new Promise((r) => setTimeout(r, 800)); // 負荷軽減
      }

      updateUI("サーバーに保存中...", 95);
      const saveRes = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          userId: authInfo.userId,
          password: authInfo.password,
          data: results,
        }),
      }).then((r) => r.json());

      if (saveRes.status === "success") {
        updateUI("同期完了！", 100);
        setTimeout(() => overlay.remove(), 2000);
      } else {
        throw new Error(saveRes.message);
      }
    } catch (e) {
      overlay.innerHTML = `<div style="padding:20px;color:#ff5555;">エラー: ${e.message}<br><button onclick="this.parentElement.parentElement.remove()" style="margin-top:10px;">閉じる</button></div>`;
    }
  }
})();
