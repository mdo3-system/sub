/**
 * 面材張り大壁の詳細計算法 ロジック
 */
async function checkAuth() { return true; }

const tbl331_data = [
    { p: "構造用合板 9mm", n: "N50", k: 3.35, dy: 0.23, du: 1.49, dpv: 0.81 },
    { p: "構造用合板 9mm", n: "N65", k: 4.38, dy: 0.22, du: 1.91, dpv: 1.10 },
    { p: "構造用合板 9mm", n: "CN50", k: 4.42, dy: 0.21, du: 1.83, dpv: 1.00 },
    { p: "構造用合板 9mm", n: "CN65", k: 5.76, dy: 0.27, du: 2.19, dpv: 1.70 },
    { p: "構造用合板 12mm", n: "N50", k: 4.80, dy: 0.21, du: 1.53, dpv: 0.98 },
    { p: "構造用合板 12mm", n: "N65", k: 6.29, dy: 0.21, du: 1.89, dpv: 1.31 },
    { p: "構造用合板 12mm", n: "CN50", k: 6.34, dy: 0.19, du: 1.81, dpv: 1.21 },
    { p: "構造用合板 12mm", n: "CN65", k: 8.26, dy: 0.25, du: 2.17, dpv: 2.05 },
    { p: "構造用合板 15mm", n: "N65", k: 6.29, dy: 0.21, du: 1.89, dpv: 1.31 },
    { p: "構造用合板 15mm", n: "N75", k: 7.08, dy: 0.18, du: 1.92, dpv: 1.44 },
    { p: "構造用合板 15mm", n: "CN65", k: 8.26, dy: 0.25, du: 2.17, dpv: 2.05 },
    { p: "構造用合板 15mm", n: "CN75", k: 10.03, dy: 0.20, du: 2.19, dpv: 2.10 },
    { p: "構造用合板 24mm", n: "N75", k: 7.08, dy: 0.18, du: 1.92, dpv: 1.44 },
    { p: "構造用合板 24mm", n: "N90", k: 9.50, dy: 0.16, du: 1.96, dpv: 1.56 },
    { p: "構造用合板 24mm", n: "CN75", k: 10.03, dy: 0.20, du: 2.19, dpv: 2.10 },
    { p: "構造用合板 24mm", n: "CN90", k: 13.43, dy: 0.18, du: 2.23, dpv: 2.45 }
];

const tbl331_novo = [
    { p: "novopan STPⅡ 9mm", n: "N50", k: 3.77, dy: 0.24, du: 1.61, dpv: 1.15 },
    { p: "novopan STPⅡ 9mm", n: "FC2850", k: 5.11, dy: 0.21, du: 1.61, dpv: 1.21 }
];

const tbl332_data = [
    { p: "構造用合板 9,12,15,24mm", g: "JAS 1級", tmax: 0.36, e1: 350, e2: 550 },
    { p: "構造用合板 9,12,15,24mm", g: "JAS 2級", tmax: 0.24, e1: 350, e2: 550 }
];

