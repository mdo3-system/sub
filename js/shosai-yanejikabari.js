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

// --- JSON入出力機能 ---
function exportData() {
    const data = {
        panel_spec: document.getElementById('panel_spec').value,
        nail_type: document.getElementById('nail_type').value,
        support_type: document.getElementById('support_type').value,
        nail_pattern: document.getElementById('nail_pattern').value,
        nail_pitch: document.getElementById('nail_pitch').value,
        base_pitch: document.getElementById('base_pitch').value,
        roof_slope: document.getElementById('roof_slope').value,
        manual: document.getElementById('manual_mode').checked,
        Ixy: document.getElementById('manual_Ixy').value,
        Zxy: document.getElementById('manual_Zxy').value,
        Cxy: document.getElementById('manual_Cxy').value,
        beta: document.getElementById('manual_beta').value
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roof_direct_calc_data.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
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
                calcConstants();
                calculate();
                return;
            }

            if(data.panel_spec) document.getElementById('panel_spec').value = data.panel_spec;
            updateOptions(); // 厚みに応じた釘の選択肢を更新
            
            if(data.nail_type) document.getElementById('nail_type').value = data.nail_type;
            if(data.support_type) document.getElementById('support_type').value = data.support_type;
            if(data.nail_pattern) document.getElementById('nail_pattern').value = data.nail_pattern;
            if(data.nail_pitch) document.getElementById('nail_pitch').value = data.nail_pitch;
            if(data.base_pitch) document.getElementById('base_pitch').value = data.base_pitch;
            if(data.roof_slope) document.getElementById('roof_slope').value = data.roof_slope;
            
            if(data.manual !== undefined) {
                document.getElementById('manual_mode').checked = data.manual;
                document.getElementById('manual_Ixy').value = data.Ixy;
                document.getElementById('manual_Zxy').value = data.Zxy;
                document.getElementById('manual_Cxy').value = data.Cxy;
                document.getElementById('manual_beta').value = data.beta;
            }
            
            updateRefData();
            calculate(); // 再計算＆結果表示
            
            document.getElementById('json_upload').value = ''; // フォームリセット
        } catch (err) {
            alert('ファイルの読み込みに失敗しました。対応するJSONファイルを選択してください。');
        }
    };
    reader.readAsText(file);
}

// --- UI更新 ---
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
    updateRefData();
}

function updateRefData() {
    const pVal = document.getElementById('panel_spec').value;
    const thickKey = (pVal.startsWith("24") || pVal.startsWith("28")) ? "24" : "12";
    const nVal = document.getElementById('nail_type').value;
    const pd = panelData[pVal];
    const nd = nailData[thickKey][nVal];
    
    if(pd && nd) {
        document.getElementById('ref_G').innerText = pd.G.toFixed(1);
        document.getElementById('ref_fs').innerText = pd.fs.toFixed(2);
        document.getElementById('ref_k').innerText = nd.k.toFixed(2);
        document.getElementById('ref_Pv').innerText = nd.Pv.toFixed(2);
    }
    checkWarnings();
    calcConstants(); 
}

function checkWarnings() {
    const sup = document.getElementById('support_type').value;
    const pVal = document.getElementById('panel_spec').value;
    const nVal = document.getElementById('nail_type').value;
    const thickKey = (pVal.startsWith("24") || pVal.startsWith("28")) ? "24" : "12";

    // 母屋警告
    document.getElementById('warn_purlin').style.display = (sup === 'purlin') ? 'block' : 'none';

    // 釘警告
    const nBox = document.getElementById('warn_nail');
    if(thickKey === "12" && nVal.includes("75")) {
        nBox.style.display = "block";
        nBox.innerText = "※12mm厚に75mm釘は推奨されません";
    } else {
        nBox.style.display = "none";
    }
}

