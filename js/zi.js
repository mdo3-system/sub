// 認証関数の安全な定義
if (typeof window.checkAuth !== 'function') {
    window.checkAuth = async () => true;
}

const d_prime_table = { 105:75, 120:87, 135:96, 150:105, 180:115, 210:145, 240:175, 270:205, 300:205, 330:235, 360:265, 390:295 };

function toggleMode() {
    const mode = document.querySelector('input[name="calcMode"]:checked').value;
    document.getElementById('area-precut').style.display = (mode === 'precut') ? 'block' : 'none';
    document.getElementById('area-watari').style.display = (mode === 'watari') ? 'block' : 'none';
}

async function calculateAndAddRow() {
    if (!await window.checkAuth()) return;
    const b = parseFloat(document.getElementById('mainB').value);
    const d = parseFloat(document.getElementById('mainD').value);
    const mode = document.querySelector('input[name="calcMode"]:checked').value;
    let conditionText = "";
    let profile = new Array(Math.ceil(b)).fill(0);
    let I_ratio = 1.00;
    let isWatari = (mode === 'watari');

    if (isWatari) {
        const w_depth = parseFloat(document.getElementById('watariDepth').value) || 0;
        conditionText = `渡り顎(${w_depth})`;
        profile.fill(w_depth);
    } else {
        const ld = parseInt(document.getElementById('leftD').value);
        const lJoint = document.getElementById('leftJoint').value;
        const rd = parseInt(document.getElementById('rightD').value);
        const rJoint = document.getElementById('rightJoint').value;
        const hasHozo = document.getElementById('chkHozo').checked;
        let texts = [];
        if (hasHozo) {
            texts.push("ほぞ(C)");
            for (let x = Math.floor(b/2-15); x < Math.ceil(b/2+15); x++) if(x>=0 && x<b) profile[x] = Math.max(profile[x], 30);
        }
        if (ld > 0) {
            if (lJoint === 'ooire') {
                texts.push(`左大入(A:${ld})`);
                for (let x=0; x<15; x++) profile[x] = Math.max(profile[x], 102);
            } else {
                texts.push(`左蟻(B:${ld})`);
                let dp = d_prime_table[ld] || 0;
                for (let x=0; x<15; x++) profile[x] = Math.max(profile[x], dp);
                for (let x=15; x<30; x++) profile[x] = Math.max(profile[x], Math.min(102, dp/2));
            }
        }
        if (rd > 0) {
            if (rJoint === 'ooire') {
                texts.push(`右大入(A:${rd})`);
                for (let x=Math.floor(b-15); x<b; x++) profile[x] = Math.max(profile[x], 102);
            } else {
                texts.push(`右蟻(B:${rd})`);
                let dp = d_prime_table[rd] || 0;
                for (let x=Math.floor(b-15); x<b; x++) profile[x] = Math.max(profile[x], dp);
                for (let x=Math.floor(b-30); x<Math.floor(b-15); x++) profile[x] = Math.max(profile[x], Math.min(102, dp/2));
            }
        }
        conditionText = texts.length > 0 ? texts.join("+") : "欠損なし";
        if (ld > 0 || rd > 0 || hasHozo) I_ratio = hasHozo ? ((d >= 240) ? 0.81 : 0.71) : 0.91;
    }

    let A=0, Sy=0, Iy=0;
    for (let x=0; x<b; x++) {
        let h = Math.max(0, d - profile[x]);
        if (h>0) {
            A += h; let yc = profile[x] + h/2;
            Sy += h * yc; Iy += (Math.pow(h,3)/12) + h*Math.pow(yc,2);
        }
    }
    if (A<=0) return alert("断面がありません");
    let Yc = Sy/A, I_rem = Iy - A*Math.pow(Yc,2);
    let Z_rem = I_rem / Math.max(Yc, d-Yc);
    let Z0 = (b*Math.pow(d,2)/6)/1000, Ze = isWatari ? Z0 : Z_rem/1000;
    let Z_loss = isWatari ? 0 : (1 - Ze/Z0)*100;

    // --- SVG描画 ---
    let critical_x = [0, b];
    for (let x = 1; x < b; x++) if (profile[x] !== profile[x-1]) critical_x.push(x);
    critical_x = [...new Set(critical_x)].sort((a,b) => a - b);

    let pathD = `M 0,${d} L 0,${profile[0]}`;
    for (let i = 0; i < critical_x.length - 1; i++) {
        let x1 = critical_x[i];
        let x2 = critical_x[i+1];
        let y = profile[x1];
        pathD += ` L ${x1},${y} L ${x2},${y}`;
    }
    pathD += ` L ${b},${d} Z`;

    let cutPathD = `M 0,0 L 0,${profile[0]}`;
    for (let i = 0; i < critical_x.length - 1; i++) {
        let x1 = critical_x[i];
        let x2 = critical_x[i+1];
        let y = profile[x1];
        cutPathD += ` L ${x1},${y} L ${x2},${y}`;
    }
    cutPathD += ` L ${b},0 Z`;

    let marginX = 15;
    let marginY = 15;
    let totalW = b + marginX * 2;
    let totalH = d + marginY * 2;
    
    let svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">`;
    svgStr += `<rect width="${totalW}" height="${totalH}" fill="#ffffff"/>`;
    svgStr += `<g transform="translate(${marginX}, ${marginY})">`;
    svgStr += `<rect x="0" y="0" width="${b}" height="${d}" fill="none" stroke="#adb5bd" stroke-width="2" stroke-dasharray="4,4"/>`;
    svgStr += `<path d="${pathD}" fill="#f8f9fa" stroke="#343a40" stroke-width="2" stroke-linejoin="round"/>`;
    svgStr += `<path d="${cutPathD}" fill="#dc3545" fill-opacity="0.3" stroke="#dc3545" stroke-width="1.5" stroke-linejoin="round"/>`;
    if (!isWatari) svgStr += `<line x1="${-marginX}" y1="${Yc}" x2="${b+marginX}" y2="${Yc}" stroke="#007bff" stroke-width="2.5" stroke-dasharray="6,4"/>`;
    svgStr += `</g></svg>`;

    let encodedSvg = encodeURIComponent(svgStr);
    let imgSrc = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
    let drawH = 60; 
    let drawW = (totalW / totalH) * drawH;
    let imgHtml = `<div class="img-container"><img src="${imgSrc}" class="cross-section-img" style="width: ${drawW}px; height: ${drawH}px;" alt="断面図"></div>`;

    const tbody = document.querySelector('#resultTable tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${imgHtml}</td><td>${b}x${d}</td><td>${conditionText}</td><td>${Z0.toFixed(1)}</td><td>${Ze.toFixed(1)}</td><td class="${Z_loss>=50?'highlight':''}">${Z_loss.toFixed(1)}%</td><td class="highlight-blue">${I_ratio.toFixed(2)}</td><td class="no-print"><button class="btn-delete" onclick="this.closest('tr').remove()">削除</button></td>`;
    tbody.insertBefore(tr, tbody.firstChild);
}

function clearTable() { document.querySelector('#resultTable tbody').innerHTML = ''; }

async function exportToPDF() {
    if (!await window.checkAuth()) return;
    const element = document.getElementById('pdf-export-area');
    document.getElementById('pdfTitle').style.display = 'block';
    html2pdf().set({ margin:15, filename:'ZI_Result.pdf', jsPDF:{unit:'mm', format:'a4'} }).from(element).save().then(()=>{
        document.getElementById('pdfTitle').style.display = 'none';
    });
}

async function saveToFile() {
    if (!await window.checkAuth()) return;
    const data = { tableHtml: document.querySelector('#resultTable tbody').innerHTML };
    const blob = new Blob([JSON.stringify(data)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'zi_data.json'; a.click();
}

function loadFromFile(event) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = JSON.parse(e.target.result);
        document.querySelector('#resultTable tbody').innerHTML = data.tableHtml;
    };
    reader.readAsText(event.target.files[0]);
}
