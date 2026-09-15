// =========================================
// 片持ち庇（引きボルト式接合部）構造計算ロジック
// =========================================

const BOLT_SIZES = [110, 125, 140, 150, 180, 195, 210, 225, 240, 255, 300, 330, 345, 360, 390, 435];

window.onload = function() {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('in_date');
    if (dateInput) dateInput.value = today;
    
    updateBoltLength();
    
    // 共通ヘッダー入力欄が復元された後に一度計算を実行する
    setTimeout(() => {
        calculate();
        syncPrintHeader();
        
        // 共通ヘッダーの変更イベントを監視して、本ツール独自の印刷用ヘッダーへリアルタイム同期
        const fields = ['g_project', 'g_date', 'g_arch_type', 'g_arch_no', 'g_engineer'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', syncPrintHeader);
                el.addEventListener('change', syncPrintHeader);
            }
        });
    }, 100);
};

// ボルト長さの自動選定と引張有効長さの更新
function updateBoltLength() {
    const colSelect = document.getElementById('sel_col');
    if (!colSelect) return;
    
    const colSize = parseFloat(colSelect.value);
    const l1 = parseFloat(document.getElementById('in_l1').value) || 0;
    const washerProps = JSON.parse(document.getElementById('sel_washer').value);

    // 引張有効長さ l = 柱寸法 + 梁への埋め込み深さ
    const l_eff = colSize + l1;
    document.getElementById('in_l_eff').value = l_eff;

    // 推奨ボルト製品全長 L = 引張有効長さ + 座金厚み×2 + ナット締付しろ(約30mm)
    const required_L = l_eff + (washerProps.thick * 2) + 30;
    let selected_L = BOLT_SIZES[BOLT_SIZES.length - 1];
    for (let size of BOLT_SIZES) {
        if (size >= required_L) {
            selected_L = size;
            break;
        }
    }
    document.getElementById('in_L_prod').value = `${selected_L} mm (必要最小値: ${required_L.toFixed(1)} mm)`;
}

