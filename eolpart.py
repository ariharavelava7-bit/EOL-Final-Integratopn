"""
eol_finder.py - Main EOL Part Finder Logic
Handles part selection, enrichment, and coordination
"""


import re
from typing import Dict, List, Optional
from datetime import datetime
from api_mouser import MouserAPI
from api_digikey import DigiKeyAPI
from api_octopart import OctopartAPI
from excel_writer import ExcelWriter

# Define a consistent set of values to treat as "empty"
EMPTY_VALUES = ('Not Available', None, "")

class EOLPartFinder:
    """
    Main class with Cross-API Data Enrichment.
    
    Coordinates fetching data from Mouser, DigiKey, and Octopart,
    enriches the data by cross-referencing all APIs, and
    compiles a list of unique component alternatives.
    """

    def __init__(self, mouser_key: str, digikey_id: str, digikey_secret: str,
                 octopart_id: str, octopart_secret: str):
        
        self.mouser = MouserAPI(mouser_key)
        self.digikey = DigiKeyAPI(digikey_id, digikey_secret)
        self.octopart = OctopartAPI(octopart_id, octopart_secret)
        
        # Map of API sources to their respective fetch methods and names
        self.api_sources = {
            'Mouser': (self.mouser.fetch, "Mouser pricing"),
            'Digikey': (self.digikey.fetch, "Digikey data"),
            'Octopart': (self.octopart.fetch, "Octopart specs"),
        }

    def find_alternatives(self, part_number: str, output_file: str = None) -> List[Dict]:
        """Find alternative parts from all three sources with cross-API enrichment"""
        print(f"\n{'='*60}")
        print(f"🔎 Searching for alternatives to: {part_number}")
        print(f"{'='*60}")

        recommendations = []
        selected_parts = set()  # Tracks (mpn, mfr) tuples to avoid duplicates

        # Search all sources
        for source_name, (fetch_method, _) in self.api_sources.items():
            print(f"\n--- Searching {source_name} ---")
            parts = fetch_method(part_number)
            best_part = self._get_best_part(parts, source_name, selected_parts)

            if best_part:
                mpn = best_part.get('ManufacturerPartNumber', 'Unknown')
                mfr = best_part.get('Manufacturer', 'Unknown')
                print(f"✔️ Selected from {source_name}: {mpn} by {mfr}")
                
                # Add to set to prevent re-selection from other APIs
                selected_parts.add((mpn.lower().strip(), mfr.lower().strip()))
                
                # Enrich the part with data from the *other* APIs
                enriched_part = self._enrich_part_data(best_part, mpn, mfr)
                recommendations.append(enriched_part)
            else:
                print(f"❌ No unique part found from {source_name}")

        # Save to Excel
        if recommendations:
            if not output_file:
                # Sanitize part number for a safe filename
                safe_part_number = re.sub(r'[^\w\-_\. ]', '_', part_number)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_file = f"EOL_Alternatives_{safe_part_number}_{timestamp}.xlsx"
            
            writer = ExcelWriter()
            writer.save_to_excel(part_number, recommendations, output_file)
            
            print(f"\n{'='*60}")
            print(f"✅ Found {len(recommendations)} unique enriched alternative(s)")
            print(f"Each recommendation is from a different MPN+Manufacturer")
            print(f"{'='*60}\n")
        else:
            print(f"\n❌ No alternatives found across all sources")
            
        return recommendations

    def _enrich_part_data(self, part: Dict, mpn: str, manufacturer: str) -> Dict:
        """Enrich part data by fetching missing information from other APIs"""
        print(f"\n🔄 Enriching data for {mpn}...")
        original_source = part.get('Source')
        enriched = part.copy()
        search_query = f"{mpn} {manufacturer}".strip()

        # Loop through all available API sources
        for source_name, (fetch_method, data_description) in self.api_sources.items():
            # Skip the API this part originally came from
            if source_name == original_source:
                continue
            
            print(f"→ Enriching with {data_description}...")
            try:
                other_parts = fetch_method(search_query, limit=5)
                matching_part = self._find_matching_part(other_parts, mpn, manufacturer)
                
                if matching_part:
                    filled_count = self._count_filled_fields(matching_part)
                    enriched = self._merge_data(enriched, matching_part)
                    print(f"✔️ Added {filled_count} fields from {source_name}")
            except Exception as e:
                print(f"⚠️ Error enriching from {source_name}: {e}")
        
        return enriched

    def _find_matching_part(self, parts: List[Dict], mpn: str, manufacturer: str) -> Optional[Dict]:
        """Find a part that strictly matches the MPN and loosely matches manufacturer"""
        mpn_lower = mpn.lower().strip()
        mfr_lower = manufacturer.lower().strip()

        # Don't try to match if we have no MPN or Manufacturer
        if mpn_lower in EMPTY_VALUES or mfr_lower in EMPTY_VALUES:
            return None

        for part in parts:
            part_mpn = part.get('ManufacturerPartNumber', "").lower().strip()
            part_mfr = part.get('Manufacturer', "").lower().strip()

            # Strict match on MPN
            if part_mpn == mpn_lower:
                # Loose match on manufacturer (e.g., "TI" matches "Texas Instruments")
                if mfr_lower in part_mfr or part_mfr in mfr_lower:
                    return part
        return None

    def _merge_data(self, primary: Dict, secondary: Dict) -> Dict:
        """Merge two dictionaries, filling in 'empty' values from secondary"""
        merged = primary.copy()

        for key, value in secondary.items():
            if key == 'Source':  # Don't overwrite the original source
                continue
            
            # Add if key is new, or if primary value is "empty" and secondary is not
            if key not in merged or merged.get(key) in EMPTY_VALUES:
                if value not in EMPTY_VALUES:
                    merged[key] = value
        
        return merged

    def _count_filled_fields(self, data: Dict) -> int:
        """Count non-'empty' fields, excluding 'Source'"""
        count = 0
        for key, value in data.items():
            if key != 'Source' and value not in EMPTY_VALUES:
                count += 1
        return count

    def _get_best_part(self, parts: List[Dict], source: str, exclude_parts: set) -> Optional[Dict]:
        """Get the first valid part from the list, excluding already selected parts"""
        if not parts:
            return None
            
        for part in parts:
            mpn = part.get('ManufacturerPartNumber')
            mfr = part.get('Manufacturer')

            # Check if part has valid MPN and MFR
            if mpn in EMPTY_VALUES or mfr in EMPTY_VALUES:
                continue
            
            # Check if this (mpn, mfr) combo has already been selected
            part_key = (mpn.lower().strip(), mfr.lower().strip())
            if part_key in exclude_parts:
                continue
            
            # This is a valid, unique part
            return part
        
        print(f"⚠️ All parts found from {source} are duplicates of already selected parts")
        return None