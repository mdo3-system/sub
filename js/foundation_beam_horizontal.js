// ========================================================
// 基礎梁 水平力に対する追加計算書 (foundation_beam_horizontal.js)
// 弾性支点（Winkler地盤モデル）FEM解析・断面検定ロジック
// ========================================================

// 連立一次方程式ソルバー（ガウスの消去法・部分ピボット選択付き）
function solveLinearSystem(A, b) {
    const n = b.length;
    // 前進消去
    for (let i = 0; i < n; i++) {
        let maxEl = Math.abs(A[i][i]), maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(A[k][i]) > maxEl) {
                maxEl = Math.abs(A[k][i]);
                maxRow = k;
            }
        }
        for (let k = i; k < n; k++) {
            let tmp = A[maxRow][k];
            A[maxRow][k] = A[i][k];
            A[i][k] = tmp;
        }
        let tmp = b[maxRow];
        b[maxRow] = b[i];
        b[i] = tmp;

        for (let k = i + 1; k < n; k++) {
            let c = -A[k][i] / A[i][i];
            for (let j = i; j < n; j++) {
                if (i === j) A[k][j] = 0;
                else A[k][j] += c * A[i][j];
            }
            b[k] += c * b[i];
        }
    }
    // 後退代入
    let x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = b[i] / A[i][i];
        for (let k = i - 1; k >= 0; k--) {
            b[k] -= A[k][i] * x[i];
        }
    }
    return x;
}

// 弾性支点（Winkler地盤モデル）梁要素FEM解析
function runFEM(L, B, I, E_kNm2, kv, TdL, TdR) {
    const EI = E_kNm2 * I;
    const k11 = 12 * EI / Math.pow(L, 3);
    const k12 = 6 * EI / Math.pow(L, 2);
    const k22 = 4 * EI / L;
    const k24 = 2 * EI / L;

    // 梁要素の全体剛性行列
    let K = [
        [ k11,  k12, -k11,  k12],
        [ k12,  k22, -k12,  k24],
        [-k11, -k12,  k11, -k12],
        [ k12,  k24, -k12,  k22]
    ];

    // Winkler地盤バネ（集中バネとして梁端部各自由度へ配置）
    const k_soil = kv * B * (L / 2.0);
    K[0][0] += k_soil;
    K[2][2] += k_soil;

    // 節点外力ベクトル（下向き正）
    const P = [-TdL, 0, -TdR, 0];
    const U = solveLinearSystem(K, P);

    const v1 = U[0], t1 = U[1], v2 = U[2], t2 = U[3];
    // 要素内応力の抽出
    const f0 =  k11 * v1 + k12 * t1 - k11 * v2 + k12 * t2;
    const f1 =  k12 * v1 + k22 * t1 - k12 * v2 + k24 * t2;

    const Qe = f0;
    const ML = -f1;
    const MR = Qe * L - ML;

    const clean = (val) => Math.abs(val) < 0.0005 ? 0 : val;

    return {
        vL: clean(-v1 * 1000), // mm
        vR: clean(-v2 * 1000), // mm
        Qe: clean(Qe),         // kN
        ML: clean(ML),         // kN・m
        MR: clean(-MR)         // kN・m
    };
}

