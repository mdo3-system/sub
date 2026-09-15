/**
 * 面材張り真壁の詳細計算法 ロジック
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

const tbl341_data = [
    { p: "スギ", r: "アカマツ", n: "N75", k: 6.5, dy: 0.33, du: 3.46, dpv: 2.10 },
    { p: "スプルース", r: "スプルース", n: "N75", k: 9.1, dy: 0.14, du: 3.07, dpv: 1.24 }
];

const tbl332_data = [
    { p: "構造用合板 12,15,24mm", g: "JAS 1級", tmax: 0.36, e1: 350, e2: 550 },
    { p: "構造用合板 12,15,24mm", g: "JAS 2級", tmax: 0.24, e1: 350, e2: 550 },
    { p: "novopan STPⅡ 9mm", g: "-", tmax: 0.81, e1: 370, e2: 370 }
];

function initTables() {
    let sel331 = document.getElementById('sel_331');
    let tbody331 = `<caption>表3.3.1 面材釘1本あたりの一面せん断の数値 (+novopan)</caption><tr><th>面材</th><th>釘</th><th>k (kN/cm)</th><th>δy (cm)</th><th>δu (cm)</th><th>ΔPv (kN)</th></tr>`;
    tbl331_data.forEach((d, i) => {
        sel331.innerHTML += `<option value="331_${i}">${d.p} - ${d.n}</option>`;
        tbody331 += `<tr><td>${d.p}</td><td>${d.n}</td><td>${d.k.toFixed(2)}</td><td>${d.dy.toFixed(2)}</td><td>${d.du.toFixed(2)}</td><td>${d.dpv.toFixed(2)}</td></tr>`;
    });
    tbl331_novo.forEach((d, i) => {
        sel331.innerHTML += `<option value="novo_${i}">${d.p} - ${d.n}</option>`;
        tbody331 += `<tr><td>${d.p}</td><td>${d.n}</td><td>${d.k.toFixed(2)}</td><td>${d.dy.toFixed(2)}</td><td>${d.du.toFixed(2)}</td><td>${d.dpv.toFixed(2)}</td></tr>`;
    });
    document.getElementById('tbl_331').innerHTML = tbody331;

    let sel341 = document.getElementById('sel_341');
    let tbody341 = `<caption>表3.4.1 受材釘1本あたりの1面せん断の数値</caption><tr><th>軸材</th><th>受材</th><th>釘</th><th>k (kN/cm)</th><th>δy (cm)</th><th>δu (cm)</th><th>ΔPv (kN)</th></tr>`;
    tbl341_data.forEach((d, i) => {
        sel341.innerHTML += `<option value="341_${i}">${d.p} - ${d.r} - ${d.n}</option>`;
        tbody341 += `<tr><td>${d.p}</td><td>${d.r}</td><td>${d.n}</td><td>${d.k.toFixed(2)}</td><td>${d.dy.toFixed(2)}</td><td>${d.du.toFixed(2)}</td><td>${d.dpv.toFixed(2)}</td></tr>`;
    });
    document.getElementById('tbl_341').innerHTML = tbody341;

    let sel332 = document.getElementById('sel_332');
    let tbody332 = `<caption>表3.3.2 面材特性 (※真壁では参考検定として計算)</caption><tr><th>面材</th><th>等級</th><th>τmax (kN/cm²)</th><th>E1 (kN/cm²)</th><th>E2 (kN/cm²)</th></tr>`;
    tbl332_data.forEach((d, i) => {
        sel332.innerHTML += `<option value="332_${i}">${d.p} - ${d.g}</option>`;
        tbody332 += `<tr><td>${d.p}</td><td>${d.g}</td><td>${d.tmax.toFixed(2)}</td><td>${d.e1}</td><td>${d.e2}</td></tr>`;
    });
    document.getElementById('tbl_332').innerHTML = tbody332;
    
    sel331.value = "331_5"; // 12mm N65
    sel341.value = "341_1"; // Sp+Sp+N75
    sel332.value = "332_0"; // 12mm JAS1

    apply331();
    apply341();
    apply332();
}

function apply331() {
    let val = document.getElementById('sel_331').value;
    let d = null;
    if(val.startsWith('331_')) d = tbl331_data[parseInt(val.split('_')[1])];
    if(val.startsWith('novo_')) d = tbl331_novo[parseInt(val.split('_')[1])];
    if(d) {
        document.getElementById('k_panel').value = d.k.toFixed(2);
        document.getElementById('dy_panel').value = d.dy.toFixed(2);
        document.getElementById('du_panel').value = d.du.toFixed(2);
        document.getElementById('dP_panel').value = d.dpv.toFixed(2);
        if(d.p.includes("9mm")) document.getElementById('t_ply').value = 0.9;
        if(d.p.includes("12mm")) document.getElementById('t_ply').value = 1.2;
        if(d.p.includes("15mm")) document.getElementById('t_ply').value = 1.5;
        if(d.p.includes("24mm")) document.getElementById('t_ply').value = 2.4;
        calculate();
    }
}

function apply341() {
    let val = document.getElementById('sel_341').value;
    if(val.startsWith('341_')) {
        let d = tbl341_data[parseInt(val.split('_')[1])];
        document.getElementById('k_rec').value = d.k.toFixed(2);
        document.getElementById('dy_rec').value = d.dy.toFixed(2);
        document.getElementById('du_rec').value = d.du.toFixed(2);
        document.getElementById('dP_rec').value = d.dpv.toFixed(2);
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
            W: document.getElementById('W_wall').value, H: document.getElementById('H_wall').value,
            kp: document.getElementById('k_panel').value, dPp: document.getElementById('dP_panel').value, dyp: document.getElementById('dy_panel').value, dup: document.getElementById('du_panel').value,
            kr: document.getElementById('k_rec').value, dPr: document.getElementById('dP_rec').value, dyr: document.getElementById('dy_rec').value, dur: document.getElementById('du_rec').value,
            t: document.getElementById('t_ply').value, GB: document.getElementById('GB').value, Tmax: document.getElementById('T_max').value, E1: document.getElementById('E1').value, E2: document.getElementById('E2').value,
            Epara: document.getElementById('E_para').value, Fcv: document.getElementById('F_cv').value
        }
    };
    [1, 2].forEach(i => {
        let pid = `m${i}`;
        let u = document.getElementById(`use_m2`);
        if (i===2 && (!u || !u.checked)) return;
        data[pid] = {
            manual: document.getElementById(`${pid}_manual`).checked,
            Ixy: document.getElementById(`${pid}_Ixy`).value, Zxy: document.getElementById(`${pid}_Zxy`).value, Cxy: document.getElementById(`${pid}_Cxy`).value, beta: document.getElementById(`${pid}_beta`).value,
            Wp: document.getElementById(`${pid}_Wp`).value, Hp: document.getElementById(`${pid}_Hp`).value, d1: document.getElementById(`${pid}_d1`).value, d2: document.getElementById(`${pid}_d2`).value,
            Z0: document.getElementById(`${pid}_Z0`).value, y1: document.getElementById(`${pid}_y1`).value, y2: document.getElementById(`${pid}_y2`).value, n: document.getElementById(`${pid}_n`).value,
            e: document.getElementById(`${pid}_e`).value, frame_e: document.getElementById(`${pid}_frame_e`).value, Pv: document.getElementById(`${pid}_Pv`).value, pattern: document.getElementById(`${pid}_pattern`).value,
            outer: document.getElementById(`${pid}_outer`).value, inner: document.getElementById(`${pid}_inner`).value, qr: document.getElementById(`${pid}_q_rec`).value
        };
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `makabe_calc.json`;
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
                if (d.beta !== undefined) document.getElementById('m1_beta').value = d.beta;
                if (d.w) document.getElementById('m1_Wp').value = d.w;
                if (d.h) document.getElementById('m1_Hp').value = d.h;
                if (d.edge) document.getElementById('m1_e').value = d.edge;
                calculate();
                return;
            }

            if(d.wall) {
                document.getElementById('W_wall').value = d.wall.W; document.getElementById('H_wall').value = d.wall.H;
                document.getElementById('k_panel').value = d.wall.kp; document.getElementById('dP_panel').value = d.wall.dPp; document.getElementById('dy_panel').value = d.wall.dyp; document.getElementById('du_panel').value = d.wall.dup;
                document.getElementById('k_rec').value = d.wall.kr; document.getElementById('dP_rec').value = d.wall.dPr; document.getElementById('dy_rec').value = d.wall.dyr; document.getElementById('du_rec').value = d.wall.dur;
                document.getElementById('t_ply').value = d.wall.t; document.getElementById('GB').value = d.wall.GB; document.getElementById('T_max').value = d.wall.Tmax; document.getElementById('E1').value = d.wall.E1; document.getElementById('E2').value = d.wall.E2;
                document.getElementById('E_para').value = d.wall.Epara; document.getElementById('F_cv').value = d.wall.Fcv;
            }
            [1, 2].forEach(i => {
                let pid = `m${i}`;
                if(d[pid]) {
                    if(i===2) { document.getElementById('use_m2').checked = true; toggleM2(); }
                    document.getElementById(`${pid}_manual`).checked = d[pid].manual;
                    document.getElementById(`${pid}_Ixy`).value = d[pid].Ixy; document.getElementById(`${pid}_Zxy`).value = d[pid].Zxy; document.getElementById(`${pid}_Cxy`).value = d[pid].Cxy; document.getElementById(`${pid}_beta`).value = d[pid].beta;
                    document.getElementById(`${pid}_Wp`).value = d[pid].Wp; document.getElementById(`${pid}_Hp`).value = d[pid].Hp; document.getElementById(`${pid}_d1`).value = d[pid].d1; document.getElementById(`${pid}_d2`).value = d[pid].d2;
                    document.getElementById(`${pid}_Z0`).value = d[pid].Z0; document.getElementById(`${pid}_y1`).value = d[pid].y1; document.getElementById(`${pid}_y2`).value = d[pid].y2; document.getElementById(`${pid}_n`).value = d[pid].n;
                    document.getElementById(`${pid}_e`).value = d[pid].e; document.getElementById(`${pid}_frame_e`).value = d[pid].frame_e; document.getElementById(`${pid}_Pv`).value = d[pid].Pv; document.getElementById(`${pid}_pattern`).value = d[pid].pattern;
                    document.getElementById(`${pid}_outer`).value = d[pid].outer; document.getElementById(`${pid}_inner`).value = d[pid].inner; document.getElementById(`${pid}_q_rec`).value = d[pid].qr;
                } else if (i===2) {
                    document.getElementById('use_m2').checked = false; toggleM2();
                }
            });
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
            let pos1 = center - i * maxPitch, pos2 = center + i * maxPitch;
            if (i === Math.floor(n_nails / 2)) { pos1 = 0; pos2 = effL; }
            arr.push(pos1); arr.push(pos2);
        }
    } else {
        for (let i = 0; i < n_nails / 2; i++) {
            let pos1 = center - (0.5 + i) * maxPitch, pos2 = center + (0.5 + i) * maxPitch;
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
    ctx.clearRect(0, 0, 200, 130);
    
    const scale = Math.min(180/W, 110/H);
    const ox = (200 - W*scale)/2, oy = (130 - H*scale)/2;

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
    const H_wall = parseFloat(document.getElementById('H_wall').value) || 288;
    const W_wall = parseFloat(document.getElementById('W_wall').value) || 91;
    
    const kp = parseFloat(document.getElementById('k_panel').value) || 6.29;
    const dPp = parseFloat(document.getElementById('dP_panel').value) || 1.31;
    const dyp = parseFloat(document.getElementById('dy_panel').value) || 0.21;
    const dup = parseFloat(document.getElementById('du_panel').value) || 1.89;

    const kr = parseFloat(document.getElementById('k_rec').value) || 9.1;
    const dPr = parseFloat(document.getElementById('dP_rec').value) || 1.24;
    const dyr = parseFloat(document.getElementById('dy_rec').value) || 0.14;
    const dur = parseFloat(document.getElementById('du_rec').value) || 3.07;
    
    const t = parseFloat(document.getElementById('t_ply').value) || 1.2;
    const GB = parseFloat(document.getElementById('GB').value) || 40;
    const E_para = parseFloat(document.getElementById('E_para').value) || 700;
    const Fcv = parseFloat(document.getElementById('F_cv').value) || 0.6;
    
    const Tmax = parseFloat(document.getElementById('T_max').value) || 0.36;
    const E1 = parseFloat(document.getElementById('E1').value) || 350;
    const E2 = parseFloat(document.getElementById('E2').value) || 550;

    let errs = [];
    let isOverallValid = true;

    const processPanel = (pid, name) => {
        const Wp = parseFloat(document.getElementById(`${pid}_Wp`).value) || 80.2;
        const Hp = parseFloat(document.getElementById(`${pid}_Hp`).value) || 272.7;
        const d1 = parseFloat(document.getElementById(`${pid}_d1`).value) || 0;
        const d2 = parseFloat(document.getElementById(`${pid}_d2`).value) || 0;
        const Z0 = parseFloat(document.getElementById(`${pid}_Z0`).value) || 10.5;
        const y1 = parseFloat(document.getElementById(`${pid}_y1`).value) || 7.5;
        const y2 = parseFloat(document.getElementById(`${pid}_y2`).value) || 1.8;
        const n_coef = parseFloat(document.getElementById(`${pid}_n`).value) || 5;

        const e = parseFloat(document.getElementById(`${pid}_e`).value) || 1.0;
        const frame_e = parseFloat(document.getElementById(`${pid}_frame_e`).value) || 2.0;
        const Pv = parseFloat(document.getElementById(`${pid}_Pv`).value) || Wp;
        const Ph = 0;
        const q_p = parseFloat(document.getElementById(`${pid}_outer`).value) || 7.5;
        const q_p_in = parseFloat(document.getElementById(`${pid}_inner`).value) || 15;
        const q_r = parseFloat(document.getElementById(`${pid}_q_rec`).value) || 10.0;
        const pattern = document.getElementById(`${pid}_pattern`).value;
        const isManual = document.getElementById(`${pid}_manual`).checked;

        if(Wp <= 0 || Hp <= 0) return null;

        let req_e = Math.max(1.0, t * 0.8);
        let req_frame = Math.max(2.0, t * 0.8);
        let p_valid = true;

        if (e < req_e) {
            errs.push(`${name}: 面材のへりあき(${e}cm)が規定(${req_e.toFixed(2)}cm以上)を満たしていません。`);
            p_valid = false;
        }
        if (frame_e < req_frame) {
            errs.push(`${name}: 受材の縁端距離(${frame_e}cm)が規定(${req_frame.toFixed(2)}cm以上)を満たしていません。`);
            p_valid = false;
        }

        if (!p_valid) {
            isOverallValid = false;
            setHTML(`${pid}_count`, "条件NGのためスキップ");
            drawNails(`${pid}_canvas`, Wp, Hp, [], e, Pv, Ph, pattern);
            return null;
        }
        
        let original_nails = generateNails(Wp, Hp, e, Pv, Ph, q_p, q_p_in, pattern);
        let nails = JSON.parse(JSON.stringify(original_nails)); 
        let isRotated = false;
        if (Wp > Hp) { isRotated = true; } else if (Wp === Hp) {
            let countW = nails.filter(n => Math.abs(n.y - e) < 0.1 || Math.abs(n.y - (Hp - e)) < 0.1).length; 
            let countH = nails.filter(n => Math.abs(n.x - e) < 0.1 || Math.abs(n.x - (Wp - e)) < 0.1).length; 
            if (countH > countW) isRotated = true;
        }
        if (isRotated) nails = nails.map(n => ({ x: n.y, y: n.x, type: n.type }));
        
        const dimX = isRotated ? Hp : Wp;
        const dimY = isRotated ? Wp : Hp;
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
        
        let calc_beta = Ix > 0 ? Iy / Ix : 0;

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

        let Ixy = calc_Ixy, Zxy = calc_Zxy, Cxy = calc_Cxy, beta = calc_beta;
        if(isManual) {
            Ixy = parseFloat(document.getElementById(`${pid}_Ixy`).value) || Ixy;
            Zxy = parseFloat(document.getElementById(`${pid}_Zxy`).value) || Zxy;
            Cxy = parseFloat(document.getElementById(`${pid}_Cxy`).value) || Cxy;
            beta = parseFloat(document.getElementById(`${pid}_beta`).value) || beta;
        } else {
            document.getElementById(`${pid}_Ixy`).value = Ixy.toFixed(3);
            document.getElementById(`${pid}_Zxy`).value = Zxy.toFixed(3);
            document.getElementById(`${pid}_Cxy`).value = Cxy.toFixed(2);
            document.getElementById(`${pid}_beta`).value = beta.toFixed(3);
        }

        drawNails(`${pid}_canvas`, Wp, Hp, original_nails, e, Pv, Ph, pattern);
        setHTML(`${pid}_count`, `N = ${N}本`);

        let k_eq = 1.0 / ( (1.0/kp) + (q_r/q_p)*(1.0/kr) );
        let dPveq = Math.min(dPp, (q_p/q_r)*dPr);
        let dyeq = dPveq / k_eq;
        let dueq = Math.min( dyeq - dyp + dup, dyeq - dyr + dur );

        let K_eq = Aw * Ixy * k_eq;
        let Ry_eq = (Zxy / Ixy) * dyeq;
        let Mu_eq = Cxy * Zxy * dPveq * Aw;
        let Ru_eq = Ry_eq * (dueq / dyeq);

        let Wf = Wp + d1;
        let hf = Hp + d2;
        let R0 = (2.0 * (d1*Wf + d2*hf) - d1*d1 - d2*d2) / (2.0 * Wf * hf);

        if (R0 >= 1.0/150.0) {
            errs.push(`${name}: 初期遊び R0 (${R0.toFixed(4)} rad) が 1/150 を超えています。(⑧NG)`);
            isOverallValid = false;
        }
        if (R0 >= Ry_eq) {
            errs.push(`${name}: 初期遊び R0 (${R0.toFixed(4)} rad) が Ryeq (${Ry_eq.toFixed(4)}) を超えています。(⑧NG)`);
            isOverallValid = false;
        }

        let w = Wp;
        let xp = w / 2.0;
        let yp = t;
        let E_perp = E_para / 50.0;
        
        let exp1 = Math.exp(-3.0*n_coef*y1/(2.0*Z0));
        let exp2 = Math.exp(-3.0*n_coef*y2/(2.0*Z0));
        let Cy = 1.0 + (2.0*Z0)/(3.0*n_coef*yp) * (2.0 - exp1 - exp2);
        
        let Ce = (xp*xp * yp * Cy * E_perp) / (2.0 * Z0);
        let K_press = (2.0/3.0) * w * Ce * (1.0 / (1.0 + beta));
        let Fm = 2.4 * (1.0/3.0) * Fcv;
        let Cym = 1.0 + (4.0*Z0)/(3.0*n_coef*yp);
        let Cxm = 1.0 + (4.0*Z0)/(3.0*xp);
        
        let theta_y = (Z0 * Fm) / (xp * E_perp * Math.sqrt(1.0 * Cy * Cxm * Cym));
        let Ry_press = (1.0 + beta) * theta_y;
        let dy_press = (w / 2.0) * theta_y;
        let k_c = (8.0 / (w*w * t)) * Ce;
        let a_c_coeff = 1.0 / 8.0;

        let My = 0;
        let C_force = 0;
        let My_press = 0;
        let K_press_dash = 0;
        let delta = (Ry_eq - R0) * (w / 2.0) * (1.0 / (1.0 + beta));
        
        if (Ry_eq > R0 + Ry_press) {
            if (delta > 0) {
                if (delta <= dy_press) {
                    C_force = k_c * delta;
                } else {
                    C_force = (k_c / delta) * ( (a_c_coeff/2.0)*delta*delta + ((a_c_coeff-1.0)/2.0)*dy_press*dy_press + (1.0-a_c_coeff)*dy_press*delta );
                }
            }
            My_press = C_force * (1.0/3.0) * w*w * t; 
            K_press_dash = My_press / Ry_eq;
            My = (K_press_dash + K_eq) * Ry_eq; 
        } else {
            My = K_press * (Ry_eq - R0) + K_eq * Ry_eq; 
        }

        let Ry = Ry_eq + My / (Aw * GB * t);
        let dK0 = 1.0 / (1.0/(beta * Ixy * k_eq) + 1.0/(GB * t));
        let K0 = My / Ry;
        let M150 = (Ry > 1.0/150.0) ? K0 / 150.0 : My;

        let Ru = Math.min(Ru_eq, 1.0/30.0); 
        let du_press = (Ru - R0) * (w / 2.0);
        
        let Cu_force = 0;
        if (du_press > 0) {
            if (du_press <= dy_press) {
                Cu_force = k_c * du_press;
            } else {
                Cu_force = (k_c / du_press) * ( (a_c_coeff/2.0)*du_press*du_press + ((a_c_coeff-1.0)/2.0)*dy_press*dy_press + (1.0-a_c_coeff)*dy_press*du_press );
            }
        }
        
        let Mu_press = Cu_force * (7.0/24.0) * w*w * t;
        let Mu = Mu_eq + Mu_press;
        let mu = Ru / Ry;

        let tau_N = t > 0 ? (Cxy * Zxy * dPveq) / t : 0; 
        let a_c_len = Math.min(Wp, Hp), b_c_len = Math.max(Wp, Hp);
        let E1_c = E1, E2_c = E2;
        let beta_a = (a_c_len/b_c_len) * Math.pow(E2_c/E1_c, 0.25);
        if(beta_a > 1) {
            let tmp = a_c_len; a_c_len = b_c_len; b_c_len = tmp;
            tmp = E1_c; E1_c = E2_c; E2_c = tmp;
            beta_a = (a_c_len/b_c_len) * Math.pow(E2_c/E1_c, 0.25);
        }
        let alpha = GB / Math.sqrt(E1_c * E2_c);
        let p1 = 7.8 * alpha + 4.2;
        let p2 = Math.min(159.1*alpha*alpha - 35.8*alpha - 0.7, 28.6*alpha*alpha - 21.2*alpha + 1.6);
        let p3 = 6.2 * alpha + 8.4;
        let Ca = p1 * beta_a * beta_a + p2 * beta_a + p3;
        let tau_cr = (Math.pow(Math.PI, 2) * t * t * Ca) / (3 * a_c_len * a_c_len) * Math.pow(Math.pow(E1_c, 3) * E2_c, 0.25);
        let ok_tau = (tau_N <= Tmax && tau_N <= tau_cr);

        let p_html = `<li style="background:#f7fafc; padding:8px; border-radius:4px; margin-top:5px; font-size:0.92em; page-break-inside: avoid;">
            <strong style="font-size:1.1em; color:#2b6cb0;">【${name} 計算プロセス】</strong><br>
            <div class="formula-group">
                <strong>■ 等価釘と等価釘配列</strong>
                <div class="formula">(3.4.13) k<sub>eq</sub> = 1 / (1/k<sub>p</sub> + (q<sub>r</sub>/q<sub>p</sub>)(1/k<sub>r</sub>)) = ${k_eq.toFixed(3)} kN/cm</div>
                <div class="formula">(3.4.14) &Delta;P<sub>veq</sub> = min(&Delta;P<sub>vp</sub>, (q<sub>p</sub>/q<sub>r</sub>)&Delta;P<sub>vr</sub>) = ${dPveq.toFixed(3)} kN</div>
                <div class="formula">(3.4.15) &delta;<sub>yeq</sub> = &Delta;P<sub>veq</sub> / k<sub>eq</sub> = ${dyeq.toFixed(3)} cm</div>
                <div class="formula">(3.4.16) &delta;<sub>ueq</sub> = min( &delta;<sub>yeq</sub>-&delta;<sub>yp</sub>+&delta;<sub>up</sub>, &delta;<sub>yeq</sub>-&delta;<sub>yr</sub>+&delta;<sub>ur</sub> ) = ${dueq.toFixed(3)} cm</div>
                <div class="formula">(3.4.12) K<sub>eq</sub> = A<sub>w</sub> I<sub>xy</sub> k<sub>eq</sub> = ${K_eq.toFixed(1)} kN&middot;cm/rad</div>
                <div class="formula">(3.4.17) R<sub>yeq</sub> = (Z<sub>xy</sub> / I<sub>xy</sub>) &delta;<sub>yeq</sub> = ${Ry_eq.toFixed(5)} rad</div>
                <div class="formula">(3.4.18) M<sub>ueq</sub> = C<sub>xy</sub> Z<sub>xy</sub> &Delta;P<sub>veq</sub> A<sub>w</sub> = ${Mu_eq.toFixed(1)} kN&middot;cm</div>
                <div class="formula">(3.4.19) R<sub>ueq</sub> = R<sub>yeq</sub> (&delta;<sub>ueq</sub> / &delta;<sub>yeq</sub>) = ${Ru_eq.toFixed(5)} rad</div>
            </div>

            <div class="formula-group">
                <strong>■ 初期遊びと圧縮筋かい効果</strong>
                <div class="formula">(3.4.3) R<sub>0</sub> = (2(&Delta;<sub>1</sub>W<sub>f</sub>+&Delta;<sub>2</sub>h<sub>f</sub>) - &Delta;<sub>1</sub>² - &Delta;<sub>2</sub>²) / (2W<sub>f</sub>h<sub>f</sub>) = ${R0.toFixed(5)} rad</div>
                <div class="formula">(3.4.34) E<sub>&perp;</sub> = E<sub>//</sub> / 50 = ${E_perp.toFixed(1)} kN/cm²</div>
                <div class="formula">(3.4.26) F<sub>m</sub> = 2.4 &times; 1/3 F<sub>cv</sub> = ${Fm.toFixed(3)} kN/cm²</div>
                <div class="formula">(3.4.23) C<sub>y</sub> = 1 + (2Z<sub>0</sub>)/(3ny<sub>p</sub>) (2 - e<sup>-3ny1/2Z0</sup> - e<sup>-3ny2/2Z0</sup>) = ${Cy.toFixed(3)}</div>
                <div class="formula">(3.4.27) C<sub>ym</sub> = 1 + 4Z<sub>0</sub> / 3ny<sub>p</sub> = ${Cym.toFixed(3)}</div>
                <div class="formula">(3.4.28) C<sub>xm</sub> = 1 + 4Z<sub>0</sub> / 3x<sub>p</sub> = ${Cxm.toFixed(3)}</div>
                <div class="formula">(3.4.21) C<sub>e</sub> = x<sub>p</sub>²y<sub>p</sub>C<sub>y</sub>E<sub>&perp;</sub> / 2Z<sub>0</sub> = ${Ce.toFixed(1)}</div>
                <div class="formula">(3.4.20) K<sub>press</sub> = 2/3 w C<sub>e</sub> (1 / (1+&beta;)) = ${K_press.toFixed(1)} kN&middot;cm/rad</div>
                <div class="formula">(3.4.25) &theta;<sub>y</sub> = Z<sub>0</sub>F<sub>m</sub> / (x<sub>p</sub>E<sub>&perp;</sub>&radic;(C<sub>y</sub>C<sub>xm</sub>C<sub>ym</sub>)) = ${theta_y.toFixed(5)} rad</div>
                <div class="formula">(3.4.24) R<sub>ypress</sub> = (1+&beta;)&theta;<sub>y</sub> = ${Ry_press.toFixed(5)} rad</div>
                <div class="formula">(3.4.30) a<sub>c</sub> = 1/8 = ${a_c_coeff.toFixed(3)}</div>
                <div class="formula">(3.4.31) k<sub>c</sub> = 8/(w²t) C<sub>e</sub> = ${k_c.toFixed(3)}</div>
                <div class="formula">(3.4.29) &delta;<sub>ypress</sub> = (w/2)&theta;<sub>y</sub> = ${dy_press.toFixed(3)} cm</div>
            </div>
            
            <div class="formula-group">
                <strong>■ 降伏モーメントとみかけの回転剛性</strong>
                <div class="formula">&delta; = (R<sub>yeq</sub> - R<sub>0</sub>)(w/2) / (1+&beta;) = ${delta.toFixed(3)} cm</div>
                <div class="formula">(3.4.32) C<sub>force</sub> = ${C_force.toFixed(2)} kN/cm²</div>
                ${(Ry_eq > R0 + Ry_press) ? 
                    `<div class="formula">(3.4.33) M<sub>ypress</sub> = C<sub>force</sub>(1/3)w²t = ${My_press.toFixed(1)} kN&middot;cm</div>
                     <div class="formula">(3.4.22) K'<sub>press</sub> = M<sub>ypress</sub> / R<sub>yeq</sub> = ${K_press_dash.toFixed(1)} kN&middot;cm/rad</div>
                     <div class="formula">(3.4.2b) M<sub>y</sub> = (K'<sub>press</sub> + K<sub>eq</sub>) R<sub>yeq</sub> = ${My.toFixed(1)} kN&middot;cm</div>` : 
                    `<div class="formula">(3.4.2a) M<sub>y</sub> = K<sub>press</sub>(R<sub>yeq</sub> - R<sub>0</sub>) + K<sub>eq</sub> R<sub>yeq</sub> = ${My.toFixed(1)} kN&middot;cm</div>`
                }
                <div class="formula">(3.4.5) R<sub>y</sub> = R<sub>yeq</sub> + M<sub>y</sub>/(A<sub>w</sub> G t) = ${Ry.toFixed(5)} rad</div>
                <div class="formula">(3.4.4) &Delta;K<sub>0</sub> = 1 / (1/(&beta;I<sub>xy</sub>k<sub>eq</sub>) + 1/(Gt)) = ${(dK0/Aw).toFixed(5)} / cm²</div>
                <div class="formula">(3.4.7) K<sub>0</sub> = M<sub>y</sub> / R<sub>y</sub> = ${K0.toFixed(1)} kN&middot;cm/rad</div>
                <div class="formula">(3.4.6) M<sub>150</sub> = K<sub>0</sub> / 150 = ${M150.toFixed(1)} kN&middot;cm</div>
            </div>

            <div class="formula-group">
                <strong>■ 終局モーメントと靭性率</strong>
                <div class="formula">(3.4.10) R<sub>u</sub> = min(R<sub>ueq</sub>, 1/30) = ${Ru.toFixed(4)} rad</div>
                <div class="formula">(3.4.37) &delta;<sub>upress</sub> = (R<sub>u</sub>-R<sub>0</sub>)(w/2) = ${du_press.toFixed(3)} cm</div>
                <div class="formula">(3.4.36) C<sub>uforce</sub> = ${Cu_force.toFixed(2)} kN/cm²</div>
                <div class="formula">(3.4.35) M<sub>upress</sub> = C<sub>uforce</sub>(7/24)w²t = ${Mu_press.toFixed(1)} kN&middot;cm</div>
                <div class="formula">(3.4.9) M<sub>u</sub> = M<sub>ueq</sub> + M<sub>upress</sub> = ${Mu.toFixed(1)} kN&middot;cm</div>
                <div class="formula">(3.4.11) &mu; = R<sub>u</sub> / R<sub>y</sub> = ${mu.toFixed(2)}</div>
            </div>

            <div class="formula-group">
                <strong>■ (3.4.8) 参考検定</strong>
                <div class="formula">&tau;<sub>N</sub> = C<sub>xy</sub> Z<sub>xy</sub> &Delta;P<sub>veq</sub> / t = ${tau_N.toFixed(3)} kN/cm²</div>
                <div class="formula">&tau;<sub>cr</sub> = (&pi;²t²C<sub>a</sub>)/(3a²) (E<sub>1</sub>³E<sub>2</sub>)<sup>1/4</sup> = ${tau_cr.toFixed(3)} kN/cm²</div>
                <div class="formula">判定: &tau;<sub>N</sub> &le; &tau;<sub>max</sub>(${Tmax}) &amp; &tau;<sub>N</sub> &le; &tau;<sub>cr</sub> &rarr; <span style="color:${ok_tau?'green':'red'}">${ok_tau ? 'OK' : 'NG'}</span></div>
            </div>
        </li>`;

        return { K0, My, M150, Mu, mu, html: p_html };
    };

    let total_K0 = 0, total_My = 0, total_M150 = 0, total_Mu = 0;
    let mu_array = [];
    let html_out = "";

    const res1 = processPanel('m1', '面材1(下側)');
    if (res1) { total_K0 += res1.K0; total_My += res1.My; total_M150 += res1.M150; total_Mu += res1.Mu; mu_array.push(res1.mu); html_out += res1.html; }

    if (document.getElementById('use_m2').checked) {
        const res2 = processPanel('m2', '面材2(上側)');
        if (res2) { total_K0 += res2.K0; total_My += res2.My; total_M150 += res2.M150; total_Mu += res2.Mu; mu_array.push(res2.mu); html_out += res2.html; }
    }

    const banner = document.getElementById('error_banner');
    const printBtn = document.getElementById('print_btn');
    if (!isOverallValid || mu_array.length === 0) {
        if(errs.length > 0) banner.innerHTML = errs.join("<br>");
        banner.style.display = 'block';
        if (printBtn) printBtn.disabled = true;
        document.body.classList.add('is-ng-print'); 
        setHTML('process_list', '<li style="color:red; font-weight:bold;">入力値・検定にエラーがあるため、最終計算を実行できません。</li>');
        setHTML('res_Pa', 'NG'); setHTML('res_dPa', 'NG'); setHTML('print_Pa', 'NG'); setHTML('print_dPa', 'NG');
        return;
    } else {
        banner.style.display = 'none';
        if (printBtn) printBtn.disabled = false;
        document.body.classList.remove('is-ng-print');
    }

    const final_mu = Math.min(...mu_array);
    const term3 = 0.2 * Math.sqrt(2 * final_mu - 1) * total_Mu;
    const Pa = (1.0 / H_wall) * Math.min(total_My, total_M150, term3);
    const dPa = Pa / (W_wall / 100.0);

    let final_html = `<li style="page-break-inside: avoid;"><strong style="font-size:1.1em; color:#2b6cb0;">壁全体の集計</strong><br>
        <div style="margin-top:5px;">
        &Sigma;M<sub>yi</sub> = ${total_My.toFixed(1)} kN&middot;cm<br>
        &Sigma;M<sub>150i</sub> = ${total_M150.toFixed(1)} kN&middot;cm<br>
        &Sigma;M<sub>ui</sub> = ${total_Mu.toFixed(1)} kN&middot;cm<br>
        min(&mu;<sub>i</sub>) = ${final_mu.toFixed(2)}
        </div>
        <br>
        <div class="formula" style="background:#edf2f7; padding:6px; border:1px solid #cbd5e0;">(3.4.1) P<sub>a</sub> = (1 / H) &times; min( &Sigma;M<sub>yi</sub>, &Sigma;M<sub>150i</sub>, 0.2&radic;(2&mu;-1)&Sigma;M<sub>ui</sub> )</div><br>
        P<sub>a</sub> = (1 / ${H_wall}) &times; min( ${total_My.toFixed(1)}, ${total_M150.toFixed(1)}, ${term3.toFixed(1)} ) = <strong>${Pa.toFixed(2)} kN</strong>
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
