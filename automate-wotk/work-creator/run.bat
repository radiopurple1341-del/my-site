@echo off
chcp 65001 > nul
python "%~dp0generate.py"
pause