function initTables() {
    let sel331 = document.getElementById('sel_331');
    let tbody331 = `<caption>表3.3.1 面材と釘1本あたりの一面せん断の数値</caption><tr><th>面材</th><th>釘</th><th>k (kN/cm)</th><th>δy (cm)</th><th>δu (cm)</th><th>ΔPv (kN)</th></tr>`;
    tbl331_data.forEach((d, i) => {
        sel331.innerHTML += `<option value="331_${i}">${d.p} - ${d.n}</option>`;
        tbody331 += `<tr><td>${d.p}</td><td>${d.n}</td><td>${d.k.toFixed(2)}</td><td>${d.dy.toFixed(2)}</td><td>${d.du.toFixed(2)}</td><td>${d.dpv.toFixed(2)}</td></tr>`;
    });
    document.getElementById('tbl_331').innerHTML = tbody331;

    let tbody_novo = `<caption>資料添付: novopan STPⅡ (9mm) の数値</caption><tr><th>面材</th><th>釘</th><th>k (kN/cm)</th><th>δy (cm)</th><th>δu (cm)</th><th>ΔPv (kN)</th></tr>`;
    tbl331_novo.forEach((d, i) => {
        sel331.innerHTML += `<option value="novo_${i}">${d.p} - ${d.n}</option>`;
        tbody_novo += `<tr><td>${d.p}</td><td>${d.n}</td><td>${d.k.toFixed(2)}</td><td>${d.dy.toFixed(2)}</td><td>${d.du.toFixed(2)}</td><td>${d.dpv.toFixed(2)}</td></tr>`;
    });
    document.getElementById('tbl_331_novo').innerHTML = tbody_novo;

    let sel332 = document.getElementById('sel_332');
    let tbody332 = `<caption>表3.3.2 構造用合板のせん断強度及び曲げヤング係数</caption><tr><th>面材</th><th>等級</th><th>τmax (kN/cm²)</th><th>E1 (kN/cm²)</th><th>E2 (kN/cm²)</th></tr>`;
    tbl332_data.forEach((d, i) => {
        sel332.innerHTML += `<option value="332_${i}">${d.p} - ${d.g}</option>`;
        tbody332 += `<tr><td>${d.p}</td><td>${d.g}</td><td>${d.tmax.toFixed(2)}</td><td>${d.e1}</td><td>${d.e2}</td></tr>`;
    });
    document.getElementById('tbl_332').innerHTML = tbody332;
    
    sel331.value = "331_7"; 
    sel332.value = "332_0"; 

    apply331();
    apply332();
}

function apply331() {
    let val = document.getElementById('sel_331').value;
    let d = null;
    if(val.startsWith('331_')) d = tbl331_data[parseInt(val.split('_')[1])];
    if(val.startsWith('novo_')) d = tbl331_novo[parseInt(val.split('_')[1])];
    if(d) {
        document.getElementById('k_nail').value = d.k.toFixed(2);
        document.getElementById('d_y').value = d.dy.toFixed(2);
        document.getElementById('d_u').value = d.du.toFixed(2);
        document.getElementById('P_v').value = d.dpv.toFixed(2);
        
        if(d.p.includes("9mm")) document.getElementById('t_ply').value = 0.9;
        if(d.p.includes("12mm")) document.getElementById('t_ply').value = 1.2;
        if(d.p.includes("15mm")) document.getElementById('t_ply').value = 1.5;
        if(d.p.includes("24mm")) document.getElementById('t_ply').value = 2.4;
        calculate();
    }
}

function apply332() {
    let val = document.getElementById('sel_332').value;
    if(val.startsWith('332_')) {
        let d = tbl332_data[parseInt(val.split('_')[1])];
        document.getElementById('T_max').value = d.tmax.toFixed(2);
        document.getElementById('E1').value = d.e1;
        document.getElementById('E2').value = d.e2;
        calculate();
    }
}

function toggleM2() {
    let use_m2 = document.getElementById('use_m2').checked;
    document.getElementById('m2_inputs').style.display = use_m2 ? 'block' : 'none';
}

function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

