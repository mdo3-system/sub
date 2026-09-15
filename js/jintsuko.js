const BAR_MASTER = { "D10":{area:71.0}, "D13":{area:126.7}, "D16":{area:198.6}, "D19":{area:286.5}, "D13+D16":{area:325.3} };
const COVER_MM = 70;
const LFs = 195;
const REQUIRED_FIELDS_M = ["posA","posB","posC", "slab_t", "n_bars", "bar_type", "m_L_mid", "m_L_end", "m_S_LD_L", "m_S_LD_R", "m_S_RU_L", "m_S_RU_R"];
const REQUIRED_FIELDS_Q = ["b_width", "q_L", "q_S_L", "q_S_R"];

let openings = [];
let rawPdfText = "";
let excelRowsData = [];
let extractSource = ""; 

function project() {
    return {
        project: (document.getElementById("g_project")?.value || document.getElementById("p_project")?.value || "").trim(),
        date: (document.getElementById("g_date")?.value || document.getElementById("p_date")?.value || "").trim(),
        engineer: (document.getElementById("g_engineer")?.value || document.getElementById("p_engineer")?.value || "").trim(),
        fc: document.getElementById("p_fc")?.value.trim() || "21",
        note: document.getElementById("p_note")?.value.trim() || "",
    };
}

function newOpening() {
    return {
        id: crypto.randomUUID(), posA: "", posB: "", posC: "", slab_t: "150", n_bars: "2", bar_type: "D13",
        m_L_mid: "", m_L_end: "", m_S_LD_L: "", m_S_LD_R: "", m_S_RU_L: "", m_S_RU_R: "",
        enable_shear: false, b_width: "450", q_L: "", q_S_L: "", q_S_R: "",
        input_complete: false, judgement: "NA", rmax: null, governing: "",
        LMa: null, SMa: null, As: null, j: null, LQa: null, SQa: null, ratios: null, abs_used_any: false
    };
}

