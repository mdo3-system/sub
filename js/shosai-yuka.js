// --- 表3.3.1 データ ---
const table331 = {
    "p9_N50": { name: "構造用合板 9mm + N50", t: 0.9, k: 3.35, dy: 0.23, du: 1.49, dpv: 0.81, gb: 40000, pa: 235 },
    "p9_N65": { name: "構造用合板 9mm + N65", t: 0.9, k: 4.38, dy: 0.22, du: 1.91, dpv: 1.10, gb: 40000, pa: 343 },
    "p9_CN50": { name: "構造用合板 9mm + CN50", t: 0.9, k: 4.42, dy: 0.21, du: 1.83, dpv: 1.00, gb: 40000, pa: 284 },
    "p9_CN65": { name: "構造用合板 9mm + CN65", t: 0.9, k: 5.76, dy: 0.27, du: 2.19, dpv: 1.70, gb: 40000, pa: 411 },
    "p12_N50": { name: "構造用合板 12mm + N50", t: 1.2, k: 4.80, dy: 0.21, du: 1.53, dpv: 0.98, gb: 40000, pa: 235 },
    "p12_N65": { name: "構造用合板 12mm + N65", t: 1.2, k: 6.29, dy: 0.21, du: 1.89, dpv: 1.31, gb: 40000, pa: 343 },
    "p12_CN50": { name: "構造用合板 12mm + CN50", t: 1.2, k: 6.34, dy: 0.19, du: 1.81, dpv: 1.21, gb: 40000, pa: 284 },
    "p12_CN65": { name: "構造用合板 12mm + CN65", t: 1.2, k: 8.26, dy: 0.25, du: 2.17, dpv: 2.05, gb: 40000, pa: 411 },
    "p15_N65": { name: "構造用合板 15mm + N65", t: 1.5, k: 6.29, dy: 0.21, du: 1.89, dpv: 1.31, gb: 40000, pa: 343 },
    "p15_N75": { name: "構造用合板 15mm + N75", t: 1.5, k: 7.08, dy: 0.18, du: 1.92, dpv: 1.44, gb: 40000, pa: 529 },
    "p15_CN65": { name: "構造用合板 15mm + CN65", t: 1.5, k: 8.26, dy: 0.25, du: 2.17, dpv: 2.05, gb: 40000, pa: 411 },
    "p15_CN75": { name: "構造用合板 15mm + CN75", t: 1.5, k: 10.03, dy: 0.20, du: 2.19, dpv: 2.10, gb: 40000, pa: 588 },
    "p24_N75": { name: "構造用合板 24mm + N75", t: 2.4, k: 7.08, dy: 0.18, du: 1.92, dpv: 1.44, gb: 40000, pa: 529 },
    "p24_N90": { name: "構造用合板 24mm + N90", t: 2.4, k: 9.50, dy: 0.16, du: 1.96, dpv: 1.56, gb: 40000, pa: 600 },
    "p24_CN75_standard": { name: "構造用合板 24mm + CN75 (標準値)", t: 2.4, k: 10.03, dy: 0.20, du: 2.19, dpv: 2.10, gb: 40000, pa: 588 },
    "p24_CN75_p232": { name: "構造用合板 24mm + CN75 (P.232計算例)", t: 2.4, k: 10.13, dy: 0.18, du: 2.14, dpv: 1.85, gb: 40000, pa: 588 },
    "p24_CN90": { name: "構造用合板 24mm + CN90", t: 2.4, k: 13.43, dy: 0.18, du: 2.23, dpv: 2.45, gb: 40000, pa: 735 }
};

function applyTable331Preset() {
    const val = document.getElementById('preset_table331').value;
    if(table331[val]) {
        document.getElementById('val_k').value = table331[val].k;
        document.getElementById('val_dpv').value = table331[val].dpv;
        document.getElementById('t_panel').value = table331[val].t;
        document.getElementById('gb_panel').value = table331[val].gb;
        document.getElementById('pa_nail').value = table331[val].pa;
        calculate();
    }
}

