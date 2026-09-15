        function updateMaterial1() {
            const select = document.getElementById('beam1_material');
            const fbInput = document.getElementById('beam1_fb');
            const fsInput = document.getElementById('beam1_fs');

            if (select.value === 'custom') {
                fbInput.focus();
            } else {
                const values = select.value.split(',');
                fbInput.value = parseFloat(values[0]).toFixed(1);
                fsInput.value = parseFloat(values[1]).toFixed(1);
            }
        }

        function updateMaterial2() {
            const select = document.getElementById('beam2_material');
            const fbInput = document.getElementById('beam2_fb');
            const fsInput = document.getElementById('beam2_fs');

            if (select.value === 'custom') {
                fbInput.focus();
            } else {
                const values = select.value.split(',');
                fbInput.value = parseFloat(values[0]).toFixed(1);
                fsInput.value = parseFloat(values[1]).toFixed(1);
            }
        }

        function calcBeamDeflection(x, a, P, L, E, I, G, A) {
            let delta = 0;
            let b = L - a;
            let kappa = 1.2; 
            if (x <= a) {
                delta += (P * b * x / (6 * L * E * I)) * (L*L - b*b - x*x);
                delta += (kappa * P * b * x) / (L * G * A);
            } else {
                let x_rev = L - x;
                delta += (P * a * x_rev / (6 * L * E * I)) * (L*L - a*a - x_rev*x_rev);
                delta += (kappa * P * a * x_rev) / (L * G * A);
            }
            return delta;
        }

        function updateUI() {
            const typeP = document.getElementById('type_primary').value;
            const divL = document.getElementById('sec_beam_L_div');
            const divR = document.getElementById('sec_beam_R_div');
            const secInputs = document.getElementById('sec_beam_inputs');

            if (typeP === 'I') { divL.style.display = 'none'; divR.style.display = 'none'; secInputs.style.display = 'none'; }
            else if (typeP === 'II') { divL.style.display = 'none'; divR.style.display = 'flex'; secInputs.style.display = 'block'; }
            else if (typeP === 'III') { divL.style.display = 'flex'; divR.style.display = 'flex'; secInputs.style.display = 'block'; }

            drawCanvas();
        }

        function drawCanvas() {
            const canvas = document.getElementById('modelCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const typeP = document.getElementById('type_primary').value;
            const L1 = parseFloat(document.getElementById('beam1_L').value) || 2730;
            const Lw = parseFloat(document.getElementById('wall_Lw').value) || 910;
            const a = parseFloat(document.getElementById('wall_a').value) || 910;
            
            const marginX = 150; const baseY = 180;
            const scale = 600 / Math.max(L1, 1000); 
            
            const p1X = marginX;
            const p2X = marginX + L1 * scale;
            const wallStartX = marginX + a * scale;
            const wallEndX = marginX + (a + Lw) * scale;

            ctx.fillStyle = '#ecc94b'; ctx.fillRect(p1X, baseY, L1 * scale, 15);
            ctx.strokeStyle = '#b7791f'; ctx.lineWidth = 2; ctx.strokeRect(p1X, baseY, L1 * scale, 15);
            ctx.fillStyle = '#000'; ctx.font = "14px Arial"; ctx.fillText("1次梁", p1X + L1*scale/2 - 20, baseY + 35);

            function drawSupport(x, isColumn, label) {
                if (isColumn) {
                    ctx.fillStyle = '#a0aec0'; ctx.fillRect(x - 10, baseY + 15, 20, 40);
                    ctx.fillText(label + "(柱)", x - 25, baseY + 70);
                } else {
                    ctx.beginPath(); ctx.arc(x, baseY + 25, 10, 0, Math.PI*2);
                    ctx.fillStyle = '#f56565'; ctx.fill(); ctx.stroke();
                    ctx.fillStyle = '#000'; ctx.fillText(label + "(2次梁)", x - 30, baseY + 55);
                    ctx.beginPath(); ctx.moveTo(x-5, baseY+25); ctx.lineTo(x-30, baseY+80);
                    ctx.moveTo(x+5, baseY+25); ctx.lineTo(x+20, baseY+80);
                    ctx.strokeStyle = '#f56565'; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
                }
            }

            if (typeP === 'I') { drawSupport(p1X, true, "左端"); drawSupport(p2X, true, "右端"); }
            if (typeP === 'II') { drawSupport(p1X, true, "左端"); drawSupport(p2X, false, "右端"); }
            if (typeP === 'III') { drawSupport(p1X, false, "左端"); drawSupport(p2X, false, "右端"); }

            ctx.fillStyle = 'rgba(49, 130, 206, 0.2)'; ctx.fillRect(wallStartX, baseY - 100, Lw * scale, 100);
            ctx.strokeStyle = '#3182ce'; ctx.strokeRect(wallStartX, baseY - 100, Lw * scale, 100);
            
            ctx.beginPath(); ctx.moveTo(wallStartX, baseY - 100); ctx.lineTo(wallEndX, baseY);
            ctx.moveTo(wallEndX, baseY - 100); ctx.lineTo(wallStartX, baseY);
            ctx.stroke();
            ctx.fillStyle = '#000'; ctx.fillText("耐力壁", wallStartX + Lw*scale/2 - 20, baseY - 45);

            function drawArrow(x, y, isDown, text) {
                ctx.beginPath();
                if(isDown) { ctx.moveTo(x, y-40); ctx.lineTo(x, y-5); ctx.lineTo(x-5, y-15); ctx.moveTo(x, y-5); ctx.lineTo(x+5, y-15); }
                else { ctx.moveTo(x, y+30); ctx.lineTo(x, y-5); ctx.lineTo(x-5, y+5); ctx.moveTo(x, y-5); ctx.lineTo(x+5, y+5); }
                ctx.strokeStyle = '#e53e3e'; ctx.lineWidth = 3; ctx.stroke();
                ctx.fillStyle = '#e53e3e'; ctx.fillText(text, x - 15, isDown ? y-45 : y+45);
            }
            drawArrow(wallStartX, baseY, true, "押込 N");
            drawArrow(wallEndX, baseY, false, "引抜 N");
            
            ctx.beginPath(); ctx.moveTo(p1X, baseY - 120); ctx.lineTo(p2X, baseY - 120);
            ctx.moveTo(p1X, baseY - 130); ctx.lineTo(p1X, baseY - 110);
            ctx.moveTo(p2X, baseY - 130); ctx.lineTo(p2X, baseY - 110);
            ctx.strokeStyle = '#718096'; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = '#000'; ctx.fillText("L1 = " + L1, p1X + L1*scale/2 - 30, baseY - 125);
        }

        function calculate() {
            const typeP = document.getElementById('type_primary').value;
            const typeSecL = document.getElementById('type_sec_L').value;
            const typeSecR = document.getElementById('type_sec_R').value;
            
            const H = parseFloat(document.getElementById('wall_H').value);
            const Lw = parseFloat(document.getElementById('wall_Lw').value);
            const a = parseFloat(document.getElementById('wall_a').value);
            const P = parseFloat(document.getElementById('wall_P').value) * 1000;
            const deltaW = parseFloat(document.getElementById('wall_deltaW').value);
            
            const N = P * H / Lw;

            const L1 = parseFloat(document.getElementById('beam1_L').value);
            const b1 = parseFloat(document.getElementById('beam1_b').value);
            const d1 = parseFloat(document.getElementById('beam1_d').value);
            const E1 = parseFloat(document.getElementById('beam1_E').value);
            const G1 = parseFloat(document.getElementById('beam1_G').value);
            const fb1 = parseFloat(document.getElementById('beam1_fb').value);
            const fs1 = parseFloat(document.getElementById('beam1_fs').value);
            const I1 = b1 * Math.pow(d1, 3) / 12; const A1 = b1 * d1;

            const x1 = a; const x2 = a + Lw;
            const R1_L = (N * (L1 - x1) - N * (L1 - x2)) / L1;
            const R1_R = -R1_L;

            const d1_x1_self = calcBeamDeflection(x1, x1, N, L1, E1, I1, G1, A1) + calcBeamDeflection(x1, x2, -N, L1, E1, I1, G1, A1);
            const d1_x2_self = calcBeamDeflection(x2, x1, N, L1, E1, I1, G1, A1) + calcBeamDeflection(x2, x2, -N, L1, E1, I1, G1, A1);

            let delta_sup_L = 0; let delta_sup_R = 0;
            let max_M2 = 0; let max_Q2 = 0;

            if (typeP === 'II' || typeP === 'III') {
                const L2 = parseFloat(document.getElementById('beam2_L').value);
                const y2 = parseFloat(document.getElementById('beam2_y').value);
                const b2 = parseFloat(document.getElementById('beam2_b').value);
                const d2 = parseFloat(document.getElementById('beam2_d').value);
                const fb2 = parseFloat(document.getElementById('beam2_fb').value);
                const fs2 = parseFloat(document.getElementById('beam2_fs').value);
                const E2 = E1; const G2 = G1;
                const I2 = b2 * Math.pow(d2, 3) / 12; const A2 = b2 * d2;

                const factorL = (typeSecL === '2') ? 1.5 : 1.0;
                const factorR = (typeSecR === '2') ? 1.5 : 1.0;

                if (typeP === 'III') {
                    delta_sup_L = calcBeamDeflection(y2, y2, R1_L, L2 * factorL, E2, I2, G2, A2);
                    max_M2 = Math.abs(R1_L * (L2 - y2) * y2 / L2);
                    max_Q2 = Math.abs(R1_L * Math.max(L2 - y2, y2) / L2);
                }
                
                delta_sup_R = calcBeamDeflection(y2, y2, R1_R, L2 * factorR, E2, I2, G2, A2);
                const M2_R = Math.abs(R1_R * (L2 - y2) * y2 / L2);
                const Q2_R = Math.abs(R1_R * Math.max(L2 - y2, y2) / L2);
                if (M2_R > max_M2) { max_M2 = M2_R; max_Q2 = Q2_R; }

                const secResults = document.getElementById('sec_beam_results');
                if (secResults) secResults.style.display = 'block';

                const sigmab2 = (max_M2) / (b2 * Math.pow(d2, 2) / 6);
                const tau2 = 1.5 * max_Q2 / A2;
                document.getElementById('res_M2').innerText = (max_M2/1000000).toFixed(2) + " kN・m";
                document.getElementById('res_sigmab2').innerText = sigmab2.toFixed(2) + " N/mm²";
                document.getElementById('jdg_sigmab2').innerHTML = (sigmab2 <= fb2) ? "<span class='ok'>OK</span>" : "<span class='ng'>NG</span>";
                document.getElementById('res_Q2').innerText = (max_Q2/1000).toFixed(2) + " kN";
                document.getElementById('res_tau2').innerText = tau2.toFixed(2) + " N/mm²";
                document.getElementById('jdg_tau2').innerHTML = (tau2 <= fs2) ? "<span class='ok'>OK</span>" : "<span class='ng'>NG</span>";
            } else {
                const secResults = document.getElementById('sec_beam_results');
                if (secResults) secResults.style.display = 'none';
            }

            const dL_total = d1_x1_self + delta_sup_L + (x1 / L1) * (delta_sup_R - delta_sup_L);
            const dR_total = d1_x2_self + delta_sup_L + (x2 / L1) * (delta_sup_R - delta_sup_L);
            const delta_delta = Math.abs(dL_total - dR_total);

            const delta_B = delta_delta * (H / Lw);
            const gamma = deltaW / (deltaW + delta_B);

            const M1_max = Math.abs(R1_L * x1);
            const Q1_max = Math.max(Math.abs(R1_L), Math.abs(R1_R));
            const sigmab1 = M1_max / (b1 * Math.pow(d1, 2) / 6);
            const tau1 = 1.5 * Q1_max / A1;

            document.getElementById('res_N').innerText = (N/1000).toFixed(2) + " kN";
            document.getElementById('res_dL').innerText = dL_total.toFixed(2) + " mm";
            document.getElementById('res_dR').innerText = dR_total.toFixed(2) + " mm";
            document.getElementById('res_delta').innerText = delta_delta.toFixed(2) + " mm";
            document.getElementById('res_deltaB').innerText = delta_B.toFixed(2) + " mm";
            document.getElementById('res_gamma').innerText = gamma.toFixed(3);

            document.getElementById('res_M1').innerText = (M1_max/1000000).toFixed(2) + " kN・m";
            document.getElementById('res_sigmab1').innerText = sigmab1.toFixed(2) + " N/mm²";
            document.getElementById('jdg_sigmab1').innerHTML = (sigmab1 <= fb1) ? "<span class='ok'>OK</span>" : "<span class='ng'>NG</span>";
            document.getElementById('res_Q1').innerText = (Q1_max/1000).toFixed(2) + " kN";
            document.getElementById('res_tau1').innerText = tau1.toFixed(2) + " N/mm²";
            document.getElementById('jdg_tau1').innerHTML = (tau1 <= fs1) ? "<span class='ok'>OK</span>" : "<span class='ng'>NG</span>";

            document.getElementById('resultArea').style.display = 'block';
        }

        document.addEventListener('DOMContentLoaded', () => {
            updateMaterial1();
            updateMaterial2();
            updateUI();
        });
