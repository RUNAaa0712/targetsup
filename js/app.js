import { createApp, reactive, ref, onMounted, computed, watch } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { initDB } from './utils/db.js';
import { getStoredAuth, storeAuth, clearAuth, login, register } from './utils/auth.js';
import { fetchMusicData, fetchConstants, fetchUserScores } from './utils/sync.js';
import { calculateRating, getRank, getRankThreshold } from './utils/rating.js';

import SyncOverlay from './components/SyncOverlay.js';
import SlotMachine from './components/SlotMachine.js';
import NavBar from './components/NavBar.js';

const app = createApp({
    components: {
        SyncOverlay,
        SlotMachine,
        NavBar
    },
    setup() {
        const tab = ref('home');
        const isLoggedIn = ref(false);
        const auth = reactive({ userId: '', password: '' });
        const masterScoreData = ref([]);
        const musicData = ref([]);
        const achievements = reactive({});
        const isSyncing = ref(false);
        const syncStatus = ref('');
        const syncProgress = ref(0);
        const syncLogs = ref([]);

        // Settings & Filters
        const diffList = ['ULTIMA', 'MASTER', 'EXPERT', 'ADVANCED', 'BASIC'];
        const levelList = ['15+', '15', '14+', '14', '13+', '13', '12+', '12', '11+', '11', '10+', '10', '9+', '9', '8+', '8', '7+', '7', '6', '5', '4', '3', '2', '1'];
        const scoreFilterList = [
            { label: 'SS未満', min: 0, max: 999999 },
            { label: 'SS', min: 1000000, max: 1004999 },
            { label: 'SS+', min: 1005000, max: 1007499 },
            { label: 'SSS', min: 1007500, max: 1008999 },
            { label: 'SSS+', min: 1009000, max: 1010000 }
        ];

        const settings = reactive({
            syncDiffs: ['MASTER', 'ULTIMA'],
            syncLevels: ['14', '14+', '15', '15+'],
            syncLamps: ['AJC', 'AJ', 'FC', 'CLEAR'],
            syncScores: [],
            excludeMasterIfUltima: false
        });

        const filters = reactive({
            diffs: ['MASTER', 'ULTIMA'],
            levels: [],
            scores: [],
            lamps: ['AJC', 'AJ', 'FC', 'CLEAR']
        });

        const target = reactive({
            diffs: ['MASTER', 'ULTIMA'],
            levels: ['14', '14+', '15', '15+'],
            genres: [],
            lamps: ['AJC', 'AJ', 'FC', 'CLEAR']
        });

        const drawCount = ref(1);
        const results = ref([]);
        const musicMaster = ref([]);

        // Chart Settings
        const chartSettings = reactive({
            display: { type: 'rank', value: 'D', achieved: 'true' },
            mark: { type: 'rank', value: 'SSS', achieved: 'true' },
            content: { mode: 'rank', baseRank: 'SSS' },
            specific: { display: 1009900, mark: 1009900 }
        });

        const chartOptions = {
            rankList: ['SSS+', 'SSS', 'SS+', 'SS', 'S', 'AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'C', 'D'],
            lampList: ['AJC', 'AJ', 'FC', 'CLEAR'],
            contentList: [
                { label: 'ランク', value: 'rank' },
                { label: 'ランプ', value: 'lamp' },
                { label: 'スコア', value: 'score' },
                { label: '両方', value: 'both' },
                { label: '基準点差', value: 'base' }
            ]
        };

        // Lottery Animation State
        const enableAnimation = ref(false);
        const isAnimating = ref(false);
        const slots = ref([]);
        const animationStatusText = ref('');

        // Rating Image Modal
        const showModal = ref(false);
        const generatedImage = ref('');

        let db = null;
        const CURRENT_VERSION = 'X-VERSE-X';

        // Methods
        const addLog = (msg) => {
            syncLogs.value.unshift(msg);
            syncStatus.value = msg;
        };

        const loadFromLocal = () => {
            const storedAuth = getStoredAuth();
            if (storedAuth) {
                auth.userId = storedAuth.userId;
                auth.password = storedAuth.password;
                isLoggedIn.value = true;
            }
            const sets = localStorage.getItem('chuni_settings');
            if (sets) {
                const parsed = JSON.parse(sets);
                Object.assign(settings, parsed.settings);
                Object.assign(filters, parsed.filters);
                Object.assign(target, parsed.target);
                drawCount.value = parsed.drawCount || 1;
            }
        };

        const saveToLocal = () => {
             localStorage.setItem('chuni_settings', JSON.stringify({
                settings, filters, target, drawCount: drawCount.value
            }));
        };

        const toggle = (arr, val) => {
            const i = arr.indexOf(val);
            if (i > -1) arr.splice(i, 1);
            else arr.push(val);
            saveToLocal();
        };

        const handleAuth = async (action) => {
            if (action === 'login') {
                const res = await login(auth.userId, auth.password);
                if (res.success) {
                    isLoggedIn.value = true;
                    storeAuth(auth);
                    await loadAndSync();
                } else {
                    alert(res.message);
                }
            } else {
                const res = await register(auth.userId, auth.password);
                alert(res.message);
            }
        };

        const handleLogout = () => {
            clearAuth();
            location.reload();
        };

        const loadAndSync = async () => {
            isSyncing.value = true;
            syncProgress.value = 0;
            syncLogs.value = [];
            addLog("接続開始...");

            try {
                syncProgress.value = 10;
                const [master, consts, scores] = await Promise.all([
                    fetchMusicData(),
                    fetchConstants(),
                    fetchUserScores(auth.userId, auth.password)
                ]);

                // 1. Map all data
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

                // 2. Save Master Data
                const txMaster = db.transaction("master_songs", "readwrite");
                const storeMaster = txMaster.objectStore("master_songs");
                await storeMaster.clear();
                allSongs.forEach(s => storeMaster.put(s));
                masterScoreData.value = allSongs.filter(s => s.score > 0);

                syncProgress.value = 40;
                addLog("マスタデータ取得完了");
                musicMaster.value = master;

                addLog("楽曲データの照合中...");
                // Filter songs based on settings
                const songs = consts.flatMap(c => {
                    const m = master.find(sm => sm.title === c.title) || {};
                    const hasUltima = c.difficulties.some(d => d.level === 'ULTIMA');

                    return c.difficulties.filter(d => {
                        if (settings.excludeMasterIfUltima && hasUltima && d.level === 'MASTER') {
                            return false;
                        }
                        const lv = m[`lev_${d.level.toLowerCase().substring(0, 3)}`] || '??';
                        const sData = scores[d.level.toLowerCase()]?.find(us => us.title === c.title);
                        const sc = sData ? sData.score : 0;
                        let lp = sData ? sData.lamp : 'CLEAR';
                        if (sc >= 1010000) lp = 'AJC';

                        return settings.syncDiffs.includes(d.level) &&
                               (settings.syncLevels.length === 0 || settings.syncLevels.includes(lv)) &&
                               settings.syncLamps.includes(lp) &&
                               (settings.syncScores.length === 0 || settings.syncScores.some(label => {
                                   const r = scoreFilterList.find(f => f.label === label);
                                   return sc >= r.min && sc <= r.max;
                               }));
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

                syncProgress.value = 80;
                addLog(`${songs.length}曲を保存中...`);

                const tx = db.transaction("songs", "readwrite");
                const store = tx.objectStore("songs");
                await store.clear();
                songs.forEach(s => store.put(s));
                musicData.value = songs;

                syncProgress.value = 100;
                addLog("同期完了！");
                setTimeout(() => isSyncing.value = false, 1000);

            } catch (e) {
                console.error(e);
                alert("同期エラー");
                isSyncing.value = false;
            }
        };

        const loadFromIndexedDB = async () => {
            const tx = db.transaction(["master_songs", "songs", "achievements"], "readonly");
            tx.objectStore("master_songs").getAll().onsuccess = e => masterScoreData.value = e.target.result;
            tx.objectStore("songs").getAll().onsuccess = e => musicData.value = e.target.result;
            tx.objectStore("achievements").getAll().onsuccess = e => {
                e.target.result.forEach(a => achievements[a.id] = true);
            };
            // Initial fetch for genres if needed, or rely on synced data
            try {
                musicMaster.value = await fetchMusicData();
            } catch(e) { console.warn("Offline or fetch failed", e); }
        };

        const toggleAchievement = (song) => {
            const tx = db.transaction("achievements", "readwrite");
            if (achievements[song.id]) {
                tx.objectStore("achievements").delete(song.id);
                delete achievements[song.id];
            } else {
                tx.objectStore("achievements").put({ id: song.id });
                achievements[song.id] = true;
            }
        };

        const resetAchievements = async () => {
            if (confirm("履歴をリセット？")) {
                const tx = db.transaction("achievements", "readwrite");
                await tx.objectStore("achievements").clear();
                Object.keys(achievements).forEach(key => delete achievements[key]);
            }
        };

        const clearAllData = async () => {
            if (!confirm("IndexedDB内の全楽曲データ、達成記録、および設定をすべて削除します。\nよろしいですか？")) return;
            try {
                db.close();
                const deleteReq = indexedDB.deleteDatabase("ChuniDB");
                deleteReq.onsuccess = () => {
                    localStorage.removeItem('chuni_settings');
                    localStorage.removeItem('chuni_auth');
                    alert("すべてのデータを削除しました。アプリを再起動します。");
                    location.reload();
                };
                deleteReq.onerror = () => alert("データベースの削除に失敗しました。");
                deleteReq.onblocked = () => alert("他のタブでアプリが開いているため削除できません。");
            } catch (e) {
                console.error(e);
                alert("エラーが発生しました。");
            }
        };

        // Computed Properties
        const remainingMusic = computed(() => musicData.value.filter(s => !achievements[s.id]));
        const achievedMusic = computed(() => musicData.value.filter(s => achievements[s.id]));

        const filteredMusic = computed(() => {
            return remainingMusic.value.filter(s => {
                const dM = filters.diffs.includes(s.level);
                const lM = filters.levels.length === 0 || filters.levels.includes(s.levelStr);
                const lpM = filters.lamps.includes(s.lamp);
                const sM = filters.scores.length === 0 || filters.scores.some(label => {
                    const r = scoreFilterList.find(f => f.label === label);
                    return s.score >= r.min && s.score <= r.max;
                });
                return dM && lM && sM && lpM;
            }).sort((a, b) => b.score - a.score);
        });

        const genres = computed(() => [...new Set(musicMaster.value.map(m => m.catname))].filter(g => g));

        // Chart Logic
        const checkCondition = (song, config, specificScore) => {
            let success = false;
            const score = parseInt(song.score) || 0;
            if (config.type === 'rank') {
                success = score >= getRankThreshold(config.value);
            } else if (config.type === 'lamp') {
                const lampMap = { 'AJC': 4, 'AJ': 3, 'FC': 2, 'CLEAR': 1 };
                success = lampMap[song.lamp] >= lampMap[config.value];
            } else if (config.type === 'score') {
                success = score >= (parseInt(specificScore) || 0);
            }
            return config.achieved === 'true' ? success : !success;
        };

        const groupedByConst = computed(() => {
            const filtered = musicData.value.filter(s =>
                checkCondition(s, chartSettings.display, chartSettings.specific.display)
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
        });

        // Rating Logic
        const ratingFrames = computed(() => {
            if (!masterScoreData.value.length) return { best: [], new: [], total: "0.0000" };

            const allRated = masterScoreData.value.filter(s => s.score > 0).map(s => ({
                ...s,
                rating: calculateRating(s.score, s.const)
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
        });

        // Lottery Logic
        const filterPoseExclusions = (songs) => {
            const ultimaTitles = new Set(songs.filter(s => s.level === 'ULTIMA').map(s => s.title));
            return songs.filter(s => !(s.level === 'MASTER' && ultimaTitles.has(s.title)));
        };

        const drawLottery = async () => {
            let pool = remainingMusic.value.filter(s =>
                (target.genres.length === 0 || target.genres.includes(s.genre)) &&
                target.diffs.includes(s.level) &&
                target.levels.includes(s.levelStr) &&
                target.lamps.includes(s.lamp)
            );

            if (settings.excludeMasterIfUltima) {
                pool = filterPoseExclusions(pool);
            }

            if (!pool.length) return alert("条件に一致する曲がありません");

            const finalResults = [...pool].sort(() => 0.5 - Math.random()).slice(0, drawCount.value);

            if (!enableAnimation.value) {
                results.value = finalResults;
                return;
            }

            isAnimating.value = true;
            results.value = [];
            animationStatusText.value = "SEARCHING...";

            slots.value = finalResults.map(targetSong => ({
                isSpinning: true,
                currentImage: pool[Math.floor(Math.random() * pool.length)].image,
                target: targetSong
            }));

            const timers = slots.value.map((slot) => {
                return setInterval(() => {
                    slot.currentImage = pool[Math.floor(Math.random() * pool.length)].image;
                }, 50);
            });

            for (let i = 0; i < slots.value.length; i++) {
                await new Promise(r => setTimeout(r, 300));
                clearInterval(timers[i]);
                slots.value[i].currentImage = slots.value[i].target.image;
                slots.value[i].isSpinning = false;
                animationStatusText.value = `LOCKED [${i + 1}/${slots.value.length}]`;
            }

            animationStatusText.value = "COMPLETE!";
            await new Promise(r => setTimeout(r, 1000));
            results.value = finalResults;
            isAnimating.value = false;
        };

        const generateRatingImage = async () => {
             const element = document.getElementById('rating-full-capture');
             if (!element) return;
             syncStatus.value = "GENERATING IMAGE...";
             try {
                // eslint-disable-next-line no-undef
                 const canvas = await html2canvas(element, {
                     useCORS: true,
                     allowTaint: false,
                     scale: 2,
                     backgroundColor: "#05080c",
                     onclone: (clonedDoc) => {
                         const target = clonedDoc.getElementById('rating-full-capture');
                         target.style.display = 'block';
                         target.style.padding = '20px';
                     }
                 });
                 generatedImage.value = canvas.toDataURL("image/png");
                 showModal.value = true;
             } catch (err) {
                 console.error("生成失敗:", err);
                 alert("画像の生成中にエラーが発生しました。");
             }
        };

        // Lifecycle
        onMounted(async () => {
            db = await initDB();
            loadFromLocal();
            if (isLoggedIn.value) await loadFromIndexedDB();
        });

        // Provide everything to the template
        return {
            tab, isLoggedIn, auth, masterScoreData, musicData, achievements,
            isSyncing, syncStatus, syncProgress, syncLogs,
            diffList, levelList, scoreFilterList, settings, filters, target,
            drawCount, results, musicMaster, chartSettings, chartOptions,
            enableAnimation, isAnimating, slots, animationStatusText,
            showModal, generatedImage,
            handleAuth, loadAndSync, logout: handleLogout, clearAllData,
            toggleAchievement, resetAchievements, toggle, drawLottery,
            saveToLocal, generateRatingImage, checkCondition, getRank, getRankThreshold,
            remainingMusic, achievedMusic, filteredMusic, genres, groupedByConst, ratingFrames
        };
    }
});

app.mount('#app');
