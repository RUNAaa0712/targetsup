export function calculateRating(score, constant) {
    const s = parseInt(score, 10);
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
}

export function getRankThreshold(rank) {
    const thresholds = {
        'SSS+': 1009000, 'SSS': 1007500, 'SS+': 1005000, 'SS': 1000000,
        'S': 975000, 'AAA': 950000, 'AA': 925000, 'A': 900000,
        'BBB': 800000, 'BB': 700000, 'B': 600000, 'C': 500000, 'D': 0
    };
    return thresholds[rank] !== undefined ? thresholds[rank] : 0;
}

export function getRank(score) {
    if (score >= 1009000) return 'SSS+';
    if (score >= 1007500) return 'SSS';
    if (score >= 1005000) return 'SS+';
    if (score >= 1000000) return 'SS';
    if (score >= 975000) return 'S';
    if (score >= 950000) return 'AAA';
    if (score >= 925000) return 'AA';
    if (score >= 900000) return 'A';
    return 'D';
}
