// --- データベース ---
const korobiImg = new Image();
korobiImg.src = '../imag/korobidome.png';
korobiImg.onload = () => { if (typeof calc === 'function') calc(); };

async function checkAuth() { return true; }

const panelData = {
    "12_1": { t: 1.2, G: 40.0, fs: 0.23 },
    "12_2": { t: 1.2, G: 35.0, fs: 0.18 },
    "24_1": { t: 2.4, G: 40.0, fs: 0.23 },
    "28_1": { t: 2.8, G: 40.0, fs: 0.23 }
};
const nailData = {
    "12": {
        "N50": { k: 4.80, dv: 0.21, du: 1.53, Pv: 0.98 },
        "CN50": { k: 6.34, dv: 0.19, du: 1.81, Pv: 1.21 },
        "N65": { k: 6.29, dv: 0.21, du: 1.89, Pv: 1.31 },
        "CN65": { k: 8.26, dv: 0.25, du: 2.17, Pv: 2.05 }
    },
    "24": {
        "N75": { k: 6.51, dv: 0.25, du: 1.71, Pv: 1.62 },
        "CN75": { k: 10.13, dv: 0.18, du: 2.14, Pv: 1.85 }
    }
};
// 接合部剛性 kj (1箇所あたり kN/cm)
const jointData = {
    "nail_2_N75": { kj: 5.87, delta_jv: 0.35, delta_ju: 1.74, kv: 9.39, delta_vv: 0.28, delta_vu: 3.44, Pvj: 3.5, label: "N75×2本" },
    "nail_3_N75": { kj: 8.80, delta_jv: 0.35, delta_ju: 1.74, kv: 14.08, delta_vv: 0.28, delta_vu: 3.44, Pvj: 5.25, label: "N75×3本" }, 
    "nail_2_CN90": { kj: 7.00, delta_jv: 0.35, delta_ju: 1.74, kv: 11.2, delta_vv: 0.28, delta_vu: 3.44, Pvj: 4.2, label: "CN90×2本" },
    "nail_3_CN90": { kj: 10.5, delta_jv: 0.35, delta_ju: 1.74, kv: 16.8, delta_vv: 0.28, delta_vu: 3.44, Pvj: 6.3, label: "CN90×3本" },
    "rigid": { kj: 100.0, delta_jv: 0.20, delta_ju: 1.0, kv: 100.0, delta_vv: 0.20, delta_vu: 1.0, Pvj: 20.0, label: "金物" }
};

