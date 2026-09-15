let roofs = []; // Updated calculation logic: Simple W/Wa without G.

function initApp() {
    // 共通項目のイベントリスナー登録を確実に行う
    const elVo = document.getElementById('Vo');
    const elSodo = document.getElementById('sodo');
    const elEr = document.getElementById('Er');
    const elAddRoof = document.getElementById('btnAddRoof');

    if (elVo) elVo.addEventListener('input', calculate);
    if (elSodo) elSodo.addEventListener('change', calculate);
    if (elEr) elEr.addEventListener('input', calculate);
    if (elAddRoof) elAddRoof.addEventListener('click', addRoof);

    if (roofs.length === 0) {
        addRoof();
    } else {
        renderRoofs();
    }
}

function addRoof() {
    const newRoof = {
        name: `屋根部位 ${roofs.length + 1}`,
        pitch: 1.25,
        wa: 2058,
        source: "",
        results: {
            deg: 0,
            cpe_ridge: 0,
            cpe_corner: 0,
            w_ridge: 0,
            ratio_ridge: 0,
            judge_ridge: '—',
            w_corner: 0,
            ratio_corner: 0,
            judge_corner: '—'
        }
    };
    roofs.push(newRoof);
    renderRoofs();
}

function removeRoof(index) {
    if (roofs.length <= 1) {
        alert("少なくとも1つの部位が必要です。");
        return;
    }
    roofs.splice(index, 1);
    renderRoofs();
}

function updateRoofData(index, field, value) {
    if (field === 'pitch' || field === 'wa') {
        roofs[index][field] = parseFloat(value) || 0;
    } else {
        roofs[index][field] = value;
    }
    calculate();
}

function calculate() {
    const voEl = document.getElementById('Vo');
    const erEl = document.getElementById('Er');
    const qResEl = document.getElementById('q_result');

    if (!voEl || !erEl || !qResEl) return;

    const Vo = parseFloat(voEl.value) || 0;
    const Er = parseFloat(erEl.value) || 0;
    const q = 0.6 * Math.pow(Er, 2) * Math.pow(Vo, 2);
    qResEl.textContent = q.toFixed(2);

    roofs.forEach((roof, index) => {
        const deg = Math.atan(roof.pitch / 10) * (180 / Math.PI);
        roof.results.deg = deg;

        let cpe_ridge = 0;
        let cpe_corner = 0;

        if (deg <= 10) {
            cpe_ridge = -3.2;
            cpe_corner = -4.3;
        } else if (deg <= 20) {
            cpe_ridge = -3.2 - (deg - 10) * 0.22;
            cpe_corner = -4.3 + (deg - 10) * 0.11;
        } else if (deg <= 30) {
            cpe_ridge = -5.4 + (deg - 20) * 0.22;
            cpe_corner = -3.2;
        } else {
            cpe_ridge = -3.2;
            cpe_corner = -3.2;
        }

        roof.results.cpe_ridge = cpe_ridge;
        roof.results.cpe_corner = cpe_corner;

        const Wa = roof.wa || 1;
        
        // 風圧力 W
        const w_ridge = Math.abs(q * cpe_ridge);
        const w_corner = Math.abs(q * cpe_corner);
        roof.results.w_ridge = w_ridge;
        roof.results.w_corner = w_corner;

        // 検定比 W/Wa
        const ratio_ridge = w_ridge / Wa;
        roof.results.ratio_ridge = ratio_ridge;
        roof.results.judge_ridge = ratio_ridge < 1 ? 'OK' : 'NG';

        const ratio_corner = w_corner / Wa;
        roof.results.ratio_corner = ratio_corner;
        roof.results.judge_corner = ratio_corner < 1 ? 'OK' : 'NG';

        // 表示の更新
        const card = document.querySelector(`.roof-card[data-index="${index}"]`);
        if (card) {
            const elDeg = card.querySelector('.deg-val');
            const elCpeR = card.querySelector('.cpe-ridge-val');
            const elCpeC = card.querySelector('.cpe-corner-val');
            const elWR = card.querySelector('.w-ridge-val');
            const elRR = card.querySelector('.ratio-ridge-val');
            const elJR = card.querySelector('.judge-ridge-val');
            const elWC = card.querySelector('.w-corner-val');
            const elRC = card.querySelector('.ratio-corner-val');
            const elJC = card.querySelector('.judge-corner-val');

            if (elDeg) elDeg.textContent = deg.toFixed(2);
            if (elCpeR) elCpeR.textContent = cpe_ridge.toFixed(3);
            if (elCpeC) elCpeC.textContent = cpe_corner.toFixed(3);
            if (elWR) elWR.textContent = w_ridge.toFixed(2);
            if (elRR) elRR.textContent = ratio_ridge.toFixed(3);
            if (elJR) {
                elJR.textContent = roof.results.judge_ridge;
                elJR.className = 'judge-ridge-val ' + (roof.results.judge_ridge === 'OK' ? 'ok' : 'ng');
            }
            if (elWC) elWC.textContent = w_corner.toFixed(2);
            if (elRC) elRC.textContent = ratio_corner.toFixed(3);
            if (elJC) {
                elJC.textContent = roof.results.judge_corner;
                elJC.className = 'judge-corner-val ' + (roof.results.judge_corner === 'OK' ? 'ok' : 'ng');
            }
        }
    });

    updatePrintSummary();
}

