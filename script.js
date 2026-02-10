
const { createApp } = Vue;
const API_URL = 'https://runaaa0712.weblike.jp/chunithm/targetsup/save.php';
const CURRENT_VERSION = 'X-VERSE-X';

createApp({
    data() {
        return {
            tab: 'home', isLoggedIn: false, auth: { userId: '', password: '' },
            masterScoreData: [], musicData: [], achievements: {},
            isSyncing: false, syncStatus: '', syncProgress: 0, syncLogs: [],
            diffList: ['ULTIMA', 'MASTER', 'EXPERT', 'ADVANCED', 'BASIC'],
            levelList: ['15+', '15', '14+', '14', '13+', '13', '12+', '12', '11+', '11', '10+', '10', '9+', '9', '8+', '8', '7+', '7', '6', '5', '4', '3', '2', '1'],
            scoreFilterList: [{ label: 'SS未満', min: 0, max: 999999 }, { label: 'SS', min: 1000000, max: 1004999 }, { label: 'SS+', min: 1005000, max: 1007499 }, { label: 'SSS', min: 1007500, max: 1008999 }, { label: 'SSS+', min: 1009000, max: 1010000 }],
            settings: { syncDiffs: ['MASTER', 'ULTIMA'], syncLevels: ['14', '14+', '15', '15+'], syncLamps: ['AJC', 'AJ', 'FC', 'CLEAR'], syncScores: [], excludeMasterIfUltima: false },
            filters: { diffs: ['MASTER', 'ULTIMA'], levels: [], scores: [], lamps: ['AJC', 'AJ', 'FC', 'CLEAR'] },
            target: { diffs: ['MASTER', 'ULTIMA'], levels: ['14', '14+', '15', '15+'], genres: [], lamps: ['AJC', 'AJ', 'FC', 'CLEAR'] },
            drawCount: 1, results: [], musicMaster: [],
            chartSettings: {
                display: { type: 'rank', value: 'D', achieved: 'true' },
                mark: { type: 'rank', value: 'SSS', achieved: 'true' },
                content: { mode: 'rank', baseRank: 'SSS' },
                specific: { display: 1009900, mark: 1009900 }
            },
            chartOptions: {
                rankList: ['SSS+', 'SSS', 'SS+', 'SS', 'S', 'AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'C', 'D'],
                lampList: ['AJC', 'AJ', 'FC', 'CLEAR'],
                contentList: [
                    { label: 'ランク', value: 'rank' },
                    { label: 'ランプ', value: 'lamp' },
                    { label: 'スコア', value: 'score' },
                    { label: '両方', value: 'both' },
                    { label: '基準点差', value: 'base' }
                ]
            },
            enableAnimation: false, // 演出ON/OFF
            isAnimating: false,     // 演出中フラグ
            slots: [],              // スロットごとの状態管理
            animationStatusText: '', // 演出中のテキスト
        }
    },
    async mounted() {
        await this.initDB();
        this.loadFromLocal();
        if (this.isLoggedIn) await this.loadFromIndexedDB();
    },
    methods: {
        filterPoseExclusions(songs) {
            // ULTIMAがある曲のタイトルをセット化
            const ultimaTitles = new Set(
                songs.filter(s => s.level === 'ULTIMA').map(s => s.title)
            );
            // MASTER かつ ULTIMAが存在する場合は除外
            return songs.filter(s => !(s.level === 'MASTER' && ultimaTitles.has(s.title)));
        },
        async initDB() {
            return new Promise(res => {
                const req = indexedDB.open("ChuniDB", 2);
                req.onupgradeneeded = e => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains("songs")) db.createObjectStore("songs", { keyPath: "id" });
                    if (!db.objectStoreNames.contains("achievements")) db.createObjectStore("achievements", { keyPath: "id" });
                    if (!db.objectStoreNames.contains("master_songs")) db.createObjectStore("master_songs", { keyPath: "id" });
                };
                req.onsuccess = e => { this.db = e.target.result; res(); };
            });
        },
        addLog(msg) { this.syncLogs.unshift(msg); this.syncStatus = msg; },
        async loadAndSync() {
            this.isSyncing = true; this.syncProgress = 0; this.syncLogs = [];
            this.addLog("接続開始...");
            try {
                this.syncProgress = 10;
                const [master, consts, scores] = await Promise.all([
                    fetch(`${API_URL}?action=getMusic`).then(r => r.json()),
                    fetch(`${API_URL}?action=getConst`).then(r => r.json()),
                    fetch(`${API_URL}?userId=${this.auth.userId}&password=${this.auth.password}`).then(r => r.json())
                ]);

                // 1. APIから取得した全データをマッピング（設定によるフィルタは一切かけない）
                const allSongs = consts.flatMap(c => {
                    const m = master.find(sm => sm.title === c.title) || {};
                    return c.difficulties.map(d => {
                        const sData = scores[d.level.toLowerCase()]?.find(us => us.title === c.title);
                        const sc = sData ? sData.score : 0;
                        let lp = sData ? sData.lamp : 'CLEAR';
                        if (sc >= 1010000) lp = 'AJC';

                        return {
                            id: `${c.title}_${d.level}`,
                            title: c.title,
                            image: c.imageUrl,
                            level: d.level,
                            const: d.const,
                            score: sc,
                            lamp: lp,
                            levelStr: m[`lev_${d.level.toLowerCase().substring(0, 3)}`] || '??',
                            genre: sData?.genre || m.catname || '未分類',
                            version: c.version
                        };
                    });
                });

                // 2. スコアがある曲すべてを計算用マスターデータとして保持
                const txMaster = this.db.transaction("master_songs", "readwrite");
                const storeMaster = txMaster.objectStore("master_songs");
                await storeMaster.clear();
                allSongs.forEach(s => storeMaster.put(s));
                this.masterScoreData = allSongs.filter(s => s.score > 0);

                this.syncProgress = 40;
                this.addLog("マスタデータ取得完了");
                this.musicMaster = master;

                this.addLog("楽曲データの照合中...");
                const songs = consts.flatMap(c => {
                    const m = master.find(sm => sm.title === c.title) || {};
                    const hasUltima = c.difficulties.some(d => d.level === 'ULTIMA');

                    return c.difficulties.filter(d => {
                        if (this.settings.excludeMasterIfUltima && hasUltima && d.level === 'MASTER') {
                            return false;
                        }
                        const lv = m[`lev_${d.level.toLowerCase().substring(0, 3)}`] || '??';
                        const sData = scores[d.level.toLowerCase()]?.find(us => us.title === c.title);
                        const sc = sData ? sData.score : 0;
                        let lp = sData ? sData.lamp : 'CLEAR';

                        /* 【重要】スコアが1010000ならAJCランプを強制適用 */
                        if (sc >= 1010000) lp = 'AJC';

                        return this.settings.syncDiffs.includes(d.level) && (this.settings.syncLevels.length === 0 || this.settings.syncLevels.includes(lv)) && this.settings.syncLamps.includes(lp) && (this.settings.syncScores.length === 0 || this.settings.syncScores.some(label => { const r = this.scoreFilterList.find(f => f.label === label); return sc >= r.min && sc <= r.max; }));
                    }).map(d => {
                        const sData = scores[d.level.toLowerCase()]?.find(us => us.title === c.title);
                        const sc = sData ? sData.score : 0;
                        let lp = sData ? sData.lamp : 'CLEAR';
                        if (sc >= 1010000) lp = 'AJC';

                        const genre = (sData && sData.genre) ? sData.genre : (m.catname || '未分類');

                        return {
                            id: `${c.title}_${d.level}`,
                            title: c.title,
                            image: c.imageUrl,
                            level: d.level,
                            const: d.const,
                            score: sc,
                            lamp: lp,
                            levelStr: m[`lev_${d.level.toLowerCase().substring(0, 3)}`] || '??',
                            genre: genre,
                            version: c.version
                        };
                    });
                });

                this.syncProgress = 80;
                this.addLog(`${songs.length}曲を保存中...`);
                const tx = this.db.transaction("songs", "readwrite");
                const store = tx.objectStore("songs");
                await store.clear();
                songs.forEach(s => store.put(s));
                this.musicData = songs;

                this.syncProgress = 100;
                this.addLog("同期完了！");
                setTimeout(() => this.isSyncing = false, 1000);
            } catch (e) { alert("同期エラー"); this.isSyncing = false; }
        },
        loadFromLocal() {
            const auth = localStorage.getItem('chuni_auth');
            if (auth) { this.auth = JSON.parse(auth); this.isLoggedIn = true; }
            const sets = localStorage.getItem('chuni_settings');
            if (sets) {
                const parsed = JSON.parse(sets);
                this.settings = parsed.settings || this.settings;
                this.filters = parsed.filters || this.filters;
                this.target = parsed.target || this.target;
                this.drawCount = parsed.drawCount || 1;
            }
        },
        saveToLocal() {
            localStorage.setItem('chuni_settings', JSON.stringify({
                settings: this.settings,
                filters: this.filters,
                target: this.target,
                drawCount: this.drawCount
            }));
        },
        async handleAuth(action) {
            const res = await fetch(`${API_URL}?action=${action}`, { method: 'POST', body: JSON.stringify({ ...this.auth }) }).then(r => r.json());
            if (res.status === 'success') { if (action === 'login') { this.isLoggedIn = true; localStorage.setItem('chuni_auth', JSON.stringify(this.auth)); await this.loadAndSync(); } else alert("登録完了"); } else alert(res.message);
        },
        logout() { localStorage.removeItem('chuni_auth'); location.reload(); },
        async loadFromIndexedDB() {
            const tx = this.db.transaction(["master_songs", "songs", "achievements"], "readonly");
            tx.objectStore("master_songs").getAll().onsuccess = e => this.masterScoreData = e.target.result;
            tx.objectStore("songs").getAll().onsuccess = e => this.musicData = e.target.result;
            tx.objectStore("achievements").getAll().onsuccess = e => { e.target.result.forEach(a => this.achievements[a.id] = true); };
            this.musicMaster = await fetch(`${API_URL}?action=getMusic`).then(r => r.json());
        },
        async toggleAchievement(song) {
            const tx = this.db.transaction("achievements", "readwrite");
            if (this.achievements[song.id]) { tx.objectStore("achievements").delete(song.id); delete this.achievements[song.id]; }
            else { tx.objectStore("achievements").put({ id: song.id }); this.achievements[song.id] = true; }
        },
        toggle(arr, val) { const i = arr.indexOf(val); i > -1 ? arr.splice(i, 1) : arr.push(val); this.saveToLocal(); },
        async resetAchievements() { if (confirm("履歴をリセット？")) { await this.db.transaction("achievements", "readwrite").objectStore("achievements").clear(); this.achievements = {}; } },
        async drawLottery() {
            // 1. 候補曲を抽出
            let pool = this.remainingMusic.filter(s =>
                (this.target.genres.length === 0 || this.target.genres.includes(s.genre)) &&
                this.target.diffs.includes(s.level) &&
                this.target.levels.includes(s.levelStr) &&
                this.target.lamps.includes(s.lamp)
            );

            // 2. 「ポゼ対象外」設定がONなら、ULTIMAがある曲のMASTERを除外
            if (this.settings.excludeMasterIfUltima) {
                pool = this.filterPoseExclusions(pool);
            }

            if (!pool.length) return alert("条件に一致する曲がありません");

            const finalResults = [...pool].sort(() => 0.5 - Math.random()).slice(0, this.drawCount);

            // 3. 演出OFFなら即表示して終了
            if (!this.enableAnimation) {
                this.results = finalResults;
                return;
            }

            // --- 以下、演出ON時の処理 ---
            this.isAnimating = true;
            this.results = []; // リスト表示はクリア
            this.animationStatusText = "SEARCHING...";

            // スロットの初期化（最初はランダムな画像で開始）
            this.slots = finalResults.map(targetSong => ({
                isSpinning: true,
                currentImage: pool[Math.floor(Math.random() * pool.length)].image,
                target: targetSong
            }));

            // 画像をパラパラ切り替えるタイマーを開始
            const timers = this.slots.map((slot, index) => {
                return setInterval(() => {
                    // 候補曲の中からランダムに画像を表示
                    slot.currentImage = pool[Math.floor(Math.random() * pool.length)].image;
                }, 50); // 0.05秒ごとに切り替え
            });

            // 順番に停止させる処理
            for (let i = 0; i < this.slots.length; i++) {
                await new Promise(r => setTimeout(r, 300));

                // タイマーを止めて、本来の当選画像のセット
                clearInterval(timers[i]);
                this.slots[i].currentImage = this.slots[i].target.image;
                this.slots[i].isSpinning = false; // 回転フラグOFF（枠が光る）

                // 効果音的なテキスト変更
                this.animationStatusText = `LOCKED [${i + 1}/${this.slots.length}]`;
            }

            // 全部止まった後の完了処理
            this.animationStatusText = "COMPLETE!";
            await new Promise(r => setTimeout(r, 1000)); // 1秒余韻を表示

            // 演出終了、結果リストを表示
            this.results = finalResults;
            this.isAnimating = false;
        },
        async exportChartImage() {
            const element = document.getElementById('capture-area');
            if (!element) return;

            // html2canvasを実行
            const canvas = await html2canvas(element, {
                useCORS: true,
                backgroundColor: '#05080c',
                scale: 2 // 高画質
            });

            const link = document.createElement('a');
            link.download = `my_chunithm_chart_${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        },
        getRankThreshold(rank) {
            const thresholds = {
                'SSS+': 1009000, 'SSS': 1007500, 'SS+': 1005000, 'SS': 1000000,
                'S': 975000, 'AAA': 950000, 'AA': 925000, 'A': 900000,
                'BBB': 800000, 'BB': 700000, 'B': 600000, 'C': 500000, 'D': 0
            };
            return thresholds[rank] !== undefined ? thresholds[rank] : 0;
        },
        getRank(score) {
            if (score >= 1009000) return 'SSS+';
            if (score >= 1007500) return 'SSS';
            if (score >= 1005000) return 'SS+';
            if (score >= 1000000) return 'SS';
            if (score >= 975000) return 'S';
            if (score >= 950000) return 'AAA';
            if (score >= 925000) return 'AA';
            if (score >= 900000) return 'A';
            return 'D';
        },
        // フィルタ・マークの条件判定ロジック (修正版)
        checkCondition(song, config, specificScore) {
            let success = false;
            const score = parseInt(song.score) || 0;

            if (config.type === 'rank') {
                success = score >= this.getRankThreshold(config.value);
            } else if (config.type === 'lamp') {
                const lampMap = { 'AJC': 4, 'AJ': 3, 'FC': 2, 'CLEAR': 1 };
                success = lampMap[song.lamp] >= lampMap[config.value];
            } else if (config.type === 'score') {
                success = score >= (parseInt(specificScore) || 0);
            }

            return config.achieved === 'true' ? success : !success;
        },
        calculateRating(score, constant) {
            const s = parseInt(score);
            const c = parseFloat(constant);
            if (!s || !c) return 0;
            let rating = 0;
            if (s >= 1009000) rating = c + 2.15;
            else if (s >= 1007500) rating = c + 2.0 + (s - 1007500) / 10000;
            else if (s >= 1005000) rating = c + 1.5 + (s - 1005000) / 5000;
            else if (s >= 1000000) rating = c + 1.0 + (s - 1000000) / 10000;
            else if (s >= 975000) rating = c + (s - 975000) / 25000;
            else if (s >= 900000) rating = c - 5.0 + (s - 900000) / 15000;
            return Math.max(0, rating);
        },
        async generateRatingImage() {
            // 1. キャプチャ対象の要素を取得
            const element = document.getElementById('rating-full-capture');
            if (!element) return;

            // 2. 処理中のトーストやアラート（任意）
            console.log("画像生成を開始します...");

            try {
                // 3. html2canvasを実行
                const canvas = await html2canvas(element, {
                    useCORS: true,        // これが重要：外部サーバーの画像を許可
                    allowTaint: false,    // セキュリティ設定
                    scale: 2,             // 高画質にする
                    backgroundColor: "#05080c",
                    // 画像が完全に読み込まれるまで少し待機させる設定
                    onclone: (clonedDoc) => {
                        clonedDoc.getElementById('rating-full-capture').style.display = 'block';
                    }
                });

                // 4. データURLに変換
                const dataUrl = canvas.toDataURL("image/png");

                // 5. 新しいタブで開く
                const newTab = window.open();
                if (newTab) {
                    newTab.document.write(`
                        <html>
                            <head><title>CHUNITHM べ枠生成結果</title></head>
                            <body style="margin:0; background:#05080c; display:flex; justify-content:center;">
                                <img src="${dataUrl}" style="max-width:100%; height:auto;">
                            </body>
                        </html>
                    `);
                    newTab.document.close();
                } else {
                    alert("タブのポップアップがブロックされました。許可してください。");
                }
            } catch (err) {
                console.error("生成失敗:", err);
                alert("画像の生成中にエラーが発生しました。");
            }
        },
        async clearAllData() {
            // 最終確認
            if (!confirm("IndexedDB内の全楽曲データ、達成記録、および設定をすべて削除します。\nよろしいですか？")) return;

            try {
                // 1. 接続中のDBを閉じる
                if (this.db) {
                    this.db.close();
                }

                // 2. IndexedDB 自体を削除
                const deleteReq = indexedDB.deleteDatabase("ChuniDB");

                deleteReq.onsuccess = () => {
                    // 3. ローカルストレージもクリア（認証情報は残す場合は removeItem を調整）
                    localStorage.removeItem('chuni_settings');
                    // 認証も解除して完全に初期化する場合
                    localStorage.removeItem('chuni_auth');

                    alert("すべてのデータを削除しました。アプリを再起動します。");
                    location.reload();
                };

                deleteReq.onerror = () => {
                    alert("データベースの削除に失敗しました。");
                };

                deleteReq.onblocked = () => {
                    // 他のタブでアプリが開いている場合に発生
                    alert("他のタブでアプリが開いているため削除できません。すべてのタブを閉じてから再度お試しください。");
                };

            } catch (e) {
                console.error("Cleanup Error:", e);
                alert("エラーが発生しました。");
            }
        },
    },
    computed: {
        remainingMusic() { return this.musicData.filter(s => !this.achievements[s.id]); },
        achievedMusic() { return this.musicData.filter(s => this.achievements[s.id]); },
        filteredMusic() {
            return this.remainingMusic.filter(s => {
                const dM = this.filters.diffs.includes(s.level);
                const lM = this.filters.levels.length === 0 || this.filters.levels.includes(s.levelStr);
                const lpM = this.filters.lamps.includes(s.lamp);
                const sM = this.filters.scores.length === 0 || this.filters.scores.some(label => { const r = this.scoreFilterList.find(f => f.label === label); return s.score >= r.min && s.score <= r.max; });
                return dM && lM && sM && lpM;
            }).sort((a, b) => b.score - a.score);
        },
        genres() { return [...new Set(this.musicMaster.map(m => m.catname))].filter(g => g); },
        groupedByConst() {
            // 表示条件に基づいてフィルタリング
            const filtered = this.musicData.filter(s =>
                this.checkCondition(s, this.chartSettings.display, this.chartSettings.specific.display)
            );

            const groups = {};
            filtered.forEach(s => {
                const val = parseFloat(s.const).toFixed(1);
                if (!groups[val]) groups[val] = [];
                groups[val].push(s);
            });

            return Object.keys(groups)
                .sort((a, b) => parseFloat(b) - parseFloat(a))
                .map(key => ({
                    constVal: key,
                    songs: groups[key].sort((a, b) => b.score - a.score)
                }));
        },
        ratingFrames() {
            // loadAndSync時に保持した「全曲マスターデータ」から計算
        if (!this.masterScoreData.length) return { best: [], new: [], total: "0.0000" };

        const allRated = this.masterScoreData.filter(s => s.score > 0).map(s => ({
            ...s,
            rating: this.calculateRating(s.score, s.const)
        })).sort((a, b) => b.rating - a.rating);

        const bestFrame = allRated.filter(s => s.version !== CURRENT_VERSION).slice(0, 30);
        const newFrame = allRated.filter(s => s.version === CURRENT_VERSION).slice(0, 20);

        const bestSum = bestFrame.reduce((acc, s) => acc + Math.floor(s.rating * 100) / 100, 0);
        const newSum = newFrame.reduce((acc, s) => acc + Math.floor(s.rating * 100) / 100, 0);

        return {
            best: bestFrame,
            new: newFrame,
            total: ((bestSum + newSum) / 50).toFixed(4),
            bestAvg: (bestSum / 30 || 0).toFixed(4),
            newAvg: (newSum / 20 || 0).toFixed(4)
        };
        },
    }
}).mount('#app');