// --- JSON入出力機能 ---
async function exportData() {
    await checkAuth();
    const data = {
        params: {
            panel_spec: document.getElementById('panel_spec').value,
            nail_type: document.getElementById('nail_type').value,
            nail_pitch: document.getElementById('nail_pitch').value,
            roof_slope: document.getElementById('roof_slope').value,
            rafter_p_val: document.getElementById('rafter_p_val').value,
            rafter_b: document.getElementById('rafter_b').value,
            rafter_d: document.getElementById('rafter_d').value,
            rafter_l: document.getElementById('rafter_l').value,
            wood_E: document.getElementById('wood_E').value,
            wood_E_val: document.getElementById('wood_E_val').value,
            joint_spec: document.getElementById('joint_spec').value,
            korobi_spec: document.getElementById('korobi_spec').value,
            manual: document.getElementById('manual_mode').checked,
            Ixy: document.getElementById('manual_Ixy').value,
            Zxy: document.getElementById('manual_Zxy').value,
            Cxy: document.getElementById('manual_Cxy').value,
            beta: document.getElementById('manual_beta').value,
            end_rafter_pv_sel: document.getElementById('end_rafter_pv_sel') ? document.getElementById('end_rafter_pv_sel').value : "",
            end_rafter_pv: document.getElementById('end_rafter_pv') ? document.getElementById('end_rafter_pv').value : "",
            end_rafter_pitch: document.getElementById('end_rafter_pitch') ? document.getElementById('end_rafter_pitch').value : "",
            conditions: Array.from(document.querySelectorAll('.condition-cb')).map(cb => cb.checked)
        }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'taruki_roof_calc.json';
    a.click();
    URL.revokeObjectURL(url);
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    await checkAuth();
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // 釘配列計算ツールからのデータ連携チェック
            if (data.Ixy !== undefined && data.Zxy !== undefined) {
                document.getElementById('manual_mode').checked = true;
                document.getElementById('manual_Ixy').value = data.Ixy;
                document.getElementById('manual_Zxy').value = data.Zxy;
                if (data.Cxy !== undefined) document.getElementById('manual_Cxy').value = data.Cxy;
                if (data.beta !== undefined) document.getElementById('manual_beta').value = data.beta;
                calc();
                return;
            }

            const p = data.params || data;
            if(p.panel_spec) document.getElementById('panel_spec').value = p.panel_spec;
            updateOptions();
            
            if(p.nail_type) document.getElementById('nail_type').value = p.nail_type;
            if(p.nail_pitch) document.getElementById('nail_pitch').value = p.nail_pitch;
            if(p.roof_slope) document.getElementById('roof_slope').value = p.roof_slope;
            if(p.rafter_p_val) document.getElementById('rafter_p_val').value = p.rafter_p_val;
            if(p.rafter_b) document.getElementById('rafter_b').value = p.rafter_b;
            if(p.rafter_d) document.getElementById('rafter_d').value = p.rafter_d;
            if(p.rafter_l) document.getElementById('rafter_l').value = p.rafter_l;
            if(p.wood_E) document.getElementById('wood_E').value = p.wood_E;
            if(p.wood_E_val) document.getElementById('wood_E_val').value = p.wood_E_val;
            if(p.joint_spec) document.getElementById('joint_spec').value = p.joint_spec;
            if(p.korobi_spec) document.getElementById('korobi_spec').value = p.korobi_spec;
            
            if(p.end_rafter_pv_sel && document.getElementById('end_rafter_pv_sel')) document.getElementById('end_rafter_pv_sel').value = p.end_rafter_pv_sel;
            if(p.end_rafter_pv && document.getElementById('end_rafter_pv')) document.getElementById('end_rafter_pv').value = p.end_rafter_pv;
            if(p.end_rafter_pitch && document.getElementById('end_rafter_pitch')) document.getElementById('end_rafter_pitch').value = p.end_rafter_pitch;
            
            if(p.conditions && Array.isArray(p.conditions)) {
                const cbs = document.querySelectorAll('.condition-cb');
                cbs.forEach((cb, i) => { if (i < p.conditions.length) cb.checked = p.conditions[i]; });
            }
            
            if(p.manual !== undefined) {
                document.getElementById('manual_mode').checked = p.manual;
                document.getElementById('manual_Ixy').value = p.Ixy;
                document.getElementById('manual_Zxy').value = p.Zxy;
                document.getElementById('manual_Cxy').value = p.Cxy;
                document.getElementById('manual_beta').value = p.beta;
            }

            calc(); 
        } catch (err) { alert('読込失敗'); }
    };
    reader.readAsText(file);
}

// --- 制御ロジック ---
function syncPitch(fromSel) {
    const sel = document.getElementById('rafter_p_sel');
    const inp = document.getElementById('rafter_p_val');
    if(fromSel) {
        if(sel.value !== 'custom') inp.value = sel.value;
    } else {
        const val = inp.value;
        if(["227.5","303","455"].includes(val)) sel.value = val;
        else sel.value = "custom";
    }
    calc();
}

function updateOptions() {
    const pVal = document.getElementById('panel_spec').value;
    const thickKey = (pVal.startsWith("24") || pVal.startsWith("28")) ? "24" : "12";
    const sel = document.getElementById('nail_type');
    sel.innerHTML = "";
    for (let k in nailData[thickKey]) {
        const opt = document.createElement('option');
        opt.value = k; opt.text = k;
        sel.appendChild(opt);
    }
    sel.value = (thickKey==="24") ? "N75" : "N50";
    calc();
}

