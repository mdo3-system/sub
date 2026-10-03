@echo off
chcp 65001 > nul
echo ======================================================================
echo   sub -> mdo3 ツール更新通知 ＆ note+/X 告知生成トリガー
echo ======================================================================
set "MDO3_DIR=%~dp0..\mdo3"
if exist "%MDO3_DIR%\tools\update_pipeline\scan_sub_updates.py" (
    py "%MDO3_DIR%\tools\update_pipeline\scan_sub_updates.py"
    echo [完了] mdo3 STUDIO の更新データ (tool_updates.json) を更新しました。
)
