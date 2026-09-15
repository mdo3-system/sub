// --- データベース ---
const panelData = {
    "12_2": { t: 1.2, G: 35.0, fs: 0.18 },
    "12_1": { t: 1.2, G: 40.0, fs: 0.23 },
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

// --- 配列データテーブル (1820x910, BasePitch@910) ---
const layoutData = {
    "150": {
        "川型": { Ixy: 0.97, Zxy: 0.024, Cxy: 1.29 },
        "山型": { Ixy: 1.58, Zxy: 0.031, Cxy: 1.53 },
        "日型": { Ixy: 2.59, Zxy: 0.064, Cxy: 1.09 }
    },
    "100": {
        "川型": { Ixy: 1.33, Zxy: 0.033, Cxy: 1.40 },
        "山型": { Ixy: 2.27, Zxy: 0.046, Cxy: 1.60 },
        "日型": { Ixy: 3.46, Zxy: 0.086, Cxy: 1.18 }
    },
    "75": {
        "川型": { Ixy: 1.68, Zxy: 0.041, Cxy: 1.44 },
        "山型": { Ixy: 3.04, Zxy: 0.061, Cxy: 1.61 },
        "日型": { Ixy: 4.69, Zxy: 0.116, Cxy: 1.18 }
    }
};

function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

function initApp() {
    updateOptions();
}

function updateOptions() {
    const pVal = document.getElementById('panel_spec').value;
    const thickKey = (pVal.startsWith("24") || pVal.startsWith("28")) ? "24" : "12";
    const sel = document.getElementById('nail_type');
    sel.innerHTML = "";
    const opts = nailData[thickKey];
    for (let key in opts) {
        const el = document.createElement('option');
        el.value = key; el.text = key;
        sel.appendChild(el);
    }
    sel.value = (thickKey==="24") ? "N75" : "N50";
    calc();
}

function calc() {
    const pVal = document.getElementById('panel_spec').value;
    const thickKey = (pVal.startsWith("24") || pVal.startsWith("28")) ? "24" : "12";
    const pd = panelData[pVal];
    const nKey = document.getElementById('nail_type').value;
    if (!nailData[thickKey][nKey]) return;
    const nd = nailData[thickKey][nKey];

    const sup = document.getElementById('support_type').value;
    document.getElementById('warn_purlin').style.display = (sup === 'purlin') ? 'block' : 'none';
    const nBox = document.getElementById('warn_nail');
    if(thickKey === "12" && nKey.includes("75")) {
        nBox.style.display = "block";
        nBox.innerText = "※12mm厚に75mm釘は推奨されません";
    } else {
        nBox.style.display = "none";
    }

    const pitch = document.getElementById('nail_pitch').value;
    const pattern = document.getElementById('nail_pattern').value;
    const lData = layoutData[pitch][pattern];

    document.getElementById('ref_G').innerText = pd.G.toFixed(1);
    document.getElementById('ref_fs').innerText = pd.fs.toFixed(2);
    document.getElementById('ref_k').innerText = nd.k.toFixed(2);
    document.getElementById('ref_Pv').innerText = nd.Pv.toFixed(2);
    document.getElementById('arrangement-data').innerText = `Ixy = ${lData.Ixy}, Zxy = ${lData.Zxy}, Cxy = ${lData.Cxy}`;

    const Ixy = lData.Ixy;
    const Zxy = lData.Zxy;
    const Cxy = lData.Cxy;
    
    const slope = parseFloat(document.getElementById('roof_slope').value) || 0;
    const rad = Math.atan(slope / 10.0);
    const cosTheta = Math.cos(rad);

    let html = "";
    
    html += `<div class="result-step">
        <strong>1) 面材釘の1面せん断データを用意する</strong>
        表3.3.1より、
        <div class="formula">
            k = ${nd.k.toFixed(2)} [kN/cm]、 δ<sub>v</sub> = ${nd.dv.toFixed(2)} [cm]、 δ<sub>u</sub> = ${nd.du.toFixed(2)} [cm]、 ΔP<sub>v</sub> = ${nd.Pv.toFixed(2)} [kN]
        </div>
    </div>`;

    html += `<div class="result-step">
        <strong>2) 面材のせん断弾性係数や寸法の数値を用意する</strong>
        表3.3.1より、
        <div class="formula">
            面材のせん断弾性係数 G<sub>B</sub> = ${pd.G.toFixed(1)} [kN/cm²]<br>
            面材の厚さ t = ${pd.t.toFixed(1)} [cm]
        </div>
    </div>`;

    html += `<div class="result-step">
        <strong>3) 釘の配列による I<sub>xy</sub>, Z<sub>xy</sub>, C<sub>xy</sub> を用意する</strong>
        規定仕様(${pitch}mmピッチ、${pattern})より、
        <div class="formula">
            I<sub>xy</sub> = ${Ixy.toFixed(2)}、 Z<sub>xy</sub> = ${Zxy.toFixed(3)}、 C<sub>xy</sub> = ${Cxy.toFixed(2)}
        </div>
    </div>`;

    const dMy = Zxy * nd.Pv;
    const Py = dMy;
    html += `<div class="result-step">
        <strong>4) 水平構面の単位長さあたりの降伏耐力 P<sub>y</sub> を求める</strong>
        (3.5.3)式により面材釘による単位面積当たりの降伏モーメントΔM<sub>y</sub>を求める。
        <div class="formula">
            ΔM<sub>y</sub> = Z<sub>xy</sub> × ΔP<sub>v</sub> = ${Zxy.toFixed(3)} × ${nd.Pv.toFixed(2)} = ${round(dMy, 4)} [kN/cm]
        </div>
        (3.5.2)式により水平構面の単位長さあたりの降伏耐力P<sub>y</sub>を求める。
        <div class="formula">
            P<sub>y</sub> = ΔM<sub>y</sub> = ${round(Py, 4)} [kN/cm]
        </div>
    </div>`;

    const dK0_denom1 = 1.0 / (Ixy * nd.k);
    const dK0_denom2 = 1.0 / (pd.G * pd.t);
    const dK0 = 1.0 / (dK0_denom1 + dK0_denom2);
    const KR = dK0;
    html += `<div class="result-step">
        <strong>5) 水平構面の単位長さあたりのせん断剛性 K<sub>R</sub> を求める</strong>
        (3.5.5)式により面材釘による単位面積当たりの回転剛性ΔK<sub>0</sub>を求める。
        <div class="formula">
            ΔK<sub>0</sub> = 1 / { 1/(I<sub>xy</sub>・k) + 1/(G<sub>B</sub>・t) }<br>
            &nbsp;&nbsp;&nbsp;&nbsp;= 1 / { 1/(${Ixy.toFixed(2)} × ${nd.k.toFixed(2)}) + 1/(${pd.G.toFixed(1)} × ${pd.t.toFixed(1)}) } = ${round(dK0, 4)} [kN・cm/rad・cm²]
        </div>
        (3.5.4)式により水平構面の単位長さあたりのせん断剛性K<sub>R</sub>を求める。
        <div class="formula">
            K<sub>R</sub> = ΔK<sub>0</sub> = ${round(KR, 4)} [kN/rad・cm]
        </div>
    </div>`;

    const P150 = KR / 150.0;
    html += `<div class="result-step">
        <strong>6) 水平構面の変形角 1/150 [rad] 時の単位長さあたりの耐力 P<sub>150</sub> を求める</strong>
        (3.5.6)式により、
        <div class="formula">
            P<sub>150</sub> = K<sub>R</sub> / 150 = ${round(KR, 4)} / 150 = ${round(P150, 4)} [kN/cm]
        </div>
    </div>`;

    const dMu = Cxy * dMy;
    const Pu = dMu;
    html += `<div class="result-step">
        <strong>7) 水平構面の単位長さあたりの終局耐力 P<sub>u</sub> を求める</strong>
        (3.5.8)式により面材釘による単位面積当たりの終局モーメントΔM<sub>u</sub>を求める。
        <div class="formula">
            ΔM<sub>u</sub> = C<sub>xy</sub> × ΔM<sub>y</sub> = ${Cxy.toFixed(2)} × ${round(dMy, 4)} = ${round(dMu, 4)} [kN/cm]
        </div>
        (3.5.7)式により水平構面の単位長さあたりの終局耐力P<sub>u</sub>を求める。
        <div class="formula">
            P<sub>u</sub> = ΔM<sub>u</sub> = ${round(Pu, 4)} [kN/cm]
        </div>
    </div>`;

    const mu_num = (nd.du * pd.G * pd.t) + (nd.dv * Ixy * nd.k);
    const mu_den = nd.dv * ((pd.G * pd.t) + (Ixy * nd.k));
    const mu = mu_num / mu_den;
    html += `<div class="result-step">
        <strong>8) 水平構面の塑性率 μ を求める</strong>
        (3.5.9)式により、
        <div class="formula">
            μ = (δ<sub>u</sub> × G<sub>B</sub> × t + δ<sub>v</sub> × I<sub>xy</sub> × k) / { δ<sub>v</sub> (G<sub>B</sub> × t + I<sub>xy</sub> × k) }<br>
            &nbsp;&nbsp;= (${nd.du.toFixed(2)} × ${pd.G.toFixed(1)} × ${pd.t.toFixed(1)} + ${nd.dv.toFixed(2)} × ${Ixy.toFixed(2)} × ${nd.k.toFixed(2)}) / { ${nd.dv.toFixed(2)} × (${pd.G.toFixed(1)} × ${pd.t.toFixed(1)} + ${Ixy.toFixed(2)} × ${nd.k.toFixed(2)}) } = ${round(mu, 2)}
        </div>
    </div>`;

    const p_ult = 0.2 * Math.sqrt(Math.max(0, 2*mu - 1)) * Pu;
    html += `<div class="result-step">
        <strong>9) 単位長さあたりの 0.2√(2μ-1)×P<sub>u</sub> を求める</strong>
        <div class="formula">
            0.2√(2μ - 1) × P<sub>u</sub> = 0.2 × √(2 × ${round(mu, 2)} - 1) × ${round(Pu, 4)} = ${round(p_ult, 4)} [kN/cm]
        </div>
    </div>`;

    const minP_plane = Math.min(Py, P150, p_ult);
    const Pa_m_unreduced = minP_plane * 100;
    const Pa_m = Pa_m_unreduced * cosTheta;
    const limit = 13.72;
    
    let isCapped = false;
    let finalPa = Pa_m;
    if(finalPa > limit) {
        finalPa = limit;
        isCapped = true;
    }

    html += `<div class="result-step" style="border:none;">
        <strong>10) 勾配屋根水平構面の単位長さあたりの許容せん断耐力 ΔQ<sub>a</sub> を求める</strong>
        (3.6.1)式により、単位長さあたりの許容せん断耐力ΔQ<sub>a</sub>を求める。（勾配 ${slope.toFixed(1)}寸 = ${(rad * 180 / Math.PI).toFixed(1)}°）
        <div class="formula">
            ΔQ<sub>a</sub> = min { P<sub>y</sub>, P<sub>150</sub>, 0.2√(2μ-1)P<sub>u</sub> } × cosθ<br>
            &nbsp;&nbsp;&nbsp;&nbsp;= min { ${round(Py, 4)}, ${round(P150, 4)}, ${round(p_ult, 4)} } × ${cosTheta.toFixed(3)}<br>
            &nbsp;&nbsp;&nbsp;&nbsp;= ${round(minP_plane, 4)} × ${cosTheta.toFixed(3)} = ${round(minP_plane * cosTheta, 4)} [kN/cm]<br>
            &nbsp;&nbsp;&nbsp;&nbsp;⇒ ${round(Pa_m, 2)} [kN/m]
        </div>
        ${isCapped ? `<div style="color:#c53030; font-weight:bold; margin-top:5px;">※上限値 ${limit} kN/m を超過したため、上限値を適用します。</div>` : ''}
    </div>`;

    document.getElementById('output').innerHTML = html;
    
    document.getElementById('results').style.display = 'block';
    document.getElementById('final-highlight').style.display = 'block';
    
    const dispVal = round(finalPa, 2).toFixed(2);
    document.getElementById('highlight-value').innerText = dispVal + " kN/m";
    document.getElementById('highlight-judge').innerText = "適用範囲① 上限値内 (OK)";
    
    if(isCapped) {
        document.getElementById('final-highlight').style.borderColor = "#dd6b20";
        document.getElementById('final-highlight').style.backgroundColor = "#fffaf0";
        document.getElementById('highlight-value').style.color = "#dd6b20";
        document.getElementById('highlight-title').style.color = "#dd6b20";
        document.getElementById('highlight-judge').innerText = "適用範囲① 上限値適用";
        document.getElementById('highlight-judge').style.color = "#dd6b20";
    } else {
        document.getElementById('final-highlight').style.borderColor = "#38a169";
        document.getElementById('final-highlight').style.backgroundColor = "#f0fff4";
        document.getElementById('highlight-value').style.color = "#2f855a";
        document.getElementById('highlight-title').style.color = "#2f855a";
        document.getElementById('highlight-judge').style.color = "#2f855a";
    }
}