// --- 計算 & 描画 ---
function calcConstants() {
    const pitch = parseFloat(document.getElementById('nail_pitch').value);
    const pattern = document.getElementById('nail_pattern').value;
    const baseP = parseFloat(document.getElementById('base_pitch').value);
    const isManual = document.getElementById('manual_mode').checked;
    
    const W = 182.0; const H = 91.0; 
    const p = pitch/10.0; const bp = baseP/10.0;
    
    const nails = [];

    // 1. 短辺方向ライン (川の字の基本)
    const numLines = Math.round(W / bp); // ライン数
    for(let i=0; i<=numLines; i++) {
        let x = i * (W / numLines); 
        const ny = Math.floor(H / p);
        for(let j=0; j<=ny; j++) {
            let y = j * (H/ny);
            nails.push({x:x, y:y});
        }
    }

    // 2. 日の字 (長辺方向)
    if(pattern === 'nichi') {
        const nx = Math.floor(W/p);
        for(let i=1; i<nx; i++) {
            let x = i*(W/nx);
            let onExisting = false;
            for(let k=0; k<=numLines; k++) {
                if(Math.abs(x - k*(W/numLines)) < 1.0) onExisting = true;
            }
            if(!onExisting) {
                nails.push({x:x, y:0});
                nails.push({x:x, y:H});
            }
        }
    }

    // 描画
    drawCanvas(W, H, nails, numLines);

    // 定数計算
    const Aw = W * H;
    let sx=0, sy=0; nails.forEach(n=>{sx+=n.x; sy+=n.y;});
    const x0=sx/nails.length; const y0=sy/nails.length;

    let Ix=0, Iy=0, max_dx=0, max_dy=0;
    nails.forEach(n=>{
        let dx=Math.abs(n.x-x0); let dy=Math.abs(n.y-y0);
        Ix+=dy*dy; Iy+=dx*dx;
        if(dx>max_dx) max_dx=dx; if(dy>max_dy) max_dy=dy;
    });

    const calc_Ixy = (Ix*Iy/(Ix+Iy))/Aw;
    const Zx = max_dy>0? Ix/max_dy : 0;
    const Zy = max_dx>0? Iy/max_dx : 0;
    const calc_Zxy = 1.0/(Aw*Math.sqrt(1.0/(Zx*Zx)+1.0/(Zy*Zy)));
    const calc_beta = Ix > 0 ? Iy / Ix : 0;
    
    // Cxy (簡易係数)
    let calc_Cxy = 1.0;
    if(pattern === 'nichi') {
        if(pitch===150) calc_Cxy=1.31; else if(pitch===100) calc_Cxy=1.25; else calc_Cxy=1.18;
    } else {
        if(pitch===150) calc_Cxy=1.40; else if(pitch===100) calc_Cxy=1.32; else calc_Cxy=1.25;
    }

    if (!isManual) {
        document.getElementById('manual_Ixy').value = calc_Ixy.toFixed(3);
        document.getElementById('manual_Zxy').value = calc_Zxy.toFixed(4);
        document.getElementById('manual_Cxy').value = calc_Cxy.toFixed(2);
        document.getElementById('manual_beta').value = calc_beta.toFixed(3);
    }

    document.getElementById('val_Ixy').innerText = parseFloat(document.getElementById('manual_Ixy').value || 0).toFixed(3);
    document.getElementById('val_Zxy').innerText = parseFloat(document.getElementById('manual_Zxy').value || 0).toFixed(4);
    document.getElementById('val_Cxy').innerText = parseFloat(document.getElementById('manual_Cxy').value || 0).toFixed(2);
}

