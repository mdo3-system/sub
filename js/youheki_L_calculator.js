// =========================================
// 宅地L型擁壁 (2m未満) 計算書 (youheki_L_calculator.js)
// =========================================

const { createApp, reactive, computed, ref } = Vue;

createApp({
    setup() {
        const p = reactive({
            Hw: 1.65,      // 縦壁高 Hw (m)
            tw: 0.20,      // 壁厚 tw (m)
            tb: 0.20,      // 底版厚 tb (m)
            B1: 1.40,      // 前趾長 B1 (m)
            Df: 0.20,      // 根入れ深さ Df (m) (前趾上の土高)
            Hsoil: 1.85,   // 背面土の全高 (m) (Hw + tb)

            q: 10.0,       // 上載荷重 q (kN/m²)
            P_fence: 0.0,  // フェンス荷重 (kN/m)
            gamma_c: 24.0, // コンクリート比重 (kN/m³)
            gamma_s: 16.0, // 土の比重 γs (kN/m³)
            Ka: 0.40,      // 土圧係数 Ka (切土・山留め0.40 / 盛土0.50)
            
            soilType: '粘性土', // 地盤条件 (粘性土 / 砂質土 / 地盤改良)
            N_val: 15,         // 底版下N値
            mu: 0.30,          // 摩擦係数 (手入力または自動)
            c: 0.0,            // 粘着力 (kN/m²)

            useAutoQa: true,   // N値からの地耐力自動算定フラグ
            qa_manual: 159.3,  // 許容地耐力 qa (kN/m²)

            fc: 21,
            ft: 195,           // 許容引張 19.5 kN/cm² = 195 N/mm²
            tau_a: 0.70,        // 許容せん断 0.70 N/mm² (7.0 N/cm²)
            dt: 7.0,           // 有効かぶり dt (cm)

            vRebarType: 'D13',
            vRebarPitch: 150,
            bRebarType: 'D13',
            bRebarPitch: 150,

            ratioLimit: 1.0
        });

        const f = (val, dec = 2) => {
            if (val === undefined || val === null || isNaN(val)) return '-';
            return val.toFixed(dec);
        };

        const rebarAreas = {
            'D10': 71.33,
            'D13': 126.7,
            'D16': 198.6,
            'D10D13': (71.33 + 126.7) / 2,
            'D13D16': (126.7 + 198.6) / 2,
        };

        // 底版全幅 B (L型は B1 + tw)
        const c_B = computed(() => p.B1 + p.tw);

        // 自動地耐力 qa 算定 (youheki-L.xls の計算式準拠)
        const c_calcC = computed(() => p.N_val * 12.5 / 2); // 粘着力 C = N * 12.5 / 2
        const c_calcPhi = computed(() => Math.sqrt(20 * p.N_val) + 15); // 内部摩擦角 φ

        const c_qa = computed(() => {
            if (!p.useAutoQa) return p.qa_manual;
            if (p.soilType === '粘性土') {
                // qa(L) = 1/3 * (1.0 * 1.0 * C * 5.1 + 1.0 * 0.5 * gamma_s * B * 0.0 + 1.0 * gamma_s * Df * 1.0)
                const C_val = c_calcC.value;
                const Nc = 5.1;
                const Nq = 1.0;
                const qa_L = (1 / 3) * (1.0 * 1.0 * C_val * Nc + 1.0 * 0.5 * p.gamma_s * c_B.value * 0.0 + 1.0 * p.gamma_s * p.Df * Nq);
                return qa_L;
            } else if (p.soilType === '砂質土') {
                const qa_L = (1 / 3) * (p.N_val * 10 + 20 * p.Df);
                return qa_L > 0 ? qa_L : 100.0;
            } else {
                return p.qa_manual;
            }
        });

        // 自動摩擦係数 μ / 粘着力 c の設定
        const c_effective_mu = computed(() => {
            if (p.soilType === '地盤改良') return 0.50;
            if (p.soilType === '砂質土') {
                const tanPhi = Math.tan(c_calcPhi.value * Math.PI / 180);
                return tanPhi > 0 ? Math.min(tanPhi, 0.6) : 0.40;
            }
            return p.mu; // 粘性土など
        });

        // SVG Canvas Settings
        const svgW = 540;
        const svgH = 500;
        const originX = 85;
        const originY = 370;

        const maxRealW = computed(() => Math.max(c_B.value + 0.6, 1.8));
        const maxRealH = computed(() => Math.max(p.Hw + p.tb + 0.4, (p.Hsoil || p.Hw + p.tb) + 0.4, 1.8));

        const scale = computed(() => {
            const scaleX = (svgW - originX - 110) / maxRealW.value;
            const scaleY = (originY - 60) / maxRealH.value;
            return Math.min(scaleX, scaleY);
        });

        const sx = (realX) => originX + realX * scale.value;
        const sy = (realY) => originY - realY * scale.value;

        // Wall Body Polygon Points (L-shape)
        const wallPoints = computed(() => {
            const x0 = sx(0);
            const x1 = sx(p.B1);
            const x2 = sx(p.B1 + p.tw);

            const y0 = sy(0);
            const y_tb = sy(p.tb);
            const y_top = sy(p.tb + p.Hw);

            return `${x1},${y_top} ${x2},${y_top} ${x2},${y0} ${x0},${y0} ${x0},${y_tb} ${x1},${y_tb}`;
        });

        // Rebar geometry computation for L-shape
        const rebarData = computed(() => {
            const dt_m = (p.dt || 7) / 100; // cm -> m
            const x_left_wall = p.B1 + dt_m;
            const x_right_wall = p.B1 + p.tw - dt_m;
            const y_top_wall = p.tb + p.Hw - dt_m;
            const y_bot_base = dt_m;
            const y_top_base = p.tb - dt_m;

            const hType = p.hRebarType || p.bRebarType || 'D10';
            const hPitch = p.hRebarPitch || p.bRebarPitch || 150;

            // Continuous Rebars
            // Front rebar & Base bottom rebar (tension side for L-shape)
            const frontRebarPoints = `${sx(x_left_wall)},${sy(y_top_wall)} ${sx(x_left_wall)},${sy(y_bot_base)} ${sx(dt_m)},${sy(y_bot_base)}`;
            // Rear rebar & Base top rebar
            const rearRebarPoints = `${sx(x_right_wall)},${sy(y_top_wall)} ${sx(x_right_wall)},${sy(y_top_base)} ${sx(dt_m)},${sy(y_top_base)}`;

            // Dots (Distribution / Horizontal rebars)
            const dots = [];
            const wallH = p.Hw - dt_m * 2;
            const dotCountWall = Math.max(4, Math.floor(wallH / 0.25));
            for (let i = 0; i <= dotCountWall; i++) {
                const y_real = p.tb + dt_m + (wallH * i) / dotCountWall;
                dots.push({ cx: sx(x_left_wall + 0.02), cy: sy(y_real) });
                dots.push({ cx: sx(x_right_wall - 0.02), cy: sy(y_real) });
            }
            const baseW = p.B1 - dt_m * 2;
            if (baseW > 0) {
                const dotCountBase = Math.max(2, Math.floor(baseW / 0.25));
                for (let i = 0; i < dotCountBase; i++) {
                    const x_real = dt_m + (baseW * i) / dotCountBase;
                    dots.push({ cx: sx(x_real), cy: sy(y_bot_base + 0.02) });
                    dots.push({ cx: sx(x_real), cy: sy(y_top_base - 0.02) });
                }
            }

            // Callout Labels
            const labels = [];
            
            // 1. Top Left Horizontal Rebar Label
            const pt_h1_start = { x: sx(x_left_wall), y: sy(y_top_wall - 0.2) };
            labels.push({
                text: `横筋${hType}@${hPitch}`,
                points: `${pt_h1_start.x},${pt_h1_start.y} ${pt_h1_start.x - 30},${pt_h1_start.y - 20} ${pt_h1_start.x - 60},${pt_h1_start.y - 20}`,
                tx: pt_h1_start.x - 65,
                ty: pt_h1_start.y - 24,
                anchor: 'end'
            });

            // 2. Top Right Horizontal Rebar Label
            const pt_h2_start = { x: sx(x_right_wall), y: sy(y_top_wall - 0.2) };
            labels.push({
                text: `横筋${hType}@${hPitch}`,
                points: `${pt_h2_start.x},${pt_h2_start.y} ${pt_h2_start.x + 30},${pt_h2_start.y - 20} ${pt_h2_start.x + 60},${pt_h2_start.y - 20}`,
                tx: pt_h2_start.x + 65,
                ty: pt_h2_start.y - 24,
                anchor: 'start'
            });

            // 3. Wall Front Vertical Rebar Label
            const pt_v1_start = { x: sx(x_left_wall), y: sy(p.tb + p.Hw * 0.6) };
            labels.push({
                text: `${p.vRebarType}@${p.vRebarPitch}`,
                points: `${pt_v1_start.x},${pt_v1_start.y} ${pt_v1_start.x - 45},${pt_v1_start.y}`,
                tx: pt_v1_start.x - 50,
                ty: pt_v1_start.y + 4,
                anchor: 'end'
            });

            // 4. Wall Rear Vertical Rebar Label
            const pt_v2_start = { x: sx(x_right_wall), y: sy(p.tb + p.Hw * 0.4) };
            labels.push({
                text: `${p.vRebarType}@${p.vRebarPitch}`,
                points: `${pt_v2_start.x},${pt_v2_start.y} ${pt_v2_start.x + 45},${pt_v2_start.y}`,
                tx: pt_v2_start.x + 50,
                ty: pt_v2_start.y + 4,
                anchor: 'start'
            });

            // 5. Base Bottom Main Rebar Label
            const pt_bb_start = { x: sx(p.B1 / 2), y: sy(y_bot_base) };
            labels.push({
                text: `配力筋${hType}@${hPitch}`,
                points: `${pt_bb_start.x - 15},${pt_bb_start.y} ${pt_bb_start.x - 15},${pt_bb_start.y + 25} ${pt_bb_start.x - 40},${pt_bb_start.y + 25}`,
                tx: pt_bb_start.x - 45,
                ty: pt_bb_start.y + 29,
                anchor: 'end'
            });
            labels.push({
                text: `${p.vRebarType}@${p.vRebarPitch}`,
                points: `${pt_bb_start.x + 15},${pt_bb_start.y} ${pt_bb_start.x + 15},${pt_bb_start.y + 25} ${pt_bb_start.x + 40},${pt_bb_start.y + 25}`,
                tx: pt_bb_start.x + 45,
                ty: pt_bb_start.y + 29,
                anchor: 'start'
            });

            // Cover dimension callouts
            const coverMm = Math.round(dt_m * 1000);
            const covers = [
                { text: `${coverMm - 20}`, x: sx(x_left_wall) - 8, y: sy(p.tb + p.Hw * 0.8) },
                { text: `${coverMm}`, x: sx(x_right_wall) + 8, y: sy(p.tb + p.Hw * 0.8) },
                { text: `${coverMm}`, x: sx(p.B1 / 2), y: sy(y_bot_base) + 12 }
            ];

            return {
                rearRebarPoints,
                frontRebarPoints,
                dots,
                labels,
                covers
            };
        });

        // Ground pressure graphic computation for L-shape
        const groundPressureData = computed(() => {
            const baseY = originY + 45;
            const hMax = 40;
            const maxVal = Math.max(c_sigma_max.value, c_qa.value, 1.0);

            const sMaxH = (c_sigma_max.value / maxVal) * hMax;
            const sMinH = (c_sigma_min.value / maxVal) * hMax;

            let leftH = 0, rightH = 0, midH = 0;
            let leftVal = 0, rightVal = 0, midVal = 0;

            if (c_e.value <= c_B.value / 6) {
                leftVal = c_sigma_max.value;
                rightVal = c_sigma_min.value;
                leftH = sMaxH;
                rightH = sMinH;
            } else {
                leftVal = c_sigma_max.value;
                rightVal = 0;
                leftH = sMaxH;
                rightH = 0;
            }

            const wallCenterRatio = (p.B1 + p.tw / 2) / c_B.value;
            midVal = leftVal - (leftVal - rightVal) * wallCenterRatio;
            midH = leftH - (leftH - rightH) * wallCenterRatio;

            const x0 = sx(0);
            const xWallCenter = sx(p.B1 + p.tw / 2);
            const xEnd = sx(c_B.value);

            const polygonPoints = `${x0},${baseY} ${x0},${baseY + leftH} ${xEnd},${baseY + rightH} ${xEnd},${baseY}`;

            return {
                baseY,
                x0,
                xWallCenter,
                xEnd,
                leftH,
                midH,
                rightH,
                leftVal,
                midVal,
                rightVal,
                polygonPoints
            };
        });

        // Dimensions Line Computation
        const dimData = computed(() => {
            const hDims = [];
            const vDims = [];

            const yDimH1 = originY + 15;
            const yDimH2 = originY + 30;

            if (p.B1 > 0) {
                hDims.push({
                    x1: sx(0), x2: sx(p.B1), y: yDimH1, text: `${f(p.B1)}`
                });
            }
            hDims.push({
                x1: sx(p.B1), x2: sx(p.B1 + p.tw), y: yDimH1, text: `${f(p.tw)}`
            });
            hDims.push({
                x1: sx(0), x2: sx(c_B.value), y: yDimH2, text: `${f(c_B.value)}`
            });

            const xDimV1 = originX - 30;
            const xDimV2 = originX - 55;

            vDims.push({
                y1: sy(0), y2: sy(p.tb), x: xDimV1, text: `${f(p.tb)}`
            });
            vDims.push({
                y1: sy(p.tb), y2: sy(p.tb + p.Hw), x: xDimV1, text: `${f(p.Hw)}`
            });
            if (p.Df > 0) {
                vDims.push({
                    y1: sy(p.tb), y2: sy(p.tb + p.Df), x: xDimV2, text: `${f(p.Df)}`
                });
            }

            return { hDims, vDims };
        });

        // 荷重計算 (L型)
        // W1: 縦壁自重 = gamma_c * tw * (Hw + tb - tb) = gamma_c * tw * Hw
        const c_W1 = computed(() => p.gamma_c * p.tw * p.Hw);
        const c_x1 = computed(() => p.B1 + p.tw / 2);

        // W2: 底版自重 (全幅 B = B1 + tw)
        const c_W2 = computed(() => p.gamma_c * c_B.value * p.tb);
        const c_x2 = computed(() => c_B.value / 2);

        // W3: 前趾上部土重 + 前趾上部上載荷重 = (gamma_s * Df + q) * B1
        const c_W3 = computed(() => (p.gamma_s * Math.max(0, p.Df) + p.q) * p.B1);
        const c_x3 = computed(() => p.B1 / 2);

        // 全鉛直荷重 SumV
        const c_sumV = computed(() => c_W1.value + c_W2.value + c_W3.value);

        // 抵抗モーメント SumMr (前趾先端まわり)
        const c_Mr = computed(() =>
            c_W1.value * c_x1.value +
            c_W2.value * c_x2.value +
            c_W3.value * c_x3.value
        );

        // 水平土圧 Ph, Pq, Pfence
        const c_Hsoil = computed(() => p.Hw + p.tb); // 擁壁全高 H
        const c_Ps = computed(() => 0.5 * p.Ka * p.gamma_s * Math.pow(c_Hsoil.value, 2));
        const c_ys = computed(() => c_Hsoil.value / 3);

        const c_Pq = computed(() => p.Ka * p.q * c_Hsoil.value);
        const c_yq = computed(() => c_Hsoil.value / 2);

        const c_M_fence = computed(() => p.P_fence * c_Hsoil.value);

        const c_sumH = computed(() => c_Ps.value + c_Pq.value + p.P_fence);
        const c_Mt = computed(() => c_Ps.value * c_ys.value + c_Pq.value * c_yq.value + c_M_fence.value);

        // 安定計算
        const c_e = computed(() => c_B.value / 2 - (c_Mr.value - c_Mt.value) / c_sumV.value);

        const c_sigma_max = computed(() => {
            if (c_e.value <= c_B.value / 6) {
                return (c_sumV.value / c_B.value) * (1 + 6 * c_e.value / c_B.value);
            } else {
                return (2 * c_sumV.value) / (3 * (c_B.value / 2 - c_e.value));
            }
        });

        const c_sigma_min = computed(() => {
            if (c_e.value <= c_B.value / 6) {
                return (c_sumV.value / c_B.value) * (1 - 6 * c_e.value / c_B.value);
            } else {
                return 0; // 浮き上がり離脱
            }
        });

        const c_Fo = computed(() => c_Mr.value / c_Mt.value);
        const c_Fs = computed(() => (c_sumV.value * c_effective_mu.value + p.c * c_B.value) / c_sumH.value);

        // 断面算定1: 縦壁付け根
        const c_hw = computed(() => p.Hw);
        const c_Mw_wall = computed(() => p.Ka * p.gamma_s * Math.pow(c_hw.value, 3) / 6 + p.Ka * p.q * Math.pow(c_hw.value, 2) / 2 + p.P_fence * c_hw.value);
        const c_Qw_wall = computed(() => p.Ka * p.gamma_s * Math.pow(c_hw.value, 2) / 2 + p.Ka * p.q * c_hw.value + p.P_fence);

        const c_d_wall = computed(() => p.tw * 100 - p.dt);
        const c_j_wall = computed(() => 7 / 8 * c_d_wall.value);

        const c_at_wall = computed(() => (c_Mw_wall.value * 100) / ((p.ft / 10) * c_j_wall.value));
        const c_aa_wall = computed(() => rebarAreas[p.vRebarType] * (1000 / p.vRebarPitch));
        const c_ratio_wall = computed(() => c_at_wall.value / c_aa_wall.value);

        const c_tau_wall = computed(() => (c_Qw_wall.value * 1000) / (1000 * c_j_wall.value * 10));

        // 断面算定2: 前趾底版付け根 (youheki-L.xls 算定式)
        // M_base = σmin * B1² / 2 + (σmax - σmin) * B1² / 6 - (gamma_c * tb + gamma_s * Df + q) * B1² / 2
        const c_w_base_down = computed(() => p.gamma_c * p.tb + p.gamma_s * p.Df + p.q);
        const c_sigma_B1 = computed(() => c_sigma_max.value - (c_sigma_max.value - c_sigma_min.value) * (p.B1 / c_B.value));

        const c_Mw_base = computed(() => {
            const M_up = c_sigma_min.value * Math.pow(p.B1, 2) / 2 + (c_sigma_max.value - c_sigma_min.value) * Math.pow(p.B1, 2) / 6;
            const M_down = c_w_base_down.value * Math.pow(p.B1, 2) / 2;
            return Math.max(0, M_up - M_down);
        });

        const c_Qw_base = computed(() => {
            const Q_up = (c_sigma_max.value + c_sigma_B1.value) / 2 * p.B1;
            const Q_down = c_w_base_down.value * p.B1;
            return Math.max(0, Q_up - Q_down);
        });

        const c_d_base = computed(() => p.tb * 100 - p.dt);
        const c_j_base = computed(() => 7 / 8 * c_d_base.value);

        const c_at_base = computed(() => (c_Mw_base.value * 100) / ((p.ft / 10) * c_j_base.value));
        const c_aa_base = computed(() => rebarAreas[p.bRebarType] * (1000 / p.bRebarPitch));
        const c_ratio_base = computed(() => c_at_base.value / c_aa_base.value);

        const c_tau_base = computed(() => (c_Qw_base.value * 1000) / (1000 * c_j_base.value * 10));

        const showWarningModal = ref(false);
        const showGuideModal = ref(false);

        const hasNG = computed(() => {
            const ok_sigma_max = c_sigma_max.value <= c_qa.value;
            const ok_sigma_min = c_e.value <= c_B.value / 6 ? c_sigma_min.value >= 0 : true;
            const ok_Fo = c_Fo.value >= 1.5;
            const ok_Fs = c_Fs.value >= 1.5;
            const ok_wall_rebar = c_ratio_wall.value <= p.ratioLimit;
            const ok_wall_tau = c_tau_wall.value <= p.tau_a;
            const ok_base_rebar = c_ratio_base.value <= p.ratioLimit;
            const ok_base_tau = c_tau_base.value <= p.tau_a;

            return !(ok_sigma_max && ok_sigma_min && ok_Fo && ok_Fs && ok_wall_rebar && ok_wall_tau && ok_base_rebar && ok_base_tau);
        });

        const handlePrint = () => {
            if (hasNG.value) {
                showWarningModal.value = true;
            } else {
                executePrint();
            }
        };

        const executePrint = () => {
            showWarningModal.value = false;
            setTimeout(() => {
                window.print();
            }, 150);
        };

        const saveJSON = () => {
            const data = JSON.stringify(p, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'youheki_L_data.json';
            a.click();
            URL.revokeObjectURL(url);
        };

        const loadJSON = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = JSON.parse(evt.target.result);
                    const pData = data.p || data;
                    Object.assign(p, pData);
                    alert("データを読み込みました");
                } catch (err) {
                    alert("JSONファイルの読み込みに失敗しました。");
                }
            };
            reader.readAsText(file);
        };

        return {
            p, f, rebarAreas,
            c_B, c_calcC, c_calcPhi, c_qa, c_effective_mu,
            sx, sy, wallPoints, rebarData, groundPressureData, dimData,
            c_W1, c_x1, c_W2, c_x2, c_W3, c_x3,
            c_sumV, c_Mr,
            c_Hsoil, c_Ps, c_ys, c_Pq, c_yq, c_M_fence, c_sumH, c_Mt,
            c_e, c_sigma_max, c_sigma_min, c_Fo, c_Fs,
            c_hw, c_Mw_wall, c_Qw_wall, c_d_wall, c_j_wall, c_at_wall, c_aa_wall, c_ratio_wall, c_tau_wall,
            c_Mw_base, c_Qw_base, c_d_base, c_j_base, c_at_base, c_aa_base, c_ratio_base, c_tau_base,
            showWarningModal, showGuideModal, handlePrint, executePrint, saveJSON, loadJSON
        };
    }
}).mount('#app');
