// =========================================
// 片持ち基礎梁（端部柱なし）＋ 片土圧検定
// cantilever_beam_no_column.js
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

// スラブ・立上がり配筋断面積テーブル (cm²/m)
const SLAB_REBAR_DATA = {
    'D10@200': 3.55,
    'D10@150': 4.73,
    'D10@100': 7.10,
    'D13@200': 6.35,
    'D13@150': 8.47,
    'D13@100': 12.70
};

// ブロック1: 参照梁リスト
let refBeams = [
    { name: 'X1 通り Y8 - Y9', QL: 3.255 },
    { name: 'Y9 通り X1 - X4', QL: 13.139 }
];

window.addEventListener('DOMContentLoaded', () => {
    renderRefBeams();
    calcCantileverBeam();
    calcEarthPressure();
});

// --- ブロック1: 参照梁・片持ち基礎梁計算 ---
function renderRefBeams() {
    const tbody = document.getElementById('refBeamTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let sumQL = 0;
    refBeams.forEach((b, idx) => {
        sumQL += parseFloat(b.QL) || 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="cbnc-input cbnc-input-text" value="${b.name}" onchange="updateRefBeam(${idx}, 'name', this.value)"></td>
            <td><input type="number" class="cbnc-input" value="${b.QL}" step="0.001" onchange="updateRefBeam(${idx}, 'QL', this.value)"></td>
            <td class="no-print">
                <button class="btn btn-secondary" style="padding:2px 6px; font-size:0.75rem;" onclick="removeRefBeam(${idx})">削除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('sum_P_val').innerText = sumQL.toFixed(3);
    calcCantileverBeam();
}

function updateRefBeam(idx, field, val) {
    refBeams[idx][field] = val;
    renderRefBeams();
}

function addRefBeam() {
    refBeams.push({ name: '参照梁' + (refBeams.length + 1), QL: 5.0 });
    renderRefBeams();
}

function removeRefBeam(idx) {
    if (refBeams.length <= 1) {
        alert('少なくとも1行は必要です。');
        return;
    }
    refBeams.splice(idx, 1);
    renderRefBeams();
}

function calcCantileverBeam() {
    let sumP = 0;
    refBeams.forEach(b => { sumP += parseFloat(b.QL) || 0; });

    const spanL = parseFloat(document.getElementById('span_L').value) || 1.0;
    const M = sumP * spanL;
    const Q = sumP;

    document.getElementById('res_M').innerText = M.toFixed(3);
    document.getElementById('res_Q').innerText = Q.toFixed(3);

    const D = parseFloat(document.getElementById('beam_D').value) || 700;
    const dt = parseFloat(document.getElementById('beam_dt').value) || 70;
    
    // 応力心距離 j
    let j = (7 / 8) * (D - dt);
    const jManual = parseFloat(document.getElementById('beam_j').value);
    if (!isNaN(jManual) && jManual > 0) {
        j = jManual;
    } else {
        document.getElementById('beam_j').value = j.toFixed(0);
    }

    const rebarKey = document.getElementById('beam_rebar').value;
    const rebarInfo = REBAR_DATA[rebarKey] || { at: 254, ft: 195 };
    document.getElementById('beam_at').innerText = rebarInfo.at;

    const LMa = (rebarInfo.at * rebarInfo.ft * j) / 1000000;
    document.getElementById('beam_LMa').innerText = LMa.toFixed(3);

    const LQa = parseFloat(document.getElementById('beam_LQa').value) || 113.925;

    const mRatio = LMa > 0 ? (M / LMa) : 0;
    const qRatio = LQa > 0 ? (Q / LQa) : 0;
    const isOk = mRatio <= 1.0 && qRatio <= 1.0;

    document.getElementById('beam_mRatio').innerText = mRatio.toFixed(2);
    document.getElementById('beam_qRatio').innerText = qRatio.toFixed(2);

    const badge = document.getElementById('beam_judgement');
    badge.className = 'cbnc-badge ' + (isOk ? 'cbnc-badge-ok' : 'cbnc-badge-ng');
    badge.innerText = isOk ? 'OK' : 'NG';
}

// --- ブロック2: 片土圧検定計算 ---
function calcEarthPressure() {
    const qSlab = parseFloat(document.getElementById('ep_q_slab').value) || 20.012;
    const ka = parseFloat(document.getElementById('ep_ka').value) || 0.5;
    const h = parseFloat(document.getElementById('ep_h').value) || 0.85;
    const gamma = parseFloat(document.getElementById('ep_gamma').value) || 16.0;

    const P1 = ka * qSlab;
    const P2 = ka * gamma * h;

    document.getElementById('ep_P1').innerText = P1.toFixed(3);
    document.getElementById('ep_P2').innerText = P2.toFixed(2);

    // M = 1/2 * P1 * h^2 + 2/3 * P2 * h^2
    const M1 = 0.5 * P1 * Math.pow(h, 2);
    const M2 = (2 / 3) * P2 * Math.pow(h, 2);
    const M_total = M1 + M2;

    document.getElementById('ep_M').innerText = M_total.toFixed(3);
    document.getElementById('ep_formula_detail').innerText = 
        `M = 1/2 × ${P1.toFixed(3)} × ${h.toFixed(2)}² + 2/3 × ${P2.toFixed(2)} × ${h.toFixed(2)}² = ${M_total.toFixed(3)} kN・m`;

    // 1. 立上がり部
    const standB = parseFloat(document.getElementById('stand_b').value) || 300;
    const standDt = parseFloat(document.getElementById('stand_dt').value) || 70;
    const standJ = (7 / 8) * (standB - standDt); // 例: 7/8 * 230 = 201.25
    document.getElementById('stand_j').innerText = standJ.toFixed(1);

    // at = M * 100 / (19.5 * j/10) (cm²)
    const standAt = (M_total * 100) / (19.5 * (standJ / 10));
    document.getElementById('stand_at').innerText = standAt.toFixed(2);

    const standRebarKey = document.getElementById('stand_rebar').value;
    const standRebarArea = SLAB_REBAR_DATA[standRebarKey] || 3.55;
    document.getElementById('stand_area').innerText = standRebarArea.toFixed(2);

    const standRatio = standAt / standRebarArea;
    document.getElementById('stand_ratio').innerText = standRatio.toFixed(2);
    const standBadge = document.getElementById('stand_judgement');
    const isStandOk = standRatio <= 1.0;
    standBadge.className = 'cbnc-badge ' + (isStandOk ? 'cbnc-badge-ok' : 'cbnc-badge-ng');
    standBadge.innerText = isStandOk ? 'OK' : 'NG';

    // 2. スラブ部
    const slabTb = parseFloat(document.getElementById('slab_tb').value) || 150;
    const slabDt = parseFloat(document.getElementById('slab_dt').value) || 80;
    let slabJ = (7 / 8) * (slabTb - slabDt); // 例: 70
    if (slabJ <= 0) slabJ = 70.0;
    const slabJManual = parseFloat(document.getElementById('slab_j_input').value);
    if (!isNaN(slabJManual) && slabJManual > 0) slabJ = slabJManual;
    else document.getElementById('slab_j_input').value = slabJ.toFixed(1);

    const slabAt = (M_total * 100) / (19.5 * (slabJ / 10));
    document.getElementById('slab_at').innerText = slabAt.toFixed(2);

    const slabRebarKey = document.getElementById('slab_rebar').value;
    const slabRebarArea = SLAB_REBAR_DATA[slabRebarKey] || 8.47;
    document.getElementById('slab_area').innerText = slabRebarArea.toFixed(2);

    const slabRatio = slabAt / slabRebarArea;
    document.getElementById('slab_ratio').innerText = slabRatio.toFixed(2);
    const slabBadge = document.getElementById('slab_judgement');
    const isSlabOk = slabRatio <= 1.0;
    slabBadge.className = 'cbnc-badge ' + (isSlabOk ? 'cbnc-badge-ok' : 'cbnc-badge-ng');
    slabBadge.innerText = isSlabOk ? 'OK' : 'NG';
}

// --- 印刷処理 ---
function printReport() {
    if (typeof GlobalInfo !== 'undefined' && GlobalInfo.updatePrintHeader) {
        GlobalInfo.updatePrintHeader();
    }

    // 帳票用タイトルの反映
    document.getElementById('p_beam_name').innerText = document.getElementById('beam_name').value;
    document.getElementById('p_ep_name').innerText = document.getElementById('ep_name').value;

    // 参照梁テーブルの反映
    const pRefTbody = document.getElementById('p_ref_tbody');
    pRefTbody.innerHTML = '';
    let sumP = 0;
    refBeams.forEach(b => {
        sumP += parseFloat(b.QL) || 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${b.name}</td><td>${parseFloat(b.QL).toFixed(3)}</td>`;
        pRefTbody.appendChild(tr);
    });
    document.getElementById('p_sum_P').innerText = sumP.toFixed(3);

    // 片持ち梁結果の反映
    const spanL = parseFloat(document.getElementById('span_L').value) || 1.0;
    const M = sumP * spanL;
    const Q = sumP;
    document.getElementById('p_span_L').innerText = spanL.toFixed(2);
    document.getElementById('p_M').innerText = M.toFixed(3);
    document.getElementById('p_Q').innerText = Q.toFixed(3);

    document.getElementById('p_D').innerText = document.getElementById('beam_D').value;
    document.getElementById('p_dt').innerText = document.getElementById('beam_dt').value;
    document.getElementById('p_j').innerText = document.getElementById('beam_j').value;

    document.getElementById('p_rebar').innerText = document.getElementById('beam_rebar').value;
    document.getElementById('p_at').innerText = document.getElementById('beam_at').innerText;
    document.getElementById('p_LMa').innerText = document.getElementById('beam_LMa').innerText;
    document.getElementById('p_LQa').innerText = document.getElementById('beam_LQa').value;
    document.getElementById('p_mRatio').innerText = document.getElementById('beam_mRatio').innerText;
    document.getElementById('p_qRatio').innerText = document.getElementById('beam_qRatio').innerText;

    // 片土圧結果の反映
    document.getElementById('p_q_slab').innerText = document.getElementById('ep_q_slab').value;
    document.getElementById('p_ka').innerText = document.getElementById('ep_ka').value;
    document.getElementById('p_h').innerText = document.getElementById('ep_h').value;
    document.getElementById('p_gamma').innerText = document.getElementById('ep_gamma').value;

    document.getElementById('p_P1').innerText = document.getElementById('ep_P1').innerText;
    document.getElementById('p_P2').innerText = document.getElementById('ep_P2').innerText;
    document.getElementById('p_ep_M').innerText = document.getElementById('ep_M').innerText;
    document.getElementById('p_formula').innerText = document.getElementById('ep_formula_detail').innerText;

    // 立上がり
    document.getElementById('p_stand_b').innerText = document.getElementById('stand_b').value;
    document.getElementById('p_stand_dt').innerText = document.getElementById('stand_dt').value;
    document.getElementById('p_stand_j').innerText = document.getElementById('stand_j').innerText;
    document.getElementById('p_stand_at').innerText = document.getElementById('stand_at').innerText;
    document.getElementById('p_stand_rebar').innerText = document.getElementById('stand_rebar').value;
    document.getElementById('p_stand_area').innerText = document.getElementById('stand_area').innerText;
    document.getElementById('p_stand_ratio').innerText = document.getElementById('stand_ratio').innerText;

    // スラブ
    document.getElementById('p_slab_tb').innerText = document.getElementById('slab_tb').value;
    document.getElementById('p_slab_dt').innerText = document.getElementById('slab_dt').value;
    document.getElementById('p_slab_j').innerText = document.getElementById('slab_j_input').value;
    document.getElementById('p_slab_at').innerText = document.getElementById('slab_at').innerText;
    document.getElementById('p_slab_rebar').innerText = document.getElementById('slab_rebar').value;
    document.getElementById('p_slab_area').innerText = document.getElementById('slab_area').innerText;
    document.getElementById('p_slab_ratio').innerText = document.getElementById('slab_ratio').innerText;

    window.print();
}