async function exportData() {
    await checkAuth();
    const data = {
        wall: {
            W: document.getElementById('W_wall').value,
            H: document.getElementById('H_wall').value,
            k: document.getElementById('k_nail').value,
            Pv: document.getElementById('P_v').value,
            dy: document.getElementById('d_y').value,
            du: document.getElementById('d_u').value,
            t: document.getElementById('t_ply').value,
            GB: document.getElementById('GB').value,
            Tmax: document.getElementById('T_max').value,
            E1: document.getElementById('E1').value,
            E2: document.getElementById('E2').value
        },
        m1: {
            manual: document.getElementById('m1_manual').checked,
            Ixy: document.getElementById('m1_Ixy').value,
            Zxy: document.getElementById('m1_Zxy').value,
            Cxy: document.getElementById('m1_Cxy').value,
            W: document.getElementById('m1_W').value,
            H: document.getElementById('m1_H').value,
            e: document.getElementById('m1_e').value,
            frame_e: document.getElementById('m1_frame_e').value,
            Pv: document.getElementById('m1_Pv').value,
            pattern: document.getElementById('m1_pattern').value,
            outer: document.getElementById('m1_outer').value,
            inner: document.getElementById('m1_inner').value
        },
        m2: {
            use: document.getElementById('use_m2').checked,
            manual: document.getElementById('m2_manual').checked,
            Ixy: document.getElementById('m2_Ixy').value,
            Zxy: document.getElementById('m2_Zxy').value,
            Cxy: document.getElementById('m2_Cxy').value,
            W: document.getElementById('m2_W').value,
            H: document.getElementById('m2_H').value,
            e: document.getElementById('m2_e').value,
            frame_e: document.getElementById('m2_frame_e').value,
            Pv: document.getElementById('m2_Pv').value,
            pattern: document.getElementById('m2_pattern').value,
            outer: document.getElementById('m2_outer').value,
            inner: document.getElementById('m2_inner').value
        }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `shear_wall_calc.json`;
    a.click();
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    await checkAuth();
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const d = JSON.parse(e.target.result);
            
            // 釘配列計算ツールからのデータ連携チェック
            if (d.Ixy !== undefined && d.Zxy !== undefined) {
                document.getElementById('m1_manual').checked = true;
                document.getElementById('m1_Ixy').value = d.Ixy;
                document.getElementById('m1_Zxy').value = d.Zxy;
                if (d.Cxy !== undefined) document.getElementById('m1_Cxy').value = d.Cxy;
                if (d.w) document.getElementById('m1_W').value = d.w;
                if (d.h) document.getElementById('m1_H').value = d.h;
                if (d.edge) {
                    document.getElementById('m1_e').value = d.edge;
                    document.getElementById('m1_frame_e').value = d.edge * 2; // 目安
                }
                calculate();
                return;
            }

            if(d.wall) {
                document.getElementById('W_wall').value = d.wall.W;
                document.getElementById('H_wall').value = d.wall.H;
                document.getElementById('k_nail').value = d.wall.k;
                document.getElementById('P_v').value = d.wall.Pv;
                document.getElementById('d_y').value = d.wall.dy;
                document.getElementById('d_u').value = d.wall.du;
                document.getElementById('t_ply').value = d.wall.t;
                document.getElementById('GB').value = d.wall.GB;
                document.getElementById('T_max').value = d.wall.Tmax;
                document.getElementById('E1').value = d.wall.E1;
                document.getElementById('E2').value = d.wall.E2;
            }
            if(d.m1) {
                document.getElementById('m1_manual').checked = d.m1.manual;
                document.getElementById('m1_Ixy').value = d.m1.Ixy;
                document.getElementById('m1_Zxy').value = d.m1.Zxy;
                document.getElementById('m1_Cxy').value = d.m1.Cxy;
                document.getElementById('m1_W').value = d.m1.W;
                document.getElementById('m1_H').value = d.m1.H;
                document.getElementById('m1_e').value = d.m1.e;
                document.getElementById('m1_frame_e').value = d.m1.frame_e;
                document.getElementById('m1_Pv').value = d.m1.Pv;
                document.getElementById('m1_pattern').value = d.m1.pattern;
                document.getElementById('m1_outer').value = d.m1.outer;
                document.getElementById('m1_inner').value = d.m1.inner;
            }
            if(d.m2) {
                document.getElementById('use_m2').checked = d.m2.use;
                toggleM2();
                document.getElementById('m2_manual').checked = d.m2.manual;
                document.getElementById('m2_Ixy').value = d.m2.Ixy;
                document.getElementById('m2_Zxy').value = d.m2.Zxy;
                document.getElementById('m2_Cxy').value = d.m2.Cxy;
                document.getElementById('m2_W').value = d.m2.W;
                document.getElementById('m2_H').value = d.m2.H;
                document.getElementById('m2_e').value = d.m2.e;
                document.getElementById('m2_frame_e').value = d.m2.frame_e;
                document.getElementById('m2_Pv').value = d.m2.Pv;
                document.getElementById('m2_pattern').value = d.m2.pattern;
                document.getElementById('m2_outer').value = d.m2.outer;
                document.getElementById('m2_inner').value = d.m2.inner;
            }
            calculate();
        } catch(err) { alert('読込失敗: ' + err.message); }
    };
    reader.readAsText(file);
}

