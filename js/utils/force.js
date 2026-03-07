/**
 * CHUNIFORCE（フォース値）計算ユーティリティ
 * 仕様: https://github.com/k-chunithm/chuni-force-calculator/blob/main/requirements.md
 */

/**
 * スコア補正値を計算する (仕様書 4.3)
 * @param {number} score - スコア
 * @param {number} constant - 譜面定数
 * @returns {number} レーティング値 (定数 + スコア補正値)
 */
export function calculateRatingValue(score, constant) {
    const s = parseInt(score, 10);
    const c = parseFloat(constant);
    if (!c || s <= 0) return 0;

    if (s >= 1010000) {
        // SSS+ 理論値: 定数 + 2.25
        return c + 2.25;
    } else if (s >= 1009000) {
        // SSS+ (1,009,000 ~ 1,010,000): 1点ごとに +0.0001
        return c + 2.15 + (s - 1009000) * 0.0001;
    } else if (s >= 1007500) {
        // SSS (1,007,500 ~ 1,009,000): 1点ごとに +0.0001
        return c + 2.0 + (s - 1007500) * 0.0001;
    } else if (s >= 1005000) {
        // SS+ (1,005,000 ~ 1,007,500): 1点ごとに +0.0002
        return c + 1.5 + (s - 1005000) * 0.0002;
    } else if (s >= 1000000) {
        // SS (1,000,000 ~ 1,005,000): 1点ごとに +0.0001
        return c + 1.0 + (s - 1000000) * 0.0001;
    } else if (s >= 990000) {
        // S+ (990,000 ~ 1,000,000): 10点ごとに +0.0004
        return c + 0.6 + (s - 990000) / 10 * 0.0004;
    } else if (s >= 975000) {
        // S (975,000 ~ 990,000): 10点ごとに +0.0004
        return c + (s - 975000) / 10 * 0.0004;
    } else if (s >= 950000) {
        // AAA (950,000 ~ 975,000): 15点ごとに +0.001
        return c - 1.67 + (s - 950000) / 15 * 0.001;
    } else if (s >= 925000) {
        // AA (925,000 ~ 950,000): 15点ごとに +0.001
        return c - 3.34 + (s - 925000) / 15 * 0.001;
    } else if (s >= 900000) {
        // A (900,000 ~ 925,000): 15点ごとに +0.001
        return c - 5.0 + (s - 900000) / 15 * 0.001;
    } else if (s >= 800000) {
        // BBB (800,000 ~ 900,000): (2000/(定数-5))点ごとに +0.01
        const base = (c - 5.0) / 2;
        const step = 2000 / (c - 5);
        if (step <= 0) return Math.max(0, base);
        return Math.max(0, base + (s - 800000) / step * 0.01);
    } else if (s >= 500000) {
        // C (500,000 ~ 800,000): (6000/(定数-5))点ごとに +0.01
        const step = 6000 / (c - 5);
        if (step <= 0) return 0;
        return Math.max(0, (s - 500000) / step * 0.01);
    }
    // 500,000未満: 0
    return 0;
}

/**
 * ランプ補正値を返す (仕様書 4.4)
 * @param {string} lamp - ランプ種別 (AJC/AJ/FC/NONE/NOPLAY)
 * @param {number} score - プレイ済みかの判定用
 * @returns {number} ランプ補正値
 */
export function getLampCorrection(lamp, score) {
    if (lamp === 'AJC') return 3.1;
    if (lamp === 'AJ') return 3.0;
    if (lamp === 'FC') return 2.0;
    // CLEAR相当: スコアがあるがランプ無し
    if (score > 0 && (lamp === 'NONE' || lamp === 'CLEAR')) return 1.5;
    return 0;
}

/**
 * 単曲FORCE値を計算する (仕様書 4.2)
 * 単曲force = レーティング値(定数+スコア補正) + ランプ補正
 */
export function calculateSingleForce(score, constant, lamp) {
    const ratingValue = calculateRatingValue(score, constant);
    const lampCorrection = getLampCorrection(lamp, lamp === 'NOPLAY' ? 0 : score);
    return ratingValue + lampCorrection;
}

/**
 * UI表示用にFORCE値の計算内訳(ベース・スコア補正・ランプ補正等)を一式返却する
 */