function toggleCalcMode() {
    const isManual = document.querySelector('input[name="calc_mode"]:checked').value === 'manual';
    document.getElementById('manual_ixy').disabled = !isManual;
    document.getElementById('manual_zxy').disabled = !isManual;
    document.getElementById('manual_cxy').disabled = !isManual;
    calculate();
}

function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

function exportData() {
    const data = {
        params: {
            dim_w: document.getElementById('dim_w').value, dim_h: document.getElementById('dim_h').value, dim_a: document.getElementById('dim_a').value,
            margin_edge: document.getElementById('margin_edge').value, pitch_v: document.getElementById('pitch_v').value, pitch_h: document.getElementById('pitch_h').value,
            nail_pattern: document.getElementById('nail_pattern').value,
            p_outer: document.getElementById('p_outer').value, p_inner: document.getElementById('p_inner').value,
            preset_table331: document.getElementById('preset_table331').value, val_k: document.getElementById('val_k').value, val_dpv: document.getElementById('val_dpv').value,
            pa_nail: document.getElementById('pa_nail').value, t_panel: document.getElementById('t_panel').value, gb_panel: document.getElementById('gb_panel').value,
            calc_mode: document.querySelector('input[name="calc_mode"]:checked').value,
            manual_ixy: document.getElementById('manual_ixy').value, manual_zxy: document.getElementById('manual_zxy').value, manual_cxy: document.getElementById('manual_cxy').value
        }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `floor_calc_data.json`;
    a.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const d = JSON.parse(e.target.result);
            
            // 釘配列計算ツールからのデータ連携チェック
            if (d.Ixy !== undefined && d.Zxy !== undefined) {
                document.querySelector('input[name="calc_mode"][value="manual"]').checked = true;
                document.getElementById('manual_ixy').value = d.Ixy;
                document.getElementById('manual_zxy').value = d.Zxy;
                if (d.Cxy !== undefined) document.getElementById('manual_cxy').value = d.Cxy;
                if (d.w) document.getElementById('dim_w').value = d.w;
                if (d.h) document.getElementById('dim_h').value = d.h;
                toggleCalcMode();
                calculate();
                return;
            }

            for (let k in d.params) {
                if(k === 'calc_mode') {
                    document.querySelector(`input[name="calc_mode"][value="${d.params[k]}"]`).checked = true;
                } else if(document.getElementById(k)) {
                    document.getElementById(k).value = d.params[k];
                }
            }
            toggleCalcMode();
            calculate();
        } catch(err) { alert('読込失敗'); }
    };
    reader.readAsText(file);
}

// --- 釘配置ロジック ---
function getSymmetricSpacingArray(length, margin, maxPitch) {
    const effL = length - 2 * margin;
    if (effL <= 0) return [margin + effL / 2]; 
    const n_intervals = Math.ceil(effL / maxPitch);
    const n_nails = n_intervals + 1;
    let arr = [];
    const center = effL / 2;
    
    if (n_intervals === 1) {
        return [margin, length - margin];
    }

    if (n_nails % 2 !== 0) {
        arr.push(center);
        for (let i = 1; i <= Math.floor(n_nails / 2); i++) {
            let pos1 = center - i * (effL / n_intervals);
            let pos2 = center + i * (effL / n_intervals);
            arr.push(pos1); arr.push(pos2);
        }
    } else {
        for (let i = 0; i < n_nails / 2; i++) {
            let pos1 = center - (0.5 + i) * (effL / n_intervals);
            let pos2 = center + (0.5 + i) * (effL / n_intervals);
            arr.push(pos1); arr.push(pos2);
        }
    }
    arr.sort((a,b) => a - b);
    return arr.map(x => Math.max(0, Math.min(x, effL)) + margin);
}

