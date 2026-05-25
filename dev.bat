@echo off
cd /d %~dp0
rd /s /q .astro
npx astro dev --host