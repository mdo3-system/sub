// =========================================
// WRC造 一括検定シミュレータ (wrc_simulator.js)
// HOUSE-WL完全互換版 / AIJ規準短期割増(×1.5)適用
// =========================================

const REBAR_AREA = {
    '10': 71.33,
    '13': 126.7,
    '16': 198.6,
    '19': 286.5,
    '22': 387.1,
    '25': 506.7
};

let extractedBeams = [];
let userStates = [];
let currentIndex = 0;
let base64Image = "";
let mimeType = "";

// モーダル開閉
function openW6029Modal() {
    const modal = document.getElementById('w6029_modal');
    if (modal) modal.style.display = 'flex';
}

function closeW6029Modal(event) {
    const modal = document.getElementById('w6029_modal');
    if (!modal) return;
    if (event && event.target !== modal && event.type === 'click') return;
    modal.style.display = 'none';
}

// 初期化
window.addEventListener('DOMContentLoaded', () => {
    // 共通キーまたは旧個別キーから読み込み
    const savedApiKey = localStorage.getItem('struct_gemini_api_key') || localStorage.getItem('gemini_api_key_wrc');
    if (savedApiKey) {
        localStorage.setItem('struct_gemini_api_key', savedApiKey);
        const keyInput = document.getElementById('api_key');
        if (keyInput) {
            keyInput.value = savedApiKey;
            fetchModels();
        }
    }

    const fileInput = document.getElementById('file_input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
});

// Geminiモデル一覧取得
async function fetchModels() {
    const apiKeyEl = document.getElementById('api_key');
    if (!apiKeyEl) return;
    const apiKey = apiKeyEl.value.trim();
    if (!apiKey) return;

    const select = document.getElementById('api_model');
    if (!select) return;
    select.innerHTML = '<option value="">通信中...</option>';

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        select.innerHTML = '';
        let models = data.models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'));
        models.sort((a, b) => b.name.localeCompare(a.name));

        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.name;
            opt.text = m.displayName || m.name.replace('models/', '');
            if (m.name === 'models/gemini-1.5-flash') opt.selected = true;
            else if (!select.value && m.name.includes('1.5')) opt.selected = true;
            select.appendChild(opt);
        });

        if (select.options.length === 0) {
            select.innerHTML = '<option value="">利用可能なモデルなし</option>';
        } else {
            localStorage.setItem('struct_gemini_api_key', apiKey);
            updateAgent(`APIキーの認証に成功しました。<br>左側のエリアに計算書画像をアップロードしてください。`);
        }
    } catch (err) {
        console.error(err);
        select.innerHTML = '<option value="">取得失敗</option>';
        alert("モデルリストの取得に失敗しました。APIキーを確認してください。詳細: " + err.message);
    }
}

// ファイル選択時の処理
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const apiKey = document.getElementById('api_key').value.trim();
    const selectedModel = document.getElementById('api_model').value;

    if (!apiKey || !selectedModel) {
        alert("右上の「🔄 取得」ボタンを押して、APIキーの検証とモデルの取得を完了させてください。");
        return;
    }

    mimeType = file.type;
    const reader = new FileReader();
    reader.onload = async function(evt) {
        base64Image = evt.target.result;
        document.getElementById('scanned_image').src = base64Image;
        document.getElementById('drop_zone').style.display = 'none';
        document.getElementById('image_viewer').style.display = 'block';

        const loader = document.getElementById('loader_container');
        if (loader) loader.style.display = 'flex';
        updateAgent(`長期および短期(地震時)の応力を一括抽出しています...`);

        try {
            await extractErrorsWithGemini(base64Image.split(',')[1], mimeType, apiKey, selectedModel);
            if (loader) loader.style.display = 'none';
            startSimulation();
        } catch (error) {
            if (loader) loader.style.display = 'none';
            document.getElementById('drop_zone').style.display = 'flex';
            document.getElementById('image_viewer').style.display = 'none';
            alert("AIの解析に失敗しました。詳細: " + error.message);
            updateAgent(`エラーが発生しました。画像の画質を上げるか、別のモデルを選択して再度お試しください。`);
        }
    };
    reader.readAsDataURL(file);
}

