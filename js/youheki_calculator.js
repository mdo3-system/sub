// =========================================
// 逆Ｌ型・逆Ｔ型擁壁の計算書 (youheki_calculator.js)
// =========================================

const { createApp, reactive, computed, ref } = Vue;

createApp({
    setup() {
        const p = reactive({
            Hw: 1.5,
            tw: 0.20,
            tb: 0.25,
            B1: 0.30,
            B2: 0.80,
            Hsoil: 1.5,
            Df: 0.20, // 根入れ深さ / 前趾上の土の高さ (m)

            q: 10.0,
            P_fence: 0.0, // フェンス荷重 (kN/m)
            gamma_c: 24.0,
            gamma_s: 19.0,
            Ka: 0.35,
            c: 0.0,
            mu: 0.5,
            qa: 100.0,

            fc: 21,
            ft: 180,
            tau_a: 0.39,
            dt: 7.0,

            vRebarType: 'D13',
            vRebarPitch: 100,
            hRebarType: 'D10',
            hRebarPitch: 150,

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

        const c_B = computed(() => p.B1 + p.tw + p.B2);

        const svgW = 540;
        const svgH = 500;
        const originX = 85;
        const originY = 370;

        const maxRealW = computed(() => Math.max(c_B.value + 0.6, 1.8));
        const maxRealH = computed(() => Math.max(p.Hw + p.tb + 0.4, p.Hsoil + p.tb + 0.4, 1.8));

        const scale = computed(() => {
            const scaleX = (svgW - originX - 110) / maxRealW.value;
            const scaleY = (originY - 60) / maxRealH.value;
            return Math.min(scaleX, scaleY);
        });

        const sx = (realX) => originX + realX * scale.value;
        const sy = (realY) => originY - realY * scale.value;

        // Wall Body Polygon Points
        const wallPoints = computed(() => {
            const x0 = sx(0);
            const x1 = sx(p.B1);
            const x2 = sx(p.B1 + p.tw);
            const x3 = sx(c_B.value);

            const y0 = sy(0);
            const y_tb = sy(p.tb);
            const y_top = sy(p.tb + p.Hw);

            return `${x1},${y_top} ${x2},${y_top} ${x2},${y_tb} ${x3},${y_tb} ${x3},${y0} ${x0},${y0} ${x0},${y_tb} ${x1},${y_tb}`;
        });

        // Rebar geometry computation (Main rebars, distribution rebars, callouts)
        const rebarData = computed(() => {
            const dt_m = (p.dt || 7) / 100; // cm -> m
            const x_left_wall = p.B1 + dt_m;
            const x_right_wall = p.B1 + p.tw - dt_m;
            const y_top_wall = p.tb + p.Hw - dt_m;
            const y_bot_base = dt_m;
            const y_top_base = p.tb - dt_m;

            // Main continuous rebar lines (L-shape / U-shape)
            const rearRebarPoints = `${sx(x_right_wall)},${sy(y_top_wall)} ${sx(x_right_wall)},${sy(y_bot_base)} ${sx(c_B.value - dt_m)},${sy(y_bot_base)}`;
            const frontRebarPoints = `${sx(x_left_wall)},${sy(y_top_wall)} ${sx(x_left_wall)},${sy(y_top_base)} ${sx(Math.max(dt_m, 0.05))},${sy(y_top_base)}`;

            // Dots (Distribution / Horizontal rebars)
            const dots = [];
            // Wall left dots
            const wallH = p.Hw - dt_m * 2;
            const dotCountWall = Math.max(4, Math.floor(wallH / 0.25));
            for (let i = 0; i <= dotCountWall; i++) {
                const y_real = p.tb + dt_m + (wallH * i) / dotCountWall;
                dots.push({ cx: sx(x_left_wall + 0.02), cy: sy(y_real) });
                dots.push({ cx: sx(x_right_wall - 0.02), cy: sy(y_real) });
            }
            // Base dots
            const baseW_rear = p.B2 - dt_m * 2;
            if (baseW_rear > 0) {
                const dotCountBaseRear = Math.max(2, Math.floor(baseW_rear / 0.25));
                for (let i = 1; i <= dotCountBaseRear; i++) {
                    const x_real = p.B1 + p.tw + (baseW_rear * i) / (dotCountBaseRear + 1);
                    dots.push({ cx: sx(x_real), cy: sy(y_bot_base + 0.02) });
                    dots.push({ cx: sx(x_real), cy: sy(y_top_base - 0.02) });
                }
            }
            const baseW_front = p.B1 - dt_m * 2;
            if (baseW_front > 0) {
                const dotCountBaseFront = Math.max(2, Math.floor(baseW_front / 0.25));
                for (let i = 0; i < dotCountBaseFront; i++) {
                    const x_real = dt_m + (baseW_front * i) / (dotCountBaseFront);
                    dots.push({ cx: sx(x_real), cy: sy(y_bot_base + 0.02) });
                    dots.push({ cx: sx(x_real), cy: sy(y_top_base - 0.02) });
                }
            }

            // Callout Labels with Leaders
            const labels = [];
            
            // 1. Top Left Horizontal Rebar Label
            const pt_h1_start = { x: sx(x_left_wall), y: sy(y_top_wall - 0.2) };
            labels.push({
                text: `横筋${p.hRebarType}@${p.hRebarPitch}`,
                points: `${pt_h1_start.x},${pt_h1_start.y} ${pt_h1_start.x - 30},${pt_h1_start.y - 20} ${pt_h1_start.x - 60},${pt_h1_start.y - 20}`,
                tx: pt_h1_start.x - 65,
                ty: pt_h1_start.y - 24,
                anchor: 'end'
            });

            // 2. Top Right Horizontal Rebar Label
            const pt_h2_start = { x: sx(x_right_wall), y: sy(y_top_wall - 0.2) };
            labels.push({
                text: `横筋${p.hRebarType}@${p.hRebarPitch}`,
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

            // 4. Wall Rear Main Vertical Rebar Label
            const pt_v2_start = { x: sx(x_right_wall), y: sy(p.tb + p.Hw * 0.4) };
            labels.push({
                text: `${p.vRebarType}@${p.vRebarPitch}`,
                points: `${pt_v2_start.x},${pt_v2_start.y} ${pt_v2_start.x + 45},${pt_v2_start.y}`,
                tx: pt_v2_start.x + 50,
                ty: pt_v2_start.y + 4,
                anchor: 'start'
            });

            // 5. Base Top Rebar Label
            if (p.B2 > 0) {
                const pt_bt_start = { x: sx(p.B1 + p.tw + p.B2 * 0.4), y: sy(y_top_base) };
                labels.push({
                    text: `${p.vRebarType}@${p.vRebarPitch}`,
                    points: `${pt_bt_start.x},${pt_bt_start.y} ${pt_bt_start.x + 20},${pt_bt_start.y - 30} ${pt_bt_start.x + 50},${pt_bt_start.y - 30}`,
                    tx: pt_bt_start.x + 55,
                    ty: pt_bt_start.y - 34,
                    anchor: 'start'
                });
            }

            // 6. Base Bottom Rebar Label & Distribution Rebar Label
            const pt_bb_start = { x: sx(p.B1 + p.tw / 2), y: sy(y_bot_base) };
            labels.push({
                text: `配力筋${p.hRebarType}@${p.hRebarPitch}`,
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

            // Cover dimension callouts (e.g. 48, 68 mm)
            const coverMm = Math.round(dt_m * 1000); // e.g. 70
            const covers = [
                { text: `${coverMm - 20}`, x: sx(x_left_wall) - 8, y: sy(p.tb + p.Hw * 0.8) },
                { text: `${coverMm}`, x: sx(x_right_wall) + 8, y: sy(p.tb + p.Hw * 0.8) },
                { text: `${coverMm}`, x: sx(p.B1 + p.tw / 2), y: sy(y_bot_base) + 12 }
            ];

            return {
                rearRebarPoints,
                frontRebarPoints,
                dots,
                labels,
                covers
            };
        });

        // Ground pressure graphic computation
        const groundPressureData = computed(() => {
            const baseY = originY + 45;
            const hMax = 40; // max height of diagram in px
            const maxVal = Math.max(c_sigma_max.value, p.qa, 1.0);

            const sMaxH = (c_sigma_max.value / maxVal) * hMax;
            const sMinH = (c_sigma_min.value / maxVal) * hMax;

            // Calculate pressure at wall centerline (x = B1 + tw/2)
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

        // Dimensions Line Computation (Vertical and Horizontal)
        const dimData = computed(() => {
            const hDims = [];
            const vDims = [];

            const yDimH1 = originY + 15; // Bottom dim line 1
            const yDimH2 = originY + 30; // Bottom dim line 2 (Total B)

            // Horizontal: B1, tw, B2
            if (p.B1 > 0) {
                hDims.push({
                    x1: sx(0), x2: sx(p.B1), y: yDimH1, text: `${f(p.B1)}`
                });
            }
            hDims.push({
                x1: sx(p.B1), x2: sx(p.B1 + p.tw), y: yDimH1, text: `${f(p.tw)}`
            });
            if (p.B2 > 0) {
                hDims.push({
                    x1: sx(p.B1 + p.tw), x2: sx(c_B.value), y: yDimH1, text: `${f(p.B2)}`
                });
            }
            // Total B
            hDims.push({
                x1: sx(0), x2: sx(c_B.value), y: yDimH2, text: `${f(c_B.value)}`
            });

            // Vertical: left side
            const xDimV1 = originX - 30;
            const xDimV2 = originX - 55;

            // tb, Hw, Df
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

        // 1. 各部位自重・土重
        const c_W1 = computed(() => p.gamma_c * p.tw * p.Hw);
        const c_x1 = computed(() => p.B1 + p.tw / 2);

        const c_W2 = computed(() => p.gamma_c * p.B2 * p.tb);
        const c_x2 = computed(() => p.B1 + p.tw + p.B2 / 2);

        // W3: 前趾上部の土重 (gamma_s * B1 * Df)
        const c_W3 = computed(() => p.gamma_s * p.B1 * Math.max(0, p.Df));
        const c_x3 = computed(() => p.B1 / 2);

        // 前趾底版自重 (底版自重前趾部) W_base1
        const c_W_base1 = computed(() => p.gamma_c * p.B1 * p.tb);

        // W4: 後趾上部土重
        const c_W4 = computed(() => p.gamma_s * p.B2 * Math.max(0, p.Hsoil - p.tb));
        const c_x4 = computed(() => p.B1 + p.tw + p.B2 / 2);

        // W5: 上載荷重 (後趾上)
        const c_W5 = computed(() => p.q * p.B2);
        const c_x5 = computed(() => p.B1 + p.tw + p.B2 / 2);

        // 全鉛直荷重 SumV
        const c_sumV = computed(() => c_W1.value + c_W2.value + c_W_base1.value + c_W3.value + c_W4.value + c_W5.value);
        
        // 抵抗モーメント SumMr
        const c_Mr = computed(() =>
            c_W1.value * c_x1.value +
            c_W2.value * c_x2.value +
            c_W_base1.value * c_x3.value +
            c_W3.value * c_x3.value +
            c_W4.value * c_x4.value +
            c_W5.value * c_x5.value
        );

        // 水平荷重 Ps, Pq, P_fence
        const c_Ps = computed(() => 0.5 * p.Ka * p.gamma_s * Math.pow(p.Hsoil, 2));
        const c_ys = computed(() => p.Hsoil / 3);

        const c_Pq = computed(() => p.Ka * p.q * p.Hsoil);
        const c_yq = computed(() => p.Hsoil / 2);

        // フェンス等の水平荷重モーメント M_fence = P_fence * (Hw + tb)
        const c_M_fence = computed(() => p.P_fence * (p.Hw + p.tb));

        const c_sumH = computed(() => c_Ps.value + c_Pq.value + p.P_fence);
        const c_Mt = computed(() => c_Ps.value * c_ys.value + c_Pq.value * c_yq.value + c_M_fence.value);

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
                return 0;
            }
        });

        const c_Fo = computed(() => c_Mr.value / c_Mt.value);
        const c_Fs = computed(() => (c_sumV.value * p.mu + p.c * c_B.value) / c_sumH.value);

        const c_hw = computed(() => Math.max(0, p.Hsoil - p.tb));
        const c_Mw = computed(() => p.Ka * p.gamma_s * Math.pow(c_hw.value, 3) / 6 + p.Ka * p.q * Math.pow(c_hw.value, 2) / 2 + p.P_fence * c_hw.value);
        const c_Qw = computed(() => p.Ka * p.gamma_s * Math.pow(c_hw.value, 2) / 2 + p.Ka * p.q * c_hw.value + p.P_fence);

        const c_d = computed(() => p.tw * 100 - p.dt);
        const c_j = computed(() => 7 / 8 * c_d.value);

        const c_at = computed(() => (c_Mw.value * 100) / ((p.ft / 10) * c_j.value));
        const c_aa = computed(() => rebarAreas[p.vRebarType] * (1000 / p.vRebarPitch));
        const c_rebarRatio = computed(() => c_at.value / c_aa.value);

        const c_tau = computed(() => (c_Qw.value * 1000) / (1000 * c_j.value * 10));

        const showWarningModal = ref(false);
        const showGuideModal = ref(false);

        const hasNG = computed(() => {
            const ok_sigma_max = c_sigma_max.value <= p.qa;
            const ok_sigma_min = c_e.value <= c_B.value / 6 ? c_sigma_min.value >= 0 : true;
            const ok_Fo = c_Fo.value >= 1.5;
            const ok_Fs = c_Fs.value >= 1.5;
            const ok_rebar = c_rebarRatio.value <= p.ratioLimit;
            const ok_tau = c_tau.value <= p.tau_a;

            return !(ok_sigma_max && ok_sigma_min && ok_Fo && ok_Fs && ok_rebar && ok_tau);
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
            a.download = 'youheki_data.json';
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
            c_B, sx, sy, wallPoints, rebarData, groundPressureData, dimData,
            c_W1, c_x1, c_W2, c_x2, c_W3, c_x3, c_W_base1, c_W4, c_x4, c_W5, c_x5,
            c_sumV, c_Mr,
            c_Ps, c_ys, c_Pq, c_yq, c_M_fence, c_sumH, c_Mt,
            c_e, c_sigma_max, c_sigma_min, c_Fo, c_Fs,
            c_hw, c_Mw, c_Qw, c_d, c_j, c_at, c_aa, c_rebarRatio, c_tau,
            showWarningModal, showGuideModal, handlePrint, executePrint, saveJSON, loadJSON
        };
    }
}).mount('#app');
