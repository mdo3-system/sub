const materials = {
  "すぎ": { Fb: 22.2, Fs: 1.8, E: 7 },
  "スプルース": { Fb: 22.2, Fs: 1.8, E: 7 },
  "ひのき": { Fb: 26.7, Fs: 2.1, E: 9 },
  "べいまつ": { Fb: 28.2, Fs: 2.4, E: 10 },
  "E105-F300": { Fb: 30.0, Fs: 3.0, E: 10.5 },
  "E135-F375": { Fb: 37.5, Fs: 3.6, E: 13.5 },
  "E95-F315": { Fb: 31.5, Fs: 3.0, E: 9.5 }
};

/**
 * 樹種選択変更時の処理
 */
function updateMaterialInfo() {
  const sel = document.getElementById('mat_select').value;
  if (sel !== "custom") {
    document.getElementById('in_Fb').value = materials[sel].Fb;
    document.getElementById('in_Fs').value = materials[sel].Fs;
    document.getElementById('in_E').value = materials[sel].E;
  }
  calc();
}

/**
 * 計算実行
 */
function calc() {
  const b = Number(document.getElementById('b').value);
  const h = Number(document.getElementById('h').value);
  const pitch = Number(document.getElementById('pitch').value);
  const spacing = Number(document.getElementById('spacing').value);
  const L = Number(document.getElementById('L').value);
  const Wg = Number(document.getElementById('Wg').value);
  const sWs = Number(document.getElementById('sWs').value);
  const q = Number(document.getElementById('q').value);
  const Cpe = Number(document.getElementById('Cpe').value);
  const Kz = Number(document.getElementById('Kz').value);
  
  const Fb_val = Number(document.getElementById('in_Fb').value);
  const Fs_val = Number(document.getElementById('in_Fs').value);
  const E_val = Number(document.getElementById('in_E').value);

  const A = b * h;
  const Z = (b * Math.pow(h, 2)) / 6;
  const I = (b * Math.pow(h, 3)) / 12;
  const cosTheta = Math.cos(Math.atan(pitch / 10));
  const E_full = E_val * 1000;

  document.getElementById('out_A').textContent = A.toLocaleString();
  document.getElementById('out_Z').textContent = Math.round(Z).toLocaleString();
  document.getElementById('out_I').textContent = Math.round(I).toLocaleString();
  document.getElementById('out_cosTheta').textContent = cosTheta.toFixed(4);

  const calcRow = (prefix, w, coef_fb, d_div) => {
    const M = 0.5 * Math.abs(w) * Math.pow(L, 2);
    const Q = Math.abs(w) * L;
    const fb = coef_fb * Fb_val / 3;
    const fs = coef_fb * Fs_val / 3;
    const sigma = (M * 1000) / Z;
    const tau = (1.5 * Q) / A;
    
    document.getElementById(`${prefix}_w`).textContent = w.toFixed(1);
    document.getElementById(`${prefix}_M`).textContent = M.toFixed(1);
    document.getElementById(`${prefix}_Q`).textContent = Q.toFixed(1);
    
    const sRatio = sigma / fb;
    document.getElementById(`${prefix}_sig`).textContent = sigma.toFixed(2);
    document.getElementById(`${prefix}_fb`).textContent = fb.toFixed(2);
    document.getElementById(`${prefix}_sig_r`).textContent = sRatio.toFixed(2);
    document.getElementById(`${prefix}_sig_j`).innerHTML = sRatio <= 1 ? '<span class="ok">OK</span>' : '<span class="ng">NG</span>';

    const tRatio = tau / fs;
    document.getElementById(`${prefix}_tau`).textContent = tau.toFixed(2);
    document.getElementById(`${prefix}_fs`).textContent = fs.toFixed(2);
    document.getElementById(`${prefix}_tau_r`).textContent = tRatio.toFixed(2);
    document.getElementById(`${prefix}_tau_j`).innerHTML = tRatio <= 1 ? '<span class="ok">OK</span>' : '<span class="ng">NG</span>';

    if (d_div) {
      const delta = (Math.abs(w) * Math.pow(L, 4) * 1e9) / (8 * E_full * I);
      const dlim = (L * 1000) / d_div;
      const dRatio = delta / dlim;
      document.getElementById(`${prefix}_d`).textContent = delta.toFixed(2);
      document.getElementById(`${prefix}_dlim`).textContent = dlim.toFixed(2);
      document.getElementById(`${prefix}_d_r`).textContent = dRatio.toFixed(2);
      document.getElementById(`${prefix}_d_j`).innerHTML = delta <= dlim ? '<span class="ok">OK</span>' : '<span class="ng">NG</span>';
    }
  };

  calcRow('l', (Wg / cosTheta) * spacing, 1.1, 200);
  calcRow('s', ((Wg / cosTheta) + sWs) * spacing, 1.6, 150);
  const Ww = q * (Cpe + 0.8 * Kz);
  calcRow('w', (Ww - Wg * cosTheta) * spacing, 2.0, null);
}

// 読み込み時に計算実行
window.addEventListener('DOMContentLoaded', calc);

/**
 * データをJSONとしてエクスポート
 */
function exportData() {
    const data = {
        b: document.getElementById('b').value,
        h: document.getElementById('h').value,
        pitch: document.getElementById('pitch').value,
        spacing: document.getElementById('spacing').value,
        L: document.getElementById('L').value,
        Wg: document.getElementById('Wg').value,
        sWs: document.getElementById('sWs').value,
        q: document.getElementById('q').value,
        Cpe: document.getElementById('Cpe').value,
        Kz: document.getElementById('Kz').value,
        mat_select: document.getElementById('mat_select').value,
        in_Fb: document.getElementById('in_Fb').value,
        in_Fs: document.getElementById('in_Fs').value,
        in_E: document.getElementById('in_E').value
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hashigo_rafter_data.json';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * JSONファイルからデータをインポート
 */
function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            for (const key in data) {
                const el = document.getElementById(key);
                if (el) el.value = data[key];
            }
            calc();
            document.getElementById('json_upload').value = ''; // リセット
        } catch (err) {
            alert('ファイルの読み込みに失敗しました。');
        }
    };
    reader.readAsText(file);
}

/**
 * 印刷の実行
 */
function attemptPrint() {
    // 他のツールではNG判定がある場合に警告を出しているが、
    // 現状はこのツールでは全ての状態を許可して印刷可能とする。
    window.print();
}