function generateNails(W, H, margin, Pv, Ph, pOuter, pInner, pattern) {
    let nails = [];
    let vLines = [margin, W - margin];
    if(Pv > 0) { for(let x=Pv; x<W-0.1; x+=Pv) vLines.push(x); }
    vLines = [...new Set(vLines)].sort((a,b)=>a-b);

    let hLines = [margin, H - margin];
    if(Ph > 0) { for(let y=Ph; y<H-0.1; y+=Ph) hLines.push(y); }
    hLines = [...new Set(hLines)].sort((a,b)=>a-b);

    vLines.forEach(x => {
        const isEdge = (Math.abs(x - margin) < 0.1 || Math.abs(x - (W - margin)) < 0.1);
        const maxP = isEdge ? pOuter : pInner;
        const yPoints = getSymmetricSpacingArray(H, margin, maxP);
        yPoints.forEach(y => { 
            if (pattern === 'yama' && Math.abs(y - (H - margin)) < 0.1) return;
            nails.push({x, y, type: isEdge ? 'peri' : 'mid'}); 
        });
    });

    if (pattern !== 'kawa') {
        hLines.forEach(y => {
            const isEdge = (Math.abs(y - margin) < 0.1 || Math.abs(y - (H - margin)) < 0.1);
            const isTopEdge = Math.abs(y - (H - margin)) < 0.1;
            if (pattern === 'yama' && isTopEdge) return; 
            if (pattern === 'hi' && !isEdge) return; 

            const maxP = isEdge ? pOuter : pInner;
            const xPoints = getSymmetricSpacingArray(W, margin, maxP);
            xPoints.forEach(x => { nails.push({x, y, type: isEdge ? 'peri' : 'mid'}); });
        });
    }
    return nails.filter((v, i, a) => a.findIndex(t => Math.abs(t.x-v.x)<0.1 && Math.abs(t.y-v.y)<0.1) === i);
}

