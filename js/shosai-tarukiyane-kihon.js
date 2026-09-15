// --- データベース ---
const korobiImg = new Image();
korobiImg.src = '../imag/korobidome.png';
korobiImg.onload = () => { 
    if (typeof calc === 'function') {
        const res = document.getElementById('results');
        if (res && res.style.display !== 'none') calc(false);
        else calc(true);
    }
};

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

const table321 = {
    "150": { "川型": { Ixy: 1.54, Zxy: 0.038, Csy: 1.31 }, "山型": { Ixy: 2.10, Zxy: 0.046, Csy: 1.42 }, "日型": { Ixy: 2.82, Zxy: 0.070, Csy: 1.18 } },
    "100": { "川型": { Ixy: 2.05, Zxy: 0.051, Csy: 1.35 }, "山型": { Ixy: 2.99, Zxy: 0.064, Csy: 1.49 }, "日型": { Ixy: 4.31, Zxy: 0.107, Csy: 1.18 } },
    "75": { "川型": { Ixy: 2.57, Zxy: 0.064, Csy: 1.39 }, "山型": { Ixy: 3.92, Zxy: 0.083, Csy: 1.51 }, "日型": { Ixy: 5.81, Zxy: 0.143, Csy: 1.18 } }
};

const jointData = {
    "nail_2_N75": { kj: 5.87, delta_jv: 0.35, delta_ju: 1.74, kv: 9.39, delta_vv: 0.28, delta_vu: 3.44, label: "N75×2本" },
    "nail_3_N75": { kj: 8.80, delta_jv: 0.35, delta_ju: 1.74, kv: 14.08, delta_vv: 0.28, delta_vu: 3.44, label: "N75×3本" }, 
    "nail_2_CN90": { kj: 7.00, delta_jv: 0.35, delta_ju: 1.74, kv: 11.2, delta_vv: 0.28, delta_vu: 3.44, label: "CN90×2本" },
    "nail_3_CN90": { kj: 10.5, delta_jv: 0.35, delta_ju: 1.74, kv: 16.8, delta_vv: 0.28, delta_vu: 3.44, label: "CN90×3本" },
    "rigid": { kj: 100.0, delta_jv: 0.20, delta_ju: 1.0, kv: 100.0, delta_vv: 0.20, delta_vu: 1.0, label: "金物" }
};

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
    if (typeof onInputChanged === 'function') onInputChanged();
    else calc();
}

function onInputChanged() {
    calc(true);
}

