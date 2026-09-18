// =========================================
// 片持ち基礎梁の検定（玄関ポーチ等・柱あり）
// cantilever_foundation_beam.js
// =========================================

const REBAR_DATA = {
    '1-D10': { at: 71, ft: 195 },
    '2-D10': { at: 142, ft: 195 },
    '1-D13': { at: 127, ft: 195 },
    '2-D13': { at: 254, ft: 195 },
    '3-D13': { at: 381, ft: 195 },
    '1-D16': { at: 199, ft: 195 },
    '2-D16': { at: 398, ft: 195 },
    '1-D13+1-D16': { at: 326, ft: 195 },
    '1-D19': { at: 287, ft: 215 },
    '2-D19': { at: 574, ft: 215 }
};

const FC_DATA = {
    '21': 0.70,
    '24': 0.73,
    '27': 0.76,
    '30': 0.79
};

// 初期データ（サンプル: X1通り Y3-Y1）
let beamRows = [
    {
        pos: 'X1Y2',
        P: 7.658,
        L: 0.9,
        b: 150,
        D: 670,
        w: 2.72,
        La: '',
        M: 7.994,
        Q: 9.340,
        rebar: '1-D13',
        dt: 70,
        alpha: 2.0,
        LQa_custom: 110.25
    },
    {
        pos: 'X1Y1',
        P: 10.967,
        L: 0.9,
        b: 150,
        D: 1430,
        w: 5.76,
        La: 1.430,
        M: 33.502,
        Q: 26.257,
        rebar: '2-D13',
        dt: 70,
        alpha: 1.0,
        LQa_custom: 124.95
    }
];

window.addEventListener('DOMContentLoaded', () => {
    renderRows();
});