// --- メイン計算 ---
function calculate() {

    const dim_a = parseFloat(document.getElementById('dim_a').value) || 0; 
    const W_input = parseFloat(document.getElementById('dim_w').value) || 0;
    const H_input = parseFloat(document.getElementById('dim_h').value) || 0;
    const margin = parseFloat(document.getElementById('margin_edge').value) || 0;
    const Pv_input = parseFloat(document.getElementById('pitch_v').value) || W_input;
    const Ph_input = parseFloat(document.getElementById('pitch_h').value) || 0;
    const pOuter = parseFloat(document.getElementById('p_outer').value) || 15;
    const pInner = parseFloat(document.getElementById('p_inner').value) || 15;
    const pattern = document.getElementById('nail_pattern').value;
    
    const k_val = parseFloat(document.getElementById('val_k').value) || 0;         // kN/cm
    const dpv_val = parseFloat(document.getElementById('val_dpv').value) || 0;     // kN
    const pa_nail = parseFloat(document.getElementById('pa_nail').value) || 0;     // N
    const t = parseFloat(document.getElementById('t_panel').value) || 0;           // cm
    const Gb = parseFloat(document.getElementById('gb_panel').value) || 0;         // N/cm²
    
    const isManualMode = document.querySelector('input[name="calc_mode"]:checked').value === 'manual';

    if (W_input <= 0 || H_input <= 0) return;

    // --- 表3.3.1 参照表示 ---
    const selT331 = document.getElementById('preset_table331').value;
    const data331 = table331[selT331];
    let dy_val = 0, du_val = 0;
    if(data331) {
        dy_val = data331.dy;
        du_val = data331.du;
        setHTML('out_t331_name', data331.name);
        setHTML('out_k', data331.k.toFixed(2));
        setHTML('out_dy', data331.dy.toFixed(2));
        setHTML('out_du', data331.du.toFixed(2));
        setHTML('out_dpv', data331.dpv.toFixed(2));
    } else {
        setHTML('out_t331_name', "手入力");
        setHTML('out_k', k_val.toFixed(2));
        setHTML('out_dy', "---");
        setHTML('out_du', "---");
        setHTML('out_dpv', dpv_val.toFixed(2));
    }

    // 釘発生と定数計算
    let original_nails = generateNails(W_input, H_input, margin, Pv_input, Ph_input, pOuter, pInner, pattern);
    let nails = JSON.parse(JSON.stringify(original_nails));
    
    let isRotated = (W_input > H_input);
    if (W_input === H_input) {
        let countW = nails.filter(n => Math.abs(n.y - margin) < 0.1 || Math.abs(n.y - (H_input - margin)) < 0.1).length; 
        let countH = nails.filter(n => Math.abs(n.x - margin) < 0.1 || Math.abs(n.x - (W_input - margin)) < 0.1).length; 
        if (countH > countW) isRotated = true;
    }

    if (isRotated) nails = nails.map(n => ({ x: n.y, y: n.x, type: n.type }));
    const dimX = isRotated ? H_input : W_input;
    const dimY = isRotated ? W_input : H_input;

    if (nails.length > 0) {
        let min_x = Math.min(...nails.map(n => n.x));
        let min_y = Math.min(...nails.map(n => n.y));
        nails = nails.map(n => ({ x: n.x - min_x, y: n.y - min_y, type: n.type }));
    }

    const N = nails.length;
    const Aw = dimX * dimY;

    let auto_Ixy = 0, auto_Zxy = 0, auto_Cxy = 1.0;

    if (N > 0) {
        let sum_x = 0, sum_y = 0;
        nails.forEach(n => { sum_x += n.x; sum_y += n.y; });
        const x0 = sum_x / N;
        const y0 = sum_y / N;

        let Ix = 0, Iy = 0, dy_max = 0, dx_max = 0;
        nails.forEach(n => {
            const dx = n.x - x0; const dy = n.y - y0;
            Ix += dy * dy; Iy += dx * dx;
            if(Math.abs(dy) > dy_max) dy_max = Math.abs(dy);
            if(Math.abs(dx) > dx_max) dx_max = Math.abs(dx);
        });

        const Zx = dy_max > 0 ? Ix / dy_max : 0;
        const Zy = dx_max > 0 ? Iy / dx_max : 0;
        
        auto_Ixy = (Ix + Iy) > 0 ? ((Ix * Iy) / (Ix + Iy)) / Aw : 0;
        auto_Zxy = (Zx > 0 && Zy > 0) ? 1.0 / (Aw * Math.sqrt(1.0/(Zx*Zx) + 1.0/(Zy*Zy))) : 0;

        let tr_xy = 1.0;
        if (Iy >= Ix && Ix > 0) { tr_xy = 1.285 * Iy / Ix; } 
        else if (Ix > 0) { tr_xy = Iy / (1.285 * Ix); }
        const tr_yx = tr_xy > 0 ? 1.0 / tr_xy : 1.0;

        let ZPx = 0, ZPy = 0;
        nails.forEach(n => {
            const dx = n.x - x0; const dy = n.y - y0;
            const denom_x = Math.sqrt(dx*dx * tr_yx*tr_yx + dy*dy);
            if(denom_x > 0) ZPx += (dy*dy) / denom_x;
            const denom_y = Math.sqrt(dx*dx + dy*dy * tr_xy*tr_xy);
            if(denom_y > 0) ZPy += (dx*dx) / denom_y;
        });

        const Xerr = (ZPx + ZPy) > 0 ? (2 * Math.abs(ZPx - ZPy)) / (ZPx + ZPy) : 0;
        const Yerr = 0.998 + 0.068 * Xerr + 0.906 * Xerr * Xerr;
        const ZPxy = (0.941 * (ZPx + ZPy)) / (2 * Yerr * Aw);
        
        auto_Cxy = auto_Zxy > 0 ? ZPxy / auto_Zxy : 1.0;
        if (auto_Cxy < 1.0) auto_Cxy = 1.0;
    }

    let final_Ixy, final_Zxy, final_Cxy;
    if (isManualMode) {
        final_Ixy = parseFloat(document.getElementById('manual_ixy').value) || 0;
        final_Zxy = parseFloat(document.getElementById('manual_zxy').value) || 0;
        final_Cxy = parseFloat(document.getElementById('manual_cxy').value) || 1.0;
    } else {
        final_Ixy = auto_Ixy;
        final_Zxy = auto_Zxy;
        final_Cxy = auto_Cxy;
        document.getElementById('manual_ixy').value = auto_Ixy.toFixed(4);
        document.getElementById('manual_zxy').value = auto_Zxy.toFixed(5);
        document.getElementById('manual_cxy').value = auto_Cxy.toFixed(3);
    }

    // ==========================================
    // グレー本 P.232～ 式 (3.5.1) ～ (3.5.9) 厳密計算
    // ==========================================
    
    // --- 単位の補正 (表のkNをNに揃える) ---
    const dPv_N = dpv_val * 1000;   // 降伏耐力 [N]
    const k_Ncm = k_val * 1000;     // 剛性 [N/cm]
    
    // （3.5.3） 面材釘による単位面積当たりの降伏モーメント [N/cm]
    const my = dPv_N * final_Zxy;
    
    // （3.5.2） 水平構面の単位長さ当たりの降伏耐力 [N/cm]
    const qy = my;
    
    // （3.5.5） 面材釘による単位面積当たりの回転剛性 [N/cm]
    const kr = k_Ncm * final_Ixy;
    
    // （3.5.4） 水平構面の単位長さ当たりのせん断剛性 [N/cm/rad]
    const K = (kr > 0 && Gb > 0 && t > 0) ? 1.0 / ( (1.0 / kr) + (1.0 / (Gb * t)) ) : 0;
    
    // （3.5.6） 水平構面の変形角1/150時の単位長さ当たりの耐力 [N/cm]
    const q150 = K * (1.0 / 150.0);
    
    // （3.5.8） 面材釘による単位面積当たりの終局モーメント [N/cm]
    const mu = dPv_N * final_Zxy * final_Cxy;
    
    // （3.5.7） 水平構面の単位長さ当たりの終局耐力 [N/cm]
    const qu = mu;
    
    // （3.5.9） 面材釘による塑性率
    const mu_factor = dy_val > 0 ? (du_val / dy_val) : 0;

    // （3.5.1） 水平構面の単位長さ当たりの許容せん断耐力 [N/cm]
    const qa = pa_nail * final_Zxy * final_Cxy;
    
    // --- 最終算出値 ---
    const Pa_total = qa * dim_a; // 構面全体の許容せん断耐力 [N]

    // --- HTML生成 ---
    let out_html = "";
    const addP = (title, formula) => { out_html += `<li><strong>${title}</strong><br><div class="formula">${formula}</div></li>`; };

    const modeStr = isManualMode ? "手入力値" : "自動計算値";
    out_html += `<li><strong>[定数] 釘配列諸定数 (${modeStr})</strong><br><div class="formula" style="font-size:0.9em; border:none; background:transparent; color:#4a5568;">I<sub>xy</sub> = ${final_Ixy.toFixed(4)}, Z<sub>xy</sub> = ${final_Zxy.toFixed(5)}, C<sub>xy</sub> = ${final_Cxy.toFixed(3)}</div></li>`;

    addP("（3.5.3） 面材釘による単位面積当たりの降伏モーメント m<sub>y</sub>", 
         `m<sub>y</sub> = &Delta;P<sub>v</sub> &cdot; Z<sub>xy</sub> = (${dpv_val} &times; 1000) &times; ${final_Zxy.toFixed(5)} = ${my.toFixed(2)} N/cm`);

    addP("（3.5.2） 水平構面の単位長さ当たりの降伏耐力 q<sub>y</sub>", 
         `q<sub>y</sub> = m<sub>y</sub> = ${qy.toFixed(2)} N/cm`);

    addP("（3.5.5） 面材釘による単位面積当たりの回転剛性 k<sub>r</sub>", 
         `k<sub>r</sub> = k &cdot; I<sub>xy</sub> = (${k_val} &times; 1000) &times; ${final_Ixy.toFixed(4)} = ${kr.toFixed(2)} N/cm`);

    addP("（3.5.4） 水平構面の単位長さ当たりのせん断剛性 K", 
         `K = 1 / ( 1/k<sub>r</sub> + 1/(G<sub>b</sub>&cdot;t) ) = 1 / ( 1/${kr.toFixed(2)} + 1/(${Gb}&times;${t.toFixed(1)}) ) = ${K.toFixed(1)} N/cm/rad`);

    addP("（3.5.6） 水平構面の変形角1/150時の単位長さ当たりの耐力 q<sub>1/150</sub>", 
         `q<sub>1/150</sub> = K &cdot; (1/150) = ${K.toFixed(1)} / 150 = ${q150.toFixed(2)} N/cm`);

    addP("（3.5.8） 面材釘による単位面積当たりの終局モーメント m<sub>u</sub>", 
         `m<sub>u</sub> = &Delta;P<sub>v</sub> &cdot; Z<sub>xy</sub> &cdot; C<sub>xy</sub> = (${dpv_val} &times; 1000) &times; ${final_Zxy.toFixed(5)} &times; ${final_Cxy.toFixed(3)} = ${mu.toFixed(2)} N/cm`);

    addP("（3.5.7） 水平構面の単位長さ当たりの終局耐力 q<sub>u</sub>", 
         `q<sub>u</sub> = m<sub>u</sub> = ${qu.toFixed(2)} N/cm`);

    if(dy_val > 0) {
        addP("（3.5.9） 面材釘による塑性率 &mu;", 
             `&mu; = &delta;<sub>u</sub> / &delta;<sub>y</sub> = ${du_val.toFixed(2)} / ${dy_val.toFixed(2)} = ${mu_factor.toFixed(2)}`);
    } else {
        addP("（3.5.9） 面材釘による塑性率 &mu;", `&mu; = &delta;<sub>u</sub> / &delta;<sub>y</sub> = (値未設定のため算出不可)`);
    }

    addP("（3.5.1） 水平構面の単位長さ当たりの許容せん断耐力 q<sub>a</sub>", 
         `q<sub>a</sub> = p<sub>a</sub> &cdot; Z<sub>xy</sub> &cdot; C<sub>xy</sub> = ${pa_nail} &times; ${final_Zxy.toFixed(5)} &times; ${final_Cxy.toFixed(3)} = ${qa.toFixed(2)} N/cm`);

    setHTML('process_list', out_html);
    setHTML('res_Pa', Math.floor(Pa_total).toLocaleString());
    setHTML('nail_count', `配置釘本数: N = ${N} 本`);

    let vLines = []; if(Pv_input>0){for(let x=Pv_input;x<W_input-1;x+=Pv_input)vLines.push(x);}
    let hLines = []; if(Ph_input>0){for(let y=Ph_input;y<H_input-1;y+=Ph_input)hLines.push(y);}
    draw(W_input, H_input, original_nails, vLines, hLines, margin);
}