function drawCanvas(W, H, nails, numLines) {
    const cvs = document.getElementById('nailCanvas');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    const cssW = 280; 
    const cssH = 140; 
    
    cvs.width = cssW * dpr;
    cvs.height = cssH * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    
    const margin = 10;
    const drawW = cssW - margin*2;
    const drawH = cssH - margin*2;
    const sc = Math.min(drawW/W, drawH/H);
    const offX = (cssW - W*sc)/2;
    const offY = (cssH - H*sc)/2;

    ctx.clearRect(0,0,cssW,cssH);

    // 面材
    ctx.fillStyle = "#fff";
    ctx.fillRect(offX, offY, W*sc, H*sc);
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    ctx.strokeRect(offX, offY, W*sc, H*sc);

    // 下地ライン
    ctx.strokeStyle = "#bbb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=1; i<numLines; i++) {
        let x = i * (W/numLines);
        ctx.moveTo(offX + x*sc, offY);
        ctx.lineTo(offX + x*sc, offY + H*sc);
    }
    ctx.stroke();

    // 釘
    ctx.fillStyle = "#c0392b";
    nails.forEach(n => {
        ctx.beginPath();
        ctx.arc(offX + n.x*sc, offY + n.y*sc, 2, 0, Math.PI*2);
        ctx.fill();
    });
    
    // 寸法テキスト
    ctx.fillStyle = "#555";
    ctx.font = "9px Arial";
    ctx.fillText("1820", offX + W*sc/2 - 10, offY - 3);
    ctx.fillText("910", offX - 20, offY + H*sc/2 + 3);
}

// --- 耐力計算 ---
function calculate() {
    const pVal = document.getElementById('panel_spec').value;
    const thickKey = (pVal.startsWith("24") || pVal.startsWith("28")) ? "24" : "12";
    const pd = panelData[pVal];
    const nKey = document.getElementById('nail_type').value;
    if (!nailData[thickKey][nKey]) return;
    const nd = nailData[thickKey][nKey];
    
    const Ixy = parseFloat(document.getElementById('manual_Ixy').value) || 0;
    const Zxy = parseFloat(document.getElementById('manual_Zxy').value) || 0;
    const Cxy = parseFloat(document.getElementById('manual_Cxy').value) || 0;
    
    const slope = parseFloat(document.getElementById('roof_slope').value);
    const rad = Math.atan(slope / 10.0);
    const cos = Math.cos(rad);
    document.getElementById('disp_cos').value = cos.toFixed(3);

    const dMy = Zxy * nd.Pv;
    const dK0 = 1.0 / ( 1.0/(Ixy * nd.k) + 1.0/(pd.G * pd.t) );
    const dMu = Cxy * dMy;
    
    const num_mu = nd.du * pd.G * pd.t + nd.dv * Ixy * nd.k;
    const den_mu = nd.dv * (pd.G * pd.t + Ixy * nd.k);
    const mu = den_mu > 0 ? num_mu / den_mu : 0;

    const P150 = dK0 / 150.0;
    const Pmult = 0.2 * Math.sqrt(Math.max(0, 2*mu - 1)) * dMu;
    const Ps = pd.fs * pd.t; 

    const minP_plane = Math.min(dMy, P150, Pmult, Ps);
    const Pa_m = minP_plane * cos * 100;

    const resultArea = document.getElementById('resultArea');
    if (resultArea) resultArea.style.display = 'block';
    
    let finalPa = Pa_m;
    let checkText = "(OK)";
    if(finalPa > 13.72) {
        finalPa = 13.72;
        checkText = "(上限値適用)";
    }

    document.getElementById('res_Pa').innerText = finalPa.toFixed(2);
    document.getElementById('res_check').innerText = checkText;
    if(finalPa === 13.72) document.getElementById('res_check').style.color = "#d35400";
    else document.getElementById('res_check').style.color = "#38a169";
    
    document.getElementById('res_Ps').innerText = (Ps * cos * 100).toFixed(2);
    document.getElementById('res_Py').innerText = (dMy * cos * 100).toFixed(2);
    document.getElementById('res_Pu').innerText = (dMu * cos * 100).toFixed(2);
    document.getElementById('res_P150').innerText = (P150 * cos * 100).toFixed(2);
    document.getElementById('res_KR').innerText = dK0.toFixed(2);
    document.getElementById('res_mu').innerText = mu.toFixed(2);
}