// Gemini APIに画像を送信して応力データを抽出
async function extractErrorsWithGemini(base64Data, mimeType, apiKey, modelName) {
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;

    const prompt = `この画像は建築の構造計算書（WRC造またはRC造の梁の断面計算結果）です。表の中から、曲げ設計やせん断設計の「判定」列に「NG」が一つでもある「梁（符号と位置）」をすべて見つけてください。
見つけた梁（符号ごと）について、同じ列にある「左端」「中央」「右端」の3部位すべての応力データを抽出し、以下のJSON形式の配列のみを出力してください。マークダウンや説明文は一切含めないでください。
注意点：
・「ML」行から各部位の数値を1つだけ抽出してください。
・「MS」行には上段と下段の2つの数値があります。「上」の数値を msTop、「下」の数値を msBot として両方抽出してください。
・「Qd」(または「QS」)行に「LR」と「RL」の2段がある場合は、「LR」の数値を qdLR、「RL」の数値を qdRL として抽出してください。1段しかない場合は qd に数値を入れ、qdLRとqdRLは0.0にしてください。
[
    {
        "sign": "梁の符号と位置 (例: FG1 X4フレーム 1F層 Y3軸 No.1)", 
        "b": 梁幅bの数値 (単位cmの場合は必ず10倍してmmにする。例: 18.00 -> 180),
        "D": 梁成Dの数値 (単位cmの場合は必ず10倍してmmにする。例: 40.00 -> 400),
        "forces": {
            "left": {
                "ml": 左端の「ML」行の数値 (無ければ0.0),
                "msTop": 左端の「MS」行の「上」の数値 (無ければ0.0),
                "msBot": 左端の「MS」行の「下」の数値 (無ければ0.0),
                "ql": 左端の「QL」行の数値 (無ければ0.0),
                "qd": 左端の「Qd」または「QS」行の数値 (1段の場合),
                "qdLR": 左端の「Qd」または「QS」行の「LR」の数値,
                "qdRL": 左端の「Qd」または「QS」行の「RL」の数値
            },
            "center": {
                "ml": 中央の「ML」行の数値 (無ければ0.0),
                "msTop": 中央の「MS」行の「上」の数値 (無ければ0.0),
                "msBot": 中央の「MS」行の「下」の数値 (無ければ0.0),
                "ql": 中央の「QL」行の数値 (無ければ0.0),
                "qd": 中央の「Qd」または「QS」行の数値 (1段の場合),
                "qdLR": 中央の「Qd」または「QS」行の「LR」の数値,
                "qdRL": 中央の「Qd」または「QS」行の「RL」の数値
            },
            "right": {
                "ml": 右端の「ML」行の数値 (無ければ0.0),
                "msTop": 右端の「MS」行の「上」の数値 (無ければ0.0),
                "msBot": 右端の「MS」行の「下」の数値 (無ければ0.0),
                "ql": 右端の「QL」行の数値 (無ければ0.0),
                "qd": 右端の「Qd」または「QS」行の数値 (1段の場合),
                "qdLR": 右端の「Qd」または「QS」行の「LR」の数値,
                "qdRL": 右端の「Qd」または「QS」行の「RL」の数値
            }
        }
    }
]`;

    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64Data } }
            ]
        }]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "API request failed");
    }

    const result = await response.json();
    let rawText = result.candidates[0].content.parts[0].text;

    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    extractedBeams = JSON.parse(rawText);

    if (!Array.isArray(extractedBeams) || extractedBeams.length === 0) {
        throw new Error("画像からNGの梁を検出できませんでした。");
    }
}