function getSymmetricSpacingArray(length, margin, maxPitch) {
    const effL = length - 2 * margin;
    if (effL <= 0) return [margin + effL / 2]; 
    const n_intervals = Math.ceil(effL / maxPitch);
    const n_nails = n_intervals + 1;
    let arr = [];
    const center = effL / 2;
    if (n_nails % 2 !== 0) {
        arr.push(center);
        for (let i = 1; i <= Math.floor(n_nails / 2); i++) {
            let pos1 = center - i * maxPitch;
            let pos2 = center + i * maxPitch;
            if (i === Math.floor(n_nails / 2)) { pos1 = 0; pos2 = effL; }
            arr.push(pos1); arr.push(pos2);
        }
    } else {
        for (let i = 0; i < n_nails / 2; i++) {
            let pos1 = center - (0.5 + i) * maxPitch;
            let pos2 = center + (0.5 + i) * maxPitch;
            if (i === (n_nails / 2) - 1) { pos1 = 0; pos2 = effL; }
            arr.push(pos1); arr.push(pos2);
        }
    }
    arr.sort((a,b) => a - b);
    return arr.map(x => Math.max(0, Math.min(x, effL)) + margin);
}

function generateNails(W, H, margin, Pv, Ph, pOuter, pInner, pattern) {
    let nails = [];
    let vLines = [margin, W - margin];
    let hLines = [margin, H - margin];
    
    if (pattern !== 'kuchi') {
        if(Pv > 0) { for(let x=Pv; x<W-0.1; x+=Pv) vLines.push(x); }
        if(Ph > 0) { for(let y=Ph; y<H-0.1; y+=Ph) hLines.push(y); }
    }
    vLines = [...new Set(vLines)].sort((a,b)=>a-b);
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
            if (pattern === 'kuchi' && !isEdge) return;

            const maxP = isEdge ? pOuter : pInner;
            const xPoints = getSymmetricSpacingArray(W, margin, maxP);
            xPoints.forEach(x => { nails.push({x, y, type: isEdge ? 'peri' : 'mid'}); });
        });
    }
    return nails.filter((v, i, a) => a.findIndex(t => Math.abs(t.x-v.x)<0.1 && Math.abs(t.y-v.y)<0.1) === i);
}

function drawNails(canvasId, W, H, nails, margin, Pv, Ph, pattern) {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return; 
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 200, 150);
    
    const scale = Math.min(180/W, 130/H);
    const ox = (200 - W*scale)/2, oy = (150 - H*scale)/2;

    ctx.strokeStyle = "#cbd5e0"; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    if (pattern !== 'kuchi') {
        if(Pv>0){for(let x=Pv;x<W-1;x+=Pv){ ctx.beginPath(); ctx.moveTo(ox+x*scale, oy); ctx.lineTo(ox+x*scale, oy+H*scale); ctx.stroke(); }}
        if(Ph>0){for(let y=Ph;y<H-1;y+=Ph){ ctx.beginPath(); ctx.moveTo(ox, oy+y*scale); ctx.lineTo(ox+W*scale, oy+y*scale); ctx.stroke(); }}
    }

    ctx.setLineDash([]); ctx.strokeStyle = "#2d3748"; ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, W*scale, H*scale);
    
    if(margin > 0) {
        ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
        ctx.strokeRect(ox+margin*scale, oy+margin*scale, (W-2*margin)*scale, (H-2*margin)*scale);
    }

    nails.forEach(n => { 
        ctx.fillStyle = (n.type === 'peri') ? "#2b6cb0" : "#dd6b20";
        ctx.beginPath(); ctx.arc(ox+n.x*scale, oy+n.y*scale, 2.0, 0, Math.PI*2); ctx.fill(); 
    });
}

