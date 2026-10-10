pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// --- タナカ 土台プレートII 許容耐力表 (単位: N) ---
const plateData = {
    "105": {
        "sugi":     { "dodai": { "long": 40700, "short": 54300 }, "ouka": { "long": 38800, "short": 54300 } },
        "hinoki":   { "dodai": { "long": 52900, "short": 70500 }, "ouka": { "long": 49400, "short": 70500 } },
        "akamatsu": { "dodai": { "long": 55800, "short": 81400 }, "ouka": { "long": 55800, "short": 81400 } }
    },
    "120": {
        "sugi":     { "dodai": { "long": 56800, "short": 75700 }, "ouka": { "long": 55700, "short": 75700 } },
        "hinoki":   { "dodai": { "long": 73200, "short": 106200}, "ouka": { "long": 69000, "short": 106200} },
        "akamatsu": { "dodai": { "long": 73200, "short": 106200}, "ouka": { "long": 72800, "short": 106200} }
    }
};

const tbody = document.getElementById('table_body');

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// --- 行の追加と計算 ---
function addRow(data = {}) {
    const tr = document.createElement('tr');
    
    const floor = data.f || "1F";
    const pos = data.p || "X1Y1";
    const longF = (data.l !== undefined) ? data.l : 0;
    const shortF = (data.s !== undefined) ? data.s : 50000;
    const sType = data.st || "水平"; // 水平 or 積雪
    const width = data.w || "105";
    const part = data.pt || "dodai";
    const wood = data.wd || "hinoki";

    tr.innerHTML = `
        <td class="col-floor">
            <div class="screen-view">
                <input type="text" value="${escapeHtml(floor)}" class="input-floor" oninput="syncRowViews(this)">
            </div>
            <div class="print-view print-floor">${escapeHtml(floor)}</div>
        </td>
        <td class="col-pos">
            <div class="screen-view">
                <input type="text" value="${escapeHtml(pos)}" class="input-pos" placeholder="X1Y1" oninput="syncRowViews(this)">
            </div>
            <div class="print-view print-pos">${escapeHtml(pos)}</div>
        </td>
        <td class="col-force">
            <div class="screen-view">
                <div class="val-box">
                    <span class="val-label">長期</span>
                    <input type="number" value="${longF}" class="f-long" oninput="calcRow(this)" onchange="calcRow(this)">
                </div>
                <div class="val-box">
                    <select class="s-type" onchange="calcRow(this)">
                        <option value="水平" ${sType==='水平'?'selected':''}>水平</option>
                        <option value="積雪" ${sType==='積雪'?'selected':''}>積雪</option>
                    </select>
                    <input type="number" value="${shortF}" class="f-short" oninput="calcRow(this)" onchange="calcRow(this)">
                </div>
            </div>
            <div class="print-view">
                <div class="print-force-row">
                    <span class="print-lbl">長期</span>
                    <span class="print-val print-f-long"></span>
                </div>
                <div class="print-force-row">
                    <span class="print-lbl print-st-label">${escapeHtml(sType)}</span>
                    <span class="print-val print-f-short"></span>
                </div>
            </div>
        </td>
        <td class="col-spec">
            <div class="screen-view">
                <select class="spec-select s-width" onchange="calcRow(this)">
                    <option value="105" ${width==='105'?'selected':''}>プレートII 105用</option>
                    <option value="120" ${width==='120'?'selected':''}>プレートII 120用</option>
                </select>
                <select class="spec-select s-part" onchange="calcRow(this)">
                    <option value="dodai" ${part==='dodai'?'selected':''}>土台 (柱脚)</option>
                    <option value="ouka" ${part==='ouka'?'selected':''}>横架材 (梁・柱頭)</option>
                </select>
                <select class="spec-select s-wood" onchange="calcRow(this)">
                    <option value="sugi" ${wood==='sugi'?'selected':''}>すぎ類 (E105等)</option>
                    <option value="hinoki" ${wood==='hinoki'?'selected':''}>ひのき類</option>
                    <option value="akamatsu" ${wood==='akamatsu'?'selected':''}>あかまつ類 (米松等)</option>
                </select>
            </div>
            <div class="print-view">
                <div class="print-spec-line print-spec-main print-spec-w"></div>
                <div class="print-spec-line print-spec-pt"></div>
                <div class="print-spec-line print-spec-wd"></div>
            </div>
        </td>
        <td class="col-allow">
            <div class="screen-view">
                <div class="allow-box"><span class="val-label">長期</span><span class="allow-val a-long"></span></div>
                <div class="allow-box"><span class="val-label">短期</span><span class="allow-val a-short"></span></div>
            </div>
            <div class="print-view">
                <div class="print-allow-row"><span class="print-lbl">長期</span><span class="print-val print-a-long"></span></div>
                <div class="print-allow-row"><span class="print-lbl">短期</span><span class="print-val print-a-short"></span></div>
            </div>
        </td>
        <td class="col-judge">
            <div class="screen-view">
                <div class="val-box" style="justify-content:center;"><span class="j-long"></span></div>
                <div class="val-box" style="justify-content:center;"><span class="j-short"></span></div>
            </div>
            <div class="print-view">
                <div class="print-judge-row"><span class="print-lbl">長期</span><span class="print-judge-val print-j-long"></span></div>
                <div class="print-judge-row"><span class="print-lbl">短期</span><span class="print-judge-val print-j-short"></span></div>
            </div>
        </td>
        <td class="col-action no-print">
            <button class="btn-delete" onclick="deleteRow(this)">削除</button>
        </td>
    `;
    tbody.appendChild(tr);
    calcRow(tr.querySelector('.f-long')); 
}