// シミュレーション開始
function startSimulation() {
    userStates = extractedBeams.map((beam) => ({
        type: beam.sign.includes('FG') ? 'FG' : 'G',
        b: parseFloat(beam.b) || 180,
        D: parseFloat(beam.D) || 400,
        Fc: 21,
        t1q: 2, t1d: '13', t2q: 0, t2d: '13',
        b1q: 2, b1d: '13', b2q: 0, b2d: '13',
        sDia: '10', sPitch: '200',
        isCleared: false
    }));

    document.getElementById('nav_bar').style.display = 'flex';
    document.getElementById('workspace').style.display = 'block';

    currentIndex = 0;
    initProgressDots();
    loadBeamData(0);
}

function initProgressDots() {
    const container = document.getElementById('progress_dots');
    container.innerHTML = '';
    for (let i = 0; i < extractedBeams.length; i++) {
        const dot = document.createElement('div');
        dot.className = 'wrc-dot ng';
        dot.id = 'dot_' + i;
        dot.onclick = () => jumpToError(i);
        dot.title = extractedBeams[i].sign;
        container.appendChild(dot);
    }
}

function updateProgressDots() {
    for (let i = 0; i < extractedBeams.length; i++) {
        const dot = document.getElementById('dot_' + i);
        if (!dot) continue;
        if (i === currentIndex) dot.classList.add('active');
        else dot.classList.remove('active');

        if (userStates[i].isCleared) dot.classList.replace('ng', 'ok');
        else dot.classList.replace('ok', 'ng');
    }

    const allCleared = userStates.every(s => s.isCleared);
    const btnExport = document.getElementById('btn_export');
    if (btnExport) {
        if (allCleared) {
            btnExport.style.display = 'inline-flex';
            updateAgent(`🎉 <b>全梁クリア達成！</b><br>お見事です！抽出された ${extractedBeams.length} 本の梁すべてで一括配筋が成立しました。右上の「A4タテ PDF出力」から報告書を作成してください。`);
        } else {
            btnExport.style.display = 'none';
        }
    }
}

function changeError(dir) {
    jumpToError(currentIndex + dir);
}

function jumpToError(index) {
    if (index < 0 || index >= extractedBeams.length) return;
    currentIndex = index;
    loadBeamData(currentIndex);
}

function loadBeamData(index) {
    const beam = extractedBeams[index];
    const state = userStates[index];

    document.getElementById('nav_title').innerText = `解析梁 ${index + 1} / ${extractedBeams.length}: ${beam.sign}`;
    document.getElementById('btn_prev').disabled = (index === 0);
    document.getElementById('btn_next').disabled = (index === extractedBeams.length - 1);

    document.getElementById('val_type').value = state.type;
    document.getElementById('val_b').value = state.b;
    document.getElementById('val_D').value = state.D;
    document.getElementById('val_Fc').value = state.Fc;
    document.getElementById('top1_qty').value = state.t1q;
    document.getElementById('top1_dia').value = state.t1d;
    document.getElementById('top2_qty').value = state.t2q;
    document.getElementById('top2_dia').value = state.t2d;
    document.getElementById('bot1_qty').value = state.b1q;
    document.getElementById('bot1_dia').value = state.b1d;
    document.getElementById('bot2_qty').value = state.b2q;
    document.getElementById('bot2_dia').value = state.b2d;
    document.getElementById('stirrup_dia').value = state.sDia;
    document.getElementById('stirrup_pitch').value = state.sPitch;

    if (state.isCleared) {
        updateAgent(`この梁は既に<b>全断面クリア済（OK）</b>です。「次の梁へ」進んでください。`);
    } else {
        updateAgent(`<b>解析結果 ${index+1}: ${beam.sign}</b><br>
        コンクリート強度(Fc)や断面寸法、または複筋（上端・下端の両方の鉄筋）を利用して、すべてのエラーを解消してください。`);
    }

    performCalculation(false);
}

