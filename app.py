from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
from datetime import datetime
import google.generativeai as genai
from dotenv import load_dotenv

# Import Octopart API and color coding
from octopartapi import OctopartAPI
from colour import apply_color_coding_to_excel
from excelwriter import ExcelWriter
from multi_api_integration import search_component_3api

# Load environment variables
load_dotenv()

app = FastAPI(title="Octopart FFF Validation with Color Coding - 3-API Integration")

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
DIGIKEY_CLIENT_ID = os.getenv("DIGIKEY_CLIENT_ID", "")
DIGIKEY_CLIENT_SECRET = os.getenv("DIGIKEY_CLIENT_SECRET", "")
MOUSER_API_KEY = os.getenv("MOUSER_API_KEY", "")
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

# Check 3-API configuration
print("=" * 60)
print("3-API Integration Status:")
print(f"  Octopart: {'[OK]' if octopart_api else '[NOT CONFIGURED]'}")
print(f"  Digi-Key: {'[OK]' if DIGIKEY_CLIENT_ID and DIGIKEY_CLIENT_SECRET else '[OPTIONAL]'}")
print(f"  Mouser: {'[OK]' if MOUSER_API_KEY else '[OPTIONAL]'}")
print(f"  Gemini: {'[OK]' if GEMINI_API_KEY else '[OPTIONAL]'}")
print("=" * 60)

# Pydantic models
class PriorityMap(BaseModel):
    parameter: str
    priority: int

class AnalyzeRequest(BaseModel):
    eol_part_number: str
    manufacturer: Optional[str] = None
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
async def lookup_eol_specs(part_number: str, manufacturer: str = None):
    """Lookup EOL part specifications from Octopart
    
    Args:
        part_number: Part number to search for
        manufacturer: Optional manufacturer name to prioritize
    """
    # Always use real Octopart data (no mock/sample data)
    if not octopart_api:
        raise HTTPException(status_code=503, detail="Octopart API not configured. Please add credentials to .env file")
    
    try:
        # Small limit to reduce API usage (EOL + up to 2 alternatives for lookup)
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
    """Generate and download color-coded Excel report using 3-API integration.
    
    Uses Octopart (cached 30 days) + Digi-Key + Mouser (real-time pricing).
    Falls back to Octopart-only if other APIs are not configured.
    """
    try:
        eol_part_number = request.eol_part_number

        if not octopart_api:
            raise HTTPException(status_code=503, detail="Octopart API not configured")

        # Try 3-API integration first (if Digi-Key and/or Mouser are configured)
        merged_parts = []
        
        if DIGIKEY_CLIENT_ID or MOUSER_API_KEY:
            # Use 3-API integration
            print(f"\n[INFO] Using 3-API integration (Octopart + Digi-Key + Mouser)")
            manufacturer_name = request.manufacturer if request.manufacturer else None
            merged_parts = search_component_3api(
                octopart_id=OCTOPART_CLIENT_ID,
                octopart_secret=OCTOPART_CLIENT_SECRET,
                digikey_id=DIGIKEY_CLIENT_ID,
                digikey_secret=DIGIKEY_CLIENT_SECRET,
                mouser_key=MOUSER_API_KEY,
                part_number=eol_part_number,
                manufacturer=manufacturer_name,
                limit=5  # Set to 5 alternatives as requested
            )
            
            if not merged_parts:
                raise HTTPException(status_code=404, detail="No parts found from 3-API integration")
        else:
            # Fallback to Octopart-only
            print(f"\n[INFO] Using Octopart-only (Digi-Key/Mouser not configured)")
            recommendations = octopart_api.search_similar_parts(eol_part_number, limit=5)
            if not recommendations:
                raise HTTPException(status_code=404, detail="No parts found from Octopart")
            
            # Convert to merged format
            for rec in recommendations:
                merged = {}
                merged['MPN'] = rec.get('ManufacturerPartNumber', rec.get('MPN', 'N/A'))
                merged['Manufacturer'] = rec.get('Manufacturer', 'N/A')
                merged['Description'] = rec.get('Description', rec.get('ShortDescription', 'N/A'))
                merged['Category'] = rec.get('Category', 'N/A')
                
                # Add all specs
                for key, value in rec.items():
                    if key not in ['ManufacturerPartNumber', 'MPN', 'Manufacturer', 'Description', 
                                  'ShortDescription', 'Category', '_internal_id', '_source']:
                        if not key.startswith('SPEC_'):
                            merged[f'SPEC_{key}'] = value
                        else:
                            merged[key] = value
                
                merged_parts.append(merged)

        # Create Excel with ExcelWriter (includes color coding)
        excel_writer = ExcelWriter()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        temp_filename = f"EOL_Alternatives_{eol_part_number}_{timestamp}.xlsx"
        temp_filepath = os.path.join("reports", temp_filename)

        # Ensure reports directory exists
        os.makedirs("reports", exist_ok=True)

        # Use the new create_comparison method directly
        temp_file = temp_filepath.replace('.xlsx', '_temp.xlsx')
        excel_writer.create_comparison(
            parts_data=merged_parts,
            filename=temp_file,
            original_part=eol_part_number
        )
        
        # Apply color coding
        final_file = temp_filepath
        try:
            import time
            time.sleep(0.5)
            apply_color_coding_to_excel(temp_file, final_file)
            
            # Clean up temp file
            if os.path.exists(temp_file):
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        time.sleep(0.3)
                        os.remove(temp_file)
                        break
                    except PermissionError:
                        if attempt < max_retries - 1:
                            time.sleep(0.5)
                else:
                    print(f"[WARNING] Could not delete temp file")
        except Exception as e:
            print(f"[WARNING] Color coding failed: {e}")
            if os.path.exists(temp_file):
                import time
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        time.sleep(0.3)
                        if os.path.exists(final_file):
                            os.remove(final_file)
                        os.rename(temp_file, final_file)
                        break
                    except (PermissionError, OSError):
                        if attempt < max_retries - 1:
                            time.sleep(0.5)

        # Return the color-coded file
        return FileResponse(
            path=final_file,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=os.path.basename(final_file)
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
    print("Starting End of Line Part Replacer - 3-API Integration")
    print("=" * 60)
    print(f"Octopart API: {'[OK]' if octopart_api else '[NOT CONFIGURED]'}")
    print(f"Digi-Key API: {'[OK]' if DIGIKEY_CLIENT_ID and DIGIKEY_CLIENT_SECRET else '[OPTIONAL]'}")
    print(f"Mouser API: {'[OK]' if MOUSER_API_KEY else '[OPTIONAL]'}")
    print(f"Gemini API: {'[OK]' if GEMINI_API_KEY else '[OPTIONAL]'}")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8001)