// メイン計算実行および帳票反映関数
function calculate() {
    // 工事名称・検討部位の反映
    const gProjectInput = document.getElementById('g_project');
    const projectName = (gProjectInput && gProjectInput.value.trim()) ? gProjectInput.value.trim() : (document.getElementById('in_project')?.value || "—");
    const partName = document.getElementById('in_part')?.value || "X5通り Y5-Y6 基礎梁 (FG2)";

    const outProject = document.getElementById('out_project');
    if (outProject) outProject.innerText = projectName;
    const outPart = document.getElementById('out_part');
    if (outPart) outPart.innerText = partName;

    // 解析条件取得
    const L = parseFloat(document.getElementById('in_L').value) || 0.9;
    const B = parseFloat(document.getElementById('in_B').value) || 0.15;
    const D = parseFloat(document.getElementById('in_D').value) || 0.5;
    const kv = parseFloat(document.getElementById('in_kv').value) || 30000;
    const E_kNm2 = 21000 * 1000; // コンクリートヤング係数: 2.1×10^4 N/mm² = 2.1×10^7 kN/m²
    const I = (B * Math.pow(D, 3)) / 12.0;

    document.getElementById('out_L').innerText = L.toFixed(3);
    document.getElementById('out_B').innerText = B.toFixed(3);
    document.getElementById('out_D').innerText = D.toFixed(3);
    document.getElementById('out_kv').innerText = kv.toLocaleString();
    document.getElementById('out_I').innerText = I.toFixed(6);

    // 水平荷重入力 (Td)
    const TdL_d = parseFloat(document.getElementById('in_TdL_down').value) || 0;
    const TdR_d = parseFloat(document.getElementById('in_TdR_down').value) || 0;
    const res_d = runFEM(L, B, I, E_kNm2, kv, TdL_d, TdR_d);

    document.getElementById('out_d_TdL').innerText = TdL_d.toFixed(3);
    document.getElementById('out_d_TdR').innerText = TdR_d.toFixed(3);
    document.getElementById('out_d_vL').innerText = res_d.vL.toFixed(3);
    document.getElementById('out_d_vR').innerText = res_d.vR.toFixed(3);
    document.getElementById('out_d_Qe').innerText = res_d.Qe.toFixed(3);
    document.getElementById('out_d_ML').innerText = res_d.ML.toFixed(3);
    document.getElementById('out_d_MR').innerText = res_d.MR.toFixed(3);

    const TdL_u = parseFloat(document.getElementById('in_TdL_up').value) || 0;
    const TdR_u = parseFloat(document.getElementById('in_TdR_up').value) || 0;
    const res_u = runFEM(L, B, I, E_kNm2, kv, TdL_u, TdR_u);

    document.getElementById('out_u_TdL').innerText = TdL_u.toFixed(3);
    document.getElementById('out_u_TdR').innerText = TdR_u.toFixed(3);
    document.getElementById('out_u_vL').innerText = res_u.vL.toFixed(3);
    document.getElementById('out_u_vR').innerText = res_u.vR.toFixed(3);
    document.getElementById('out_u_Qe').innerText = res_u.Qe.toFixed(3);
    document.getElementById('out_u_ML').innerText = res_u.ML.toFixed(3);
    document.getElementById('out_u_MR').innerText = res_u.MR.toFixed(3);

    // 許容耐力
    const LMa_t = parseFloat(document.getElementById('in_LMa_top').value) || 0;
    const LMa_b = parseFloat(document.getElementById('in_LMa_bot').value) || 0;
    const LQa = parseFloat(document.getElementById('in_LQa').value) || 0;
    const SMa_t = parseFloat(document.getElementById('in_SMa_top').value) || 0;
    const SMa_b = parseFloat(document.getElementById('in_SMa_bot').value) || 0;
    const SQa = parseFloat(document.getElementById('in_SQa').value) || 0;

    document.getElementById('out_LMa_top').innerText = LMa_t.toFixed(3);
    document.getElementById('out_LMa_bot').innerText = LMa_b.toFixed(3);
    document.getElementById('out_LQa').innerText = LQa.toFixed(3);
    document.getElementById('out_SMa_top').innerText = SMa_t.toFixed(3);
    document.getElementById('out_SMa_bot').innerText = SMa_b.toFixed(3);
    document.getElementById('out_SQa').innerText = SQa.toFixed(3);

    // 断面検定
    const max_Q = Math.max(Math.abs(res_d.Qe), Math.abs(res_u.Qe));
    const max_M = Math.max(Math.abs(res_d.ML), Math.abs(res_d.MR), Math.abs(res_u.ML), Math.abs(res_u.MR));
    const min_SMa = Math.min(SMa_t, SMa_b);

    document.getElementById('chk_M_val').innerText = max_M.toFixed(3);
    document.getElementById('chk_Ma_val').innerText = min_SMa.toFixed(3);
    let ratio_M = min_SMa > 0 ? (max_M / min_SMa) : 0;
    document.getElementById('chk_M_ratio').innerText = ratio_M.toFixed(3);

    const judgeM = document.getElementById('chk_M_judge');
    if (ratio_M <= 1.0) {
        judgeM.innerText = "OK";
        judgeM.className = "judge-ok";
    } else {
        judgeM.innerText = "NG";
        judgeM.className = "judge-ng";
    }

    document.getElementById('chk_Q_val').innerText = max_Q.toFixed(3);
    document.getElementById('chk_Qa_val').innerText = SQa.toFixed(3);
    let ratio_Q = SQa > 0 ? (max_Q / SQa) : 0;
    document.getElementById('chk_Q_ratio').innerText = ratio_Q.toFixed(3);

    const judgeQ = document.getElementById('chk_Q_judge');
    if (ratio_Q <= 1.0) {
        judgeQ.innerText = "OK";
        judgeQ.className = "judge-ok";
    } else {
        judgeQ.innerText = "NG";
        judgeQ.className = "judge-ng";
    }
}

// A4印刷実行
function printReport() {
    if (window.GlobalInfo && typeof window.GlobalInfo.updatePrintHeader === 'function') {
        window.GlobalInfo.updatePrintHeader();
    }
    calculate();
    window.print();
}

// A4 PDF出力実行 (html2pdf.js)
function exportPDF() {
    calculate();
    const element = document.getElementById('report-page');
    const opt = {
        margin:       [8, 10, 8, 10], // mm [top, left, bottom, right]
        filename:     '基礎梁_応力算定_断面検定書.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

// 初期化
window.addEventListener('DOMContentLoaded', () => {
    // 共通ヘッダーとの連動イベント登録
    const gProj = document.getElementById('g_project');
    if (gProj) {
        gProj.addEventListener('input', () => {
            const outProj = document.getElementById('out_project');
            if (outProj) outProj.innerText = gProj.value || "—";
        });
    }

    // 初回計算実行
    calculate();
});
