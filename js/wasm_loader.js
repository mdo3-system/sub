// ========================================================
// WebAssembly (Wasm) コアエンジン ローダー
// ========================================================
(function() {
    window.WasmEngine = {
        isLoaded: false,
        exports: null,
        
        /**
         * Wasmモジュールの初期化
         * @param {string} wasmUrl - calc_core.wasm へのパス
         */
        async init(wasmUrl = "../wasm/calc_core.wasm") {
            try {
                let response;
                if (typeof WebAssembly.instantiateStreaming === "function") {
                    try {
                        const result = await WebAssembly.instantiateStreaming(fetch(wasmUrl), {});
                        this.exports = result.instance.exports;
                        this.isLoaded = true;
                        return this.exports;
                    } catch (e) {
                        // フォールバック: arrayBuffer
                        console.warn("[WasmEngine] instantiateStreaming failed, falling back to arrayBuffer:", e);
                    }
                }
                
                const res = await fetch(wasmUrl);
                const bytes = await res.arrayBuffer();
                const result = await WebAssembly.instantiate(bytes, {});
                this.exports = result.instance.exports;
                this.isLoaded = true;
                return this.exports;
            } catch (err) {
                console.error("[WasmEngine] Failed to load Wasm:", err);
                this.isLoaded = false;
                return null;
            }
        },

        // 各種Wasm計算関数のプロキシ
        calcColumnCheckRatio(b, h, lk, N, q, B, Cf, Fc, Fb) {
            if (this.isLoaded && this.exports && this.exports.calcColumnCheckRatio) {
                return this.exports.calcColumnCheckRatio(b, h, lk, N, q, B, Cf, Fc, Fb);
            }
            return null; // 未ロード時はnull（JS側フォールバック）
        },

        calcColumnFk(h, lk, Fc) {
            if (this.isLoaded && this.exports && this.exports.calcColumnFk) {
                return this.exports.calcColumnFk(h, lk, Fc);
            }
            return null;
        },

        calcMerikomiRatio(P, b, l, Fs) {
            if (this.isLoaded && this.exports && this.exports.calcMerikomiRatio) {
                return this.exports.calcMerikomiRatio(P, b, l, Fs);
            }
            return null;
        },

        calcBalancedRebarRatio(fc, fy) {
            if (this.isLoaded && this.exports && this.exports.calcBalancedRebarRatio) {
                return this.exports.calcBalancedRebarRatio(fc, fy);
            }
            return null;
        },

        calcCantileverMoment(w, P, L) {
            if (this.isLoaded && this.exports && this.exports.calcCantileverMoment) {
                return this.exports.calcCantileverMoment(w, P, L);
            }
            return null;
        }
    };

    // DOMロード時に自動初期化を試行
    if (typeof window !== "undefined") {
        window.addEventListener("DOMContentLoaded", () => {
            // パス解決: tools配下なら ../wasm/、ルートなら ./wasm/
            const isSubDir = window.location.pathname.includes("/tools/");
            const wasmPath = isSubDir ? "../wasm/calc_core.wasm" : "./wasm/calc_core.wasm";
            window.WasmEngine.init(wasmPath);
        });
    }
})();