export function getForceDetails(score, constant, lamp) {
    const s = parseInt(score, 10);
    const c = parseFloat(constant);

    let base = 0;
    let rankStr = '';
    let bonus = 0;

    if (s >= 1010000)      { rankStr = 'SSS+'; base = c + 2.15; bonus = 0.1000; }
    else if (s >= 1009000) { rankStr = 'SSS+'; base = c + 2.15; bonus = (s - 1009000) * 0.0001; }
    else if (s >= 1007500) { rankStr = 'SSS'; base = c + 2.0; bonus = (s - 1007500) * 0.0001; }
    else if (s >= 1005000) { rankStr = 'SS+'; base = c + 1.5; bonus = (s - 1005000) * 0.0002; }
    else if (s >= 1000000) { rankStr = 'SS'; base = c + 1.0; bonus = (s - 1000000) * 0.0001; }
    else if (s >= 990000)  { rankStr = 'S+'; base = c + 0.6; bonus = (s - 990000) / 10 * 0.0004; }
    else if (s >= 975000)  { rankStr = 'S'; base = c; bonus = (s - 975000) / 10 * 0.0004; }
    else if (s >= 950000)  { rankStr = 'AAA'; base = c - 1.67; bonus = (s - 950000) / 15 * 0.001; }
    else if (s >= 925000)  { rankStr = 'AA'; base = c - 3.34; bonus = (s - 925000) / 15 * 0.001; }
    else if (s >= 900000)  { rankStr = 'A'; base = c - 5.0; bonus = (s - 900000) / 15 * 0.001; }
    else if (s >= 800000)  {
        rankStr = 'BBB';
        const b = (c - 5.0) / 2;
        const step = 2000 / (c - 5.0);
        base = Math.max(0, b);
        bonus = step > 0 ? (s - 800000) / step * 0.01 : 0;
    } else if (s >= 500000)  {
        rankStr = 'C';
        const step = 6000 / (c - 5.0);
        base = 0;
        bonus = step > 0 ? (s - 500000) / step * 0.01 : 0;
    } else {
        rankStr = 'D'; base = 0; bonus = 0;
    }

    const lampBonus = getLampCorrection(lamp, s);

    return {
        rankStr,
        baseValue: base.toFixed(2),
        scoreBonus: (bonus > 0 ? '+' : '') + bonus.toFixed(4),
        lampBonus: (lampBonus > 0 ? '+' : '') + lampBonus.toFixed(1)
    };
}

/**
 * 理論値枠の単曲AJC-FORCE値 (仕様書 4.6)
 * = (Const / 15.0)^2 * 2
 */
export function calculateAjcForce(constant) {
    const c = parseFloat(constant);
    return Math.pow(c / 15.0, 2) * 2;
}

/**
 * CLASS 一覧 (仕様書 5.4)
 */
const CLASS_DEFINITIONS = [
    { class: 'Ⅰ', color: '#888888', colorName: 'grey',    min: 0,     stars: [0, 2.5, 5.0, 7.5] },
    { class: 'Ⅱ', color: '#4488ff', colorName: 'blue',    min: 10,    stars: [10.0, 10.5, 11.0, 11.5] },
    { class: 'Ⅲ', color: '#44cc44', colorName: 'green',   min: 12,    stars: [12.0, 12.5, 13.0, 13.5] },
    { class: 'Ⅳ', color: '#ff8800', colorName: 'orange',  min: 14,    stars: [14.0, 14.25, 14.5, 14.75] },
    { class: 'Ⅴ', color: '#ff3333', colorName: 'red',     min: 15,    stars: [15.0, 15.25, 15.5, 15.75] },
    { class: 'Ⅵ', color: '#cc44cc', colorName: 'purple',  min: 16,    stars: [16.0, 16.25, 16.5, 16.75] },
    { class: 'Ⅶ', color: '#c0c0c0', colorName: 'silver',  min: 17,    stars: [17.0, 17.25, 17.5, 17.75] },
    { class: 'Ⅷ', color: '#ffcc00', colorName: 'gold',    min: 18,    stars: [18.0, 18.25, 18.5, 18.75] },
    { class: 'Ⅸ', color: '#9944ff', colorName: 'violet',  min: 19,    stars: [19.0, 19.25, 19.5, 19.75] },
    { class: 'Ⅹ', color: 'url(#goldx)', colorName: 'goldx', min: 20,    stars: [20.0, 21.0, 22.0, 23.0] },
];

/**
 * フォース値からCLASSと星数を取得する
 * @param {number} forceValue - フォース値
 * @returns {{ className: string, color: string, colorName: string, starCount: number }}
 */
export function getForceClass(forceValue) {
    let classDef = CLASS_DEFINITIONS[0]; // default Ⅰ

    for (let i = CLASS_DEFINITIONS.length - 1; i >= 0; i--) {
        if (forceValue >= CLASS_DEFINITIONS[i].min) {
            classDef = CLASS_DEFINITIONS[i];
            break;
        }
    }

    let starCount = 1;
    for (let i = classDef.stars.length - 1; i >= 0; i--) {
        if (forceValue >= classDef.stars[i]) {
            starCount = i + 1;
            break;
        }
    }

    return {
        className: classDef.class,
        color: classDef.color,
        colorName: classDef.colorName,
        starCount
    };
}