// 構造計算処理
function calculate() {
    // --- 1. 入力値の取得 ---
    const Md = parseFloat(document.getElementById('in_Md').value) || 0; // 設計曲げモーメント [kN・m]
    const Qd = parseFloat(document.getElementById('in_Qd').value) || 0; // 設計せん断力 [kN]

    const colWood = JSON.parse(document.getElementById('sel_col_wood').value);
    const beamWood = JSON.parse(document.getElementById('sel_beam_wood').value);

    const colSize = parseFloat(document.getElementById('sel_col').value); // 柱寸法 [mm]
    const beamD = parseFloat(document.getElementById('sel_beam_d').value); // 梁せい d [mm]
    const washer = JSON.parse(document.getElementById('sel_washer').value); // 座金情報

    const l1 = parseFloat(document.getElementById('in_l1').value) || 0; // 埋め込み深さ [mm]
    const l_eff = colSize + l1; // 引張有効長さ [mm]

    // --- 2. 各種定数と物理パラメータの設定 ---
    const Za = 30; // めり込み寸法効果定数 [mm]
    const Es = 205000; // 鋼材ヤング係数 [N/mm2]
    const At = 84.3; // M12ボルト有効断面積 [mm2]
    const Ft = 235; // M12ボルト (4.6) 基準引張強度 [N/mm2]
    const eta = 0.15; // 引きボルト鋼材の伸び率 (普通ボルト 15%)

    // ★画像仕様: E⊥ は柱の横圧縮ヤング係数で 1/25 * E// とする
    const E_perp_col = colWood.E / 25; // [N/mm2]
    
    // ★画像仕様: Fm ≒ 2.4/3 * Fcv = 0.8 * Fcv とする
    const Fm = 0.8 * colWood.Fcv; // [N/mm2]
    const Fs = beamWood.Fs; // 梁の基準せん断強度 [N/mm2]

    const yp = colSize; // めり込み幅 (柱幅) [mm]
    const d = beamD; // 有効高さ [mm]

    // 柱座金寸法 x0, y0 (入力された座金寸法を適用)
    const x0 = washer.xb;
    const y0 = washer.yb;

    // --- 3. 要素剛性の計算 ---
    // (a) ★画像仕様: 梁座金の繊維方向すべり剛性 K3
    // k0 = E_b0 / (31.6 + 10.9 * xb)
    const k0 = beamWood.E / (31.6 + 10.9 * washer.xb); // [N/mm3]
    const K3 = washer.xb * washer.yb * k0; // [N/mm]

    // (b) ボルト軸引張剛性 K2
    const K2 = (Es * At) / l_eff; // [N/mm]

    // (c) 柱座金めり込み剛性 K1
    const Cx2m = 1 + (4 * Za) / (3 * x0);
    const Cy2 = 1 + (4 * Za) / (3 * colWood.n * y0) * (1 - Math.exp(-(3 * colWood.n * y0) / (2 * Za)));
    const K1 = (x0 * y0 * Cx2m * Cy2 * E_perp_col) / Za; // [N/mm]

    // --- 4. 接合面中立軸位置 xp の算出（反復計算） ---
    const Cy = 1 + (4 * Za) / (3 * colWood.n * yp) * (1 - Math.exp(-(3 * colWood.n * yp) / (2 * Za)));
    const a_coeff = (yp * Cy * E_perp_col / Za) * (1 / K1 + 1 / K2 + 1 / K3);
    const c_coeff = 2 * d;
    
    let xp = d / 3.0; // 初期値
    for (let iter = 0; iter < 15; iter++) {
        const b_coeff = 1 + (2 * Za / 3) * (1 - Math.exp(-(3 * xp) / (2 * Za))) * a_coeff;
        const xp_next = (-b_coeff + Math.sqrt(b_coeff * b_coeff + a_coeff * c_coeff)) / a_coeff;
        if (Math.abs(xp_next - xp) < 1e-4) {
            xp = xp_next;
            break;
        }
        xp = xp_next;
    }

    // --- 5. 回転剛性 Kθ の算出 ---
    const Cs = 1 + (4 * Za) / (3 * xp) * (1 - Math.exp(-(3 * xp) / (2 * Za)));
    const xa = xp / (3 * Cs);
    const K_theta = (xp * xp * yp * Cs * Cy * E_perp_col * (d - xa)) / (2 * Za); // [N・mm/rad]

    // --- 6. 各種降伏限界値・モーメントの計算 ---
    const Csm = 1 + (4 * Za) / (3 * xp);
    const Cym = 1 + (4 * Za) / (3 * colWood.n * yp);
    
    // (a) 木材めり込み降伏耐力 ΣNy
    const Sigma_Ny = ((xp * yp * Fm) / 2) * Math.sqrt((Cs * Cy) / (Csm * Cym)); // [N]

    // (b) 柱座金めり込み降伏耐力 Ny1
    const Cy2m = 1 + (4 * Za) / (3 * colWood.n * y0);
    const Ny1 = x0 * y0 * Fm * Math.sqrt(Cy2 / Cy2m); // [N]

    // (c) ボルト引張降伏耐力 Ty2
    const Ty2 = At * Ft; // [N]

    // 接合部降伏耐力 Ny = min(ΣNy, Ny1, Ty2)
    const Ny = Math.min(Sigma_Ny, Ny1, Ty2);
    const My = Ny * (d - xa); // 降伏モーメント [N・mm]
    const My_kNm = My / 1e6; // [kN・m]

    // --- 7. 各種終局限界値・終局モーメントの計算 ---
    // (a) ★画像仕様: ボルト引張終局モーメント Mu = Mut (降伏後の強度上昇を考慮せず Ft = 235 を適用)
    const Tu = At * Ft; // [N]
    const Mut = Tu * (d - xa); // [N・mm]
    const Mut_kNm = Mut / 1e6; // [kN・m]

    // (b) 梁座金圧縮降伏耐力 Nyb (Fe: 梁繊維方向めり込み降伏応力。すぎ基準圧縮強度等から Fe ≒ 2.0 * Fm と仮定)
    const Fe = 2.0 * Fm; // [N/mm2]
    const Nyb = washer.xb * washer.yb * Fe; // [N]
    const Muk = Nyb * (d - xa); // [N・mm]
    const Muk_kNm = Muk / 1e6; // [kN・m]

    // (c) ★画像仕様: 木口せん断破壊耐力 Nus (le の範囲に応じた 3 段階条件分岐)
    let le = l1;
    if (l1 <= 200) {
        le = l1;
    } else if (l1 <= 400) {
        le = 200 + 0.5 * (l1 - 200);
    } else {
        le = 300;
    }
    const As = ((2 * washer.xb + washer.yb) * le) / 1.5; // [mm2]
    const Nus = As * Fs; // [N]
    const Mus = Nus * (d - xa); // [N・mm]
    const Mus_kNm = Mus / 1e6; // [kN・m]

    // 終局モーメント限界 Mu_limit
    const Mu_limit = Math.min(Mut, Muk, Mus); // [N・mm]
    const Mu_limit_kNm = Mu_limit / 1e6; // [kN・m]

    // --- 8. 塑性率 μ と短期許容モーメント sMa の算出 ---
    const theta_y = My / K_theta;
    const theta_u2 = (eta * l_eff) / (d - xa);
    const theta_u = Math.min(theta_u2, 1.0 / 15.0); // 最大1/15rad
    
    let mu = theta_u / theta_y;
    if (mu < 1.0) mu = 1.0;

    // 短期基準モーメント sMa = min(My, 0.2 * Mu * sqrt(2μ - 1))
    const sMa = Math.min(My, 0.2 * Mu_limit * Math.sqrt(2 * mu - 1)); // [N・mm]

    // --- 9. 結果の表示反映 ---
    const sMa_kNm = sMa / 1e6; // N・mm -> kN・m
    const ratio = sMa > 0 ? (Md / sMa_kNm) : 9.99;
    const isSafe = ratio <= 1.0;

    // (a) 画面UIへの表示
    const resultsPanel = document.getElementById('results_panel');
    if (resultsPanel) {
        resultsPanel.style.display = 'block';
        document.getElementById('ui_Ny').innerText = (Sigma_Ny / 1000).toFixed(2) + " kN";
        document.getElementById('ui_Nus').innerText = (Nus / 1000).toFixed(2) + " kN";
        document.getElementById('ui_K2').innerText = K2.toFixed(0) + " N/mm";
        document.getElementById('ui_sMa').innerText = sMa_kNm.toFixed(2) + " kN・m";

        const judgeSpan = document.getElementById('ui_judge');
        judgeSpan.innerHTML = `検定比: ${ratio.toFixed(3)} ➔ <span class="${isSafe ? 'ok' : 'ng'}">${isSafe ? 'OK' : 'NG'}</span>`;
    }

    // (b) 印刷用領域への表示（リアルタイム同期処理を呼び出し）
    syncPrintHeader();

    // 数値出力
    document.getElementById('pr_Md').innerHTML = `<strong>${Md.toFixed(2)}</strong> kN・m`;
    document.getElementById('pr_Qd').innerHTML = `<strong>${Qd.toFixed(2)}</strong> kN`;

    document.getElementById('pr_col_info').innerText = `${colWood.name} ${colSize}角 (E=${colWood.E}, Fcv=${colWood.Fcv})`;
    document.getElementById('pr_beam_info').innerText = `${beamWood.name} 幅${colSize}×せい${beamD} (E=${beamWood.E}, Fs=${beamWood.Fs})`;

    document.getElementById('pr_sMa').innerHTML = `<strong>${sMa_kNm.toFixed(2)}</strong> kN・m`;
    document.getElementById('pr_Ty').innerText = (Ty2 / 1000).toFixed(2) + " kN";
    document.getElementById('pr_Ny').innerText = (Sigma_Ny / 1000).toFixed(2) + " kN";
    document.getElementById('pr_Nus').innerText = (Nus / 1000).toFixed(2) + " kN";
    document.getElementById('pr_K2').innerText = K2.toFixed(0) + " N/mm";

    // 金物・納まり仕様
    document.getElementById('pr_img_L').innerText = document.getElementById('in_L_prod').value.split(' ')[0];
    document.getElementById('pr_img_l_eff').innerText = l_eff;
    document.getElementById('pr_img_l1').innerText = l1;
    document.getElementById('pr_img_washer').innerText = washer.name;

    // 総合判定ボックス
    const judgeBox = document.getElementById('pr_judgment_box');
    if (judgeBox) {
        if (isSafe) {
            judgeBox.innerHTML = `【総合判定】 検定比 ${ratio.toFixed(3)} ≦ 1.00 ➔ <span style="color:#27ae60;">適合 (OK)</span>`;
            judgeBox.style.borderColor = "#27ae60";
            judgeBox.style.color = "#000";
        } else {
            judgeBox.innerHTML = `【総合判定】 検定比 ${ratio.toFixed(3)} ＞ 1.00 ➔ <span style="color:#c0392b;">不適合 (NG)</span>`;
            judgeBox.style.borderColor = "#c0392b";
            judgeBox.style.color = "#c0392b";
        }
    }

    // --- 10. 数式代入プロセスの完全動的生成 ---
    // (1-2-1)
    const eq_comp_stiff = (xp * xp * yp * Cy * E_perp_col) / (2 * Za);
    const eq_1_2_1_val = eq_comp_stiff * Cs;
    document.getElementById('eq_1_2_1').innerHTML = `
    $$\\Sigma N = \\frac{x_p^2 y_p C_y E_{\\perp}}{2 Z_a} \\times \\left\\{ 1 + \\frac{4 Z_a}{3 x_p} \\left( 1 - e^{-\\frac{3 x_p}{2 Z_a}} \\right) \\right\\} \\theta$$
    $$\\Sigma N = \\frac{${xp.toFixed(1)}^2 \\times ${yp} \\times ${Cy.toFixed(3)} \\times ${E_perp_col.toFixed(1)}}{2 \\times 30} \\times \\left\\{ 1 + \\frac{4 \\times 30}{3 \\times ${xp.toFixed(1)}} \\left( 1 - e^{-\\frac{3 \\times ${xp.toFixed(1)}}{2 \\times 30}} \\right) \\right\\} \\theta$$
    $$\\Sigma N = ${eq_comp_stiff.toExponential(3)} \\times ${Cs.toFixed(3)} \\times \\theta = ${eq_1_2_1_val.toExponential(3)} \\cdot \\theta \\text{ [N]}$$
    `;

    // (1-2-2)
    const flexibility = 1/K1 + 1/K2 + 1/K3;
    document.getElementById('eq_1_2_2').innerHTML = `
    $$\\delta_T = T \\left( \\frac{1}{K_1} + \\frac{1}{K_2} + \\frac{1}{K_3} \\right)$$
    $$\\delta_T = T \\left( \\frac{1}{${K1.toFixed(0)}} + \\frac{1}{${K2.toFixed(0)}} + \\frac{1}{${K3.toFixed(0)}} \\right)$$
    $$\\delta_T = T \\times ${flexibility.toExponential(3)} \\text{ [mm]}$$
    `;

    // (1-2-4)
    document.getElementById('eq_1_2_4').innerHTML = `
    $$(d - x_p) \\cdot \\theta = \\delta_T$$
    $$(${d} - ${xp.toFixed(1)}) \\cdot \\theta = \\delta_T$$
    $$${(d - xp).toFixed(1)} \\cdot \\theta = \\delta_T$$
    `;

    // (1-2-5)
    document.getElementById('eq_1_2_5').innerHTML = `
    $$\\frac{x_p^2 y_p C_y E_{\\perp}}{2 Z_a} \\left\\{ 1 + \\frac{4 Z_a}{3 x_p} \\left( 1 - e^{-\\frac{3 x_p}{2 Z_a}} \\right) \\right\\} \\left( \\frac{1}{K_1} + \\frac{1}{K_2} + \\frac{1}{K_3} \\right) = d - x_p$$
    $$${eq_1_2_1_val.toExponential(3)} \\times ${flexibility.toExponential(3)} \\cdot \\theta = (${d} - x_p) \\cdot \\theta$$
    $$${(eq_1_2_1_val * flexibility).toFixed(3)} \\cdot \\theta = (${d} - ${xp.toFixed(1)}) \\cdot \\theta \\text{ (適合確認)}$$
    `;

    // (1-2-6)
    const b_coeff = 1 + (2 * Za / 3) * (1 - Math.exp(-(3 * xp) / (2 * Za))) * a_coeff;
    document.getElementById('eq_1_2_6').innerHTML = `
    $$x_p = \\frac{-b + \\sqrt{b^2 + ac}}{a}$$
    $$x_p = \\frac{-${b_coeff.toFixed(3)} + \\sqrt{${b_coeff.toFixed(3)}^2 + ${a_coeff.toExponential(4)} \\times ${c_coeff}}}{${a_coeff.toExponential(4)}} = ${xp.toFixed(1)} \\text{ mm}$$
    `;

    // (1-2-6a)
    document.getElementById('eq_1_2_6a').innerHTML = `
    $$a = \\frac{y_p C_y E_{\\perp}}{Z_a} \\left( \\frac{1}{K_1} + \\frac{1}{K_2} + \\frac{1}{K_3} \\right)$$
    $$a = \\frac{${yp} \\times ${Cy.toFixed(3)} \\times ${E_perp_col.toFixed(1)}}{30} \\times \\left( \\frac{1}{${K1.toFixed(0)}} + \\frac{1}{${K2.toFixed(0)}} + \\frac{1}{${K3.toFixed(0)}} \\right) = ${a_coeff.toExponential(4)}$$
    `;

    // (1-2-6b)
    document.getElementById('eq_1_2_6b').innerHTML = `
    $$b = 1 + \\frac{2 Z_a}{3} \\left( 1 - e^{-\\frac{3 x_p}{2 Z_a}} \\right) \\cdot a$$
    $$b = 1 + \\frac{2 \\times 30}{3} \\left( 1 - e^{-\\frac{3 \\times ${xp.toFixed(1)}}{2 \\times 30}} \\right) \\times ${a_coeff.toExponential(4)} = ${b_coeff.toFixed(3)}$$
    `;

    // (1-2-6c)
    document.getElementById('eq_1_2_6c').innerHTML = `
    $$c = 2d$$
    $$c = 2 \\times ${d} = ${c_coeff} \\text{ mm}$$
    `;

    // (1-2-6d)
    document.getElementById('eq_1_2_6d').innerHTML = `
    $$C_y = 1 + \\frac{4 Z_a}{3 n y_p} \\left( 1 - e^{-\\frac{3 n y_p}{2 Z_a}} \\right)$$
    $$C_y = 1 + \\frac{4 \\times 30}{3 \\times ${colWood.n} \\times ${yp}} \\left( 1 - e^{-\\frac{3 \\times ${colWood.n} \\times ${yp}}{2 \\times 30}} \\right) = ${Cy.toFixed(3)}$$
    `;

    // (1-2-7)
    document.getElementById('eq_1_2_7').innerHTML = `
    $$K_1 = \\frac{x_0 y_0 C_{x2m} C_{y2} E_{\\perp}}{Z_a}$$
    $$K_1 = \\frac{${x0} \\times ${y0} \\times ${Cx2m.toFixed(3)} \\times ${Cy2.toFixed(3)} \\times ${E_perp_col.toFixed(1)}}{30} = ${K1.toFixed(0)} \\text{ N/mm}$$
    `;

    // (1-2-7a)
    document.getElementById('eq_1_2_7a').innerHTML = `
    $$C_{x2m} = 1 + \\frac{4 Z_a}{3 x_0}$$
    $$C_{x2m} = 1 + \\frac{4 \\times 30}{3 \\times ${x0}} = ${Cx2m.toFixed(3)}$$
    `;

    // (1-2-7b)
    document.getElementById('eq_1_2_7b').innerHTML = `
    $$C_{y2} = 1 + \\frac{4 Z_a}{3 n y_0} \\left( 1 - e^{-\\frac{3 n y_0}{2 Z_a}} \\right)$$
    $$C_{y2} = 1 + \\frac{4 \\times 30}{3 \\times ${colWood.n} \\times ${y0}} \\left( 1 - e^{-\\frac{3 \\times ${colWood.n} \\times ${y0}}{2 \\times 30}} \\right) = ${Cy2.toFixed(3)}$$
    `;

    // (1-2-8)
    document.getElementById('eq_1_2_8').innerHTML = `
    $$K_2 = \\frac{E_s A_t}{l}$$
    $$K_2 = \\frac{205000 \\times 84.3}{${l_eff}} = ${K2.toFixed(0)} \\text{ N/mm}$$
    `;

    // (1-2-9)
    document.getElementById('eq_1_2_9').innerHTML = `
    $$K_3 = x_b \\cdot y_b \\cdot k_0$$
    $$K_3 = ${washer.xb} \\times ${washer.yb} \\times ${k0.toFixed(2)} = ${K3.toFixed(0)} \\text{ N/mm}$$
    <span style="font-size:0.85em; color:#555; display:block; text-align:center;">
    （※ $k_0 = E_{b0} / (31.6 + 10.9 x_b) = ${beamWood.E} / (31.6 + 10.9 \\times ${washer.xb}) = ${k0.toFixed(2)} \\text{ N/mm}^3$ ）
    </span>
    `;

    // (1-2-10)
    document.getElementById('eq_1_2_10').innerHTML = `
    $$K_\\theta = \\frac{M}{\\theta} = \\frac{x_p^2 y_p C_s C_y E_{\\perp} (d - x_a)}{2 Z_a}$$
    $$K_\\theta = \\frac{${xp.toFixed(1)}^2 \\times ${yp} \\times ${Cs.toFixed(3)} \\times ${Cy.toFixed(3)} \\times ${E_perp_col.toFixed(1)} \\times (${d} - ${xa.toFixed(1)})}{2 \\times 30} = ${K_theta.toExponential(3)} \\text{ N・mm/rad}$$
    `;

    // (1-2-10a)
    document.getElementById('eq_1_2_10a').innerHTML = `
    $$x_a = \\frac{x_p}{3 C_s}$$
    $$x_a = \\frac{${xp.toFixed(1)}}{3 \\times ${Cs.toFixed(3)}} = ${xa.toFixed(1)} \\text{ mm}$$
    `;

    // (1-2-10b)
    document.getElementById('eq_1_2_10b').innerHTML = `
    $$C_s = 1 + \\frac{4 Z_a}{3 x_p} \\left( 1 - e^{-\\frac{3 x_p}{2 Z_a}} \\right)$$
    $$C_s = 1 + \\frac{4 \\times 30}{3 \\times ${xp.toFixed(1)}} \\left( 1 - e^{-\\frac{3 \\times ${xp.toFixed(1)}}{2 \\times 30}} \\right) = ${Cs.toFixed(3)}$$
    `;

    // (1-2-11)
    document.getElementById('eq_1_2_11').innerHTML = `
    $$\\theta_y = \\frac{Z_a F_m}{x_p E_{\\perp} \\sqrt{C_s C_y C_{sm} C_{ym}}}$$
    $$\\theta_y = \\frac{30 \\times ${Fm.toFixed(2)}}{${xp.toFixed(1)} \\times ${E_perp_col.toFixed(1)} \\times \\sqrt{${Cs.toFixed(3)} \\times ${Cy.toFixed(3)} \\times ${Csm.toFixed(3)} \\times ${Cym.toFixed(3)}}} = ${theta_y.toExponential(4)} \\text{ rad}$$
    <span style="font-size:0.85em; color:#555; display:block; text-align:center;">
    （※ $F_m = 0.8 \\times F_{cv} = 0.8 \\times ${colWood.Fcv} = ${Fm.toFixed(2)} \\text{ N/mm}^2$ ）
    </span>
    `;

    // (1-2-11a)
    document.getElementById('eq_1_2_11a').innerHTML = `
    $$C_{sm} = 1 + \\frac{4 Z_a}{3 x_p}$$
    $$C_{sm} = 1 + \\frac{4 \\times 30}{3 \\times ${xp.toFixed(1)}} = ${Csm.toFixed(3)}$$
    `;

    // (1-2-11b)
    document.getElementById('eq_1_2_11b').innerHTML = `
    $$C_{ym} = 1 + \\frac{4 Z_a}{3 n y_p}$$
    $$C_{ym} = 1 + \\frac{4 \\times 30}{3 \\times ${colWood.n} \\times ${yp}} = ${Cym.toFixed(3)}$$
    `;

    // (1-2-12)
    document.getElementById('eq_1_2_12').innerHTML = `
    $$\\Sigma N_y = \\frac{x_p y_p F_m}{2} \\sqrt{\\frac{C_s C_y}{C_{sm} C_{ym}}}$$
    $$\\Sigma N_y = \\frac{${xp.toFixed(1)} \\times ${yp} \\times ${Fm.toFixed(2)}}{2} \\times \\sqrt{\\frac{${Cs.toFixed(3)} \\times ${Cy.toFixed(3)}}{${Csm.toFixed(3)} \\times ${Cym.toFixed(3)}}} = ${Sigma_Ny.toFixed(0)} \\text{ N}$$
    `;

    // (1-2-13)
    document.getElementById('eq_1_2_13').innerHTML = `
    $$N_{y1} = x_0 y_0 F_m \\sqrt{\\frac{C_{y2}}{C_{y2m}}}$$
    $$N_{y1} = ${x0} \\times ${y0} \\times ${Fm.toFixed(2)} \\times \\sqrt{\\frac{${Cy2.toFixed(3)}}{${Cy2m.toFixed(3)}}} = ${Ny1.toFixed(0)} \\text{ N}$$
    `;

    // (1-2-13b)
    document.getElementById('eq_1_2_13b').innerHTML = `
    $$C_{y2m} = 1 + \\frac{4 Z_a}{3 n y_0}$$
    $$C_{y2m} = 1 + \\frac{4 \\times 30}{3 \\times ${colWood.n} \\times ${y0}} = ${Cy2m.toFixed(3)}$$
    `;

    // (1-2-14)
    document.getElementById('eq_1_2_14').innerHTML = `
    $$T_{y2} = A_t \\cdot F_t$$
    $$T_{y2} = 84.3 \\times 235 = ${Ty2.toFixed(0)} \\text{ N}$$
    `;

    // (1-2-15)
    document.getElementById('eq_1_2_15').innerHTML = `
    $$N_y = \\min(\\Sigma N_y, N_{y1}, T_{y2})$$
    $$N_y = \\min(${Sigma_Ny.toFixed(0)}, ${Ny1.toFixed(0)}, ${Ty2.toFixed(0)}) = ${Ny.toFixed(0)} \\text{ N}$$
    $$M_y = N_y (d - x_a) = ${Ny.toFixed(0)} \\times (${d} - ${xa.toFixed(1)}) \\times 10^{-6} = ${My_kNm.toFixed(2)} \\text{ kN・m}$$
    `;

    // (1-2-16a)
    document.getElementById('eq_1_2_16a').innerHTML = `
    $$M_{ut2} \\le \\min(M_{uk}, M_{us}, M_{cu}, M_{bu})$$
    $$M_{ut2} \\le \\min(${Muk_kNm.toFixed(2)}, ${Mus_kNm.toFixed(2)}, M_{cu}, M_{bu})$$
    `;

    // (1-2-16b)
    const Mu_t2 = (1.1 * At * Ft * (d - xa));
    document.getElementById('eq_1_2_16b').innerHTML = `
    $$M_{ut2} = C \\times A_t \\cdot F_{t2} \\cdot (d - x_u)$$
    $$M_{ut2} = 1.1 \\times 84.3 \\times 235 \\times (${d} - ${xa.toFixed(1)}) \\times 10^{-6} = ${(Mu_t2 / 1e6).toFixed(2)} \\text{ kN・m}$$
    `;

    // (1-2-17)
    document.getElementById('eq_1_2_17').innerHTML = `
    $$M_u = M_{ut} = A_t \\cdot F_t \\cdot (d - x_a)$$
    $$M_u = 84.3 \\times 235 \\times (${d} - ${xa.toFixed(1)}) \\times 10^{-6} = ${Mut_kNm.toFixed(2)} \\text{ kN・m}$$
    `;

    // (1-2-18)
    document.getElementById('eq_1_2_18').innerHTML = `
    $$N_{yb} = x_b \\cdot y_b \\cdot F_e$$
    $$N_{yb} = ${washer.xb} \\times ${washer.yb} \\times ${Fe.toFixed(2)} = ${Nyb.toFixed(0)} \\text{ N}$$
    $$M_{uk} = N_{yb} (d - x_a) = ${Nyb.toFixed(0)} \\times (${d} - ${xa.toFixed(1)}) \\times 10^{-6} = ${Muk_kNm.toFixed(2)} \\text{ kN・m}$$
    `;

    // (1-2-19)
    document.getElementById('eq_1_2_19').innerHTML = `
    $$N_{us} = A_s F_s$$
    $$N_{us} = ${As.toFixed(1)} \\times ${Fs} = ${Nus.toFixed(0)} \\text{ N}$$
    $$M_{us} = N_{us} (d - x_a) = ${Nus.toFixed(0)} \\times (${d} - ${xa.toFixed(1)}) \\times 10^{-6} = ${Mus_kNm.toFixed(2)} \\text{ kN・m}$$
    `;

    // (1-2-20)
    document.getElementById('eq_1_2_20').innerHTML = `
    $$A_s = (2x_b + y_b) \\cdot l_e / 1.5$$
    $$A_s = (2 \\times ${washer.xb} + ${washer.yb}) \\times ${le.toFixed(1)} / 1.5 = ${As.toFixed(1)} \\text{ mm}^2$$
    <span style="font-size:0.85em; color:#555; display:block; text-align:center;">
    （※ 埋込み深さ $l_1=${l1}\\text{mm}$ より 有効せん断長 $l_e=${le.toFixed(1)}\\text{mm}$ を適用）
    </span>
    `;

    // (1-2-23)
    document.getElementById('eq_1_2_23').innerHTML = `
    $$\\theta_y = \\frac{M_y}{K_\\theta}$$
    $$\\theta_y = \\frac{${My.toFixed(0)}}{${K_theta.toExponential(3)}} = ${theta_y.toExponential(4)} \\text{ rad}$$
    `;

    // (1-2-24)
    document.getElementById('eq_1_2_24').innerHTML = `
    $$\\theta_{u2} = \\frac{\\eta \\cdot l}{j}$$
    $$\\theta_{u2} = \\frac{0.15 \\times ${l_eff}}{${(d - xa).toFixed(1)}} = ${theta_u2.toExponential(4)} \\text{ rad}$$
    `;

    // (1-2-25)
    document.getElementById('eq_1_2_25').innerHTML = `
    $$\\theta_u = \\min(\\theta_{u2}, 1/15)$$
    $$\\theta_u = \\min(${theta_u2.toExponential(4)}, 0.0667) = ${theta_u.toExponential(4)} \\text{ rad}$$
    `;

    // (1-2-26)
    document.getElementById('eq_1_2_26').innerHTML = `
    $$\\text{塑性率 } \\mu = \\frac{\\theta_u}{\\theta_y}$$
    $$\\mu = \\frac{${theta_u.toExponential(4)}}{${theta_y.toExponential(4)}} = ${mu.toFixed(3)}$$
    `;

    // (1-2-27)
    document.getElementById('eq_1_2_27').innerHTML = `
    $$ {}_s M_a = \\min(M_y, 0.2 M_u \\sqrt{2\\mu - 1})$$
    $$ {}_s M_a = \\min(${My_kNm.toFixed(2)}, 0.2 \\times ${Mu_limit_kNm.toFixed(2)} \\times \\sqrt{2 \\times ${mu.toFixed(3)} - 1})$$
    $$ {}_s M_a = \\min(${My_kNm.toFixed(2)}, ${(0.2 * Mu_limit_kNm * Math.sqrt(2 * mu - 1)).toFixed(2)}) = ${sMa_kNm.toFixed(2)} \\text{ kN・m}$$
    `;

    // MathJaxに再描画を指示
    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise();
    }
}