function renderRows() {
    const tbody = document.getElementById('beamTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const fc = document.getElementById('fc_select').value;
    const fs = FC_DATA[fc] || 0.70;

    let sumP = 0;
    let sumL = 0;

    beamRows.forEach((row, idx) => {
        sumP += parseFloat(row.P) || 0;
        sumL += parseFloat(row.L) || 0;

        // 自重計算 (D + 10mm レベラー)
        const dLeveler = (parseFloat(row.D) || 0) + 10;
        const calcW = ((parseFloat(row.b) || 0) / 1000) * (dLeveler / 1000) * 24;
        const selfWeight = calcW * (parseFloat(row.L) || 0);

        // 耐力計算 (レベラーなし元のDで有効成d, jを算出)
        const D_orig = parseFloat(row.D) || 0;
        const dt = parseFloat(row.dt) || 70;
        const d = Math.max(D_orig - dt, 0);
        const j = (7 / 8) * d;

        const rebarInfo = REBAR_DATA[row.rebar] || { at: 127, ft: 195 };
        const at = rebarInfo.at;
        const ft = rebarInfo.ft;

        const LMa = (at * ft * j) / 1000000;

        // せん断耐力 (手動転記値優先、なければ自動計算)
        let LQa = parseFloat(row.LQa_custom);
        if (isNaN(LQa) || LQa <= 0) {
            LQa = ((parseFloat(row.b) || 0) * j * fs * (parseFloat(row.alpha) || 1.0)) / 1000;
        }

        const M = parseFloat(row.M) || 0;
        const Q = parseFloat(row.Q) || 0;

        const mRatio = LMa > 0 ? (M / LMa) : 0;
        const qRatio = LQa > 0 ? (Q / LQa) : 0;
        const isOk = mRatio <= 1.0 && qRatio <= 1.0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="cfb-input cfb-input-text" value="${row.pos}" onchange="updateRow(${idx}, 'pos', this.value)"></td>
            <td><input type="number" class="cfb-input" value="${row.P}" step="0.001" onchange="updateRow(${idx}, 'P', this.value)"></td>
            <td><input type="number" class="cfb-input" value="${row.L}" step="0.05" onchange="updateRow(${idx}, 'L', this.value)"></td>
            <td><input type="number" class="cfb-input" value="${row.b}" step="10" onchange="updateRow(${idx}, 'b', this.value)"></td>
            <td><input type="number" class="cfb-input" value="${row.D}" step="10" onchange="updateRow(${idx}, 'D', this.value)"></td>
            <td>${selfWeight.toFixed(3)}</td>
            <td><input type="number" class="cfb-input" value="${row.w}" step="0.01" onchange="updateRow(${idx}, 'w', this.value)"></td>
            <td><input type="number" class="cfb-input" value="${row.M}" step="0.001" onchange="updateRow(${idx}, 'M', this.value)"></td>
            <td><input type="number" class="cfb-input" value="${row.Q}" step="0.001" onchange="updateRow(${idx}, 'Q', this.value)"></td>
            <td>
                <select class="cfb-input" style="text-align:left;" onchange="updateRow(${idx}, 'rebar', this.value)">
                    ${Object.keys(REBAR_DATA).map(k => `<option value="${k}" ${k === row.rebar ? 'selected' : ''}>${k} (${REBAR_DATA[k].at}mm²)</option>`).join('')}
                </select>
            </td>
            <td>${j.toFixed(0)}</td>
            <td style="font-weight:bold;">${LMa.toFixed(3)}</td>
            <td>
                <input type="number" class="cfb-input" value="${row.LQa_custom || LQa.toFixed(2)}" step="0.01" placeholder="${LQa.toFixed(2)}" title="アーキトレンドから転記" onchange="updateRow(${idx}, 'LQa_custom', this.value)">
            </td>
            <td style="font-weight:bold; color:${mRatio > 1.0 ? 'var(--danger)' : 'inherit'}">${mRatio.toFixed(3)}</td>
            <td style="font-weight:bold; color:${qRatio > 1.0 ? 'var(--danger)' : 'inherit'}">${qRatio.toFixed(3)}</td>
            <td><span class="cfb-badge ${isOk ? 'cfb-badge-ok' : 'cfb-badge-ng'}">${isOk ? 'OK' : 'NG'}</span></td>
            <td class="no-print">
                <button class="btn btn-secondary" style="padding:2px 6px; font-size:0.75rem;" onclick="removeRow(${idx})">削除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // 合計行の更新
    document.getElementById('sum_P').innerText = sumP.toFixed(3);
    document.getElementById('sum_L').innerText = sumL.toFixed(2);
}

function updateRow(idx, field, value) {
    beamRows[idx][field] = value;
    renderRows();
}

function addRow() {
    beamRows.push({
        pos: 'X1Y' + (beamRows.length + 1),
        P: 5.0,
        L: 0.9,
        b: 150,
        D: 600,
        w: 2.4,
        La: '',
        M: 5.0,
        Q: 6.0,
        rebar: '1-D13',
        dt: 70,
        alpha: 1.0,
        LQa_custom: ''
    });
    renderRows();
}

function removeRow(idx) {
    if (beamRows.length <= 1) {
        alert('少なくとも1行は必要です。');
        return;
    }
    beamRows.splice(idx, 1);
    renderRows();
}

// 印刷用帳票生成と実行
function printReport() {
    if (typeof GlobalInfo !== 'undefined' && GlobalInfo.updatePrintHeader) {
        GlobalInfo.updatePrintHeader();
    }

    const titleEl = document.getElementById('report_span_title');
    const spanVal = document.getElementById('span_name').value;
    if (titleEl) titleEl.innerText = spanVal;

    const fcVal = document.getElementById('fc_select').value;
    const fsVal = FC_DATA[fcVal] || 0.70;

    const tbody = document.getElementById('print_table_body');
    tbody.innerHTML = '';

    beamRows.forEach(row => {
        const dLeveler = (parseFloat(row.D) || 0) + 10;
        const calcW = ((parseFloat(row.b) || 0) / 1000) * (dLeveler / 1000) * 24;
        const selfWeight = calcW * (parseFloat(row.L) || 0);

        const D_orig = parseFloat(row.D) || 0;
        const dt = parseFloat(row.dt) || 70;
        const d = Math.max(D_orig - dt, 0);
        const j = (7 / 8) * d;

        const rebarInfo = REBAR_DATA[row.rebar] || { at: 127, ft: 195 };
        const LMa = (rebarInfo.at * rebarInfo.ft * j) / 1000000;

        let LQa = parseFloat(row.LQa_custom);
        if (isNaN(LQa) || LQa <= 0) {
            LQa = ((parseFloat(row.b) || 0) * j * fsVal * (parseFloat(row.alpha) || 1.0)) / 1000;
        }

        const M = parseFloat(row.M) || 0;
        const Q = parseFloat(row.Q) || 0;
        const mRatio = LMa > 0 ? (M / LMa) : 0;
        const qRatio = LQa > 0 ? (Q / LQa) : 0;
        const isOk = mRatio <= 1.0 && qRatio <= 1.0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.pos}</td>
            <td>${parseFloat(row.P).toFixed(3)}</td>
            <td>${parseFloat(row.L).toFixed(2)}</td>
            <td>${row.b} × ${row.D}</td>
            <td>${selfWeight.toFixed(3)}</td>
            <td>${parseFloat(row.w).toFixed(2)}</td>
            <td>${M.toFixed(3)}</td>
            <td>${Q.toFixed(3)}</td>
            <td>${row.rebar}</td>
            <td>${j.toFixed(0)}</td>
            <td>${LMa.toFixed(3)}</td>
            <td>${LQa.toFixed(2)}</td>
            <td>${mRatio.toFixed(3)}</td>
            <td>${qRatio.toFixed(3)}</td>
            <td style="font-weight:bold; color:${isOk ? '#166534' : '#991b1b'};">${isOk ? 'OK' : 'NG'}</td>
        `;
        tbody.appendChild(tr);
    });

    window.print();
}