function addEmptyRow() {
    addRow();
}

function deleteRow(btn) {
    btn.closest('tr').remove();
    checkOverallStatus();
}

function syncRowViews(el) {
    const tr = el.closest('tr');
    if (!tr) return;
    const fIn = tr.querySelector('.input-floor');
    const pIn = tr.querySelector('.input-pos');
    const fPrint = tr.querySelector('.print-floor');
    const pPrint = tr.querySelector('.print-pos');
    if (fIn && fPrint) fPrint.innerText = fIn.value || "1F";
    if (pIn && pPrint) pPrint.innerText = pIn.value || "-";
}

// 行ごとの計算と判定
function calcRow(el) {
    const tr = el.closest('tr');
    if (!tr) return;
    
    const fFloor = tr.querySelector('.input-floor')?.value || "1F";
    const fPos = tr.querySelector('.input-pos')?.value || "-";
    const fLong = parseFloat(tr.querySelector('.f-long')?.value) || 0;
    const fShort = parseFloat(tr.querySelector('.f-short')?.value) || 0;
    const sType = tr.querySelector('.s-type')?.value || "水平";
    
    const w = tr.querySelector('.s-width')?.value || "105";
    const pt = tr.querySelector('.s-part')?.value || "dodai";
    const wd = tr.querySelector('.s-wood')?.value || "hinoki";

    // 印刷用 階・位置 同期
    const pFloor = tr.querySelector('.print-floor');
    const pPos = tr.querySelector('.print-pos');
    if (pFloor) pFloor.innerText = fFloor;
    if (pPos) pPos.innerText = fPos;

    // 許容耐力
    let aLong = 0, aShort = 0;
    try {
        aLong = plateData[w][wd][pt]["long"];
        aShort = plateData[w][wd][pt]["short"];
    } catch(e) {}

    const aLongFmt = aLong.toLocaleString();
    const aShortFmt = aShort.toLocaleString();
    const aLongEl = tr.querySelector('.a-long');
    const aShortEl = tr.querySelector('.a-short');
    if (aLongEl) aLongEl.innerText = aLongFmt;
    if (aShortEl) aShortEl.innerText = aShortFmt;

    const paLongEl = tr.querySelector('.print-a-long');
    const paShortEl = tr.querySelector('.print-a-short');
    if (paLongEl) paLongEl.innerText = aLongFmt + " N";
    if (paShortEl) paShortEl.innerText = aShortFmt + " N";

    // 印刷用 発生力
    const pfLong = tr.querySelector('.print-f-long');
    const pfShort = tr.querySelector('.print-f-short');
    const pstLbl = tr.querySelector('.print-st-label');
    if (pfLong) pfLong.innerText = fLong.toLocaleString() + " N";
    if (pfShort) pfShort.innerText = fShort.toLocaleString() + " N";
    if (pstLbl) pstLbl.innerText = sType;

    // 印刷用 仕様
    const pwEl = tr.querySelector('.print-spec-w');
    const pptEl = tr.querySelector('.print-spec-pt');
    const pwdEl = tr.querySelector('.print-spec-wd');
    const wText = (w === "120") ? "プレートII 120用" : "プレートII 105用";
    const ptText = (pt === "dodai") ? "土台 (柱脚)" : "横架材 (梁・柱頭)";
    let wdText = "ひのき類";
    if (wd === "sugi") wdText = "すぎ類 (E105等)";
    else if (wd === "akamatsu") wdText = "あかまつ類 (米松等)";

    if (pwEl) pwEl.innerText = wText;
    if (pptEl) pptEl.innerText = ptText;
    if (pwdEl) pwdEl.innerText = wdText;

    // 判定
    const jL = tr.querySelector('.j-long');
    const jS = tr.querySelector('.j-short');
    const pjL = tr.querySelector('.print-j-long');
    const pjS = tr.querySelector('.print-j-short');
    
    let isOk = true;

    if (fLong <= aLong) {
        if (jL) jL.innerHTML = '<span class="badge badge-ok">OK</span>';
        if (pjL) { pjL.innerText = "OK"; pjL.classList.remove('ng'); }
    } else {
        if (jL) jL.innerHTML = '<span class="badge badge-ng">NG</span>';
        if (pjL) { pjL.innerText = "NG"; pjL.classList.add('ng'); }
        isOk = false;
    }
    
    if (fShort <= aShort) {
        if (jS) jS.innerHTML = '<span class="badge badge-ok">OK</span>';
        if (pjS) { pjS.innerText = "OK"; pjS.classList.remove('ng'); }
    } else {
        if (jS) jS.innerHTML = '<span class="badge badge-ng">NG</span>';
        if (pjS) { pjS.innerText = "NG"; pjS.classList.add('ng'); }
        isOk = false;
    }

    if(isOk) {
        tr.style.backgroundColor = "#ffffff";
        tr.classList.remove('row-ng');
        tr.classList.add('row-ok');
    } else {
        tr.style.backgroundColor = "#fff5f5";
        tr.classList.remove('row-ok');
        tr.classList.add('row-ng');
    }

    checkOverallStatus();
}