function updateAgent(text) {
    const dialog = document.getElementById('agent_dialog');
    if (!dialog) return;
    dialog.style.opacity = '0';
    setTimeout(() => {
        dialog.innerHTML = text;
        dialog.style.opacity = '1';
    }, 200);
}

// 鉄筋あき寸法チェック
function checkClearance(qty1, diaStr1, qty2, diaStr2, b) {
    const getReqW = (qty, diaStr) => {
        const dia = parseInt(diaStr);
        if (qty <= 0) return 0;
        return 100 + (qty * dia) + ((qty - 1) * 25);
    };
    const reqMax = Math.max(getReqW(qty1, diaStr1), getReqW(qty2, diaStr2));
    return { ok: b >= reqMax, req: reqMax };
}

function updateCalc() {
    saveState();
    performCalculation(true);
}

function saveState() {
    const state = userStates[currentIndex];
    state.type = document.getElementById('val_type').value;
    state.b = parseFloat(document.getElementById('val_b').value) || 180;
    state.D = parseFloat(document.getElementById('val_D').value) || 400;
    state.Fc = parseInt(document.getElementById('val_Fc').value) || 21;
    state.t1q = parseInt(document.getElementById('top1_qty').value) || 0;
    state.t1d = document.getElementById('top1_dia').value;
    state.t2q = parseInt(document.getElementById('top2_qty').value) || 0;
    state.t2d = document.getElementById('top2_dia').value;
    state.b1q = parseInt(document.getElementById('bot1_qty').value) || 0;
    state.b1d = document.getElementById('bot1_dia').value;
    state.b2q = parseInt(document.getElementById('bot2_qty').value) || 0;
    state.b2d = document.getElementById('bot2_dia').value;
    state.sDia = document.getElementById('stirrup_dia').value;
    state.sPitch = document.getElementById('stirrup_pitch').value;
}

// 鉄筋材質許容応力度
function getFt(diaStr) {
    const dia = parseInt(diaStr);
    if (dia >= 16) return 215; // SD345
    return 195; // SD295
}

// 曲げ耐力算定 (AIJ式・単筋/複筋)
function getBendingCapacity(At, Ac, dt, dc, b, D, Fc, ft_long, isShortTerm) {
    if (At === 0) return { mal: 0, isLimit: false, pt: 0 };
    const n = 15;

    const multiplier = isShortTerm ? 1.5 : 1.0;
    const fc_allow = (Fc / 3) * multiplier;
    const ft_allow = ft_long * multiplier;

    const d = D - dt;
    const pt = At / (b * d);

    const A_term = n * (At + Ac);
    const B_term = 2 * b * n * (At * d + Ac * dc);
    const x = (-A_term + Math.sqrt(Math.pow(A_term, 2) + B_term)) / b;

    let Cs = 0;
    if (x > dc) Cs = Ac * n * fc_allow * (x - dc) / x;
    const Cc = 0.5 * fc_allow * b * x;
    const Mc = (Cc * (d - x / 3) + Cs * (d - dc)) / 1000000;

    const j = 1 - x / (3 * d);
    const Mt = (At * ft_allow * j * d) / 1000000;

    return {
        mal: Math.min(Mc, Mt),
        isLimit: Mc < Mt,
        pt: pt * 100
    };
}

