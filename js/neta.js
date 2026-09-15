        const table321 = {
            "150": { "川型": { Ixy: 1.54, Zxy: 0.038, Csy: 1.31 }, "山型": { Ixy: 2.10, Zxy: 0.046, Csy: 1.42 }, "日型": { Ixy: 2.82, Zxy: 0.070, Csy: 1.18 } },
            "100": { "川型": { Ixy: 2.05, Zxy: 0.051, Csy: 1.35 }, "山型": { Ixy: 2.99, Zxy: 0.064, Csy: 1.49 }, "日型": { Ixy: 4.31, Zxy: 0.107, Csy: 1.18 } },
            "75": { "川型": { Ixy: 2.57, Zxy: 0.064, Csy: 1.39 }, "山型": { Ixy: 3.92, Zxy: 0.083, Csy: 1.51 }, "日型": { Ixy: 5.81, Zxy: 0.143, Csy: 1.18 } }
        };

        const table351 = {
            "1": { kj: 5.87, delta_jv: 0.35, delta_ju: 1.74 },
            "2": { kj: 8.76, delta_jv: 0.31, delta_ju: 1.60 },
            "3": { kj: 18.8, delta_jv: 0.28, delta_ju: 0.74 }
        };

        let currentCalcData = {};

        function toggleRoofMode() {
            const mode = document.querySelector('input[name="calc-mode"]:checked').value;
            const roofGroup = document.getElementById('roof-pitch-group');
            if (mode === 'roof') {
                roofGroup.style.display = 'flex';
            } else {
                roofGroup.style.display = 'none';
            }
        }

        function saveState() {
            const state = {
                chk2: document.getElementById('chk2').checked,
                chk3: document.getElementById('chk3').checked,
                chk4: document.getElementById('chk4').checked,
                chk5: document.getElementById('chk5').checked,
                chk6: document.getElementById('chk6').checked,
                calcMode: document.querySelector('input[name="calc-mode"]:checked').value,
                roofPitch: document.getElementById('roof-pitch').value,
                jointType: document.getElementById('joint-type').value,
                nailPitch: document.getElementById('nail-pitch').value,
                nailPattern: document.getElementById('nail-pattern').value
            };
            localStorage.setItem('floorCalcStateV4', JSON.stringify(state));
            
            const statusText = document.getElementById('save-status');
            statusText.innerText = "状態を保存しました (" + new Date().toLocaleTimeString() + ")";
            setTimeout(() => { statusText.innerText = ""; }, 3000);
        }

        function loadState() {
            const saved = localStorage.getItem('floorCalcStateV4');
            if (saved) {
                const state = JSON.parse(saved);
                document.getElementById('chk2').checked = state.chk2;
                document.getElementById('chk3').checked = state.chk3;
                document.getElementById('chk4').checked = state.chk4;
                document.getElementById('chk5').checked = state.chk5;
                document.getElementById('chk6').checked = state.chk6;
                if(state.calcMode) {
                    document.querySelector(`input[name="calc-mode"][value="${state.calcMode}"]`).checked = true;
                }
                document.getElementById('roof-pitch').value = state.roofPitch || "5.0";
                document.getElementById('joint-type').value = state.jointType || "3";
                document.getElementById('nail-pitch').value = state.nailPitch || "150";
                document.getElementById('nail-pattern').value = state.nailPattern || "川型";
            }
            toggleRoofMode();
            updateArrangement();
            if (saved) calculate(); 
        }

        function resetState() {
            if(confirm("入力状態を初期化しますか？")) {
                localStorage.removeItem('floorCalcStateV4');
                location.reload();
            }
        }

        async function exportJSON() {
            if (!currentCalcData || Object.keys(currentCalcData).length === 0) {
                alert("先に「計算実行」ボタンを押して計算を完了させてください。");
                return;
            }
            // 認証チェックもダミー化しておく (common等に合わせる)
            if (typeof checkAuth === 'function') {
                if(!await checkAuth()) return;
            }
            const jsonString = JSON.stringify(currentCalcData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `calculation_result_${new Date().getTime()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function drawNails(ctx, scale, pitch, pattern) {
            const width = 1820 * scale;
            const height = 910 * scale;
            const joistPitch = 455 * scale;
            const nPitch = pitch * scale;

            ctx.clearRect(0, 0, 440, 240);
            ctx.translate(20, 20);

            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, width, height);

            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            for (let x = 0; x <= width + 0.1; x += joistPitch) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#d9534f';
            const drawDot = (x, y) => {
                ctx.beginPath();
                ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                ctx.fill();
            };

            for (let x = 0; x <= width + 0.1; x += joistPitch) {
                for (let y = 0; y <= height + 0.1; y += nPitch) {
                    drawDot(x, y);
                }
            }

            if (pattern === '山型' || pattern === '日型') {
                for (let x = 0; x <= width + 0.1; x += nPitch) {
                    drawDot(x, 0);
                    drawDot(x, height);
                }
            }
            ctx.translate(-20, -20);
        }

        function updateArrangement() {
            const pitch = document.getElementById('nail-pitch').value;
            const pattern = document.getElementById('nail-pattern').value;
            const data = table321[pitch][pattern];
            
            document.getElementById('arrangement-data').innerText = `引用データ: Ixy = ${data.Ixy}, Zxy = ${data.Zxy}, Csy = ${data.Csy}`;

            const canvas = document.getElementById('patternCanvas');
            const ctx = canvas.getContext('2d');
            drawNails(ctx, 400/1820, parseInt(pitch), pattern);
        }

        function calculate() {
            const mode = document.querySelector('input[name="calc-mode"]:checked').value;
            const pitchStr = document.getElementById('nail-pitch').value;
            const patternStr = document.getElementById('nail-pattern').value;
            const jointTypeStr = document.getElementById('joint-type').value;
            const roofPitchVal = parseFloat(document.getElementById('roof-pitch').value) || 0;

            const k = 4.80, delta_y = 0.21, delta_u = 1.53, delta_Py = 0.98;
            const GB = 40, t = 1.2, B = 91;
            
            const arrData = table321[pitchStr][patternStr];
            const Ixy = arrData.Ixy, Zxy = arrData.Zxy, Csy = arrData.Csy;

            const { kj, delta_jv, delta_ju } = table351[jointTypeStr];
            const p = 45.5, b = 4.5, d = 10.5, L = 182, e = 4.5, Gw = 46.7;

            let html = "";
            const add = (text) => html += `<div class="result-step">${text}</div>`;

            add(`<strong>1) 面材釘の1面せん断データを用意する</strong>k=${k}, δy=${delta_y}, δu=${delta_u}, ΔPy=${delta_Py}`);
            add(`<strong>2) 面材のせん断弾性係数や寸法等</strong>GB=${GB}, t=${t}, B=${B}`);
            add(`<strong>3) 釘の配列による Ixy, Zxy, Csy</strong>Ixy=${Ixy}, Zxy=${Zxy}, Csy=${Csy}`);
            add(`<strong>4) 根太端部接合のせん断データ</strong>kj=${kj}, δjv=${delta_jv}, δju=${delta_ju}`);
            
            const Ip = (1/3 - 0.21 * (b/d) * (1 - Math.pow(b,4)/(12 * Math.pow(d,4)))) * d * Math.pow(b,3);
            add(`<strong>5) 根太の寸法と断面性能を用意する</strong><span class="formula">(3.5.18)式: Ip = { 1/3 - 0.21(b/d)(1 - b⁴/12d⁴) } d·b³</span><br>Ip = ${Ip.toFixed(2)} [cm⁴]`);

            const jly = L / (2 * p);
            add(`<strong>6) 床梁と根太の接合部配列二次モーメント jly を求める</strong><span class="formula">(3.5.20)式: jly = L / 2p</span><br>jly = ${L} / (2×${p}) = ${jly.toFixed(2)}`);

            const ky = (2 * Gw * Ip) / (Math.pow(e,2) * B);
            add(`<strong>7) 根太の転びによる剛性 ky を求める</strong><span class="formula">(3.5.17a)式: ky = (2·Gw·Ip) / (e²·B)</span><br>ky = (2×${Gw}×${Ip.toFixed(2)}) / (${e}²×${B}) = ${ky.toFixed(2)} [kN/cm]`);

            const deltaK0 = 1 / (1/(Ixy * k) + 1/(GB * t));
            add(`<strong>8) 面材釘による単位面積当たりの回転剛性 ΔK0 を求める</strong><span class="formula">(3.5.16)式: ΔK0 = 1 / { 1/(Ixy·k) + 1/(GB·t) }</span><br>ΔK0 = 1 / (1/(${Ixy}×${k}) + 1/(${GB}×${t})) = ${deltaK0.toFixed(3)} [kN·cm/rad·cm²]`);

            const KR = 1 / (1/deltaK0 + 1/(kj * jly) + 1/(ky * jly));
            add(`<strong>9) 水平構面の単位長さあたりのせん断剛性 KR を求める</strong><span class="formula">(3.5.15)式: KR = 1 / { 1/ΔK0 + 1/(kj·jly) + 1/(ky·jly) }</span><br>KR = 1 / (1/${deltaK0.toFixed(3)} + 1/(${kj}×${jly}) + 1/(${ky.toFixed(2)}×${jly})) = ${KR.toFixed(2)} [kN/rad·cm]`);

            const P150 = KR / 150;
            add(`<strong>10) 水平構面の変形角 1/150[rad] 時の単位長さあたりの耐力 P150 を求める</strong><span class="formula">(3.5.21)式: P150 = KR / 150</span><br>P150 = ${KR.toFixed(2)} / 150 = ${P150.toFixed(4)} [kN/cm]`);

            const deltaMy = Zxy * delta_Py;
            add(`<strong>11) 面材釘による単位面積あたりの降伏耐力 ΔMy を求める</strong><span class="formula">(3.5.12)式: ΔMy = Zxy × ΔPy</span><br>ΔMy = ${Zxy} × ${delta_Py} = ${deltaMy.toFixed(4)} [kN/cm]`);

            const deltaQj = kj * delta_jv;
            add(`<strong>12) 根太端部接合の降伏せん断耐力 ΔQj を求める</strong><span class="formula">(3.5.14)式: ΔQj = kj × δjv</span><br>ΔQj = ${kj} × ${delta_jv} = ${deltaQj.toFixed(2)} [kN]`);

            const Pyj = deltaQj / p;
            add(`<strong>13) 根太端部接合で決まる単位長さあたりの降伏耐力 Pyj を求める</strong><span class="formula">(3.5.13)式: Pyj = ΔQj / p</span><br>Pyj = ${deltaQj.toFixed(2)} / ${p} = ${Pyj.toFixed(4)} [kN/cm]`);

            const Py = Math.min(deltaMy, Pyj);
            add(`<strong>14) 水平構面の単位長さあたりの降伏耐力 Py を求める</strong><span class="formula">(3.5.11)式: Py = min(ΔMy, Pyj)</span><br>Py = min(${deltaMy.toFixed(4)}, ${Pyj.toFixed(4)}) = ${Py.toFixed(4)} [kN/cm]`);

            const Ry = Py / KR;
            add(`<strong>15) 水平構面の降伏変形角 Ry を求める</strong><span class="formula">(3.5.25)式: Ry = Py / KR</span><br>Ry = ${Py.toFixed(4)} / ${KR.toFixed(2)} = ${Ry.toFixed(5)} [rad]`);

            const deltaMu = Csy * deltaMy;
            add(`<strong>16) 面材釘による単位面積あたりの終局モーメント ΔMu を求める</strong><span class="formula">(3.5.23)式: ΔMu = Csy × ΔMy</span><br>ΔMu = ${Csy} × ${deltaMy.toFixed(4)} = ${deltaMu.toFixed(4)} [kN/cm]`);

            const Pu = Math.min(deltaMu, Pyj);
            add(`<strong>17) 水平構面の単位長さあたりの終局耐力 Pu を求める</strong><span class="formula">(3.5.22)式: Pu = min(ΔMu, Pyj)</span><br>Pu = min(${deltaMu.toFixed(4)}, ${Pyj.toFixed(4)}) = ${Pu.toFixed(4)} [kN/cm]`);

            const Ry0 = deltaMy / deltaK0;
            const mu0 = (delta_u * GB * t + delta_u * Ixy * k) / (delta_y * (GB * t + Ixy * k));
            add(`<strong>18) 面材釘による降伏変形角 Ry0 及び、塑性率 μ0 を求める</strong><span class="formula">(3.5.28)式: Ry0 = ΔMy / ΔK0</span><br>Ry0 = ${deltaMy.toFixed(4)} / ${deltaK0.toFixed(3)} = ${Ry0.toFixed(5)} [rad]<br><br><span class="formula">(3.5.27)式: μ0 = (δu·GB·t + δu·Ixy·k) / { δy(GB·t + Ixy·k) }</span><br>μ0 = ${mu0.toFixed(2)}`);

            const Ru = Ry + (mu0 - 1) * Ry0;
            add(`<strong>19) 水平構面の終局変形角 Ru を求める</strong><span class="formula">(3.5.26a)式: Ru = Ry + (μ0 - 1) × Ry0</span><br>Ru = ${Ry.toFixed(5)} + (${mu0.toFixed(2)} - 1) × ${Ry0.toFixed(5)} = ${Ru.toFixed(5)} [rad]`);

            const mu = Ru / Ry;
            add(`<strong>20) 水平構面の塑性率 μ を求める</strong><span class="formula">(3.5.24)式: μ = Ru / Ry</span><br>μ = ${Ru.toFixed(5)} / ${Ry.toFixed(5)} = ${mu.toFixed(2)}`);

            const factor = 0.2 * Math.sqrt(2 * mu - 1);
            const P_u_mod = factor * Pu;
            add(`<strong>21) 水平構面の単位長さあたりの 0.2√(2μ-1)×Pu を求める</strong><br>0.2√(2×${mu.toFixed(2)} - 1) × ${Pu.toFixed(4)} = ${P_u_mod.toFixed(4)} [kN/cm]`);

            const deltaQa = Math.min(P150, P_u_mod);
            const deltaQa_meter = deltaQa * 100;
            const isOkInPlane = deltaQa_meter <= 13.72;
            const judgeTextPlane = isOkInPlane ? "≦ 13.72kN/m ... 適用範囲① 面内耐力OK" : "＞ 13.72kN/m ... 適用範囲外NG";
            
            add(`<strong>22) 水平構面の単位長さあたりの面内許容せん断耐力 ΔQa を求める</strong><span class="formula">(3.5.10)式: ΔQa = min( P150, 0.2√(2μ-1)×Pu )</span><br>ΔQa = min( ${P150.toFixed(4)}, ${P_u_mod.toFixed(4)} ) = ${deltaQa.toFixed(4)} [kN/cm] → ${deltaQa_meter.toFixed(2)} [kN/m]<br><br><span style="color:${isOkInPlane?'green':'red'};font-weight:bold;font-size:16px;">${judgeTextPlane}</span>`);

            let finalOutputValue = deltaQa_meter;
            let finalOutputText = "";
            let cosTheta = 1.0;
            let slopeDeg = 0;

            if (mode === 'roof') {
                const x = roofPitchVal;
                cosTheta = 10 / Math.sqrt(100 + x * x);
                slopeDeg = Math.atan(x / 10) * (180 / Math.PI);
                finalOutputValue = deltaQa_meter * cosTheta;
                
                add(`<strong>23) 屋根勾配による水平投影耐力の低減 (屋根面モード)</strong>
                    勾配: ${x}寸 (約${slopeDeg.toFixed(1)}°)<br>
                    低減率 = cosθ = 10 / √(10² + ${x}²) = ${cosTheta.toFixed(4)}<br>
                    水平投影耐力 = ${deltaQa_meter.toFixed(2)} × ${cosTheta.toFixed(4)} = <strong>${finalOutputValue.toFixed(2)} [kN/m]</strong>
                `);
                
                finalOutputText = `${finalOutputValue.toFixed(2)} kN/m`;
                document.getElementById('highlight-title').innerText = "屋根構面の単位長さあたりの許容せん断耐力 (水平投影)";
                document.getElementById('highlight-sub').innerText = `(面内耐力 ${deltaQa_meter.toFixed(2)} kN/m × 勾配低減率 ${cosTheta.toFixed(3)})`;
            } else {
                finalOutputText = `${finalOutputValue.toFixed(2)} kN/m`;
                document.getElementById('highlight-title').innerText = "水平構面の単位長さあたりの許容せん断耐力 ΔQa";
                document.getElementById('highlight-sub').innerText = "";
            }

            document.getElementById('output').innerHTML = html;
            document.getElementById('results').style.display = 'block';

            document.getElementById('highlight-value').innerText = finalOutputText;
            const judgeEl = document.getElementById('highlight-judge');
            judgeEl.innerText = judgeTextPlane;
            judgeEl.style.color = isOkInPlane ? 'green' : 'red';
            document.getElementById('final-highlight').style.display = 'block';

            document.getElementById('chk1').checked = isOkInPlane;

            currentCalcData = {
                inputs: {
                    calcMode: mode,
                    roofPitch: mode === 'roof' ? roofPitchVal : null,
                    jointType: jointTypeStr,
                    nailPitch: pitchStr,
                    nailPattern: patternStr
                },
                parameters: {
                    k, delta_y, delta_u, delta_Py, GB, t, B, 
                    Ixy, Zxy, Csy, kj, delta_jv, delta_ju, 
                    p, b, d, L, e, Gw
                },
                results: {
                    Ip: Ip, jly: jly, ky: ky, deltaK0: deltaK0, KR: KR, 
                    P150: P150, deltaMy: deltaMy, deltaQj: deltaQj, Pyj: Pyj, 
                    Py: Py, Ry: Ry, deltaMu: deltaMu, Pu: Pu, 
                    Ry0: Ry0, mu0: mu0, Ru: Ru, mu: mu, P_u_mod: P_u_mod,
                    deltaQa_in_plane_kNm: deltaQa_meter,
                    isOkInPlaneLimit: isOkInPlane,
                    roofReductionFactor: mode === 'roof' ? cosTheta : 1.0,
                    finalAllowableStrength_kNm: finalOutputValue
                },
                timestamp: new Date().toISOString()
            };
        }

        document.addEventListener('DOMContentLoaded', loadState);