function isFilled(v) { return v !== null && v !== undefined && String(v).trim() !== ""; }
function toNumberOrNull(v) { if (!isFilled(v)) return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
function abs(n) { return n < 0 ? -n : n; }
function getDocumentTitle() {
    const hasShear = openings.some(o => o.enable_shear === true || o.enable_shear === "true");
    return hasShear ? "人通口補強計算書（スラブ内割増筋 ＋ せん断）" : "人通口補強計算書（スラブ内割増筋）";
}

function updateSourceDisplay(source, text, color) {
    extractSource = source;
    const msg = document.getElementById('loading_msg');
    if (msg) {
        msg.innerHTML = `優先ソース: <span style="color:${color}">${text}</span>`;
        msg.style.borderColor = color;
    }
}

window.executeExtraction = function() {
    if (extractSource === "EXCEL") _fromExcel();
    else if (extractSource === "PDF") _fromPdf();
    else alert("先にPDFまたはExcelを読み込んでください。");
};

function _fromExcel() {
    if (excelRowsData.length === 0) return alert("Excelデータがありません。");
    const line = document.getElementById('target_line').value.trim();
    const s = document.getElementById('target_start').value.trim();
    const e = document.getElementById('target_end').value.trim();
    if (!line || !s || !e) return alert("抽出スパンの「通り芯」と「始点・終点」をすべて入力してください。");
    
    const targetSpan = `${s}-${e}`;
    const targetSpanRev = `${e}-${s}`;
    let currentLine = ""; let section = "";
    let ms = ["", "", "", "", "", ""], qs = ["", "", ""];
    let fL = false, fS = false;

    for (let r = 0; r < excelRowsData.length; r++) {
        const row = excelRowsData[r];
        if (!row || row.length === 0) continue;
        const rowStr = row.join('');
        if (rowStr.includes('通り')) {
            if (rowStr.includes(line + '通り')) currentLine = line;
            else currentLine = "";
        }
        if (currentLine !== line) continue;
        if (rowStr.includes('応力の算定 (長期)')) { section = "長期"; continue; }
        if (rowStr.includes('応力の算定 (短期)')) { section = "短期"; continue; }
        if (rowStr.includes('判定') || rowStr.includes('OK') || rowStr.includes('NG') || rowStr.includes('水平荷重') || rowStr.includes('許容耐力')) {
            section = ""; continue;
        }
        const col0 = String(row[0] || "").trim();
        if (section && (col0 === targetSpan || col0 === targetSpanRev)) {
            let nums = [];
            for (let i = 1; i < row.length; i++) {
                if (row[i] !== undefined && row[i] !== null && String(row[i]).trim() !== "") {
                    const val = parseFloat(row[i]);
                    if (!isNaN(val)) nums.push(val);
                }
            }
            if (section === "長期" && !fL && nums.length >= 6) {
                ms[0] = nums[3]; ms[1] = nums[4]; qs[0] = nums[5]; fL = true;
            } else if (section === "短期" && !fS && nums.length >= 4) {
                ms[2] = nums[0]; ms[3] = nums[1];
                if (nums.length >= 6) { qs[1] = nums[2]; ms[4] = nums[3]; ms[5] = nums[4]; qs[2] = nums[5]; }
                else { ms[4] = nums[2]; ms[5] = nums[3]; }
                fS = true;
            }
        }
    }
    if (!fL && !fS) return alert(`「${line}通り ${s}-${e}間」のデータが見つかりませんでした。`);
    _addExtractedCard(line, s, e, ms, qs);
}

function _fromPdf() {
    if (!rawPdfText) return alert("PDFデータがありません。");
    const line = document.getElementById('target_line').value.trim();
    const spanStart = document.getElementById('target_start').value.trim();
    const spanEnd = document.getElementById('target_end').value.trim();
    if (!line || !spanStart || !spanEnd) return alert("抽出スパンをすべて入力してください。");
    const spanRegex = new RegExp(spanStart + "[\\s\\-~]*" + spanEnd, 'g');
    const numRegex = /[+-]?\d+\.\d{3}/g; 
    let extractedData = [];
    let startIndex = 0;
    while ((startIndex = rawPdfText.indexOf(line, startIndex)) !== -1) {
        let area = rawPdfText.substring(startIndex, startIndex + 8000);
        let match;
        while ((match = spanRegex.exec(area)) !== null) {
            let matchPosInArea = match.index;
            let absoluteMatchPos = startIndex + matchPosInArea;
            let isDuplicate = extractedData.some(d => Math.abs(d.pos - absoluteMatchPos) < 100);
            if (!isDuplicate) {
                let rowStart = matchPosInArea + match[0].length;
                let rowText = area.substring(rowStart, rowStart + 150);
                let nextSpanRegex = /(?:[A-Za-z\u4E00-\u9FFF][A-Za-z0-9]*[\s\-~]+[A-Za-z\u4E00-\u9FFF][A-Za-z0-9]*|[0-9]+[a-z]?\s*[\-~]+\s*[0-9]+[a-z]?)/;
                let nextMatch = rowText.match(nextSpanRegex);
                if (nextMatch) rowText = rowText.substring(0, nextMatch.index);
                let nums = rowText.match(numRegex);
                if (nums && nums.length >= 4) {
                    extractedData.push({ pos: absoluteMatchPos, nums: nums, context: rawPdfText.substring(Math.max(0, absoluteMatchPos - 8000), absoluteMatchPos) });
                }
            }
        }
        startIndex += line.length;
    }
    if (extractedData.length === 0) return alert(`データが見つかりませんでした。`);
    let extMs = ["", "", "", "", "", ""]; let extQs = ["", "", ""]; let foundL = false, foundS = false;
    extractedData.forEach(data => {
        let nums = data.nums; let ctx = data.context;
        let lastL = Math.max(ctx.lastIndexOf("長期"), ctx.lastIndexOf("長期 M中"));
        let lastS = Math.max(ctx.lastIndexOf("短期"), ctx.lastIndexOf("左加力"), ctx.lastIndexOf("右加力"));
        let lastTairyoku = Math.max(ctx.lastIndexOf("耐力"), ctx.lastIndexOf("検定"));
        if (lastTairyoku > lastL && lastTairyoku > lastS) return;
        let len = nums.length;
        if (lastS > lastL) {
            if (!foundS && len >= 5) {
                extMs[2] = parseFloat(nums[0]).toFixed(3); extMs[3] = parseFloat(nums[1]).toFixed(3); 
                extQs[1] = parseFloat(nums[2]).toFixed(3); extMs[4] = parseFloat(nums[3]).toFixed(3); extMs[5] = parseFloat(nums[4]).toFixed(3); 
                if (len >= 6) extQs[2] = parseFloat(nums[5]).toFixed(3); foundS = true;
            }
        } else {
            if (!foundL && len >= 4) {
                extMs[0] = parseFloat(nums[len - 3]).toFixed(3); extMs[1] = parseFloat(nums[len - 2]).toFixed(3); extQs[0] = parseFloat(nums[len - 1]).toFixed(3); foundL = true;
            }
        }
    });
    if (!foundL && !foundS) return alert("応力データが解析できませんでした。");
    _addExtractedCard(line, spanStart, spanEnd, extMs, extQs);
}

function _addExtractedCard(l, s, e, ms, qs) {
    let o = newOpening(); o.posA = l; o.posB = s; o.posC = e;
    o.m_L_mid = ms[0]; o.m_L_end = ms[1]; o.m_S_LD_L = ms[2]; o.m_S_LD_R = ms[3]; o.m_S_RU_L = ms[4]; o.m_S_RU_R = ms[5];
    o.q_L = qs[0]; o.q_S_L = qs[1]; o.q_S_R = qs[2];
    openings.push(o); mountCards(); window.updateAllCardsFc();
    setTimeout(() => { 
        const cards = document.querySelectorAll('.card');
        if (cards.length > 0) {
            const lastCard = cards[cards.length - 1];
            const headerHeight = document.getElementById('stickyArea')?.offsetHeight || 0;
            window.scrollTo({ top: lastCard.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20, behavior: 'smooth' });
            lastCard.style.boxShadow = "0 0 20px rgba(49, 130, 206, 0.6)";
            setTimeout(() => { lastCard.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)"; }, 1200);
        }
    }, 100);
}

window.updateAllCardsFc = function() {
    openings.forEach(o => { if (o.judgement !== "NA") computeOne(o); });
    mountCards(); window.updateGlobalControls();
};

function computeOne(o) {
    let isComplete = REQUIRED_FIELDS_M.every(k => isFilled(o[k]));
    let enable_shear = (o.enable_shear === true || o.enable_shear === "true");
    if (enable_shear && !REQUIRED_FIELDS_Q.every(k => isFilled(o[k]))) isComplete = false;
    o.input_complete = isComplete;
    if (!o.input_complete) { o.judgement = "NA"; return; }
    const slab_t = toNumberOrNull(o.slab_t); const n_bars = toNumberOrNull(o.n_bars); const bm = BAR_MASTER[String(o.bar_type || "")];
    const Ms = { "長期 M中": toNumberOrNull(o.m_L_mid), "長期 M端": toNumberOrNull(o.m_L_end), "短期 左(下) 左側": toNumberOrNull(o.m_S_LD_L), "短期 左(下) 右側": toNumberOrNull(o.m_S_LD_R), "短期 右(上) 左側": toNumberOrNull(o.m_S_RU_L), "短期 右(上) 右側": toNumberOrNull(o.m_S_RU_R) };
    const As = n_bars * bm.area; const j = (7/8) * (slab_t - COVER_MM);
    const LMa = (As * LFs * j) / 1_000_000; const SMa = (As * LFs * 1.5 * j) / 1_000_000;
    o.As = As; o.j = j; o.LMa = LMa; o.SMa = SMa;
    let rows = [ { label: "長期 M中", M: Ms["長期 M中"], denom: LMa }, { label: "長期 M端", M: Ms["長期 M端"], denom: LMa }, { label: "短期 M左(下) 左側", M: Ms["短期 左(下) 左側"], denom: SMa }, { label: "短期 M左(下) 右側", M: Ms["短期 左(下) 右側"], denom: SMa }, { label: "短期 M右(上) 左側", M: Ms["短期 右(上) 左側"], denom: SMa }, { label: "短期 M右(上) 右側", M: Ms["短期 右(上) 右側"], denom: SMa } ];
    if (enable_shear) {
        const b_width = toNumberOrNull(o.b_width); const Fc = toNumberOrNull(document.getElementById("p_fc").value) || 18;
        const fs = Fc / 30; const sfs = fs * 1.5; 
        const LQa = (b_width * j * fs) / 1000; const SQa = (b_width * j * sfs) / 1000; 
        o.LQa = LQa; o.SQa = SQa;
        rows.push({ label: "長期 Q_L", M: toNumberOrNull(o.q_L), denom: LQa });
        rows.push({ label: "短期 左加力 Q", M: toNumberOrNull(o.q_S_L), denom: SQa });
        rows.push({ label: "短期 右加力 Q", M: toNumberOrNull(o.q_S_R), denom: SQa });
    } else { o.LQa = null; o.SQa = null; }
    let maxR = -Infinity, maxLabel = ""; let absUsedAny = false;
    const ratioRows = rows.map(r => {
        const Mabs = abs(r.M); if (Mabs !== r.M) absUsedAny = true;
        const ratio = (r.denom && r.denom !== 0) ? (Mabs / r.denom) : null;
        if (ratio !== null && ratio > maxR) { maxR = ratio; maxLabel = r.label; }
        return { ...r, Mabs, ratio };
    });
    o.abs_used_any = absUsedAny; o.rmax = maxR; o.governing = maxLabel; o.ratios = ratioRows;
    o.judgement = (maxR > 1.0) ? "NG" : "OK";
}

function makeInput({id, label, type="text", step=null, placeholder=""}) {
    const wrap = document.createElement("div"); const l = document.createElement("label"); l.textContent = label; wrap.appendChild(l);
    const inp = document.createElement("input"); inp.type = type; inp.placeholder = placeholder; inp.dataset.field = id;
    if (step !== null) inp.step = step; wrap.appendChild(inp); return wrap;
}
function makeSelect({id, label, options}) {
    const wrap = document.createElement("div"); const l = document.createElement("label"); l.textContent = label; wrap.appendChild(l);
    const sel = document.createElement("select"); sel.dataset.field = id;
    for (const o of options) { const opt = document.createElement("option"); opt.value = o; opt.textContent = o; sel.appendChild(opt); }
    wrap.appendChild(sel); return wrap;
}

function renderCard(o, idx) {
    const card = document.createElement("div"); card.className = "card"; card.dataset.id = o.id;
    const h = document.createElement("div"); h.className = "row";
    const title = document.createElement("h3"); title.textContent = `人通口 No.${idx+1}`; h.appendChild(title);
    const right = document.createElement("div"); right.className = "row";
    const pill = document.createElement("span"); pill.className = "pill na"; pill.dataset.role = "pill"; pill.textContent = "判定待ち"; right.appendChild(pill);
    const btnDel = document.createElement("button"); btnDel.type = "button"; btnDel.textContent = "削除"; btnDel.style.padding = "4px 8px"; btnDel.style.background = "#e2e8f0"; btnDel.style.color = "#4a5568";
    btnDel.addEventListener("click", () => { openings = openings.filter(x => x.id !== o.id); mountCards(); window.updateGlobalControls(); });
    right.appendChild(btnDel); h.appendChild(right); card.appendChild(h);

    const gridBase = document.createElement("div"); gridBase.className = "grid";
    gridBase.appendChild(makeInput({id:"posA", label:"位置：通り芯", placeholder:"Y7"})); gridBase.appendChild(makeInput({id:"posB", label:"間（始点）", placeholder:"X6"})); gridBase.appendChild(makeInput({id:"posC", label:"間（終点）", placeholder:"X7"}));
    gridBase.appendChild(makeInput({id:"slab_t", label:"スラブ厚 (mm)", type:"number", step:"10", placeholder:"150"})); gridBase.appendChild(makeInput({id:"n_bars", label:"割増筋 本数", type:"number", step:"1", placeholder:"2"})); gridBase.appendChild(makeSelect({id:"bar_type", label:"割増筋 径", options:Object.keys(BAR_MASTER)}));
    card.appendChild(gridBase);

    const stressSec = document.createElement("div"); stressSec.className = "stress-section"; stressSec.innerHTML = `<div class="stress-section-title">設計曲げモーメント M (kN·m) ※抽出時は符号付きでセット</div>`;
    const gridStress = document.createElement("div"); gridStress.className = "grid"; gridStress.style.marginTop = "0";
    gridStress.appendChild(makeInput({id:"m_L_mid", label:"長期 M中", type:"number", step:"0.001"})); gridStress.appendChild(makeInput({id:"m_L_end", label:"長期 M端", type:"number", step:"0.001"}));
    gridStress.appendChild(makeInput({id:"m_S_LD_L", label:"短期 左(下) 左側", type:"number", step:"0.001"})); gridStress.appendChild(makeInput({id:"m_S_LD_R", label:"短期 左(下) 右側", type:"number", step:"0.001"})); gridStress.appendChild(makeInput({id:"m_S_RU_L", label:"短期 右(上) 左側", type:"number", step:"0.001"})); gridStress.appendChild(makeInput({id:"m_S_RU_R", label:"短期 右(上) 右側", type:"number", step:"0.001"}));
    stressSec.appendChild(gridStress); card.appendChild(stressSec);

    const toggleWrap = document.createElement("div"); toggleWrap.style.marginTop = "15px"; const chkId = `chk_${o.id}`;
    toggleWrap.innerHTML = `<label style="font-weight:bold; color:#dd6b20; cursor:pointer; display:flex; align-items:center; gap:5px;"><input type="checkbox" id="${chkId}" data-field="enable_shear" style="width:16px; height:16px;">せん断力（Q）の検定も同時に行う</label>`;
    card.appendChild(toggleWrap);

    const shearWrap = document.createElement("div"); shearWrap.className = "stress-section shear-inputs"; shearWrap.style.marginTop = "8px"; shearWrap.style.background = "#fffaf0"; shearWrap.style.borderColor = "#ed8936";
    shearWrap.innerHTML = `<div class="stress-section-title" style="color:#dd6b20; border-bottom-color:#fbd38d;">設計せん断力 Q (kN) および 基礎幅</div>`;
    const gridShear = document.createElement("div"); gridShear.className = "grid"; gridShear.style.marginTop = "0";
    gridShear.appendChild(makeInput({id:"b_width", label:"基礎幅 b (mm)", type:"number", step:"10", placeholder:"450"})); gridShear.appendChild(makeInput({id:"q_L", label:"長期 Q_L", type:"number", step:"0.001"})); gridShear.appendChild(makeInput({id:"q_S_L", label:"短期 左加力 Q", type:"number", step:"0.001"})); gridShear.appendChild(makeInput({id:"q_S_R", label:"短期 右加力 Q", type:"number", step:"0.001"}));
    shearWrap.appendChild(gridShear); card.appendChild(shearWrap);

    const btnCalc = document.createElement("button"); btnCalc.className = "btn-calc"; btnCalc.textContent = "▶ この箇所を計算・判定実行";
    btnCalc.addEventListener("click", () => {
        card.querySelectorAll("input[type='text'], input[type='number'], select").forEach(el => { o[el.dataset.field] = el.value; });
        o.enable_shear = card.querySelector(`[data-field="enable_shear"]`).checked;
        computeOne(o); updateCardComputed(card, o); window.updateGlobalControls();
    });
    card.appendChild(btnCalc);

    const res = document.createElement("div"); res.className = "res-footer";
    res.innerHTML = `<span><strong>As</strong>: <span data-role="As">-</span> mm²</span> <span><strong>j</strong>: <span data-role="j">-</span> mm</span> <span style="border-left:1px solid #cbd5e0; padding-left:10px;"><strong>許容 LMa</strong>: <span data-role="LMa">-</span> kN·m</span> <span><strong>許容 SMa</strong>: <span data-role="SMa">-</span> kN·m</span> <span class="shear-res" style="border-left:1px solid #cbd5e0; padding-left:10px;"><strong>許容 LQa</strong>: <span data-role="LQa">-</span> kN</span> <span class="shear-res"><strong>許容 SQa</strong>: <span data-role="SQa">-</span> kN</span> <span style="margin-left:auto; background:#fed7d7; padding:2px 8px; border-radius:4px;"><strong>最大検定比</strong>: <span data-role="rmax" class="val-hl">-</span> (<span data-role="gov" style="font-size:0.9em; color:#4a5568;">-</span>)</span>`;
    card.appendChild(res);

    card.querySelectorAll("input,select").forEach(el => {
        if(el.type === "checkbox") el.checked = o[el.dataset.field] === true || o[el.dataset.field] === "true"; else el.value = o[el.dataset.field] ?? "";
        el.addEventListener("input", () => { if(o.judgement !== "NA") { o.judgement = "NA"; updateCardComputed(card, o); window.updateGlobalControls(); } });
    });

    const chk = card.querySelector(`[data-field="enable_shear"]`);
    shearWrap.style.display = chk.checked ? "block" : "none";
    chk.addEventListener("change", (e) => { shearWrap.style.display = e.target.checked ? "block" : "none"; o.enable_shear = e.target.checked; window.updateGlobalControls(); });

    updateCardComputed(card, o); return card;
}

function updateCardComputed(card, o) {
    const pill = card.querySelector('[data-role="pill"]'); pill.className = "pill " + (o.judgement === "OK" ? "ok" : (o.judgement === "NG" ? "ng" : "na")); pill.textContent = (o.judgement === "OK") ? "OK" : ((o.judgement === "NG") ? "NG" : "判定待ち");
    const fnum = (n, d=2) => (n === null || n === undefined || !Number.isFinite(n)) ? "-" : n.toFixed(d);
    card.querySelector('[data-role="As"]').textContent = fnum(o.As, 1); card.querySelector('[data-role="j"]').textContent = fnum(o.j, 1);
    card.querySelector('[data-role="LMa"]').textContent = fnum(o.LMa, 2); card.querySelector('[data-role="SMa"]').textContent = fnum(o.SMa, 2);
    card.querySelectorAll('.shear-res').forEach(el => el.style.display = (o.enable_shear === true || o.enable_shear === "true") ? "inline" : "none");
    card.querySelector('[data-role="LQa"]').textContent = fnum(o.LQa, 2); card.querySelector('[data-role="SQa"]').textContent = fnum(o.SQa, 2);
    card.querySelector('[data-role="rmax"]').textContent = fnum(o.rmax, 3); card.querySelector('[data-role="gov"]').textContent = o.governing || "-";
}

function mountCards() { const wrap = document.getElementById("cards"); if(!wrap) return; wrap.innerHTML = ""; openings.forEach((o, i) => wrap.appendChild(renderCard(o, i))); }

window.recalculateAll = function() {
    openings.forEach(o => computeOne(o));
};

window.updateGlobalControls = function() {
    const gErr = document.getElementById("globalError"); const btnPrint = document.getElementById("btnPrint");
    const titleEl = document.getElementById("main_title"); if(titleEl) titleEl.textContent = getDocumentTitle();
    
    // 全件再計算
    window.recalculateAll();

    if (openings.length === 0) { 
        if(btnPrint) btnPrint.disabled = true; 
        if(gErr){ gErr.textContent = "カードを追加して計算を実行してください。"; gErr.style.color = "#e53e3e";} 
        const pagesWrap = document.getElementById("printPages"); if(pagesWrap) pagesWrap.innerHTML = "";
        return; 
    }

    const notOk = openings.filter(o => o.judgement !== "OK");
    if(btnPrint) btnPrint.disabled = false; 

    if (notOk.length > 0) { 
        if(gErr){ gErr.textContent = `⚠️ 判定待ち・NGが ${notOk.length} 件あります。内容をご確認の上、印刷してください。`; gErr.style.color = "#dd6b20";} 
    } else {
        if(gErr){ gErr.textContent = "✅ 全ての検定をクリアしました。印刷可能です。"; gErr.style.color = "#38a169";}
    }

    // 常に印刷プレビュー用HTMLを更新描画する
    window.updatePrintPreview();
};

window.exportData = function() {
    const blob = new Blob([JSON.stringify({ project: project(), openings: openings }, null, 2)], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'jintsuko_calc.json'; a.click();
};

function setInputValueIfExists(ids, val) {
    if (typeof ids === 'string') ids = [ids];
    for (const id of ids) {
        const el = document.getElementById(id);
        if (el) {
            el.value = (val !== undefined && val !== null) ? val : "";
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }
    }
    return false;
}

window.importData = function(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            let loadedOpenings = [];

            if (Array.isArray(data)) {
                loadedOpenings = data;
            } else if (data && typeof data === 'object') {
                const proj = data.project || data;
                setInputValueIfExists(["g_project", "p_project"], proj.project || proj.g_project);
                setInputValueIfExists(["g_date", "p_date"], proj.date || proj.g_date);
                setInputValueIfExists(["g_engineer", "p_engineer"], proj.engineer || proj.g_engineer);
                setInputValueIfExists("p_fc", proj.fc || proj.p_fc);
                setInputValueIfExists("p_note", proj.note || proj.p_note);

                if (Array.isArray(data.openings)) {
                    loadedOpenings = data.openings;
                } else if (Array.isArray(data.cards)) {
                    loadedOpenings = data.cards;
                }
            }

            openings = loadedOpenings;
            window.recalculateAll();
            mountCards();
            window.updateGlobalControls();
            const uploadEl = document.getElementById('json_upload');
            if (uploadEl) uploadEl.value = '';
            alert('データを読み込みました。');
        } catch (err) {
            console.error("JSON import error:", err);
            alert('ファイルの読み込みに失敗しました。ファイル形式をご確認ください。');
        }
    };
    reader.readAsText(file);
};

function fmt(v) { return (v === null || v === undefined || String(v).trim() === "") ? "—" : String(v); }
function fnum(n, d=3) { return (n === null || n === undefined || !Number.isFinite(n)) ? "—" : n.toFixed(d); }
function escapeHtml(str) { return String(str).replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }

window.updatePrintPreview = function() {
    const pagesWrap = document.getElementById("printPages"); if(!pagesWrap) return; pagesWrap.innerHTML = "";
    if(openings.length === 0) return;
    const currentTitle = getDocumentTitle();
    document.title = currentTitle;
    if (window.GlobalInfo && typeof window.GlobalInfo.updatePrintHeader === 'function') {
        window.GlobalInfo.updatePrintHeader();
    }
    const perPage = 4; const chunks = [];
    for (let i = 0; i < openings.length; i += perPage) chunks.push(openings.slice(i, i+perPage));
    const p = project();

    chunks.forEach((chunk, pIdx) => {
        const page = document.createElement("div"); page.className = "page";
        const header = document.createElement("div"); header.className = "page-header";
        
        let leftHeaderContent = "";
        if (pIdx === 0) {
            leftHeaderContent = p.note ? `<div class="mrow2" style="margin-top:0;"><div class="mlbl">備考:</div><div class="mval">${escapeHtml(p.note)}</div></div>` : `<div></div>`;
        } else {
            leftHeaderContent = `<div class="hdr-title" style="font-size:11pt; font-weight:bold; color:#333;">${escapeHtml(currentTitle)}</div>`;
        }

        header.innerHTML = `<div>${leftHeaderContent}</div><div class="hdr-right"><div class="pg">Page ${pIdx+1} / ${chunks.length}</div></div>`;
        page.appendChild(header);

        if (pIdx === 0) {
            const hasShear = openings.some(o => o.enable_shear === true || o.enable_shear === "true");
            const fig = document.createElement("div"); fig.className = "spec-figure";
            fig.innerHTML = `<div class="spec-cap" style="border-bottom:1px solid #ccc; padding-bottom:5px; margin-bottom:10px;">計算仕様（参考配筋図）</div><div class="spec-images"><img src="../imag/j01.png" alt="断面図" loading="eager"><img src="../imag/j02.png" alt="斜視図" loading="eager"></div><div style="font-size:8pt; line-height:1.6; padding-left:20px;">・本計算は、基礎スラブ内に配置する人通口下部の引張主筋（割増筋）の曲げ耐力${hasShear ? '、およびせん断耐力の略算検定です' : 'の略算検定です'}。<br>・鉄筋の許容引張応力度（長期）は <b>LFs = ${LFs} N/mm²</b> (SD295A相当) を用います。<br>・鉄筋のかぶり厚さは <b>${COVER_MM} mm</b> とし、応力中心距離 <b>j = 7/8 d</b> にて算定します。<br>${hasShear ? `・せん断検定を行う場合、コンクリート強度は <b>Fc = ${escapeHtml(p.fc)} N/mm²</b>（α=1.0）として許容せん断力を算定します。<br>` : ''}・短期許容耐力は長期の1.5倍とし、各応力ケースにおける最大検定比 ≦ 1.00 で OK とします。</div>`;
            page.appendChild(fig);
        }

        const body = document.createElement("div"); body.className = "page-body";
        chunk.forEach((o, idx) => {
            const block = document.createElement("div"); block.className = "block";
            const no = (pIdx*perPage) + idx + 1; const pos = (o.posA && o.posB && o.posC) ? `${o.posA}通り ${o.posB}-${o.posC}間` : "—"; const isShearON = (o.enable_shear === true || o.enable_shear === "true");
            const rows = (o.ratios || []).map(r => `<tr><td>${escapeHtml(r.label)}</td><td class="num">${fmt(r.M)}</td><td class="num">${fmt(r.Mabs)}</td><td class="num">${fnum(r.ratio, 3)}</td></tr>`).join("");
            block.innerHTML = `<div class="block-head"><div class="bno">人通口 No.${no}</div><div class="bpos">${escapeHtml(pos)}</div><div class="bjudge ${o.judgement === "OK" ? "ok" : (o.judgement === "NG" ? "ng" : "na")}">${o.judgement === "OK" ? "判定：OK" : (o.judgement === "NG" ? "判定：NG" : "未計算")}</div></div><div class="kv"><div><span class="k">スラブ厚:</span><span class="v">${fmt(o.slab_t)} mm</span></div><div><span class="k">割増筋:</span><span class="v">${fmt(o.n_bars)} - ${escapeHtml(o.bar_type)}</span></div><div><span class="k">許容 LMa:</span><span class="v">${fnum(o.LMa, 2)} kN·m</span></div><div><span class="k">許容 SMa:</span><span class="v">${fnum(o.SMa, 2)} kN·m</span></div>${isShearON ? `<div><span class="k">基礎幅 b:</span><span class="v">${fmt(o.b_width)} mm</span></div><div></div><div><span class="k">許容 LQa:</span><span class="v">${fnum(o.LQa, 2)} kN</span></div><div><span class="k">許容 SQa:</span><span class="v">${fnum(o.SQa, 2)} kN</span></div>` : ''}<div style="grid-column: 1 / 3; border-top:1px dashed #ccc; padding-top:2px; margin-top:2px;"><span class="k" style="width:auto;">最大検定比:</span><span class="v" style="color:red; margin-left:5px;">${fnum(o.rmax, 3)}</span><span style="margin-left:10px; color:#555;">(支配: ${escapeHtml(o.governing)})</span></div></div><div class="cond"><div class="ct" style="font-weight:bold;">[断面諸元]</div><div class="cv">As = ${fnum(o.As, 1)} mm² / j = ${fnum(o.j, 1)} mm / LFs = ${LFs} N/mm²</div></div><table class="tbl"><thead><tr><th>荷重ケース (${isShearON ? 'M / Q' : 'M'})</th><th class="num">入力値<br/><span class="u">(kN·m${isShearON ? ' / kN' : ''})</span></th><th class="num">検定用 絶対値<br/><span class="u">(kN·m${isShearON ? ' / kN' : ''})</span></th><th class="num">検定比<br/><span class="u">(|入力|/許容)</span></th></tr></thead><tbody>${rows || `<tr><td colspan="4">—</td></tr>`}</tbody></table>`;
            body.appendChild(block);
        });
        page.appendChild(body);
        const footer = document.createElement("div"); footer.className = "page-footer"; footer.innerHTML = `<div class="f-left">${escapeHtml(currentTitle)}</div><div class="f-right">- ${pIdx+1} / ${chunks.length} -</div>`;
        page.appendChild(footer); pagesWrap.appendChild(page);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('pdf_upload')?.addEventListener('change', async function(e) {
        const file = e.target.files[0]; if (!file) return;
        updateSourceDisplay("PDF", "解析中...", "#2b6cb0");
        const reader = new FileReader();
        reader.onload = async function(ev) {
            try {
                const typedarray = new Uint8Array(ev.target.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                rawPdfText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    rawPdfText += textContent.items.map(item => item.str).join(' ') + "\n";
                }
                updateSourceDisplay("PDF", "PDF", "#e53e3e"); 
            } catch(err) {
                alert("PDFの読み込みに失敗しました。");
            }
        };
        reader.readAsArrayBuffer(file);
    });

    document.getElementById('xlsx_upload')?.addEventListener('change', function(e) {
        const file = e.target.files[0]; if (!file) return;
        updateSourceDisplay("EXCEL", "解析中...", "#2b6cb0");
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = new Uint8Array(ev.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                excelRowsData = [];
                workbook.SheetNames.forEach(name => {
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 });
                    excelRowsData.push(...rows);
                });
                updateSourceDisplay("EXCEL", "Excel", "#3182ce"); 
            } catch(err) {
                alert("Excelの読み込みに失敗しました。");
            }
        };
        reader.readAsArrayBuffer(file);
    });

    document.getElementById("btnAdd")?.addEventListener("click", () => { openings.push(newOpening()); mountCards(); window.updateGlobalControls(); });
    document.getElementById("btnClear")?.addEventListener("click", () => { if(confirm('全てクリアしますか？')) { openings = []; mountCards(); window.updateGlobalControls(); }});
    
    const dlg = document.getElementById("dlg"); 
    const agree = document.getElementById("agree"); 
    const btnDlgPrint = document.getElementById("btnDlgPrint");
    const dlgMsg = document.getElementById("dlg_msg");

    document.getElementById("btnPrint")?.addEventListener("click", () => { 
        if (document.getElementById("btnPrint").disabled) return; 
        
        const notOk = openings.filter(o => o.judgement !== "OK");
        if (dlgMsg) {
            if (notOk.length > 0) {
                dlgMsg.innerHTML = `<span style="color:#e53e3e; font-weight:bold;">⚠️ 判定待ち・NGの項目が ${notOk.length} 件含まれています。</span><br>このまま印刷プレビューに進みますか？`;
            } else {
                dlgMsg.innerHTML = `すべての検定がクリアされています。<br>印刷プレビューに進みますか？`;
            }
        }
        if (agree) agree.checked = true; 
        if (btnDlgPrint) btnDlgPrint.disabled = false; 
        if (dlg) dlg.showModal(); 
    });

    agree?.addEventListener("change", () => { if(btnDlgPrint) btnDlgPrint.disabled = !agree.checked; });

    btnDlgPrint?.addEventListener("click", () => {
        if(dlg) dlg.close();
        // 印刷プレビュー用HTMLの最新化
        window.updatePrintPreview();
        setTimeout(() => {
            window.print();
        }, 150);
    });

    mountCards();
    window.updateGlobalControls();
});