// --- メイン計算 ---
async function calc() {
    await checkAuth();

    const pSpec = document.getElementById('panel_spec').value;
    const thickKey = (pSpec.startsWith("24") || pSpec.startsWith("28")) ? "24" : "12";
    const pd = panelData[pSpec];
    const nVal = document.getElementById('nail_type').value;
    if (!nailData[thickKey][nVal]) return;
    const nd = nailData[thickKey][nVal];
    
    const nailP_mm = parseFloat(document.getElementById('nail_pitch').value); 
    const isManual = document.getElementById('manual_mode').checked;
    
const table321 = {
    "150": { Ixy: 1.54, Zxy: 0.038, Cxy: 1.31 },
    "100": { Ixy: 2.05, Zxy: 0.051, Cxy: 1.35 },
    "75":  { Ixy: 2.57, Zxy: 0.064, Cxy: 1.39 }
};

// --- メイン計算 ---
async function calc() {
    await checkAuth();

    const pSpec = document.getElementById('panel_spec').value;
    const thickKey = (pSpec.startsWith("24") || pSpec.startsWith("28")) ? "24" : "12";
    const pd = panelData[pSpec];
    const nVal = document.getElementById('nail_type').value;
    if (!nailData[thickKey][nVal]) return;
    const nd = nailData[thickKey][nVal];
    
    const nailP_mm = parseFloat(document.getElementById('nail_pitch').value); 
    const isManual = document.getElementById('manual_mode').checked;
    
    // 定数計算 (手入力でない場合は表3.2.1の川型の値を使用)
    let Ixy, Zxy, Cxy, beta_factor;
    if (isManual) {
        Ixy = parseFloat(document.getElementById('manual_Ixy').value) || 0;
        Zxy = parseFloat(document.getElementById('manual_Zxy').value) || 0;
        Cxy = parseFloat(document.getElementById('manual_Cxy').value) || 1.0;
        beta_factor = parseFloat(document.getElementById('manual_beta').value) || 1.0;
    } else {
        const arrData = table321[nailP_mm.toString()] || table321["150"];
        Ixy = arrData.Ixy;
        Zxy = arrData.Zxy;
        Cxy = arrData.Cxy;
        beta_factor = 1.0;
        document.getElementById('manual_Ixy').value = Ixy.toFixed(3);
        document.getElementById('manual_Zxy').value = Zxy.toFixed(4);
        document.getElementById('manual_Cxy').value = Cxy.toFixed(2);
        document.getElementById('manual_beta').value = beta_factor.toFixed(3);
    }

    const slope = parseFloat(document.getElementById('roof_slope').value);
    const cos = Math.cos(Math.atan(slope/10.0));

    const rp_cm = parseFloat(document.getElementById('rafter_p_val').value) / 10.0;
    const rb_cm = parseFloat(document.getElementById('rafter_b').value) / 10.0;
    const rd_cm = parseFloat(document.getElementById('rafter_d').value) / 10.0;
    const rl_cm = parseFloat(document.getElementById('rafter_l').value) / 10.0;
    
    const eSel = document.getElementById('wood_E').value;
    let E_val_Nmm = (eSel === 'custom') ? parseFloat(document.getElementById('wood_E_val').value) : parseFloat(eSel);
    if(eSel === 'custom') document.getElementById('wood_E_custom_div').style.display = 'flex';
    else document.getElementById('wood_E_custom_div').style.display = 'none';
    const E_kNcm2 = E_val_Nmm / 10.0; 
    const G_wood = E_kNcm2 / 15.0;

    const jd = jointData[document.getElementById('joint_spec').value];
    const korobi = document.getElementById('korobi_spec').value;

    document.getElementById('ref_G').innerText = pd.G;
    document.getElementById('ref_fs').innerText = pd.fs;
    document.getElementById('ref_k').innerText = nd.k;
    document.getElementById('ref_Pv').innerText = nd.Pv;

    // (1) 面材剛性 Ksh (1cmあたり)
    const term_sh1 = 1.0 / (Ixy * nd.k);
    const term_sh2 = 1.0 / (pd.G * pd.t);
    const deltaK0 = 1.0 / (term_sh1 + term_sh2);
    const Ksh_100 = deltaK0 * 100;

    // (2) 接合部剛性 Kj
    // _jIr = L / 2p (3.6.14式)
    const _jIr = rl_cm / (2.0 * rp_cm);
    const Kj_100 = jd.kj * _jIr * 100;

    // (3) 垂木ねじれ剛性 Ky (緑本 3.6.11, 3.6.13式)
    const Ip = (1/3 - 0.21 * (rb_cm/rd_cm) * (1 - Math.pow(rb_cm, 4)/(12*Math.pow(rd_cm, 4)))) * rd_cm * Math.pow(rb_cm, 3);
    const e = rd_cm; // 転ばし寸法
    
    let ky, ky2 = 0;
    let ksy = (korobi === 'full') ? 11.4 : 0;
    if (korobi === 'full') {
        ky2 = (1/6 * (rl_cm / (nailP_mm/10)) + 3 * Math.pow(rb_cm / (2*e), 2)) * ksy;
        ky = (2 * G_wood * Ip) / (Math.pow(e, 2) * rl_cm) + ky2;
    } else {
        ky = (2 * G_wood * Ip) / (Math.pow(e, 2) * rl_cm);
    }
    const Ky_100 = ky * _jIr * 100;

    // 合成剛性 KR (1cmあたり)
    const KR = 1.0 / ( (1.0/deltaK0) + (1.0/(jd.kj * _jIr)) + (1.0/(ky * _jIr)) );
    const KR_100 = KR * 100;

    // 3. 耐力計算 (1cmあたり)
    // (1) 面材支配
    const deltaMy = Zxy * nd.Pv; // [kN/cm]
    const deltaMu = Cxy * deltaMy; // [kN/cm]

    // (2) 接合部支配 (3.6.8式)
    let deltaQj;
    if (korobi === 'full') {
        const kx2 = jd.kv ? jd.kv * 2 : 0;
        const delta_jv = jd.delta_jv || 0.35;
        const delta_vv = jd.delta_vv || 0.28;
        deltaQj = jd.kj * delta_jv + kx2 * delta_vv;
        if (!jd.kv) deltaQj = jd.Pvj; // フォールバック
    } else {
        const delta_jv = jd.delta_jv || 0.35;
        deltaQj = jd.kj * delta_jv;
        if (!jd.delta_jv) deltaQj = jd.Pvj; // フォールバック
    }
    const Pyj = deltaQj / rp_cm; // [kN/cm]
    
    const Py = Math.min(deltaMy, Pyj); // [kN/cm]
    const Pu = Math.min(deltaMu, Pyj); // [kN/cm]

    // 4. 許容耐力 Pa
    const P150 = KR / 150.0; // [kN/cm]

    const Ry = Py / KR; // [rad]
    const Ry0 = deltaMy / deltaK0; // [rad]
    const mu0_num = nd.du * pd.G * pd.t + nd.dv * Ixy * nd.k;
    const mu0_den = nd.dv * (pd.G * pd.t + Ixy * nd.k);
    const mu0 = mu0_den > 0 ? mu0_num / mu0_den : 0;

    let Ru;
    if (deltaMu <= Pyj) {
        // (3.6.20a)式: Pu = ΔMu のとき
        Ru = Ry + (mu0 - 1) * Ry0;
    } else {
        // (3.6.20b)式: Pu = Pyj のとき
        const delta_ju = jd.delta_ju || 1.74;
        const delta_jv = jd.delta_jv || 0.35;
        Ru = Ry + (2.0 * (delta_ju - delta_jv)) / rl_cm;
    }
    const mu = Ry > 0 ? Ru / Ry : 0;

    const Pmult = 0.2 * Math.sqrt(Math.max(0, 2*mu - 1)) * Pu; // [kN/cm]
    const Ps = pd.fs * pd.t; // 面材許容せん断耐力 [kN/cm]

    const minP = Math.min(Py, P150, Pmult, Ps); // [kN/cm]
    const Pa = minP * cos * 100; // [kN/m] に換算

    // 条件チェック
    let allChecked = true;
    const cbs = document.querySelectorAll('.condition-cb');
    if (cbs.length > 0) {
        cbs.forEach(cb => { if(!cb.checked) allChecked = false; });
    }

    const pv_end = parseFloat(document.getElementById('end_rafter_pv').value) || 0.63;
    const q_end_cm = (parseFloat(document.getElementById('end_rafter_pitch').value) || 150) / 10;
    const q_panel_cm = nailP_mm / 10;
    const pv_panel = nd.Pv;

    // (3.6.2)式 端垂木留め付け検定
    const ratio_362 = (pv_panel / q_panel_cm) / (pv_end / q_end_cm);
    let formula362_ok = ratio_362 < 1.5;

    // (3.6.3)式 垂木-桁接合部先行破壊検定
    const B_cm = rl_cm;
    const ratio_363 = (pv_panel * (B_cm + 2.0 * q_panel_cm)) / (4.0 * q_panel_cm * deltaQj);
    let formula363_ok = ratio_363 < 1.0;

    let errorMsgs = [];
    if (!allChecked) errorMsgs.push("適用条件のチェックボックスがすべてチェックされていません。");
    if (!formula362_ok) errorMsgs.push(`公式(3.6.2) 端垂木留め付け検定 NG (比率 ${ratio_362.toFixed(2)} ≧ 1.5)`);
    if (!formula363_ok) errorMsgs.push(`公式(3.6.3) 垂木-桁接合部先行破壊検定 NG (比率 ${ratio_363.toFixed(2)} ≧ 1.0)`);

    const warning = document.getElementById('condition_warning');
    if (errorMsgs.length > 0) {
        if (warning) {
            warning.style.display = 'block';
            warning.innerHTML = "※" + errorMsgs.join("<br>※");
        }
        allChecked = false; // Block calculation
    } else {
        if (warning) {
            warning.style.display = 'none';
            warning.innerHTML = "※適用条件がすべてチェックされていないため、計算は実行されません。";
        }
        allChecked = true;
    }

    if (!allChecked) {
        document.getElementById('res_Pa').innerText = "---";
        if (document.getElementById('header_result')) document.getElementById('header_result').innerText = "--- kN/m";
        document.getElementById('res_Ps').innerText = "---";
        document.getElementById('res_Py').innerText = "---";
        document.getElementById('res_Pu').innerText = "---";
        document.getElementById('res_P150').innerText = "---";
        document.getElementById('res_KR').innerText = "---";
        document.getElementById('res_check').innerText = "---";
        document.getElementById('res_check').style.color = "inherit";
        document.getElementById('val_Ksh').innerText = "---";
        document.getElementById('val_Kj').innerText = "---";
        document.getElementById('val_Ky').innerText = "---";
        return;
    }

    let finalPa = Pa;
    if(finalPa > 13.72) finalPa = 13.72;
    let resMsg = (finalPa === 13.72 ? "(上限値)" : "(OK)");
    
    document.getElementById('res_Pa').innerText = finalPa.toFixed(2);
    if (document.getElementById('header_result')) document.getElementById('header_result').innerText = finalPa.toFixed(2) + " kN/m";
    document.getElementById('res_Ps').innerText = (Ps * 100 * cos).toFixed(2);
    document.getElementById('res_Py').innerText = (Py * 100 * cos).toFixed(2);
    document.getElementById('res_Pu').innerText = (Pu * 100 * cos).toFixed(2);
    document.getElementById('res_P150').innerText = (P150 * 100 * cos).toFixed(2);
    document.getElementById('res_KR').innerText = KR.toFixed(3);
    document.getElementById('res_check').innerText = resMsg;
    document.getElementById('res_check').style.color = (finalPa===13.72 ? "#d35400" : "#38a169");

    document.getElementById('val_Ksh').innerText = Ksh_100.toFixed(1);
    document.getElementById('val_Kj').innerText = Kj_100.toFixed(1);
    document.getElementById('val_Ky').innerText = Ky_100.toFixed(1);

    drawViz(slope, korobi, document.getElementById('joint_spec').value, rp_cm*10, rb_cm*10, rd_cm*10);
}

function drawViz(slope, korobi, joint, rp, rb, rd) {
    const cvs = document.getElementById('detailCanvas');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = 350; const h = 200;
    cvs.width = w * dpr; cvs.height = h * dpr;
    ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr, dpr);
    ctx.clearRect(0,0,w,h);

    const ox = 175; const oy = 110;
    const ang = Math.atan(slope/10);

    if (korobiImg.complete && korobiImg.naturalWidth > 0) {
        const scale = Math.min(w / korobiImg.naturalWidth, h / korobiImg.naturalHeight);
        const imgW = korobiImg.naturalWidth * scale;
        const imgH = korobiImg.naturalHeight * scale;
        ctx.drawImage(korobiImg, (w - imgW)/2, (h - imgH)/2, imgW, imgH);
    }
}

function initApp() {
    updateOptions();
}
