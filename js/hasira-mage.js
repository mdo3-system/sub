// --- 保存・復元機能 ---
function saveData() {
    const data = {
        material: document.getElementById('material').value,
        width: document.getElementById('width').value,
        height: document.getElementById('height').value,
        length: document.getElementById('length').value,
        axial: document.getElementById('axial').value,
        wind_q: document.getElementById('wind_q').value,
        load_width: document.getElementById('load_width').value,
        cf_coef: document.getElementById('cf_coef').value
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    // ファイル名を日付入りにする
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    a.download = `column_check_${dateStr}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
}

function loadData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // 存在するキーのみ復元
            if(data.material) document.getElementById('material').value = data.material;
            if(data.width) document.getElementById('width').value = data.width;
            if(data.height) document.getElementById('height').value = data.height;
            if(data.length) document.getElementById('length').value = data.length;
            if(data.axial) document.getElementById('axial').value = data.axial;
            if(data.wind_q) document.getElementById('wind_q').value = data.wind_q;
            if(data.load_width) document.getElementById('load_width').value = data.load_width;
            if(data.cf_coef) document.getElementById('cf_coef').value = data.cf_coef;
            
            // フィールド入力の値をリセット（同じファイルを再度読めるようにする）
            document.getElementById('fileInput').value = "";
            
            // 読み込み直後に自動計算させる場合
            calculate();
            
        } catch (err) {
            alert("ファイルの読み込みに失敗しました。正しいJSONファイルを選択してください。");
        }
    };
    reader.readAsText(file);
}

// --- 計算・描画機能 ---
function drawMDiagram(canvasId, M_max_kNm, lk) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padY = 20, startX = 60, drawHeight = canvas.height - padY * 2;
    
    ctx.beginPath();
    ctx.moveTo(startX, padY);
    ctx.lineTo(startX, canvas.height - padY);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#333";
    ctx.stroke();

    ctx.fillStyle = "#333";
    ctx.fillRect(startX - 10, padY - 5, 20, 5);
    ctx.beginPath();
    ctx.moveTo(startX, canvas.height - padY);
    ctx.lineTo(startX - 10, canvas.height - padY + 10);
    ctx.lineTo(startX + 10, canvas.height - padY + 10);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(startX, padY);
    ctx.quadraticCurveTo(startX + 180, canvas.height / 2, startX, canvas.height - padY);
    ctx.fillStyle = "rgba(52, 152, 219, 0.15)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#2980b9";
    ctx.stroke();

    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 9; i++) {
        let y = padY + drawHeight * (i / 10);
        let t = i / 10;
        let x = startX + 90 * (4 * t * (1 - t)); 
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    ctx.fillStyle = "#e74c3c";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("Mmax = " + M_max_kNm.toFixed(2) + " kN・m", startX + 50, canvas.height / 2 + 5);
    ctx.fillStyle = "#333";
    ctx.font = "12px sans-serif";
    ctx.fillText("lk=" + lk, 10, canvas.height / 2 + 5);
}

function calculate() {

    const matData = document.getElementById('material').value.split(',');
    const Fc = parseFloat(matData[0]);
    const Fb = parseFloat(matData[1]);
    const matName = matData[2];
    
    const b = parseFloat(document.getElementById('width').value);
    const h = parseFloat(document.getElementById('height').value);
    const lk = parseFloat(document.getElementById('length').value);
    const N = parseFloat(document.getElementById('axial').value);
    
    const q = parseFloat(document.getElementById('wind_q').value);
    const B = parseFloat(document.getElementById('load_width').value);
    const Cf = parseFloat(document.getElementById('cf_coef').value);

    const A = b * h;
    const Z = (b * Math.pow(h, 2)) / 6;
    const i = h / Math.sqrt(12);

    const w = q * (B / 1000) * Cf; 
    const w_N_mm = w / 1000;
    const M = (w_N_mm * Math.pow(lk, 2)) / 8;

    const lambda = lk / i;

    let Fk = 0;
    let fk_reason = "";
    if (lambda <= 30) {
        Fk = Fc;
        fk_reason = "λ ≦ 30 のため、Fk = Fc となります。";
    } else if (lambda > 30 && lambda <= 100) {
        Fk = (1.3 - 0.01 * lambda) * Fc;
        fk_reason = "30 < λ ≦ 100 のため、Fk = (1.3 - 0.01λ)Fc となります。";
    } else {
        Fk = (3000 / Math.pow(lambda, 2)) * Fc;
        fk_reason = "λ > 100 のため、Fk = (3000 / λ²)Fc となります。";
    }

    const sfk = (2 / 3) * Fk;
    const sfb = (2 / 3) * Fb;

    const ratio_c = N / (A * sfk);
    const ratio_b = M / (Z * sfb);
    const ratio_total = ratio_c + ratio_b;

    document.getElementById('out_mat').innerText = matName;
    document.getElementById('out_fc').innerText = Fc.toFixed(2);
    document.getElementById('out_fb').innerText = Fb.toFixed(2);
    
    document.getElementById('out_b').innerText = b;
    document.getElementById('out_h').innerText = h;
    document.getElementById('out_A').innerText = A.toFixed(1);
    document.getElementById('out_Z').innerText = Z.toFixed(1);
    document.getElementById('out_lk').innerText = lk;
    
    document.getElementById('out_q').innerText = q;
    document.getElementById('out_q_val').innerText = q;
    document.getElementById('out_B').innerText = B;
    document.getElementById('out_B_val').innerText = B;
    document.getElementById('out_cf').innerText = Cf.toFixed(1);
    document.getElementById('out_cf_val').innerText = Cf.toFixed(1);
    
    document.getElementById('out_w').innerText = w.toFixed(1);
    document.getElementById('out_N').innerText = N.toLocaleString();
    document.getElementById('out_M').innerText = M.toLocaleString(undefined, {maximumFractionDigits: 0});
    
    document.getElementById('out_lambda').innerText = lambda.toFixed(2);
    document.getElementById('out_fk_calc').innerText = fk_reason;
    document.getElementById('out_Fk').innerText = Fk.toFixed(2);
    document.getElementById('out_sfk').innerText = sfk.toFixed(2);
    document.getElementById('out_sfb').innerText = sfb.toFixed(2);
    
    document.getElementById('out_ratio_c').innerText = ratio_c.toFixed(3);
    document.getElementById('out_ratio_b').innerText = ratio_b.toFixed(3);
    document.getElementById('out_ratio_total').innerText = ratio_total.toFixed(3);

    const judgeEl = document.getElementById('out_judge');
    if (ratio_total <= 1.0) {
        judgeEl.innerText = "【 OK 】";
        judgeEl.style.color = "#27ae60";
    } else {
        judgeEl.innerText = "【 NG 】";
        judgeEl.style.color = "#c0392b";
    }

    drawMDiagram("mDiagram", M / 1000000, lk);

    document.getElementById('print_area').style.visibility = 'visible';

    if (window.MathJax) {
        MathJax.typesetPromise();
    }
}