function calculate() {
    const H_wall = parseFloat(document.getElementById('H_wall').value) || 300;
    const W_wall = parseFloat(document.getElementById('W_wall').value) || 91;
    
    const k = parseFloat(document.getElementById('k_nail').value) || 8.26;
    const P_v = parseFloat(document.getElementById('P_v').value) || 2.05;
    const d_y = parseFloat(document.getElementById('d_y').value) || 0.25;
    const d_u = parseFloat(document.getElementById('d_u').value) || 2.17;
    
    const t = parseFloat(document.getElementById('t_ply').value) || 1.2;
    const GB = parseFloat(document.getElementById('GB').value) || 40;
    const T_max = parseFloat(document.getElementById('T_max').value) || 0.36;
    const E1 = parseFloat(document.getElementById('E1').value) || 350;
    const E2 = parseFloat(document.getElementById('E2').value) || 550;

    let errs = [];
    let isOverallValid = true;

    const processPanel = (pid, name) => {
        const W = parseFloat(document.getElementById(`${pid}_W`).value) || 0;
        const H = parseFloat(document.getElementById(`${pid}_H`).value) || 0;
        const e = parseFloat(document.getElementById(`${pid}_e`).value) || 0;
        const frame_e = parseFloat(document.getElementById(`${pid}_frame_e`).value) || 0;
        const Pv = parseFloat(document.getElementById(`${pid}_Pv`).value) || W;
        const Ph = 0;
        const outer = parseFloat(document.getElementById(`${pid}_outer`).value) || 7.5;
        const inner = parseFloat(document.getElementById(`${pid}_inner`).value) || 15;
        const pattern = document.getElementById(`${pid}_pattern`).value;
        const isManual = document.getElementById(`${pid}_manual`).checked;

        if(W <= 0 || H <= 0) return null;

        let req_e = Math.max(1.0, t * 0.8);
        let req_frame = Math.max(2.0, t * 0.8);
        let p_valid = true;

        if (e < req_e) {
            errs.push(`${name}: 面材のへりあき(${e}cm)が規定(${req_e.toFixed(2)}cm以上)を満たしていません。`);
            p_valid = false;
        }
        if (frame_e < req_frame) {
            errs.push(`${name}: 軸材の縁端距離(${frame_e}cm)が規定(${req_frame.toFixed(2)}cm以上)を満たしていません。`);
            p_valid = false;
        }

        if (!p_valid) {
            isOverallValid = false;
            setHTML(`${pid}_count`, "条件NGのため計算スキップ");
            drawNails(`${pid}_canvas`, W, H, [], e, Pv, Ph, pattern);
            return null;
        }
        
        let original_nails = generateNails(W, H, e, Pv, Ph, outer, inner, pattern);
        let nails = JSON.parse(JSON.stringify(original_nails)); 
        let isRotated = false;
        if (W > H) { isRotated = true; } else if (W === H) {
            let countW = nails.filter(n => Math.abs(n.y - e) < 0.1 || Math.abs(n.y - (H - e)) < 0.1).length; 
            let countH = nails.filter(n => Math.abs(n.x - e) < 0.1 || Math.abs(n.x - (W - e)) < 0.1).length; 
            if (countH > countW) isRotated = true;
        }
        if (isRotated) nails = nails.map(n => ({ x: n.y, y: n.x, type: n.type }));
        
        const dimX = isRotated ? H : W;
        const dimY = isRotated ? W : H;
        if (nails.length > 0) {
            let min_x = Math.min(...nails.map(n => n.x));
            let min_y = Math.min(...nails.map(n => n.y));
            nails = nails.map(n => ({ x: n.x - min_x, y: n.y - min_y, type: n.type }));
        }

        const N = nails.length;
        if(N === 0) return null;

        const Aw = dimX * dimY;
        let sum_x = 0, sum_y = 0;
        nails.forEach(n => { sum_x += n.x; sum_y += n.y; });
        const x0 = sum_x / N, y0 = sum_y / N;

        let Ix = 0, Iy = 0, dy_max = 0, dx_max = 0;
        nails.forEach(n => {
            const dx = n.x - x0, dy = n.y - y0;
            Ix += dy * dy; Iy += dx * dx;
            if(Math.abs(dy) > dy_max) dy_max = Math.abs(dy);
            if(Math.abs(dx) > dx_max) dx_max = Math.abs(dx);
        });

        const Zx = dy_max > 0 ? Ix / dy_max : 0;
        const Zy = dx_max > 0 ? Iy / dx_max : 0;
        let calc_Zxy = (Zx > 0 && Zy > 0) ? 1.0 / (Aw * Math.sqrt(1.0/(Zx*Zx) + 1.0/(Zy*Zy))) : 0;
        const calc_Ixy = (Ix + Iy) > 0 ? ((Ix * Iy) / (Ix + Iy)) / Aw : 0; 

        let tr_xy = 1.0;
        if (Iy >= Ix && Ix > 0) tr_xy = 1.285 * Iy / Ix;
        else if (Ix > 0) tr_xy = Iy / (1.285 * Ix);
        const tr_yx = tr_xy > 0 ? 1.0 / tr_xy : 1.0;

        let ZPx = 0, ZPy = 0;
        nails.forEach(n => {
            const dx = n.x - x0, dy = n.y - y0;
            const denom_x = Math.sqrt(dx*dx * tr_yx*tr_yx + dy*dy);
            if(denom_x > 0) ZPx += (dy*dy) / denom_x;
            const denom_y = Math.sqrt(dx*dx + dy*dy * tr_xy*tr_xy);
            if(denom_y > 0) ZPy += (dx*dx) / denom_y;
        });

        const Xerr = (ZPx + ZPy) > 0 ? (2 * Math.abs(ZPx - ZPy)) / (ZPx + ZPy) : 0;
        const Yerr = 0.998 + 0.068 * Xerr + 0.906 * Xerr * Xerr;
        const ZPxy = (0.941 * (ZPx + ZPy)) / (2 * Yerr * Aw);
        let calc_Cxy = calc_Zxy > 0 ? ZPxy / calc_Zxy : 1.0;
        if (calc_Cxy < 1.0) calc_Cxy = 1.0;

        let Ixy = calc_Ixy, Zxy = calc_Zxy, Cxy = calc_Cxy;
        if(isManual) {
            Ixy = parseFloat(document.getElementById(`${pid}_Ixy`).value) || Ixy;
            Zxy = parseFloat(document.getElementById(`${pid}_Zxy`).value) || Zxy;
            Cxy = parseFloat(document.getElementById(`${pid}_Cxy`).value) || Cxy;
        } else {
            document.getElementById(`${pid}_Ixy`).value = Ixy.toFixed(3);
            document.getElementById(`${pid}_Zxy`).value = Zxy.toFixed(3);
            document.getElementById(`${pid}_Cxy`).value = Cxy.toFixed(2);
        }

        drawNails(`${pid}_canvas`, W, H, original_nails, e, Pv, Ph, pattern);
        setHTML(`${pid}_count`, `N = ${N}本 (Ixy=${Ixy.toFixed(3)}, Zxy=${Zxy.toFixed(3)}, Cxy=${Cxy.toFixed(2)})`);

        const K0 = Aw / (1/(Ixy * k) + 1/(GB * t));
        const My = Aw * Zxy * P_v;
        const Mu = Cxy * My;
        const mu = (d_u * GB * t + d_y * Ixy * k) / (d_y * (GB * t + Ixy * k));
        
        const tau_N = (Cxy * Zxy * P_v) / t;
        
        let a_c = Math.min(W, H), b_c = Math.max(W, H);
        let E1_c = E1, E2_c = E2;
        let beta_a = (a_c/b_c) * Math.pow(E2_c/E1_c, 0.25);
        if(beta_a > 1) {
            let tmp = a_c; a_c = b_c; b_c = tmp;
            tmp = E1_c; E1_c = E2_c; E2_c = tmp;
            beta_a = (a_c/b_c) * Math.pow(E2_c/E1_c, 0.25);
        }
        const alpha = GB / Math.sqrt(E1_c * E2_c);
        const p1 = 7.8 * alpha + 4.2;
        const p2 = Math.min(159.1*alpha*alpha - 35.8*alpha - 0.7, 28.6*alpha*alpha - 21.2*alpha + 1.6);
        const p3 = 6.2 * alpha + 8.4;
        const Ca = p1 * beta_a * beta_a + p2 * beta_a + p3;
        
        const tau_cr = (Math.pow(Math.PI, 2) * t * t * Ca) / (3 * a_c * a_c) * Math.pow(Math.pow(E1_c, 3) * E2_c, 0.25);

        let ok = (tau_N <= T_max && tau_N <= tau_cr);
        if(!ok) {
            errs.push(`${name}: 座屈またはせん断強度の検定NGです (τN=${tau_N.toFixed(3)}, τmax=${T_max}, τcr=${tau_cr.toFixed(3)})`);
            isOverallValid = false;
        }

        let p_html = `<li style="background:#f7fafc; padding:8px; border-radius:4px; margin-top:10px;"><strong>【${name}の各係数と検定】</strong><br>
                 ・I<sub>xy</sub>=${Ixy.toFixed(3)}, Z<sub>xy</sub>=${Zxy.toFixed(3)}, C<sub>xy</sub>=${Cxy.toFixed(3)} (面積 A<sub>w</sub>=${Aw.toFixed(1)} cm²)<br>
                 ・(3.3.10a) &alpha; = G / &radic;(E<sub>1</sub>&middot;E<sub>2</sub>) = <strong>${alpha.toFixed(4)}</strong><br>
                 ・(3.3.10b) &beta;<sub>a</sub> = (a/b) &middot; (E<sub>2</sub>/E<sub>1</sub>)<sup>1/4</sup> = <strong>${beta_a.toFixed(4)}</strong><br>
                 ・(3.3.11a) p<sub>1</sub> = 7.8&alpha; + 4.2 = <strong>${p1.toFixed(3)}</strong><br>
                 ・(3.3.11b) p<sub>2</sub> = min(159.1&alpha;² - 35.8&alpha; - 0.7, 28.6&alpha;² - 21.2&alpha; + 1.6) = <strong>${p2.toFixed(3)}</strong><br>
                 ・(3.3.11c) p<sub>3</sub> = 6.2&alpha; + 8.4 = <strong>${p3.toFixed(3)}</strong><br>
                 ・(3.3.10c) 座屈せん断応力 &tau;<sub>cr</sub> = (&pi;²&middot;t²&middot;C<sub>a</sub>)/(3&middot;a²) &middot; (E<sub>1</sub>³&middot;E<sub>2</sub>)<sup>1/4</sup> = <strong>${tau_cr.toFixed(3)}</strong><br>
                 ・(3.3.9) 面材釘せん断応力 &tau;<sub>N</sub> = (C<sub>xy</sub>&middot;Z<sub>xy</sub>&middot;&Delta;P<sub>v</sub>) / t = <strong>${tau_N.toFixed(3)}</strong><br>
                 ・(3.3.8) 検定: &tau;<sub>N</sub>(${tau_N.toFixed(3)}) &le; &tau;<sub>max</sub>(${T_max}) &amp; &tau;<sub>N</sub> &le; &tau;<sub>cr</sub>(${tau_cr.toFixed(3)}) &rarr; 
                 ${ok ? '<span style="color:green;font-weight:bold;">OK</span>' : '<span style="color:red;font-weight:bold;">NG</span>'}<br>
                 ・(3.3.4) &Delta;K<sub>0</sub> = 1 / (1/(I<sub>xy</sub>&middot;k) + 1/(G&middot;t)) = ${(K0/Aw).toFixed(4)}<br>
                 ・(3.3.3) 回転剛性 K<sub>0</sub> = A<sub>w</sub> &middot; &Delta;K<sub>0</sub> = <strong>${K0.toFixed(1)}</strong><br>
                 ・(3.3.5) 降伏モーメント M<sub>y</sub> = A<sub>w</sub> &middot; Z<sub>xy</sub> &middot; &Delta;P<sub>v</sub> = <strong>${My.toFixed(1)}</strong><br>
                 ・(3.3.6) 終局モーメント M<sub>u</sub> = C<sub>xy</sub> &middot; M<sub>y</sub> = <strong>${Mu.toFixed(1)}</strong><br>
                 ・(3.3.7) 靭性率 &mu; = (&delta;<sub>u</sub>&middot;G&middot;t + &delta;<sub>y</sub>&middot;I<sub>xy</sub>&middot;k) / (&delta;<sub>y</sub>&middot;(G&middot;t + I<sub>xy</sub>&middot;k)) = <strong>${mu.toFixed(2)}</strong>
                 </li>`;

        return { K0, My, Mu, mu, html: p_html };
    };

    let total_K0 = 0, total_My = 0, total_Mu = 0;
    let mu_array = [];
    let html_out = "";

    const res1 = processPanel('m1', '面材1(下側)');
    if (res1) { total_K0 += res1.K0; total_My += res1.My; total_Mu += res1.Mu; mu_array.push(res1.mu); html_out += res1.html; }

    if (document.getElementById('use_m2').checked) {
        const res2 = processPanel('m2', '面材2(上側)');
        if (res2) { total_K0 += res2.K0; total_My += res2.My; total_Mu += res2.Mu; mu_array.push(res2.mu); html_out += res2.html; }
    }

    const banner = document.getElementById('error_banner');
    const printBtn = document.getElementById('print_btn');
    if (!isOverallValid) {
        banner.innerHTML = errs.join("<br>");
        banner.style.display = 'block';
        printBtn.disabled = true;
        document.body.classList.add('is-ng-print'); 
        setHTML('process_list', '<li style="color:red; font-weight:bold;">入力値・検定にエラーがあるため、最終計算を実行できません。</li>');
        setHTML('res_Pa', 'NG');
        setHTML('res_dPa', 'NG');
        setHTML('print_Pa', 'NG');
        setHTML('print_dPa', 'NG');
        return;
    } else {
        banner.style.display = 'none';
        if (printBtn) printBtn.disabled = false;
        document.body.classList.remove('is-ng-print');
    }

    if (mu_array.length === 0) return;

    const final_mu = Math.min(...mu_array);
    const M150 = total_K0 / 150;
    const term3 = 0.2 * Math.sqrt(2 * final_mu - 1) * total_Mu;
    const Pa = (1 / H_wall) * Math.min(total_My, M150, term3);
    const dPa = Pa / (W_wall / 100);

    let final_html = `<li><strong>壁全体の集計</strong><br>
        &Sigma;K<sub>0i</sub> = ${total_K0.toFixed(1)} kN&middot;cm/rad<br>
        &Sigma;M<sub>yi</sub> = ${total_My.toFixed(1)} kN&middot;cm<br>
        &Sigma;M<sub>ui</sub> = ${total_Mu.toFixed(1)} kN&middot;cm<br>
        min(&mu;<sub>i</sub>) = ${final_mu.toFixed(2)}<br><br>
        <div class="formula">P<sub>a</sub> = (1 / H) &times; min( &Sigma;M<sub>yi</sub>, &Sigma;K<sub>0i</sub> / 150, 0.2&radic;(2&mu;-1)&Sigma;M<sub>ui</sub> )</div><br>
        P<sub>a</sub> = (1 / ${H_wall}) &times; min( ${total_My.toFixed(1)}, ${M150.toFixed(1)}, ${term3.toFixed(1)} ) = <strong>${Pa.toFixed(2)} kN</strong>
    </li>`;

    setHTML('process_list', html_out + final_html);
    
    setHTML('res_Pa', Pa.toFixed(2));
    setHTML('res_dPa', dPa.toFixed(2));
    setHTML('print_Pa', Pa.toFixed(2));
    setHTML('print_dPa', dPa.toFixed(2));
}

function initApp() {
    initTables();
    calculate();
}