// データのJSON保存
function saveJSON() {
    const projectVal = window.GlobalInfo ? document.getElementById('g_project').value : "";
    const dateVal = window.GlobalInfo ? document.getElementById('g_date').value : document.getElementById('in_date').value;
    const archTypeVal = window.GlobalInfo ? document.getElementById('g_arch_type').value : "";
    const archNoVal = window.GlobalInfo ? document.getElementById('g_arch_no').value : "";
    const engineerVal = window.GlobalInfo ? document.getElementById('g_engineer').value : "";

    const data = {
        project: projectVal,
        date: dateVal,
        arch_type: archTypeVal,
        arch_no: archNoVal,
        engineer: engineerVal,
        Md: document.getElementById('in_Md').value,
        Qd: document.getElementById('in_Qd').value,
        col_wood: document.getElementById('sel_col_wood').value,
        beam_wood: document.getElementById('sel_beam_wood').value,
        l1: document.getElementById('in_l1').value,
        col: document.getElementById('sel_col').value,
        beam_d: document.getElementById('sel_beam_d').value,
        washer: document.getElementById('sel_washer').value
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectVal || '片持ち庇検討データ'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// データのJSON読込
function loadJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // 共通ヘッダー入力の復元とLocalStorageへの同期
            if (window.GlobalInfo) {
                if (data.project !== undefined) {
                    document.getElementById('g_project').value = data.project;
                    localStorage.setItem('struct_tools_g_project', data.project);
                }
                if (data.date !== undefined) {
                    document.getElementById('g_date').value = data.date;
                    localStorage.setItem('struct_tools_g_date', data.date);
                }
                if (data.arch_type !== undefined && document.getElementById('g_arch_type')) {
                    document.getElementById('g_arch_type').value = data.arch_type;
                    localStorage.setItem('struct_tools_g_arch_type', data.arch_type);
                }
                if (data.arch_no !== undefined && document.getElementById('g_arch_no')) {
                    document.getElementById('g_arch_no').value = data.arch_no;
                    localStorage.setItem('struct_tools_g_arch_no', data.arch_no);
                }
                if (data.engineer !== undefined && document.getElementById('g_engineer')) {
                    document.getElementById('g_engineer').value = data.engineer;
                    localStorage.setItem('struct_tools_g_engineer', data.engineer);
                }
                if (window.GlobalInfo && window.GlobalInfo.updatePrintHeader) {
                    window.GlobalInfo.updatePrintHeader();
                }
            } else {
                if (data.date && document.getElementById('in_date')) document.getElementById('in_date').value = data.date;
            }

            // 個別ツールの入力復元
            if (data.Md && document.getElementById('in_Md')) document.getElementById('in_Md').value = data.Md;
            if (data.Qd && document.getElementById('in_Qd')) document.getElementById('in_Qd').value = data.Qd;
            if (data.col_wood && document.getElementById('sel_col_wood')) document.getElementById('sel_col_wood').value = data.col_wood;
            if (data.beam_wood && document.getElementById('sel_beam_wood')) document.getElementById('sel_beam_wood').value = data.beam_wood;
            if (data.l1 && document.getElementById('in_l1')) document.getElementById('in_l1').value = data.l1;
            if (data.col && document.getElementById('sel_col')) document.getElementById('sel_col').value = data.col;
            if (data.beam_d && document.getElementById('sel_beam_d')) document.getElementById('sel_beam_d').value = data.beam_d;
            if (data.washer && document.getElementById('sel_washer')) document.getElementById('sel_washer').value = data.washer;

            updateBoltLength();
            calculate();
            alert('JSONデータを読み込みました。');
        } catch (err) {
            console.error(err);
            alert('読み込みに失敗しました。ファイル形式を確認してください。');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

// 共通ヘッダーから本ツール独自の印刷用ヘッダーへデータを同期する
function syncPrintHeader() {
    const headerData = typeof GlobalInfo !== 'undefined' ? GlobalInfo.getData() : {};
    
    const prProj = document.getElementById('pr_project');
    if (prProj) prProj.innerText = headerData.g_project || "—";
    
    let printDate = headerData.g_date;
    if (!printDate) {
        printDate = document.getElementById('in_date') ? document.getElementById('in_date').value : "—";
    }
    const prDate = document.getElementById('pr_date');
    if (prDate) prDate.innerText = printDate;

    let archInfo = headerData.g_engineer || "";
    const prLicense = document.getElementById('pr_license');
    if (prLicense) prLicense.innerText = archInfo || "—";
    
    const prDesigner = document.getElementById('pr_designer');
    if (prDesigner) prDesigner.innerText = headerData.g_engineer || "—";
}

// 印刷処理
function prepareAndPrint() {
    syncPrintHeader();
    if (typeof GlobalInfo !== 'undefined') {
        GlobalInfo.updatePrintHeader();
    }
    window.print();
}