async function calc(isJustInput = false) {
    await checkAuth();

    const pSpec = document.getElementById('panel_spec').value;
    const thickKey = (pSpec.startsWith("24") || pSpec.startsWith("28")) ? "24" : "12";
    const pd = panelData[pSpec];
    const nVal = document.getElementById('nail_type').value;
    if (!nailData[thickKey][nVal]) return;
    const nd = nailData[thickKey][nVal];
    
    const nailPitchStr = document.getElementById('nail_pitch').value; 
    const nailPatternStr = document.getElementById('nail_pattern').value;
    
    const arrData = table321[nailPitchStr][nailPatternStr];
    const Ixy = arrData.Ixy;
    const Zxy = arrData.Zxy;
    const Cxy = arrData.Csy; // Csy is used in table

    document.getElementById('arrangement-data').innerText = `Ixy = ${Ixy.toFixed(2)}, Zxy = ${Zxy.toFixed(3)}, Cxy = ${Cxy.toFixed(2)}`;

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

    let html = "";
    const add = (text) => html += `<div class="result-step">${text}</div>`;

    // 1) 
    add(`<strong>1) 面材釘の1面せん断データを用意する</strong>構造用合板 ${pd.t*10}mm+${nVal}: k=${nd.k} [kN/cm]、δv=${nd.dv} [cm]、δu=${nd.du} [cm]、ΔPv_面材=${nd.Pv} [kN]`);

    // 2) 
    add(`<strong>2) 面材のせん断弾性係数や寸法等の数値を用意する</strong>面材のせん断弾性係数 Gθ=${pd.G} [kN/cm²]<br>面材の厚さ t=${pd.t} [cm]、面材の垂木方向の幅 B=${rl_cm} [cm]`);

    // 3) 
    add(`<strong>3) 釘の配列による Ixy, Zxy, Cxy を用意する</strong>Ixy=${Ixy.toFixed(2)}、Zxy=${Zxy.toFixed(3)}、Cxy=${Cxy.toFixed(2)}`);

    // 4) 
    add(`<strong>4) 垂木桁接合部のせん断データを用意する</strong>垂木直交方向: kj=${jd.kj} [kN/cm]、δjv=${jd.delta_jv} [cm]、δju=${jd.delta_ju} [cm]<br>
垂木軸方向: kv=${jd.kv} [kN/cm]、δvv=${jd.delta_vv} [cm]、δvu=${jd.delta_vu} [cm]<br>
転び止めの軸方向接合: kx2=${(jd.kv*2).toFixed(2)} [kN/cm]、δxv2=${jd.delta_vv} [cm]、δxu=${jd.delta_vu} [cm]`);

    // 5) 
    const Ip = (1/3 - 0.21 * (rb_cm/rd_cm) * (1 - Math.pow(rb_cm, 4)/(12*Math.pow(rd_cm, 4)))) * rd_cm * Math.pow(rb_cm, 3);
    const e = rd_cm; // 転ばし寸法
    add(`<strong>5) 垂木の寸法と断面性能を用意する</strong>ピッチ p=${rp_cm} [cm]<br>幅 b=${rb_cm} [cm]<br>せい d=${rd_cm} [cm]<br>転ばし寸法 e=${e} [cm]<br>
垂木のせん断弾性係数: Gw = E/15 = ${G_wood.toFixed(1)} [kN/cm²]<br>
<span class="formula">(3.6.12)式: Ip = {1/3 - 0.21(b/d)(1 - b⁴/12d⁴)} d·b³</span><br>Ip = ${Ip.toFixed(1)} [cm⁴]`);

    // 6) 
    const jIr = rl_cm / (2 * rp_cm);
    add(`<strong>6) 垂木－桁接合部配列二次モーメント jIr を求める</strong><span class="formula">(3.6.14)式: jIr = L / 2p</span><br>jIr = ${rl_cm} / (2×${rp_cm}) = ${jIr.toFixed(3)} [cm⁴/cm²]`);

    // 7) 
    let ky, ky2 = 0;
    let ksy = (korobi === 'full') ? 11.4 : 0;
    if (korobi === 'full') {
        ky2 = (1/6 * (rl_cm / (nailPitchStr/10)) + 3 * Math.pow(rb_cm / (2*e), 2)) * ksy;
        ky = (2 * G_wood * Ip) / (Math.pow(e, 2) * rl_cm) + ky2;
        add(`<strong>7) 垂木の転びによる剛性 ky を求める (転び止めを設ける場合)</strong><span class="formula">(3.6.13)式: ky2 = { 1/6(B/q) + 3(b/2e)² } ksy</span><br>ky2 = { 1/6(${rl_cm}/${nailPitchStr/10}) + 3(${rb_cm}/(2×${e}))² } × ${ksy} = ${ky2.toFixed(3)} [kN/cm]<br>
<span class="formula">(3.6.11b)式: ky = (2·Gw·Ip) / (e²·B) + ky2</span><br>ky = (2×${G_wood.toFixed(1)}×${Ip.toFixed(1)}) / (${e}²×${rl_cm}) + ${ky2.toFixed(3)} = ${ky.toFixed(3)} [kN/cm]`);
    } else {
        ky = (2 * G_wood * Ip) / (Math.pow(e, 2) * rl_cm);
        add(`<strong>7) 垂木の転びによる剛性 ky を求める (転び止めを設けない場合)</strong><span class="formula">(3.6.11a)式: ky = (2·Gw·Ip) / (e²·B)</span><br>ky = (2×${G_wood.toFixed(1)}×${Ip.toFixed(1)}) / (${e}²×${rl_cm}) = ${ky.toFixed(3)} [kN/cm]`);
    }

    // 8) 
    const deltaK0 = 1 / (1/(Ixy * nd.k) + 1/(pd.G * pd.t));
    add(`<strong>8) 面材釘による単位面積あたりの回転剛性 ΔKθ を求める</strong><span class="formula">(3.6.10)式: ΔKθ = 1 / { 1/(Ixy·k) + 1/(Gθ·t) }</span><br>ΔKθ = 1 / (1/(${Ixy.toFixed(2)}×${nd.k}) + 1/(${pd.G}×${pd.t})) = ${deltaK0.toFixed(3)} [kN·cm/rad·cm²]`);

    // 9) 
    const KR = 1 / (1/deltaK0 + 1/(jd.kj * jIr) + 1/(ky * jIr));
    add(`<strong>9) 水平構面の単位長さあたりのせん断剛性 KR を求める</strong><span class="formula">(3.6.9)式: KR = 1 / { 1/ΔKθ + 1/(kj·jIr) + 1/(ky·jIr) }</span><br>KR = 1 / (1/${deltaK0.toFixed(3)} + 1/(${jd.kj}×${jIr.toFixed(3)}) + 1/(${ky.toFixed(3)}×${jIr.toFixed(3)})) = ${KR.toFixed(3)} [kN/rad·cm]`);

    // 10) 
    const P150 = KR / 150;
    add(`<strong>10) 水平構面の変形角 1/150 [rad] 時の単位長さあたりの耐力 P150 を求める</strong><span class="formula">(3.6.15)式: P150 = KR / 150</span><br>P150 = ${KR.toFixed(3)} / 150 = ${P150.toFixed(4)} [kN/cm]`);

    // 11) 
    const deltaMy = Zxy * nd.Pv;
    add(`<strong>11) 面材釘による単位面積あたりの降伏耐力 ΔMy を求める</strong><span class="formula">(3.6.6)式: ΔMy = Zxy × ΔPv</span><br>ΔMy = ${Zxy.toFixed(3)} × ${nd.Pv} = ${deltaMy.toFixed(4)} [kN/cm]`);

    // 12) 
    let deltaQj;
    if (korobi === 'full') {
        const kx2 = jd.kv * 2;
        deltaQj = jd.kj * jd.delta_jv + kx2 * jd.delta_vv;
        add(`<strong>12) 垂木端部接合の降伏せん断耐力 ΔQj を求める (転び止めを設ける場合)</strong><span class="formula">(3.6.8)式: ΔQj = kj × δjv + kx2 × δxv2</span><br>ΔQj = ${jd.kj} × ${jd.delta_jv} + ${kx2.toFixed(2)} × ${jd.delta_vv} = ${deltaQj.toFixed(3)} [kN]`);
    } else {
        deltaQj = jd.kj * jd.delta_jv;
        add(`<strong>12) 垂木端部接合の降伏せん断耐力 ΔQj を求める (転び止めを設けない場合)</strong><span class="formula">(3.6.8)式: ΔQj = kj × δjv</span><br>ΔQj = ${jd.kj} × ${jd.delta_jv} = ${deltaQj.toFixed(3)} [kN]`);
    }

    // 13) 
    const Pyj = deltaQj / rp_cm;
    add(`<strong>13) 垂木端部接合で決まる単位長さあたりの降伏耐力 Pyj を求める</strong><span class="formula">(3.6.7)式: Pyj = ΔQj / p</span><br>Pyj = ${deltaQj.toFixed(3)} / ${rp_cm} = ${Pyj.toFixed(4)} [kN/cm]`);

    // 14) 
    const Py = Math.min(deltaMy, Pyj);
    add(`<strong>14) 水平構面の単位長さあたりの降伏耐力 Py を求める</strong><span class="formula">(3.6.5)式: Py = min(ΔMy, Pyj)</span><br>Py = min(${deltaMy.toFixed(4)}, ${Pyj.toFixed(4)}) = ${Py.toFixed(4)} [kN/cm]`);

    // 15) 
    const Ry = Py / KR;
    add(`<strong>15) 水平構面の降伏変形角 Ry を求める</strong><span class="formula">(3.6.19)式: Ry = Py / KR</span><br>Ry = ${Py.toFixed(4)} / ${KR.toFixed(3)} = ${Ry.toFixed(4)} [rad]`);

    // 16) 
    const deltaMu = Cxy * deltaMy;
    add(`<strong>16) 面材釘による単位面積あたりの終局モーメント ΔMu を求める</strong><span class="formula">(3.6.17)式: ΔMu = Cxy × ΔMy</span><br>ΔMu = ${Cxy.toFixed(2)} × ${deltaMy.toFixed(4)} = ${deltaMu.toFixed(4)} [kN/cm]`);

    // 17) 
    const Pu = Math.min(deltaMu, Pyj);
    add(`<strong>17) 単位長さあたりの終局耐力 Pu を求める</strong><span class="formula">(3.6.16)式: Pu = min(ΔMu, Pyj)</span><br>Pu = min(${deltaMu.toFixed(4)}, ${Pyj.toFixed(4)}) = ${Pu.toFixed(4)} [kN/cm]`);

    // 18) 
    const Ry0 = deltaMy / deltaK0;
    const mu0 = (nd.du * pd.G * pd.t + nd.dv * Ixy * nd.k) / (nd.dv * (pd.G * pd.t + Ixy * nd.k));
    add(`<strong>18) 面材釘による降伏変形角 Ry0 及び、塑性率 μ0 を求める</strong><span class="formula">(3.6.22)式: Ry0 = ΔMy / ΔKθ</span><br>Ry0 = ${deltaMy.toFixed(4)} / ${deltaK0.toFixed(3)} = ${Ry0.toFixed(4)} [rad]<br>
<span class="formula">(3.6.21)式: μ0 = (δu·Gθ·t + δv·Ixy·k) / { δv(Gθ·t + Ixy·k) }</span><br>μ0 = ${mu0.toFixed(2)}`);

    // 19) 
    let Ru;
    if (deltaMu <= Pyj) {
        Ru = Ry + (mu0 - 1) * Ry0;
        add(`<strong>19) 水平構面の終局変形角 Ru を求める (Pu = ΔMu のとき)</strong><span class="formula">(3.6.20a)式: Ru = Ry + (μ0 - 1)·Ry0</span><br>Ru = ${Ry.toFixed(4)} + (${mu0.toFixed(2)} - 1) × ${Ry0.toFixed(4)} = ${Ru.toFixed(4)} [rad]`);
    } else {
        Ru = Ry + (2 * (jd.delta_ju - jd.delta_jv)) / rl_cm;
        add(`<strong>19) 水平構面の終局変形角 Ru を求める (Pu = Pyj のとき)</strong><span class="formula">(3.6.20b)式: Ru = Ry + 2(δju - δjv) / L</span><br>Ru = ${Ry.toFixed(4)} + 2(${jd.delta_ju} - ${jd.delta_jv}) / ${rl_cm} = ${Ru.toFixed(4)} [rad]`);
    }

    // 20) 
    const mu = Ru / Ry;
    add(`<strong>20) 水平構面の塑性率 μ を求める</strong><span class="formula">(3.6.18)式: μ = Ru / Ry</span><br>μ = ${Ru.toFixed(4)} / ${Ry.toFixed(4)} = ${mu.toFixed(2)}`);

    // 21) 
    const factor = 0.2 * Math.sqrt(Math.max(0, 2*mu - 1));
    const P_u_mod = factor * Pu;
    add(`<strong>21) 水平構面の単位長さあたりの 0.2√(2μ-1)×Pu を求める</strong><br>0.2√(2×${mu.toFixed(2)} - 1) × ${Pu.toFixed(4)} = ${P_u_mod.toFixed(4)} [kN/cm]`);

    // 22) 
    const min_all = Math.min(Py, P150, P_u_mod);
    const deltaQa = min_all * cos;
    const deltaQa_meter = deltaQa * 100;

    const limit_kNm = 13.72;
    const isOk = (deltaQa_meter <= limit_kNm);
    const finalQa = Math.min(deltaQa_meter, limit_kNm);

    add(`<strong>22) 屋根勾配を考慮した水平構面の単位長さあたりの許容せん断耐力 ΔQa を求める</strong><span class="formula">(3.6.4)式: ΔQa = min( Py, P150, 0.2√(2μ-1)×Pu ) × cosθ</span><br>
cosθ = ${cos.toFixed(3)}<br>
ΔQa = min( ${Py.toFixed(4)}, ${P150.toFixed(4)}, ${P_u_mod.toFixed(4)} ) × ${cos.toFixed(3)}<br>
= ${min_all.toFixed(4)} × ${cos.toFixed(3)} = ${deltaQa.toFixed(4)} [kN/cm] → ${(deltaQa*100).toFixed(2)} [kN/m]`);

    // 条件チェック
    let allChecked = true;
    const cbs = document.querySelectorAll('.condition-cb');
    if (cbs.length > 0) {
        cbs.forEach(cb => { if(!cb.checked) allChecked = false; });
    }

    const pv_end = parseFloat(document.getElementById('end_rafter_pv').value) || 0.63;
    const q_end_cm = (parseFloat(document.getElementById('end_rafter_pitch').value) || 150) / 10;
    const q_panel_cm = parseInt(nailPitchStr) / 10;
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

    document.getElementById('output').innerHTML = html;

    if (isJustInput || !allChecked) {
        document.getElementById('results').style.display = 'none';
        document.getElementById('final-highlight').style.display = 'none';
        const hr = document.getElementById('header_result');
        if (hr) hr.innerText = '0.00 kN/m';
        if (!allChecked && !isJustInput) {
            alert('適用条件が満たされていません（画面の赤字警告をご確認ください）。');
        }
    } else {
        document.getElementById('results').style.display = 'block';
        document.getElementById('highlight-value').innerText = `${finalQa.toFixed(2)} kN/m`;
        if(!isOk) {
            document.getElementById('highlight-judge').innerText = `上限値 13.72 kN/m を採用`;
            document.getElementById('highlight-judge').style.color = '#c53030';
        } else {
            document.getElementById('highlight-judge').innerText = `上限値 13.72 kN/m 以内`;
            document.getElementById('highlight-judge').style.color = '#38a169';
        }
        document.getElementById('final-highlight').style.display = 'block';
        const hr = document.getElementById('header_result');
        if (hr) hr.innerText = `${finalQa.toFixed(2)} kN/m`;
    }

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

// --- JSON入出力機能 ---
async function exportData() {
    if (typeof checkAuth === 'function') await checkAuth();
    const data = {
        params: {
            panel_spec: document.getElementById('panel_spec').value,
            nail_type: document.getElementById('nail_type').value,
            roof_slope: document.getElementById('roof_slope').value,
            rafter_b: document.getElementById('rafter_b').value,
            rafter_d: document.getElementById('rafter_d').value,
            rafter_l: document.getElementById('rafter_l').value,
            wood_E: document.getElementById('wood_E').value,
            wood_E_val: document.getElementById('wood_E_val').value,
            joint_spec: document.getElementById('joint_spec').value,
            korobi_spec: document.getElementById('korobi_spec').value,
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
    a.download = 'taruki_kihon_data.json';
    a.click();
    URL.revokeObjectURL(url);
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (typeof checkAuth === 'function') await checkAuth();
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const p = data.params || data;
            
            if(p.panel_spec) document.getElementById('panel_spec').value = p.panel_spec;
            updateOptions();
            
            if(p.nail_type) document.getElementById('nail_type').value = p.nail_type;
            if(p.roof_slope) document.getElementById('roof_slope').value = p.roof_slope;
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
            
            if (typeof onInputChanged === 'function') onInputChanged();
            else calc();
        } catch (err) { alert('読込失敗'); }
    };
    reader.readAsText(file);
}