// 全体の判定ステータス
function checkOverallStatus() {
    const ngCount = document.querySelectorAll('tbody tr.row-ng').length;
    const totalCount = document.querySelectorAll('tbody tr').length;
    const statusBox = document.getElementById('overall_status');
    
    if (!statusBox) return;

    if (totalCount === 0) {
        statusBox.className = "status-box status-ok";
        statusBox.innerText = "データがありません。PDFまたは手動で行を追加してください。";
    } else if (ngCount > 0) {
        statusBox.className = "status-box status-ng";
        statusBox.innerText = `【NGあり】 検討中 ${totalCount} 箇所中、${ngCount} 箇所が許容耐力を超過しています。仕様を変更してください。`;
    } else {
        statusBox.className = "status-box status-ok";
        statusBox.innerText = `【全数クリア】 全 ${totalCount} 箇所のめり込み検討が許容耐力以下（OK）です。印刷出力可能です。`;
    }
}

// 帳票印刷の実行
function attemptPrint() {
    const rows = collectMerikomiRows();
    if (rows.length === 0) {
        alert("印刷するデータがありません。行を追加してください。");
        return;
    }

    // 最新状態へ同期
    document.querySelectorAll('tbody tr').forEach(tr => {
        const input = tr.querySelector('.f-long');
        if (input) calcRow(input);
    });

    const ngRows = document.querySelectorAll('tbody tr.row-ng');
    if (ngRows.length > 0) {
        alert("【エラー】\n表の中に「NG」の項目が残っています。\nプレート幅（120用へ変更）や受材樹種（べいまつ等へ変更）を行い、すべての判定を「OK」にしてから印刷してください。");
        return;
    }
    if (typeof GlobalInfo !== 'undefined' && GlobalInfo.updatePrintHeader) {
        GlobalInfo.updatePrintHeader();
    }
    window.print();
}
window.attemptPrint = attemptPrint;
window.executeToolPrint = attemptPrint;

// --- JSONデータのエクスポート・インポート ---
function collectMerikomiRows() {
    const rows = document.querySelectorAll('tbody tr');
    const data = [];
    rows.forEach(tr => {
        const floorInput = tr.querySelector('.input-floor');
        const posInput = tr.querySelector('.input-pos');
        const fLong = tr.querySelector('.f-long');
        const fShort = tr.querySelector('.f-short');
        const sType = tr.querySelector('.s-type');
        const sWidth = tr.querySelector('.s-width');
        const sPart = tr.querySelector('.s-part');
        const sWood = tr.querySelector('.s-wood');

        if (floorInput && posInput && fLong && fShort && sWidth) {
            data.push({
                f: floorInput.value || "1F",
                p: posInput.value || "",
                l: parseFloat(fLong.value) || 0,
                s: parseFloat(fShort.value) || 0,
                st: sType ? sType.value : "水平",
                w: sWidth.value || "105",
                pt: sPart ? sPart.value : "dodai",
                wd: sWood ? sWood.value : "hinoki"
            });
        }
    });
    return data;
}
window.collectMerikomiRows = collectMerikomiRows;