// 1部位（左端/中央/右端）の算定処理
function processCol(pos, reqForces, state, b, D, topClear, botClear) {
    const reqMlTop = Math.abs(parseFloat(reqForces.ml) || 0);
    const reqMlBot = Math.abs(parseFloat(reqForces.ml) || 0);

    const reqMsTopRaw = Math.abs(parseFloat(reqForces.msTop) || 0);
    const reqMsBotRaw = Math.abs(parseFloat(reqForces.msBot) || 0);
    const reqMs = Math.max(reqMsTopRaw, reqMsBotRaw);
    const reqMsTop = reqMs;
    const reqMsBot = reqMs;

    const reqQl = Math.abs(parseFloat(reqForces.ql) || 0);
    const rawQd = Math.abs(parseFloat(reqForces.qd) || 0);
    const rawQdLR = Math.abs(parseFloat(reqForces.qdLR) || 0);
    const rawQdRL = Math.abs(parseFloat(reqForces.qdRL) || 0);
    const reqQd = Math.max(rawQd, rawQdLR, rawQdRL);

    const isNoForce = (reqMlTop === 0 && reqMlBot === 0 && reqMsTop === 0 && reqMsBot === 0 && reqQl === 0 && reqQd === 0);

    const Fc = state.Fc;
    const fs_long = Fc / 30;

    const a_t1 = state.t1q * (REBAR_AREA[state.t1d] || 0);
    const a_t2 = state.t2q * (REBAR_AREA[state.t2d] || 0);
    const atTop = a_t1 + a_t2;

    const a_b1 = state.b1q * (REBAR_AREA[state.b1d] || 0);
    const a_b2 = state.b2q * (REBAR_AREA[state.b2d] || 0);
    const atBot = a_b1 + a_b2;

    let ftTopL = 195;
    if (atTop > 0) {
        ftTopL = (a_t1 * getFt(state.t1d) + a_t2 * getFt(state.t2d)) / atTop;
    }

    let ftBotL = 195;
    if (atBot > 0) {
        ftBotL = (a_b1 * getFt(state.b1d) + a_b2 * getFt(state.b2d)) / atBot;
    }

    const isFG = state.type === 'FG';
    const dtTopBase = 40 + 10 + parseInt(state.t1d)/2;
    const dtBotBase = (isFG ? 70 : 40) + 10 + parseInt(state.b1d)/2;

    const dtTop = atTop > 0 ? ((a_t1*dtTopBase + a_t2*(dtTopBase+40)) / atTop) : dtTopBase;
    const dtBot = atBot > 0 ? ((a_b1*dtBotBase + a_b2*(dtBotBase+40)) / atBot) : dtBotBase;

    const topResLong = getBendingCapacity(atTop, atBot, dtTop, dtBot, b, D, Fc, ftTopL, false);
    const topResShort = getBendingCapacity(atTop, atBot, dtTop, dtBot, b, D, Fc, ftTopL, true);
    const isMalTopOk = isNoForce || Number(topResLong.mal) >= reqMlTop;
    const isMasTopOk = isNoForce || Number(topResShort.mal) >= reqMsTop;
    const isPtTopOk = isNoForce || topResLong.pt >= 0.40;

    const botResLong = getBendingCapacity(atBot, atTop, dtBot, dtTop, b, D, Fc, ftBotL, false);
    const botResShort = getBendingCapacity(atBot, atTop, dtBot, dtTop, b, D, Fc, ftBotL, true);
    const isMalBotOk = isNoForce || Number(botResLong.mal) >= reqMlBot;
    const isMasBotOk = isNoForce || Number(botResShort.mal) >= reqMsBot;
    const isPtBotOk = isNoForce || botResLong.pt >= 0.40;

    const aw = (REBAR_AREA[state.sDia] || 0) * 2;
    const sPitch = parseInt(state.sPitch) || 200;
    const j_shear = (7/8) * (D - 40);

    const Qal = (b * j_shear * fs_long) / 1000;
    const isQalOk = isNoForce || Number(Qal) >= reqQl;

    const Qas = (Qal * 1.5) + (0.5 * aw * 295 * j_shear / sPitch) / 1000;
    const isQasOk = isNoForce || Number(Qas) >= reqQd;

    const pw = (b > 0 && sPitch > 0) ? (aw / (b * sPitch)) * 100 : 0;
    const isPwOk = isNoForce || pw >= 0.20;
    const maxPitch = Math.min(D / 2, 250);
    const isPitchOk = isNoForce || sPitch <= maxPitch;

    const updateBadge = (id, text, ok) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerText = text;
            el.className = 'wrc-status-badge ' + (isNoForce ? 'wrc-bg-none' : (ok ? 'wrc-bg-ok' : 'wrc-bg-ng'));
        }
    };
    const setBar = (id, val, target, isOk) => {
        const scale = Math.max(val, target, 50) * 1.15;
        const elBar = document.getElementById('bar_' + id);
        const elTar = document.getElementById('target_' + id);
        if (elBar) {
            elBar.style.width = Math.min((val/scale)*100, 100) + '%';
            elBar.style.background = isNoForce ? '#cbd5e1' : (isOk ? 'var(--success)' : 'var(--danger)');
        }
        if (elTar) elTar.style.left = (target/scale*100) + '%';
    };

    // 上端描画
    updateBadge(`badge_pt_top_${pos}`, 'Pt', isPtTopOk);
    updateBadge(`badge_mal_top_${pos}`, 'Mal', isMalTopOk);
    updateBadge(`badge_mas_top_${pos}`, 'Mas', isMasTopOk);
    setBar(`mal_top_${pos}`, topResLong.mal, reqMlTop, isMalTopOk);
    setBar(`mas_top_${pos}`, topResShort.mal, reqMsTop, isMasTopOk);
    document.getElementById(`meta_mal_top_${pos}`).innerHTML = `応力: ${reqMlTop.toFixed(1)} / 耐力: ${topResLong.mal.toFixed(1)} (Pt: ${topResLong.pt.toFixed(2)}%)`;
    document.getElementById(`meta_mas_top_${pos}`).innerHTML = `応力: ${reqMsTop.toFixed(1)} / 耐力: ${topResShort.mal.toFixed(1)}`;
    document.getElementById(`limit_top_${pos}`).style.display = (!isNoForce && topResLong.isLimit && !isMalTopOk) ? 'block' : 'none';

    // 下端描画
    updateBadge(`badge_pt_bot_${pos}`, 'Pt', isPtBotOk);
    updateBadge(`badge_mal_bot_${pos}`, 'Mal', isMalBotOk);
    updateBadge(`badge_mas_bot_${pos}`, 'Mas', isMasBotOk);
    setBar(`mal_bot_${pos}`, botResLong.mal, reqMlBot, isMalBotOk);
    setBar(`mas_bot_${pos}`, botResShort.mal, reqMsBot, isMasBotOk);
    document.getElementById(`meta_mal_bot_${pos}`).innerHTML = `応力: ${reqMlBot.toFixed(1)} / 耐力: ${botResLong.mal.toFixed(1)} (Pt: ${botResLong.pt.toFixed(2)}%)`;
    document.getElementById(`meta_mas_bot_${pos}`).innerHTML = `応力: ${reqMsBot.toFixed(1)} / 耐力: ${botResShort.mal.toFixed(1)}`;
    document.getElementById(`limit_bot_${pos}`).style.display = (!isNoForce && botResLong.isLimit && !isMalBotOk) ? 'block' : 'none';

    // せん断描画
    updateBadge(`badge_pw_${pos}`, 'Pw', isPwOk);
    updateBadge(`badge_pitch_${pos}`, '間隔', isPitchOk);
    updateBadge(`badge_qal_${pos}`, 'Qal', isQalOk);
    updateBadge(`badge_qas_${pos}`, 'Qas', isQasOk);
    setBar(`qal_${pos}`, Qal, reqQl, isQalOk);
    setBar(`qas_${pos}`, Qas, reqQd, isQasOk);
    document.getElementById(`meta_qal_${pos}`).innerHTML = `応力: ${reqQl.toFixed(1)} / 耐力: ${Qal.toFixed(1)}`;
    document.getElementById(`meta_qas_${pos}`).innerHTML = `応力: ${reqQd.toFixed(1)} / 耐力: ${Qas.toFixed(1)} <br>Pw: ${pw.toFixed(2)}% | 上限: ${maxPitch}mm`;

    return isNoForce || (isPtTopOk && isMalTopOk && isMasTopOk && isPtBotOk && isMalBotOk && isMasBotOk && isQalOk && isQasOk && isPwOk && isPitchOk);
}