function draw(W, H, nails, vLines, hLines, margin) {
    const canvas = document.getElementById('canvas');
    if(!canvas) return; 
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 300, 200);
    
    const scale = Math.min(260/W, 160/H);
    const ox = (300 - W*scale)/2, oy = (200 - H*scale)/2;

    ctx.strokeStyle = "#cbd5e0"; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    vLines.forEach(x => { ctx.beginPath(); ctx.moveTo(ox+x*scale, oy); ctx.lineTo(ox+x*scale, oy+H*scale); ctx.stroke(); });
    hLines.forEach(y => { ctx.beginPath(); ctx.moveTo(ox, oy+y*scale); ctx.lineTo(ox+W*scale, oy+y*scale); ctx.stroke(); });

    ctx.setLineDash([]); ctx.strokeStyle = "#2d3748"; ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, W*scale, H*scale);
    
    if(margin > 0) {
        ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
        ctx.strokeRect(ox+margin*scale, oy+margin*scale, (W-2*margin)*scale, (H-2*margin)*scale);
    }

    nails.forEach(n => { 
        ctx.fillStyle = (n.type === 'peri') ? "#2b6cb0" : "#dd6b20";
        ctx.beginPath(); ctx.arc(ox+n.x*scale, oy+n.y*scale, 2.5, 0, Math.PI*2); ctx.fill(); 
    });
}

function initApp() {
    applyTable331Preset();
    calculate();
}
