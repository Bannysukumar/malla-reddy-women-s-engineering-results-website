Write-Host "==> Building React frontend..."
Set-Location frontend
npm ci
npm run build
Set-Location ..

Write-Host ""
Write-Host "Project structure:"
Write-Host "  backend/   - Flask API + Playwright scraper"
Write-Host "  frontend/  - React app (deploy to Vercel)"
Write-Host ""
Write-Host "Local dev:"
Write-Host "  python backend/server.py     # API on :3000"
Write-Host "  cd frontend && npm run dev   # UI on :5173"
Write-Host ""
Write-Host "Deploy:"
Write-Host "  vercel --prod                # frontend (set VITE_API_URL)"
Write-Host "  render.com                   # backend (Docker, set ALLOWED_ORIGINS)"
Write-Host ""