// 全体計算実行
function performCalculation(showClearMessage) {
    const beam = extractedBeams[currentIndex];
    const state = userStates[currentIndex];
    const b = state.b;
    const D = state.D;

    const topClear = checkClearance(state.t1q, state.t1d, state.t2q, state.t2d, b);
    const elTopC = document.getElementById('top_clearance');
    elTopC.className = 'wrc-clearance-box ' + (topClear.ok ? 'wrc-clearance-ok' : 'wrc-clearance-ng');
    elTopC.innerText = topClear.ok ? `梁幅への納まり: OK (${topClear.req}mm ≦ ${b}mm)` : `梁幅への納まり: NG (${topClear.req}mm > ${b}mm)`;

    const botClear = checkClearance(state.b1q, state.b1d, state.b2q, state.b2d, b);
    const elBotC = document.getElementById('bot_clearance');
    elBotC.className = 'wrc-clearance-box ' + (botClear.ok ? 'wrc-clearance-ok' : 'wrc-clearance-ng');
    elBotC.innerText = botClear.ok ? `梁幅への納まり: OK (${botClear.req}mm ≦ ${b}mm)` : `梁幅への納まり: NG (${botClear.req}mm > ${b}mm)`;

    const isLeftOk = processCol('left', beam.forces.left, state, b, D, topClear, botClear);
    const isCenterOk = processCol('center', beam.forces.center, state, b, D, topClear, botClear);
    const isRightOk = processCol('right', beam.forces.right, state, b, D, topClear, botClear);

    const currentlyCleared = topClear.ok && botClear.ok && isLeftOk && isCenterOk && isRightOk;
    const newlyCleared = currentlyCleared && !state.isCleared;

    state.isCleared = currentlyCleared;
    updateProgressDots();

    if (showClearMessage && newlyCleared) {
        updateAgent(`🎉 <b>お見事です！</b> 梁 ${beam.sign} の全断面が、長期・短期応力ともに1つの配筋でクリアできました。`);
    }
}