function exportData() {
    const rows = collectMerikomiRows();
    if(rows.length === 0) {
        alert("保存するデータがありません。行を追加してください。");
        return;
    }

    const payload = {
        app_version: "1.4.0",
        tool_id: "merikomi",
        title: "土台プレートII 許容めり込み耐力 検討書",
        timestamp: new Date().toISOString(),
        merikomi_rows: rows,
        rows: rows
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merikomi_plate_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

window.addRow = addRow;
window.addEmptyRow = addEmptyRow;
window.checkOverallStatus = checkOverallStatus;

window.restoreToolData = function(data) {
    if (!data) return false;
    let rows = [];
    if (Array.isArray(data)) {
        rows = data;
    } else if (data && typeof data === 'object') {
        rows = data.merikomi_rows || data.rows || data.data?.merikomi_rows || data.data?.rows || (Array.isArray(data.data) ? data.data : []);
    }
    if (!Array.isArray(rows) || rows.length === 0) return false;

    const targetTbody = document.getElementById('table_body') || document.querySelector('tbody');
    if (targetTbody) {
        targetTbody.innerHTML = '';
        rows.forEach(d => addRow(d));
        checkOverallStatus();
        return true;
    }
    return false;
};

function importData(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(ev) {
        try {
            const parsed = JSON.parse(ev.target.result);
            if (window.restoreToolData(parsed)) {
                const targetTbody = document.getElementById('table_body') || document.querySelector('tbody');
                const count = targetTbody ? targetTbody.querySelectorAll('tr').length : 0;
                alert(`✓ めり込み補強データを正常に復元しました。（検討柱: ${count} 箇所）`);
            } else {
                throw new Error("有効なめり込みデータ（柱の検討行）が見つかりませんでした。");
            }
        } catch (err) {
            console.error("Merikomi load error:", err);
            alert('ファイルの読み込みに失敗しました。\n' + err.message);
        } finally {
            if (e.target) e.target.value = '';
        }
    };
    reader.readAsText(file);
}

// --- PDF読み込み解析 ---
document.getElementById('pdf_upload')?.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const loadMsg = document.getElementById('loading_msg');
    if (loadMsg) loadMsg.style.display = 'inline';
    const reader = new FileReader();

    reader.onload = async function(e) {
        const typedarray = new Uint8Array(e.target.result);
        try {
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + "\n";
            }
            parsePdfText(fullText);
        } catch(err) {
            alert("PDFの解析に失敗しました。");
            console.error(err);
        } finally {
            if (loadMsg) loadMsg.style.display = 'none';
            document.getElementById('pdf_upload').value = "";
        }
    };
    reader.readAsArrayBuffer(file);
});

function parsePdfText(text) {
    const blocks = text.split(/(?=X\d+[a-z]?Y\d+[a-z]?)/);
    let foundCount = 0;
    let currentFloor = "1F"; 

    tbody.innerHTML = ''; 

    blocks.forEach(block => {
        if (block.includes("1F") || block.includes("1階")) currentFloor = "1F";
        if (block.includes("2F") || block.includes("2階")) currentFloor = "2F";
        
        const posMatch = block.match(/X\d+[a-z]?Y\d+[a-z]?/);
        if (!posMatch) return;
        const pos = posMatch[0];
        
        if (block.includes("NG")) {
            let wood = "sugi"; 
            if (block.includes("ひのき") || block.includes("桧")) {
                wood = "hinoki";
            } else if (block.includes("べいまつ") || block.includes("米松") || block.includes("あかまつ") || block.includes("赤松")) {
                if (block.includes("欧州赤松")) wood = "sugi";
                else wood = "akamatsu";
            } else if (block.includes("すぎ") || block.includes("スギ") || block.includes("スプルース")) {
                wood = "sugi";
            } else {
                wood = (currentFloor === "1F") ? "hinoki" : "sugi";
            }
            
            let part = "ouka";
            if (block.includes("土台")) part = "dodai";
            else if (currentFloor === "1F") part = "dodai";
            
            const nums = block.match(/\d{4,6}/g);
            let forceLong = 0;
            let forceShort = 50000;
            let sType = "水平";
            
            if (nums) {
                const largeNums = nums.map(Number).filter(n => n > 1000);
                if (largeNums.length >= 2) {
                    forceLong = largeNums[0]; 
                    forceShort = Math.max(...largeNums);
                }
            }
            
            addRow({
                f: currentFloor, p: pos,
                l: forceLong, s: forceShort, st: sType,
                w: "105", pt: part, wd: wood
            });
            foundCount++;
        }
    });
    
    if (foundCount > 0) {
        alert(`PDFから ${foundCount} 件のNG箇所を抽出しました。\n許容耐力を超えている箇所は、プレート幅や樹種を変更して「OK」にしてください。`);
    } else {
        alert("PDFから「NG」となる柱を検出できませんでした。");
    }
    checkOverallStatus();
}

window.onload = checkOverallStatus;
