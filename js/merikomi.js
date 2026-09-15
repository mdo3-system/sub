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

// --- 行の追加と計算 ---
function addRow(data = {}) {
    const tr = document.createElement('tr');
    
    const floor = data.f || "1F";
    const pos = data.p || "X1Y1";
    const longF = data.l || 0;
    const shortF = data.s || 50000;
    const sType = data.st || "水平"; // 水平 or 積雪
    const width = data.w || "105";
    const part = data.pt || "dodai";
    const wood = data.wd || "hinoki";

    tr.innerHTML = `
        <td><input type="text" value="${floor}"></td>
        <td><input type="text" value="${pos}"></td>
        <td>
            <div class="val-box">
                <span class="val-label" style="width:55px;">長期</span>
                <input type="number" value="${longF}" class="f-long" onchange="calcRow(this)">
            </div>
            <div class="val-box">
                <select class="s-type" onchange="calcRow(this)">
                    <option value="水平" ${sType==='水平'?'selected':''}>水平</option>
                    <option value="積雪" ${sType==='積雪'?'selected':''}>積雪</option>
                </select>
                <input type="number" value="${shortF}" class="f-short" onchange="calcRow(this)">
            </div>
        </td>
        <td>
            <select class="s-width" onchange="calcRow(this)">
                <option value="105" ${width==='105'?'selected':''}>プレートII 105用</option>
                <option value="120" ${width==='120'?'selected':''}>プレートII 120用</option>
            </select>
            <select class="s-part" onchange="calcRow(this)">
                <option value="dodai" ${part==='dodai'?'selected':''}>土台 (柱脚)</option>
                <option value="ouka" ${part==='ouka'?'selected':''}>横架材 (梁・柱頭)</option>
            </select>
            <select class="s-wood" onchange="calcRow(this)">
                <option value="sugi" ${wood==='sugi'?'selected':''}>すぎ類(E105等)</option>
                <option value="hinoki" ${wood==='hinoki'?'selected':''}>ひのき類</option>
                <option value="akamatsu" ${wood==='akamatsu'?'selected':''}>あかまつ類(米松等)</option>
            </select>
        </td>
        <td>
            <div class="val-box"><span class="val-label">長期</span><span class="a-long"></span></div>
            <div class="val-box"><span class="val-label">短期</span><span class="a-short"></span></div>
        </td>
        <td>
            <div class="val-box"><span class="val-label">長期</span><span class="j-long"></span></div>
            <div class="val-box"><span class="val-label">短期</span><span class="j-short"></span></div>
        </td>
        <td class="no-print"><button class="btn btn-danger" onclick="deleteRow(this)">削除</button></td>
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

// 行ごとの計算と判定
function calcRow(el) {
    const tr = el.closest('tr');
    
    const fLong = parseFloat(tr.querySelector('.f-long').value) || 0;
    const fShort = parseFloat(tr.querySelector('.f-short').value) || 0;
    
    const w = tr.querySelector('.s-width').value;
    const pt = tr.querySelector('.s-part').value;
    const wd = tr.querySelector('.s-wood').value;

    let aLong = 0, aShort = 0;
    try {
        aLong = plateData[w][wd][pt]["long"];
        aShort = plateData[w][wd][pt]["short"];
    } catch(e) {}

    tr.querySelector('.a-long').innerText = aLong.toLocaleString();
    tr.querySelector('.a-short').innerText = aShort.toLocaleString();

    const jL = tr.querySelector('.j-long');
    const jS = tr.querySelector('.j-short');
    
    let isOk = true;

    if (fLong <= aLong) { jL.innerHTML = '<span class="judge-ok">OK</span>'; } 
    else { jL.innerHTML = '<span class="judge-ng">NG</span>'; isOk = false; }
    
    if (fShort <= aShort) { jS.innerHTML = '<span class="judge-ok">OK</span>'; } 
    else { jS.innerHTML = '<span class="judge-ng">NG</span>'; isOk = false; }

    if(isOk) { tr.style.backgroundColor = "#fff"; tr.classList.remove('row-ng'); tr.classList.add('row-ok'); }
    else { tr.style.backgroundColor = "#fff5f5"; tr.classList.remove('row-ok'); tr.classList.add('row-ng'); }

    checkOverallStatus();
}

function checkOverallStatus() {
    const ngRows = document.querySelectorAll('.row-ng');
    const totalRows = document.querySelectorAll('tbody tr').length;
    const statusBox = document.getElementById('overall_status');
    
    if (totalRows === 0) {
        statusBox.className = "status-box status-ok";
        statusBox.innerHTML = `データがありません。PDFまたは保存ファイルを読み込んでください。`;
    } else if (ngRows.length > 0) {
        statusBox.className = "status-box status-ng";
        statusBox.innerHTML = `⚠️ ${ngRows.length} 件のNG項目が残っています。プレート幅や樹種を変更してOKにしてください。`;
    } else {
        statusBox.className = "status-box status-ok";
        statusBox.innerHTML = `✅ 全ての項目がOKです。印刷可能です。`;
    }
}

function attemptPrint() {
    const ngRows = document.querySelectorAll('.row-ng');
    if (ngRows.length > 0) {
        alert("【エラー】\n表の中に「NG」の項目が残っています。\nプレート幅（120用へ変更）や受材樹種（べいまつ等へ変更）を行い、すべての判定を「OK」にしてから印刷してください。");
        return;
    }
    window.print();
}

// --- JSONデータのエクスポート・インポート ---
function exportData() {
    const rows = document.querySelectorAll('tbody tr');
    const data = [];
    rows.forEach(tr => {
        data.push({
            f: tr.querySelectorAll('input[type="text"]')[0].value,
            p: tr.querySelectorAll('input[type="text"]')[1].value,
            l: tr.querySelector('.f-long').value,
            s: tr.querySelector('.f-short').value,
            st: tr.querySelector('.s-type').value,
            w: tr.querySelector('.s-width').value,
            pt: tr.querySelector('.s-part').value,
            wd: tr.querySelector('.s-wood').value
        });
    });

    if(data.length === 0) { alert("保存するデータがありません。"); return; }

    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merikomi_plate_data.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            tbody.innerHTML = '';
            data.forEach(d => addRow(d));
            checkOverallStatus();
            document.getElementById('json_upload').value = ''; // リセット
        } catch (err) {
            alert('ファイルの読み込みに失敗しました。対応する JSONファイルを選択してください。');
        }
    };
    reader.readAsText(file);
}

// --- PDF読み込み解析 ---
document.getElementById('pdf_upload').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('loading_msg').style.display = 'inline';
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
            document.getElementById('loading_msg').style.display = 'none';
            document.getElementById('pdf_upload').value = ""; // リセット
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
            // 樹種の自動判別
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
            
            // 部位の判定
            let part = "ouka";
            if (block.includes("土台")) part = "dodai";
            else if (currentFloor === "1F") part = "dodai";
            
            // 荷重の抽出
            const nums = block.match(/\d{4,6}/g);
            let forceLong = 0;
            let forceShort = 50000;
            let sType = "水平"; // PDF抽出時は基本的に水平力が支配的と仮定
            
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