function formatRebar(qty1, dia1, qty2, dia2) {
    let parts = [];
    if (qty1 > 0) parts.push(`${qty1}-D${dia1}`);
    if (qty2 > 0) parts.push(`${qty2}-D${dia2}`);
    return parts.length > 0 ? parts.join('<br>+ ') : 'なし';
}

// 印刷・PDF出力
function exportPDF() {
    // 既存共通ヘッダー（GlobalInfo）の印刷情報更新
    if (typeof GlobalInfo !== 'undefined' && GlobalInfo.updatePrintHeader) {
        GlobalInfo.updatePrintHeader();
    }

    const now = new Date();
    const dateStr = `作成日: ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    const printDateEl = document.getElementById('print_date');
    if (printDateEl) printDateEl.innerText = dateStr;

    const tbody = document.getElementById('print_tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    for (let i = 0; i < extractedBeams.length; i++) {
        const data = extractedBeams[i];
        const state = userStates[i];

        const topStr = formatRebar(state.t1q, state.t1d, state.t2q, state.t2d);
        const botStr = formatRebar(state.b1q, state.b1d, state.b2q, state.b2d);
        const stirrupStr = `D${state.sDia} @ ${state.sPitch}`;

        const badgeClass = state.isCleared ? 'wrc-print-badge wrc-print-ok' : 'wrc-print-badge wrc-print-ng';
        const badgeText = state.isCleared ? 'OK' : 'NG';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:left; font-weight:bold;">${data.sign}</td>
            <td>${state.b} × ${state.D}</td>
            <td>${topStr}</td>
            <td>${botStr}</td>
            <td>${stirrupStr}</td>
            <td><span class="${badgeClass}">${badgeText}</span></td>
        `;
        tbody.appendChild(tr);
    }

    window.print();
}
