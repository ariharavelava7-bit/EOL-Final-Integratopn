from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict
import os
from datetime import datetime
import google.generativeai as genai
from dotenv import load_dotenv

# Import Octopart API and color coding
from octopartapi import OctopartAPI
from colour import apply_color_coding_to_excel
from excelwriter import ExcelWriter

# Load environment variables
load_dotenv()

app = FastAPI(title="Octopart FFF Validation with Color Coding")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
OCTOPART_CLIENT_ID = os.getenv("OCTOPART_CLIENT_ID", "")
OCTOPART_CLIENT_SECRET = os.getenv("OCTOPART_CLIENT_SECRET", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Initialize APIs
octopart_api = None
if OCTOPART_CLIENT_ID and OCTOPART_CLIENT_SECRET:
    octopart_api = OctopartAPI(OCTOPART_CLIENT_ID, OCTOPART_CLIENT_SECRET)
else:
    print("WARNING: Octopart credentials not configured")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("WARNING: Gemini API key not configured")

# Pydantic models
class PriorityMap(BaseModel):
    parameter: str
    priority: int

class AnalyzeRequest(BaseModel):
    eol_part_number: str
    priority_map: List[PriorityMap]

class PartSpec(BaseModel):
    parameter: str
    value: str

class EOLSpecResponse(BaseModel):
    part_number: str
    specs: List[PartSpec]

@app.get("/")
async def root():
    return {"message": "End of Line Part Replacer API"}

@app.get("/api/v1/lookup_eol_specs/{part_number}")
async def lookup_eol_specs(part_number: str):
    """Lookup EOL part specifications from Octopart"""
    # Always use real Octopart data (no mock/sample data)
    if not octopart_api:
        raise HTTPException(status_code=503, detail="Octopart API not configured. Please add credentials to .env file")
    
    try:
        # Small limit to reduce API usage (EOL + up to 2 alternatives)
        recommendations = octopart_api.search_similar_parts(part_number, limit=3)
        if not recommendations:
            raise HTTPException(status_code=404, detail=f"No parts found for {part_number}")

        eol_part = recommendations[0]
        specs: List[PartSpec] = []
        for key, value in eol_part.items():
            if key not in ['_internal_id', '_source']:
                specs.append(PartSpec(parameter=key, value=str(value)))

        return EOLSpecResponse(part_number=part_number, specs=specs)
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching specs: {str(e)}")

@app.post("/api/v1/download_report")
async def download_report(request: AnalyzeRequest):
    """Generate and download color-coded Excel report using real Octopart data.

    Uses a very small Octopart limit (3) → EOL + up to 2 alternatives.
    """
    try:
        eol_part_number = request.eol_part_number

        if not octopart_api:
            raise HTTPException(status_code=503, detail="Octopart API not configured")

        # Fetch a very small number of parts (EOL + up to 2 alternatives)
        recommendations = octopart_api.search_similar_parts(eol_part_number, limit=3)
        if not recommendations:
            raise HTTPException(status_code=404, detail="No parts found from Octopart")

        # Create Excel with ExcelWriter (includes color coding)
        excel_writer = ExcelWriter()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        temp_filename = f"EOL_Alternatives_{eol_part_number}_{timestamp}.xlsx"
        temp_filepath = os.path.join("reports", temp_filename)

        # Ensure reports directory exists
        os.makedirs("reports", exist_ok=True)

        # Save with color coding enabled
        excel_writer.save_to_excel(
            original_part=eol_part_number,
            recommendations=recommendations,
            output_file=temp_filepath,
            apply_color_coding=True
        )

        # Return the color-coded file
        return FileResponse(
            path=temp_filepath,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=os.path.basename(temp_filepath)
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

async def analyze_with_gemini(eol_specs: Dict, candidate_specs: Dict, priority_map: List[Dict]) -> Dict:
    """Use Gemini AI to perform FFF validation and color coding decisions"""
    if not GEMINI_API_KEY:
        # Fallback without Gemini
        return fallback_comparison(eol_specs, candidate_specs)
    
    try:
        # Build prompt
        priority_text = "\n".join([
            f"- {p['parameter']}: Priority {p['priority']} "
            f"({'Must Match' if p['priority'] == 1 else 'Can Differ' if p['priority'] == 2 else 'Cosmetic'})"
            for p in priority_map
        ])
        
        eol_text = "\n".join([f"- {k}: {v}" for k, v in eol_specs.items() if not k.startswith('_')])
        candidate_text = "\n".join([f"- {k}: {v}" for k, v in candidate_specs.items() if not k.startswith('_')])
        
        user_prompt = f"""
Compare these electronic component specifications and determine color coding:

EOL Part Specifications:
{eol_text}

Candidate Part Specifications:
{candidate_text}

User Priority Map:
{priority_text}

For each parameter, determine the color:
- "MATCH" (Green): Exact match or functionally equivalent
- "VARIATION" (Yellow): Slight variation that may be acceptable
- "NO_MATCH" (Red): Significant difference or missing data

Return JSON format:
{{
  "comparison_matrix": [
    {{
      "parameter": "parameter_name",
      "eol_value": "value1",
      "candidate_value": "value2",
      "ai_status": "MATCH" | "VARIATION" | "NO_MATCH",
      "reasoning": "explanation"
    }}
  ],
  "overall_status": "MATCH" | "VARIATION" | "NO_MATCH"
}}
"""
        
        model = genai.GenerativeModel(model_name="gemini-1.5-flash")
        response = model.generate_content(user_prompt)
        
        # Parse JSON from response
        response_text = response.text
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
        
        import json
        result = json.loads(response_text.strip())
        return result
    
    except Exception as e:
        print(f"Gemini API error: {e}")
        return fallback_comparison(eol_specs, candidate_specs)

def fallback_comparison(eol_specs: Dict, candidate_specs: Dict) -> Dict:
    """Fallback comparison without Gemini"""
    comparison = []
    all_params = set(eol_specs.keys()) | set(candidate_specs.keys())
    
    for param in all_params:
        if param.startswith('_'):
            continue
            
        eol_val = str(eol_specs.get(param, "N/A"))
        cand_val = str(candidate_specs.get(param, "N/A"))
        
        if eol_val == cand_val and eol_val != "N/A":
            status = "MATCH"
        elif eol_val != "N/A" and cand_val != "N/A":
            status = "VARIATION"
        else:
            status = "NO_MATCH"
        
        comparison.append({
            "parameter": param,
            "eol_value": eol_val,
            "candidate_value": cand_val,
            "ai_status": status,
            "reasoning": "Automatic comparison"
        })
    
    return {
        "comparison_matrix": comparison,
        "overall_status": "VARIATION"
    }

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("Starting End of Line Part Replacer")
    print("=" * 60)
    print(f"Octopart API: {'[OK]' if octopart_api else '[NOT CONFIGURED]'}")
    print(f"Gemini API: {'[OK]' if GEMINI_API_KEY else '[NOT CONFIGURED]'}")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8001)
