// =========================================
// WRC造 長期軸力分割ツール (wrc_axial_force.js)
// マスタ連動・集計分離版 / Gemini AI画像抽出対応
// =========================================

// --- 初期化 ---
window.addEventListener('DOMContentLoaded', () => {
    // 共通キーからGemini APIキーを読み込み
    const savedApiKey = localStorage.getItem('struct_gemini_api_key') || localStorage.getItem('gemini_api_key_wrc');
    if (savedApiKey) {
        localStorage.setItem('struct_gemini_api_key', savedApiKey);
        const keyInput = document.getElementById('apiKey');
        if (keyInput) {
            keyInput.value = savedApiKey;
            fetchModels();
        }
    }

    // 初期状態で空の生データ行を1行追加
    addRawRow();

    // APIキー入力欄の変更監視（自動保存）
    const keyInput = document.getElementById('apiKey');
    if (keyInput) {
        keyInput.addEventListener('change', () => {
            const key = keyInput.value.trim();
            if (key) {
                localStorage.setItem('struct_gemini_api_key', key);
            }
        });
    }
});

// --- APIモデル取得 ---
async function fetchModels() {
    const keyInput = document.getElementById('apiKey');
    if (!keyInput) return;
    const apiKey = keyInput.value.trim();
    const status = document.getElementById('modelStatus');
    const select = document.getElementById('modelSelect');

    if (!apiKey) {
        alert('Google AI Studio APIキーを入力してください。');
        return;
    }

    localStorage.setItem('struct_gemini_api_key', apiKey);
    if (status) status.innerText = "モデルを取得中...";
    const btnFetch = document.getElementById('btn-fetch');
    if (btnFetch) btnFetch.disabled = true;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) throw new Error("API通信エラー。キーを確認してください。");

        const data = await response.json();
        select.innerHTML = '';

        let modelCount = 0;
        data.models.forEach(model => {
            const n = model.name.toLowerCase();
            const dn = (model.displayName || "").toLowerCase();
            if (n.includes("tts") || n.includes("transcribe") || n.includes("banana")) return;

            if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes("generateContent")) {
                const option = document.createElement('option');
                option.value = model.name;
                option.text = `${model.displayName || model.name} (${model.name.replace('models/', '')})`;

                // Flash系を優先選択
                if (n.includes("flash")) {
                    option.selected = true;
                }
                select.appendChild(option);
                modelCount++;
            }
        });

        if (status) {
            status.innerText = modelCount > 0 ? "読込完了。" : "利用可能なモデルがありません。";
        }
    } catch (error) {
        if (status) status.innerText = "";
        alert(error.message);
    } finally {
        if (btnFetch) btnFetch.disabled = false;
    }
}

// --- 画像リサイズ処理 ---
function resizeImage(file, maxWidth) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve({
                    mimeType: 'image/jpeg',
                    base64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
                });
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// --- Gemini画像解析と生データへの追記 ---
async function processImage() {
    const keyInput = document.getElementById('apiKey');
    const apiKey = keyInput ? keyInput.value.trim() : "";
    let modelName = document.getElementById('modelSelect').value;
    const fileInput = document.getElementById('imageInput');
    const status = document.getElementById('statusMessage');
    const btnProcess = document.getElementById('btn-process');

    if (!apiKey) {
        alert('APIキーを入力してください。');
        return;
    }
    if (!fileInput.files.length) {
        alert('画像を選択してください。');
        return;
    }
    if (!modelName) {
        alert('モデルを選択してください（「モデルを読み込む」ボタンを押してください）。');
        return;
    }
    if (!modelName.startsWith('models/')) modelName = 'models/' + modelName;

    const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;

    btnProcess.disabled = true;
    status.style.color = "#2563eb";
    status.innerText = "Geminiが画像を解析中...";

    try {
        const resizedImageData = await resizeImage(fileInput.files[0], 1200);

        const promptText = `
提供された画像は建築の荷重表です。表のデータを行ごとに読み取り、以下のキーを持つJSON配列（Array）として出力してください。
Markdownコードブロックは使わず、純粋なJSON文字列のみを出力してください。
- "symbol": 符号（例: "X1Y1"）。空欄は ""。
- "floor": 階（例: "PH", "2", "1"）。空欄は ""。
- "item": 項目（例: "屋根一般"）。
- "unitLoad": 単位荷重の数値。ない場合は ""。
- "area": 面積の数値。計算式ではなく数値のみ。ない場合は ""。`;

        const requestBody = {
            contents: [{
                parts: [
                    { text: promptText },
                    { inlineData: { mimeType: resizedImageData.mimeType, data: resizedImageData.base64 } }
                ]
            }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        };

        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) throw new Error(`HTTPエラー ${response.status}`);

        const data = await response.json();
        let jsonText = data.candidates[0].content.parts[0].text;
        jsonText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(jsonText);

        extractedData.forEach(row => {
            addRawRow(row.symbol || '', row.floor || '', row.item || '', row.unitLoad || '', row.area || '');
        });

        status.style.color = "#10b981";
        status.innerText = "解析完了。生データに追記しました。";
        fileInput.value = "";

    } catch (error) {
        status.style.color = "#ef4444";
        status.innerText = "エラーが発生しました。";
        alert(`解析失敗:\n${error.message}`);
    } finally {
        btnProcess.disabled = false;
    }
}

