const layoutData = {
    "150": {
        "川型": { Ixy: 0.98, Zxy: 0.024, Cxy: 1.35 },
        "山型": { Ixy: 1.54, Zxy: 0.032, Cxy: 1.53 },
        "日型": { Ixy: 2.26, Zxy: 0.056, Cxy: 1.18 }
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

// 1)の選択変更時に、2)の表示を更新する関数
function updateSection2() {
    const nailRadio = document.querySelector('input[name="nail"]:checked');
    if(nailRadio) {
        const nd = JSON.parse(nailRadio.value);
        const dispT = document.getElementById('disp-t');
        if (dispT) dispT.innerText = nd.t.toFixed(1);
    }
}

function drawLayout() {
    const pitch = document.getElementById('nailPitch').value;
    const pattern = document.getElementById('nailPattern').value;
    const data = layoutData[pitch][pattern];
    
    // Cxy が無い場合は Csy を使う (150のデータ対応)
    const cVal = data.Cxy || data.Csy;

    document.getElementById('disp-layout').innerHTML = 
        `<strong>Ixy:</strong> ${data.Ixy.toFixed(2)} &nbsp;&nbsp; <strong>Zxy:</strong> ${data.Zxy.toFixed(3)} &nbsp;&nbsp; <strong>Cxy:</strong> ${cVal.toFixed(2)}`;

    const canvas = document.getElementById('layoutCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const scale = 360 / 1820; // 400px幅に合わせて少し縮小
    const w = 1820 * scale;
    const h = 910 * scale;
    const pX = 910 * scale; // 455から910に変更
    const nPitch = parseInt(pitch) * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(20, 20);

    // 外枠と根太(点線)
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);
    ctx.beginPath(); ctx.setLineDash([5, 5]);
    for(let x=pX; x<w; x+=pX) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    ctx.stroke(); ctx.setLineDash([]);

    // 釘描画
    ctx.fillStyle = '#e74c3c';
    const drawNail = (x, y) => { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fill(); };
    
    // 縦線の釘 (すべての型)
    for(let x=0; x<=w+0.1; x+=pX) {
        for(let y=0; y<=h+0.1; y+=nPitch) drawNail(x, y);
    }
    // 横線の釘 (山型・日型)
    if(pattern === '山型' || pattern === '日型') {
        for(let x=0; x<=w+0.1; x+=nPitch) { drawNail(x, 0); drawNail(x, h); }
    }
    
    ctx.restore();
}

function calculate() {
    const pName = document.getElementById('inProjectName').value;
    const displayPName = document.getElementById('displayProjectName');
    if (displayPName) displayPName.innerText = pName || '未入力';

    const GB = 40; 

    const nailRadio = document.querySelector('input[name="nail"]:checked');
    const pitch = document.getElementById('nailPitch').value;
    const pattern = document.getElementById('nailPattern').value;

    if(!nailRadio) {
        alert("面材・釘を選択してください。");
        return;
    }

    const nd = JSON.parse(nailRadio.value);
    const ld = layoutData[pitch][pattern];

    const t = nd.t;
    const k = nd.k; const dv = nd.dv; const du = nd.du; const dPv = nd.dPv;
    const Ixy = ld.Ixy; const Zxy = ld.Zxy; 
    const Cxy = ld.Cxy || ld.Csy;

    let html = "";

    const dMy = Zxy * dPv;
    const Py = dMy;
    html += `<div class="step keep-together">
        <b>4) 水平構面の単位長さあたりの降伏耐力 P<sub>y</sub> を求める</b>
        <div class="formula">
            ΔM<sub>y</sub> = Z<sub>xy</sub> × ΔP<sub>v</sub> = ${Zxy} × ${dPv} = ${round(dMy, 4)} [kN/cm]<br>
            P<sub>y</sub> = ΔM<sub>y</sub> = ${round(Py, 4)} [kN/cm]
        </div>
    </div>`;

    const dK0_denom1 = 1 / (Ixy * k);
    const dK0_denom2 = 1 / (GB * t);
    const dK0 = 1 / (dK0_denom1 + dK0_denom2);
    const KR = dK0;
    html += `<div class="step keep-together">
        <b>5) 水平構面の単位長さあたりのせん断剛性 K<sub>R</sub> を求める</b>
        <div class="formula">
            ΔK<sub>0</sub> = 1 / { 1 / (Ixy・k) + 1 / (G<sub>B</sub>・t) }<br>
            &nbsp;&nbsp;&nbsp;&nbsp;= 1 / { 1 / (${Ixy} × ${k}) + 1 / (${GB} × ${t}) } = ${round(dK0, 4)} [kN・cm/rad・cm²]<br>
            K<sub>R</sub> = ΔK<sub>0</sub> = ${round(KR, 4)} [kN/rad・cm]
        </div>
    </div>`;

    const P150 = KR / 150;
    html += `<div class="step keep-together">
        <b>6) 変形角 1/150 [rad] 時の単位長さあたりの耐力 P<sub>150</sub> を求める</b>
        <div class="formula">
            P<sub>150</sub> = K<sub>R</sub> / 150 = ${round(KR, 4)} / 150 = ${round(P150, 4)} [kN/cm]
        </div>
    </div>`;

    const dMu = Cxy * dMy;
    const Pu = dMu;
    html += `<div class="step keep-together">
        <b>7) 水平構面の単位長さあたりの終局耐力 P<sub>u</sub> を求める</b>
        <div class="formula">
            ΔM<sub>u</sub> = C<sub>xy</sub> × ΔM<sub>y</sub> = ${Cxy} × ${round(dMy, 4)} = ${round(dMu, 4)} [kN/cm]<br>
            P<sub>u</sub> = ΔM<sub>u</sub> = ${round(Pu, 4)} [kN/cm]
        </div>
    </div>`;

    const mu_num = (du * GB * t) + (dv * Ixy * k);
    const mu_den = dv * ((GB * t) + (Ixy * k));
    const mu = mu_num / mu_den;
    html += `<div class="step keep-together">
        <b>8) 水平構面の塑性率 μ を求める</b>
        <div class="formula">
            μ = (δ<sub>u</sub> × G<sub>B</sub> × t + δ<sub>v</sub> × I<sub>xy</sub> × k) / { δ<sub>v</sub> (G<sub>B</sub> × t + I<sub>xy</sub> × k) }<br>
            &nbsp;&nbsp;= (${du} × ${GB} × ${t} + ${dv} × ${Ixy} × ${k}) / { ${dv} × (${GB} × ${t} + ${Ixy} × ${k}) } = ${round(mu, 2)}
        </div>
    </div>`;

    const p_ult = 0.2 * Math.sqrt(2 * mu - 1) * Pu;
    html += `<div class="step keep-together">
        <b>9) 単位長さあたりの 0.2√(2μ-1)×P<sub>u</sub> を求める</b>
        <div class="formula">
            0.2√(2μ - 1) × P<sub>u</sub> = 0.2 × √(2 × ${round(mu, 2)} - 1) × ${round(Pu, 4)} = ${round(p_ult, 4)} [kN/cm]
        </div>
    </div>`;

    const dQa = Math.min(Py, P150, p_ult);
    const dQa_m_raw = dQa * 100;
    
    // 上限値キャップの適用 (13.72 kN/m)
    let dQa_m = dQa_m_raw;
    let isCapped = false;
    if (dQa_m > 13.72) {
        dQa_m = 13.72;
        isCapped = true;
    }

    const isOK = isCapped ? "上限値適用 (13.72kN/m)" : "OK";
    const resultColor = isCapped ? "#d35400" : "#38a169"; // キャップ時はオレンジ、通常OKは緑（元は赤だったが修正）

    // チェックボックスの連動（上限を超えていても適合扱いとする）
    const chk1 = document.getElementById('chk1');
    if (chk1) chk1.checked = true;

    html += `<div class="highlight keep-together">
        10) 単位長さあたりの許容せん断耐力 ΔQ<sub>a</sub><br>
        ΔQ<sub>a</sub> = min { P<sub>y</sub>, P<sub>150</sub>, 0.2√(2μ-1)×P<sub>u</sub> }<br>
        = min { ${round(Py, 4)}, ${round(P150, 4)}, ${round(p_ult, 4)} } = ${round(dQa, 4)} [kN/cm]<br>
        <span style="font-size: 1.4rem; color: ${resultColor}; margin-top: 10px; display: inline-block;">
            ⇒ ${round(dQa_m, 2)} kN/m
        </span><br>
        <span style="font-size: 1rem; font-weight: normal;">(上限確認: ${round(dQa_m_raw, 2)} ≦ 13.72 ･･･ 適用範囲① ${isOK})</span>
    </div>`;

    const calcSteps = document.getElementById('calcSteps');
    if (calcSteps) calcSteps.innerHTML = html;
    const displayResult = document.getElementById('displayResultStr');
    if (displayResult) displayResult.innerText = round(dQa_m, 2);
    const outputSection = document.getElementById('outputSection');
    if (outputSection) outputSection.style.display = 'block';
}

function saveData() {
    const data = {
        projectName: document.getElementById('inProjectName').value,
        chk: [],
        nailIdx: getRadioIndex('nail'),
        nailPitch: document.getElementById('nailPitch').value,
        nailPattern: document.getElementById('nailPattern').value
    };
    for(let i=1; i<=8; i++) {
        const chk = document.getElementById('chk'+i);
        if (chk) data.chk.push(chk.checked);
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '床水平構面計算_' + (data.projectName || '新規') + '.json';
    a.click();
    URL.revokeObjectURL(url);
}

function loadData(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if(data.projectName !== undefined) document.getElementById('inProjectName').value = data.projectName;
            if(data.chk && data.chk.length === 8) {
                for(let i=1; i<=8; i++) {
                    const chk = document.getElementById('chk'+i);
                    if (chk) chk.checked = data.chk[i-1];
                }
            }
            if(data.nailIdx !== undefined) setRadioIndex('nail', data.nailIdx);
            if(data.nailPitch !== undefined) document.getElementById('nailPitch').value = data.nailPitch;
            if(data.nailPattern !== undefined) document.getElementById('nailPattern').value = data.nailPattern;
            
            updateSection2();
            drawLayout();
            calculate(); 
        } catch(err) {
            alert("ファイルの読み込みに失敗しました。形式が正しいか確認してください。");
        }
    };
    reader.readAsText(file);
}

function getRadioIndex(name) {
    const radios = document.getElementsByName(name);
    for(let i=0; i<radios.length; i++) if(radios[i].checked) return i;
    return 0;
}
function setRadioIndex(name, index) {
    const radios = document.getElementsByName(name);
    if(radios[index]) radios[index].checked = true;
}

// 初期読み込み時の処理
document.addEventListener('DOMContentLoaded', () => {
    updateSection2();
    drawLayout();
    calculate();
});
