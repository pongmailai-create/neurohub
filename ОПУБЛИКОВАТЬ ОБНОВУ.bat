@echo off
chcp 65001 >nul
title NeuroHub - Publish Update
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish-update.ps1"