// --- UIの行追加関数 ---
function addMasterRow() {
    const tbody = document.getElementById('masterBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="wrc-cell-input m_kw" value=""></td>
        <td><input type="number" class="wrc-cell-input m_ll" value="0.000" step="0.001"></td>
        <td><input type="number" class="wrc-cell-input m_eq" value="0.000" step="0.001"></td>
        <td><button class="btn btn-secondary" style="padding:3px 8px; font-size:0.75rem;" onclick="this.closest('tr').remove()">削除</button></td>
    `;
    tbody.appendChild(tr);
}

function addRawRow(symbol = '', floor = '', item = '', unitLoad = '', area = '') {
    const tbody = document.getElementById('rawTableBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="wrc-cell-input r_symbol" value="${symbol}"></td>
        <td><input type="text" class="wrc-cell-input r_floor" value="${floor}"></td>
        <td><input type="text" class="wrc-cell-input r_item" value="${item}"></td>
        <td><input type="number" class="wrc-cell-input r_unitLoad" value="${unitLoad}" step="0.001"></td>
        <td><input type="number" class="wrc-cell-input r_area" value="${area}" step="0.001"></td>
        <td><button class="btn btn-secondary" style="padding:3px 8px; font-size:0.75rem;" onclick="this.closest('tr').remove()">削除</button></td>
    `;
    tbody.appendChild(tr);
}

// --- 【メインロジック】集計・グループ化実行 ---
function runAggregation() {
    const rawRows = document.querySelectorAll('#rawTableBody tr');
    if (rawRows.length === 0) {
        alert('集計する生データがありません。');
        return;
    }

    const resultBody = document.getElementById('resultTableBody');
    resultBody.innerHTML = '';

    // 審査用マスタ表をPDFエリアにコピー
    copyMasterToPDF();

    let currentSymbol = "";
    let currentFloor = "";
    let activeSymbol = "";
    let activeFloor = "";

    let floorSubtotals = { dl: 0, ll: 0, eq: 0 };
    let symbolTotals = { dl: 0, ll: 0, eq: 0 };
    let isFirst = true;

    rawRows.forEach(tr => {
        const sym = tr.querySelector('.r_symbol').value.trim();
        const flr = tr.querySelector('.r_floor').value.trim();
        const item = tr.querySelector('.r_item').value.trim();
        const unitLoad = parseFloat(tr.querySelector('.r_unitLoad').value) || 0;
        const area = parseFloat(tr.querySelector('.r_area').value) || 0;

        // 符号・階が空欄の場合は上の行の値を引き継ぐ（縦追い）
        if (sym !== "") activeSymbol = sym;
        if (flr !== "") activeFloor = flr;

        // 階や符号の切り替わり判定
        if (!isFirst) {
            if (activeSymbol !== currentSymbol || activeFloor !== currentFloor) {
                addResultSubtotal(currentFloor + " 小計", floorSubtotals, "#f1f5f9"); // 階ごとの小計
                floorSubtotals = { dl: 0, ll: 0, eq: 0 };
            }
            if (activeSymbol !== currentSymbol) {
                addResultSubtotal("【" + currentSymbol + "】最下階 基礎荷重合計", symbolTotals, "#fef3c7"); // 符号ごとの合計
                symbolTotals = { dl: 0, ll: 0, eq: 0 };
            }
        }

        isFirst = false;
        currentSymbol = activeSymbol;
        currentFloor = activeFloor;

        // マスタに基づいて荷重を計算
        const { dl_po, ll_po, eq_po } = calculatePo(item, unitLoad, area);

        // 行の出力
        addResultRow(activeSymbol, activeFloor, item, unitLoad, area, dl_po, ll_po, eq_po);

        // 集計に加算
        floorSubtotals.dl += dl_po;
        floorSubtotals.ll += ll_po;
        floorSubtotals.eq += eq_po;
        symbolTotals.dl += dl_po;
        symbolTotals.ll += ll_po;
        symbolTotals.eq += eq_po;
    });

    // 最後のブロックの小計・合計を出力
    if (!isFirst) {
        addResultSubtotal(currentFloor + " 小計", floorSubtotals, "#f1f5f9");
        addResultSubtotal("【" + currentSymbol + "】最下階 基礎荷重合計", symbolTotals, "#fef3c7");
    }

    // PDFエリアを表示してスクロール
    const wrapper = document.getElementById('pdf-wrapper');
    wrapper.style.display = 'block';
    wrapper.scrollIntoView({ behavior: 'smooth' });
}

// --- 荷重計算関数（マスタから引く） ---
function calculatePo(item, unitLoad, area) {
    const masterRows = document.querySelectorAll('#masterTable tbody tr');
    let ll = 0;
    let eq = 0;

    for (let tr of masterRows) {
        let kw = tr.querySelector('.m_kw').value.trim();
        let m_ll = parseFloat(tr.querySelector('.m_ll').value) || 0;
        let m_eq = parseFloat(tr.querySelector('.m_eq').value) || 0;

        if (kw !== "" && item.includes(kw)) {
            ll = m_ll;
            eq = m_eq;
            break; // 最初に見つかったキーワードの条件を適用
        }
    }

    // 単位荷重がある場合のみ積載を引いて固定を算出
    let dl_unit = unitLoad > 0 ? (unitLoad - ll) : 0;
    if (dl_unit < 0) dl_unit = 0;

    return {
        dl_po: dl_unit * area,
        ll_po: ll * area,
        eq_po: eq * area
    };
}

// --- 審査用マスタ表のコピー ---
function copyMasterToPDF() {
    const pdfMasterBody = document.getElementById('pdfMasterBody');
    if (!pdfMasterBody) return;
    pdfMasterBody.innerHTML = '';
    document.querySelectorAll('#masterTable tbody tr').forEach(tr => {
        let kw = tr.querySelector('.m_kw').value.trim();
        let ll = tr.querySelector('.m_ll').value;
        let eq = tr.querySelector('.m_eq').value;
        if (kw) {
            const newTr = document.createElement('tr');
            newTr.innerHTML = `<td style="text-align:left; padding-left:12px;">${kw}</td><td>${ll}</td><td>${eq}</td>`;
            pdfMasterBody.appendChild(newTr);
        }
    });
}

// --- 結果行の生成 ---
function addResultRow(symbol, floor, item, unitLoad, area, dl, ll, eq) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="font-weight:600;">${symbol}</td>
        <td>${floor}</td>
        <td style="text-align:left; padding-left:10px;">${item}</td>
        <td>${unitLoad === 0 ? '' : unitLoad.toFixed(3)}</td>
        <td>${area === 0 ? '' : area.toFixed(3)}</td>
        <td>${dl.toFixed(3)}</td>
        <td>${ll.toFixed(3)}</td>
        <td>${eq.toFixed(3)}</td>
    `;
    document.getElementById('resultTableBody').appendChild(tr);
}

function addResultSubtotal(label, totals, bgColor) {
    const tr = document.createElement('tr');
    tr.style.backgroundColor = bgColor;
    tr.style.fontWeight = "bold";
    tr.innerHTML = `
        <td colspan="5" style="text-align:right; padding-right:15px;">${label}</td>
        <td>${totals.dl.toFixed(3)}</td>
        <td>${totals.ll.toFixed(3)}</td>
        <td>${totals.eq.toFixed(3)}</td>
    `;
    document.getElementById('resultTableBody').appendChild(tr);
}

// --- PDF出力（印刷ダイアログ連携） ---
function downloadPDF() {
    // 既存共通ヘッダー（GlobalInfo）の印刷情報更新
    if (typeof GlobalInfo !== 'undefined' && GlobalInfo.updatePrintHeader) {
        GlobalInfo.updatePrintHeader();
    }
    window.print();
}
