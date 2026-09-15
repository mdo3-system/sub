@echo off
echo ========================================================
echo Deploying to XServer (/home/mdo3/thanks.work/public_html/kozo/)
echo ========================================================
ssh -o BatchMode=yes -p 10022 mdo3@mdo3.xsrv.jp "cd /home/mdo3/thanks.work/public_html/kozo && git pull origin main"
if %ERRORLEVEL% equ 0 (
    echo Deploy completed successfully.
) else (
    echo Deploy failed with error level %ERRORLEVEL%.
)