function renderRoofs() {
    const container = document.getElementById('roof-cards-container');
    if (!container) return;
    container.innerHTML = '';

    roofs.forEach((roof, index) => {
        const card = document.createElement('div');
        card.className = 'card roof-card';
        card.setAttribute('data-index', index);
        card.innerHTML = `
            <button class="btn-remove no-print" onclick="removeRoof(${index})">削除</button>
            <div class="input-group">
                <label>部位名称:</label>
                <input type="text" value="${escapeHtml(roof.name)}" oninput="updateRoofData(${index}, 'name', this.value)" class="wide">
            </div>
            <div class="row">
                <div class="col">
                    <div class="input-group">
                        <label style="width: 150px;">屋根勾配 (寸勾配):</label>
                        <input type="number" value="${roof.pitch}" step="0.05" oninput="updateRoofData(${index}, 'pitch', this.value)">
                    </div>
                    <div class="input-group">
                        <label style="width: 180px;">短期許容引上 Wa (N/m²):</label>
                        <input type="number" value="${roof.wa}" step="1" oninput="updateRoofData(${index}, 'wa', this.value)">
                    </div>
                    <div class="input-group">
                        <label style="width: 150px;">参照元:</label>
                        <input type="text" value="${escapeHtml(roof.source)}" oninput="updateRoofData(${index}, 'source', this.value)" class="wide">
                    </div>
                    
                    <div class="note">勾配角度: <span class="deg-val auto-calc">0</span>°</div>
                    <div class="note">棟端部 Cf: <span class="cpe-ridge-val auto-calc">0</span> / 隅部 Cf: <span class="cpe-corner-val auto-calc">0</span></div>
                    
                    <table>
                        <tr><th>部位</th><th>風圧力 W<br>(N/m²)</th><th>検定比<br>W/Wa</th><th>判定</th></tr>
                        <tr>
                            <td>棟端部</td>
                            <td class="w-ridge-val">0</td>
                            <td class="ratio-ridge-val">0</td>
                            <td class="judge-ridge-val"></td>
                        </tr>
                        <tr>
                            <td>隅部</td>
                            <td class="w-corner-val">0</td>
                            <td class="ratio-corner-val">0</td>
                            <td class="judge-corner-val"></td>
                        </tr>
                    </table>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    calculate();
}

function updatePrintSummary() {
    const summary = document.getElementById('print_summary');
    if (!summary) return;

    let isAllOk = true;
    let summaryHtml = '<div class="summary-box"><div class="summary-title">【判定結果サマリー】</div>';
    
    roofs.forEach(roof => {
        if (roof.results.judge_ridge !== 'OK' || roof.results.judge_corner !== 'OK') {
            isAllOk = false;
        }
        summaryHtml += `
            <div class="summary-item">
                ・${escapeHtml(roof.name)}: 
                棟端部 W/Wa=${roof.results.ratio_ridge.toFixed(3)} (${roof.results.judge_ridge}) / 
                隅部 W/Wa=${roof.results.ratio_corner.toFixed(3)} (${roof.results.judge_corner})
            </div>
        `;
    });

    summaryHtml += `<div style="margin-top:10px; font-size:1.4em; font-weight:bold; text-align:center;" class="${isAllOk ? 'ok':'ng'}">
        総合判定: ${isAllOk ? '適合 (OK)' : '不適合 (NG)'}
    </div></div>`;
    
    summary.innerHTML = summaryHtml;
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}

// I/O 処理
function exportData() {
    const elSelection = {
        Vo: document.getElementById('Vo'),
        sodo: document.getElementById('sodo'),
        Er: document.getElementById('Er')
    };
    if (!elSelection.Vo || !elSelection.sodo || !elSelection.Er) return;

    const data = {
        Vo: elSelection.Vo.value,
        sodo: elSelection.sodo.value,
        Er: elSelection.Er.value,
        roofs: roofs
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `屋根検討_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            const elSelection = {
                Vo: document.getElementById('Vo'),
                sodo: document.getElementById('sodo'),
                Er: document.getElementById('Er')
            };

            if (data.Vo && elSelection.Vo) elSelection.Vo.value = data.Vo;
            if (data.sodo && elSelection.sodo) elSelection.sodo.value = data.sodo;
            if (data.Er && elSelection.Er) elSelection.Er.value = data.Er;
            if (data.roofs) roofs = data.roofs;
            renderRoofs();
        } catch (err) {
            alert("ファイルの読み込みに失敗しました。");
        }
    };
    reader.readAsText(file);
}

// 初期化
window.addEventListener('DOMContentLoaded', initApp);
