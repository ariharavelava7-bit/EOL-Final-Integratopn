# End of Line Part Replacer

## Simplified Workflow

**No color coding in UI - Only in downloaded Excel!**

### 3 Simple Steps:
1. **Lookup** part specifications from Octopart
2. **Set priorities** for each parameter (1, 2, or 3)
3. **Download** color-coded Excel report

---

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
npm install
```

### 2. Configure API Keys
Create `.env` file:
```
OCTOPART_CLIENT_ID=your_octopart_client_id
OCTOPART_CLIENT_SECRET=your_octopart_client_secret
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Run Application
```bash
# Terminal 1 - Backend
python app.py

# Terminal 2 - Frontend
npm run dev
```

### 4. Open Browser
```
http://localhost:3001
```

---

## Features

### UI (Simple & Clean)
- ✅ Part lookup
- ✅ Priority settings
- ✅ Download button
- ❌ No color-coded tables
- ❌ No analysis display

### Excel Export (Beautiful)
- 🟨 Yellow headers
- ⬜ Gray attribute column
- 🟢 Green = Match
- 🟠 Orange = Variation
- 🔴 Red = Missing/Critical

---

## API Endpoints

```
GET  /api/v1/lookup_eol_specs/{part_number}
POST /api/v1/download_report
```

---

## Technology Stack

- **Backend:** FastAPI + Uvicorn
- **Frontend:** React + Vite
- **APIs:** Octopart (parts) + Gemini (AI analysis)
- **Color Coding:** colour.py module
- **Excel:** openpyxl + pandas

---

## Test Part Numbers

- `LM317` - Voltage regulator
- `MCP73831T` - Battery charger
- `ATMEGA328P` - Microcontroller

---

## What Was Simplified

### Removed:
- ❌ Color-coded UI tables
- ❌ Analysis display in frontend
- ❌ Complex multi-step workflow
- ❌ DigiKey API
- ❌ Mouser API

### Kept:
- ✅ Octopart integration
- ✅ Gemini AI analysis
- ✅ Color-coded Excel export
- ✅ Priority settings
- ✅ Simple 3-step workflow

---

## File Structure

```
├── app.py                  # Simplified backend
├── colour.py              # Color coding logic
├── octopartapi.py         # Octopart API client
├── excelwriter.py         # Excel export
├── src/
│   └── components/
│       └── Dashboard.jsx  # Simplified UI
└── reports/              # Generated Excel files
```

---

## License

MIT

