// ========================================================
// 基礎スラブ内補強 釣り合い鉄筋比の計算 (balanced_rebar_ratio.js)
// 人通口等のスラブ内補強における引張鉄筋比と釣り合い鉄筋比判定ロジック
// ========================================================

const REBAR_DATA = {
    'D10': { area: 71.33, diameter: 9.53 },
    'D13': { area: 126.7, diameter: 12.7 },
    'D16': { area: 198.6, diameter: 15.9 },
    'D19': { area: 286.5, diameter: 19.1 },
    'D22': { area: 387.1, diameter: 22.2 }
};

const REBAR_TYPES = {
    'SD295A': { ft: 295 },
    'SD345':  { ft: 345 }
};

const YOUNG_RATIO = 15; // コンクリートと鉄筋のヤング係数比 (n)

// メイン計算関数
function calculate() {
    // 共通ヘッダー入力値の取得と帳票への反映
    const gProject = document.getElementById('g_project');
    const projectName = (gProject && gProject.value.trim()) ? gProject.value.trim() : (document.getElementById('in_project')?.value || "—");
    const partName = document.getElementById('in_part')?.value || "基礎スラブ人通口部";
    const gDesigner = document.getElementById('g_designer');
    const designerName = (gDesigner && gDesigner.value.trim()) ? gDesigner.value.trim() : "—";
    const gDate = document.getElementById('g_date');
    const dateVal = (gDate && gDate.value.trim()) ? gDate.value.trim() : new Date().toLocaleDateString('ja-JP');

    const outProject = document.getElementById('out_project');
    if (outProject) outProject.innerText = projectName;
    const outPart = document.getElementById('out_part');
    if (outPart) outPart.innerText = partName;
    const outDesigner = document.getElementById('out_designer');
    if (outDesigner) outDesigner.innerText = designerName;
    const outDate = document.getElementById('out_date');
    if (outDate) outDate.innerText = dateVal;

    // 入力値取得
    const width = parseFloat(document.getElementById('in_width').value) || 1000;
    const depth = parseFloat(document.getElementById('in_depth').value) || 150;
    const coverDepth = parseFloat(document.getElementById('in_cover').value) || 60;
    const rebarSize = document.getElementById('in_rebar_size').value || 'D16';
    const rebarCount = parseInt(document.getElementById('in_rebar_count').value, 10) || 1;
    const fc = parseFloat(document.getElementById('in_fc').value) || 21;
    const rebarType = document.getElementById('in_rebar_type').value || 'SD295A';

    // 鉄筋データ
    const rebarInfo = REBAR_DATA[rebarSize] || REBAR_DATA['D16'];
    const totalArea = rebarInfo.area * rebarCount; // mm²
    const effectiveDepth = depth - coverDepth - (rebarInfo.diameter / 2); // mm

    // 引張鉄筋比 pt
    let pt = 0;
    if (width > 0 && effectiveDepth > 0) {
        pt = totalArea / (width * effectiveDepth);
    }
    const ptPercent = (pt * 100);

    // 材料許容応力度
    const ft = REBAR_TYPES[rebarType]?.ft || 295; // N/mm² (短期)
    const fcAllowable = (fc * 2.0) / 3.0; // 短期許容圧縮応力度 (2/3 * Fc)

    // 釣り合い鉄筋比 ptb (許容応力度設計)
    // ptb = 0.5 * (fcAllowable / ft) * ((n * fcAllowable) / (n * fcAllowable + ft))
    const ptb = 0.5 * (fcAllowable / ft) * ((YOUNG_RATIO * fcAllowable) / (YOUNG_RATIO * fcAllowable + ft));
    const ptbPercent = (ptb * 100);

    // 判定
    const isOverReinforced = pt > ptb;
    const ratio = ptb > 0 ? (pt / ptb) : 0;

    // 略算式曲げ耐力 Ma (参考値) = at * ft * (7/8) * d [N・mm] -> kN・m
    const Ma_approx = (totalArea * ft * (7.0 / 8.0) * effectiveDepth) / 1000000.0;

    // 帳票テーブルへの反映
    // 1. 設計条件
    document.getElementById('out_b').innerText = width.toLocaleString();
    document.getElementById('out_D').innerText = depth.toLocaleString();
    document.getElementById('out_cover').innerText = coverDepth.toLocaleString();
    document.getElementById('out_d').innerText = effectiveDepth.toFixed(1);

    document.getElementById('out_rebar_str').innerText = `${rebarCount}-${rebarSize}`;
    document.getElementById('out_rebar_area').innerText = totalArea.toFixed(1);
    document.getElementById('out_rebar_type').innerText = rebarType;
    document.getElementById('out_ft').innerText = ft.toLocaleString();

    document.getElementById('out_fc').innerText = fc.toLocaleString();
    document.getElementById('out_fc_allow').innerText = fcAllowable.toFixed(2);
    document.getElementById('out_n').innerText = YOUNG_RATIO.toString();

    // 2. 算定値
    document.getElementById('out_pt').innerText = ptPercent.toFixed(3);
    document.getElementById('out_ptb').innerText = ptbPercent.toFixed(3);
    document.getElementById('out_ratio').innerText = ratio.toFixed(3);

    // 帳票側 判定結果バッジ
    const outJudgeBadge = document.getElementById('out_judge_badge');
    if (outJudgeBadge) {
        if (isOverReinforced) {
            outJudgeBadge.className = 'judge-badge ng';
            outJudgeBadge.innerText = '過鉄筋（コンクリート圧壊先行・NG）';
        } else {
            outJudgeBadge.className = 'judge-badge ok';
            outJudgeBadge.innerText = '支障なし（引張降伏先行・OK）';
        }
    }

    // ゲージバーの更新
    // スケール最大値を 3.0% または pt, ptb の大きい方に余白を持たせる
    const maxScale = Math.max(3.0, ptPercent * 1.25, ptbPercent * 1.25);
    const fillPercent = Math.min(100, Math.max(0, (ptPercent / maxScale) * 100));
    const ptbPosPercent = Math.min(100, Math.max(0, (ptbPercent / maxScale) * 100));

    const gaugeFill = document.getElementById('gauge_fill');
    if (gaugeFill) {
        gaugeFill.style.width = fillPercent + '%';
        gaugeFill.className = 'gauge-fill ' + (isOverReinforced ? 'ng' : 'ok');
    }

    const gaugeMarker = document.getElementById('gauge_marker_ptb');
    if (gaugeMarker) {
        gaugeMarker.style.left = ptbPosPercent + '%';
        gaugeMarker.setAttribute('data-label', `釣り合い: ${ptbPercent.toFixed(2)}%`);
    }

    const gaugeMaxLabel = document.getElementById('gauge_max_label');
    if (gaugeMaxLabel) {
        gaugeMaxLabel.innerText = `${maxScale.toFixed(1)}% (スケール目安)`;
    }

    // 左側操作パネルの判定バナー更新
    const sideCard = document.getElementById('side_status_card');
    const sideTitle = document.getElementById('side_status_title');
    const sideDesc = document.getElementById('side_status_desc');
    if (sideCard && sideTitle && sideDesc) {
        if (isOverReinforced) {
            sideCard.className = 'brr-status-card ng';
            sideTitle.innerText = '過鉄筋状態（コンクリート圧壊先行）';
            sideDesc.innerText = `引張鉄筋比 pt (${ptPercent.toFixed(2)}%) が釣り合い鉄筋比 ptb (${ptbPercent.toFixed(2)}%) を超過しています。略算式による耐力算定は過大評価となり危険です。`;
        } else {
            sideCard.className = 'brr-status-card ok';
            sideTitle.innerText = '支障なし（引張破壊先行）';
            sideDesc.innerText = `引張鉄筋比 pt (${ptPercent.toFixed(2)}%) ≦ 釣り合い鉄筋比 ptb (${ptbPercent.toFixed(2)}%)。鉄筋が先に降伏する粘り強い破壊形式であり、略算式が安全に適用可能です。`;
        }
    }

    // 帳票側の考察・推奨対策テキストの更新
    const outNoteContent = document.getElementById('out_note_content');
    if (outNoteContent) {
        if (isOverReinforced) {
            outNoteContent.innerHTML = `
                <div style="color: #b91c1c; font-weight: bold; margin-bottom: 4px;">
                    ⚠️ 【注意】曲げ耐力の略算式（M = at・ft・j）は適用できません
                </div>
                <p style="margin-bottom: 4px;">
                    実鉄筋比（<strong>pt = ${ptPercent.toFixed(3)}%</strong>）が、短期許容応力度設計における釣り合い鉄筋比（<strong>ptb = ${ptbPercent.toFixed(3)}%</strong>）を超過しています（検定比 <strong>${ratio.toFixed(2)}</strong>）。
                    この配筋状態では、鉄筋が許容引張応力度に達する前に<strong>コンクリート側が圧縮破壊（圧壊）</strong>に至るため、通常の略算式 <code>M = at・ft・(7/8)d</code> を用いると耐力を著しく過大評価し極めて危険です。
                </p>
                <p>
                    <strong>【推奨される是正措置】</strong><br>
                    ① <strong>スラブ厚（せい）の増大：</strong> 人通口部を下方に掘り下げて増打・地中梁形状（せい250〜300mm等）とし、有効せい $d$ を確保する。<br>
                    ② <strong>コンクリート設計基準強度の向上：</strong> Fcを24または27 N/mm²に上げ、圧縮許容応力度を高める（効果は限定的なため、せい増大が最善）。
                </p>
            `;
        } else {
            outNoteContent.innerHTML = `
                <div style="color: #047857; font-weight: bold; margin-bottom: 4px;">
                    ✅ 【適正】引張降伏先行型であり、曲げ耐力の略算式が安全に適用可能です
                </div>
                <p style="margin-bottom: 4px;">
                    実鉄筋比（<strong>pt = ${ptPercent.toFixed(3)}%</strong>）は、釣り合い鉄筋比（<strong>ptb = ${ptbPercent.toFixed(3)}%</strong>）以下となっており、適正な配筋設計です（比率 <strong>${ratio.toFixed(2)} ≦ 1.00</strong>）。
                    部材が限界に達する際に鉄筋の引張降伏が先行するため、脆性破壊（突然のコンクリート圧壊）を防止し、十分な靭性（変形性能）が確保されます。
                </p>
                <p>
                    <strong>【設計耐力の確認】</strong><br>
                    許容応力度設計における曲げ耐力略算式 <code>M = at・ft・(7/8)d</code> を安全に適用可能です。<br>
                    ・参考短期許容曲げ耐力略算値： <strong>Ma ≒ ${Ma_approx.toFixed(2)} kN・m</strong>
                </p>
            `;
        }
    }
}

// 印刷実行
function printReport() {
    calculate();
    window.print();
}

// A4 PDF出力実行 (html2pdf.js)
function exportPDF() {
    calculate();
    const element = document.getElementById('report-page');
    const opt = {
        margin:       [8, 10, 8, 10], // mm [top, left, bottom, right]
        filename:     '基礎スラブ内補強_釣り合い鉄筋比検討書.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

// 初期化イベント
window.addEventListener('DOMContentLoaded', () => {
    // 共通ヘッダーとの連動イベント登録
    const gProj = document.getElementById('g_project');
    if (gProj) {
        gProj.addEventListener('input', () => {
            const outProj = document.getElementById('out_project');
            if (outProj) outProj.innerText = gProj.value || "—";
        });
    }
    const gDes = document.getElementById('g_designer');
    if (gDes) {
        gDes.addEventListener('input', () => {
            const outDes = document.getElementById('out_designer');
            if (outDes) outDes.innerText = gDes.value || "—";
        });
    }
    const gDt = document.getElementById('g_date');
    if (gDt) {
        gDt.addEventListener('input', () => {
            const outDt = document.getElementById('out_date');
            if (outDt) outDt.innerText = gDt.value || "—";
        });
    }

    // 初回計算実行
    calculate();
});
