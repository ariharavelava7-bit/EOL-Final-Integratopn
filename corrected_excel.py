#!/usr/bin/env python3
"""
3-API COMPONENT SEARCH INTEGRATION
Octopart (Nexar) + Digi-Key + Mouser

Enhanced with 30-day caching for specifications
Real-time pricing from Mouser
"""

import requests
import json
import pandas as pd
from datetime import datetime, timedelta
import hashlib
import os
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.utils import get_column_letter
import urllib3

# Suppress SSL certificate warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ============================================================================
# SMART CACHE SYSTEM - 30 Day TTL
# ============================================================================

class SmartCache:
    """30-day cache for component specifications"""
    
    def __init__(self, cache_dir=".component_cache"):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        
    def _get_cache_key(self, part_number):
        """Generate cache key from part number"""
        return hashlib.md5(part_number.encode()).hexdigest()
    
    def get(self, part_number):
        """Get cached data if not expired (30 days)"""
        cache_key = self._get_cache_key(part_number)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        
        if not os.path.exists(cache_file):
            return None
        
        try:
            with open(cache_file, 'r') as f:
                cached = json.load(f)
            
            # Check if expired (30 days)
            cached_time = datetime.fromisoformat(cached['timestamp'])
            if datetime.now() - cached_time > timedelta(days=30):
                print(f"   ⏰ Cache expired for {part_number}")
                return None
            
            print(f"   ✓ Using cached data for {part_number} (saved API call!)")
            return cached['data']
            
        except Exception as e:
            print(f"   ⚠ Cache read error: {e}")
            return None
    
    def set(self, part_number, data):
        """Save data to cache"""
        cache_key = self._get_cache_key(part_number)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        
        try:
            cache_data = {
                'timestamp': datetime.now().isoformat(),
                'part_number': part_number,
                'data': data
            }
            
            with open(cache_file, 'w') as f:
                json.dump(cache_data, f, indent=2)
                
        except Exception as e:
            print(f"   ⚠ Cache write error: {e}")


# ============================================================================
# OCTOPART (NEXAR) API CLIENT - WITH CACHING
# ============================================================================

class OctopartClient:
    """Octopart/Nexar API client with 30-day caching"""
    
    def __init__(self, client_id, client_secret):
        self.client_id = client_id
        self.client_secret = client_secret
        self.token_url = "https://identity.nexar.com/connect/token"
        self.api_url = "https://api.nexar.com/graphql"
        self.access_token = None
        self.cache = SmartCache()
        
    def get_access_token(self):
        """Get OAuth2 access token"""
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "supply.domain"
        }
        
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        try:
            response = requests.post(self.token_url, data=payload, headers=headers, verify=False)
            response.raise_for_status()
            result = response.json()
            self.access_token = result.get('access_token')
            return self.access_token
            
        except Exception as e:
            print(f"❌ Nexar authentication error: {e}")
            return None
    
    def search_part_with_similar(self, part_number, limit=10):
        """Search for part and similar parts - WITH CACHING"""
        
        # Check cache first
        cached = self.cache.get(part_number)
        if cached:
            return cached
        
        print(f"\n🔍 Searching Octopart for: {part_number}")
        
        if not self.access_token:
            self.get_access_token()
        
        query = """
        query SearchPart($q: String!, $limit: Int!) {
          supSearch(q: $q, limit: $limit) {
            results {
              part {
                mpn
                manufacturer {
                  name
                }
                category {
                  name
                }
                shortDescription
                specs {
                  attribute {
                    name
                  }
                  displayValue
                }
              }
            }
          }
        }
        """
        
        variables = {"q": part_number, "limit": limit}
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        payload = {"query": query, "variables": variables}
        
        try:
            response = requests.post(self.api_url, json=payload, headers=headers, verify=False)
            response.raise_for_status()
            result = response.json()
            
            if 'errors' in result:
                print(f"❌ Octopart error: {result['errors']}")
                return []
            
            results = result.get('data', {}).get('supSearch', {}).get('results', [])
            parts = [r.get('part') for r in results if r.get('part')]
            
            print(f"   ✓ Found {len(parts)} parts from Octopart")
            
            # Cache the results for 30 days
            self.cache.set(part_number, parts)
            
            return parts
            
        except Exception as e:
            print(f"❌ Octopart search error: {e}")
            return []


# ============================================================================
# DIGI-KEY API CLIENT
# ============================================================================

class DigiKeyClient:
    """Digi-Key API client"""
    
    def __init__(self, client_id, client_secret):
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.base_url = "https://api.digikey.com"
        
    def authenticate(self):
        """Get OAuth2 access token"""
        token_url = f"{self.base_url}/v1/oauth2/token"
        
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "client_credentials"
        }
        
        try:
            response = requests.post(token_url, data=data, verify=False)
            if response.status_code == 200:
                result = response.json()
                self.access_token = result.get("access_token")
                return True
            return False
        except:
            return False
    
    def search_part(self, part_number):
        """Search for additional specs if needed"""
        if not self.access_token:
            if not self.authenticate():
                return None
        
        print(f"   🔍 Checking Digi-Key for additional specs...")
        
        url = f"{self.base_url}/products/v4/search/keyword"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "X-DIGIKEY-Client-Id": self.client_id,
            "Content-Type": "application/json"
        }
        payload = {
            "Keywords": part_number,
            "RecordCount": 1,
            "RecordStartPosition": 0
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, verify=False)
            if response.status_code == 200:
                data = response.json()
                products = data.get('Products', [])
                if products:
                    print(f"   ✓ Found additional specs from Digi-Key")
                    return products[0]
            return None
        except:
            return None


# ============================================================================
# MOUSER API CLIENT - ALWAYS REAL-TIME
# ============================================================================

class MouserClient:
    """Mouser API client - real-time pricing/stock"""
    
    # Common manufacturer name variations
    MANUFACTURER_ALIASES = {
        'onsemi': 'ON Semiconductor',
        'on semiconductor': 'ON Semiconductor',
        'on semi': 'ON Semiconductor',
        'stmicroelectronics': 'STMicroelectronics',
        'st': 'STMicroelectronics',
        'stm': 'STMicroelectronics',
        'texas instruments': 'Texas Instruments',
        'ti': 'Texas Instruments',
        'analog devices': 'Analog Devices',
        'adi': 'Analog Devices',
        'maxim': 'Maxim Integrated',
        'maxim integrated': 'Maxim Integrated',
        'nxp': 'NXP Semiconductors',
        'nxp semiconductors': 'NXP Semiconductors',
        'infineon': 'Infineon Technologies',
        'infineon technologies': 'Infineon Technologies',
        'microchip': 'Microchip Technology',
        'microchip technology': 'Microchip Technology',
        'diodes': 'Diodes Incorporated',
        'diodes incorporated': 'Diodes Incorporated',
        'diodes inc': 'Diodes Incorporated',
        'renesas': 'Renesas Electronics',
        'renesas electronics': 'Renesas Electronics',
        'vishay': 'Vishay',
        'rohm': 'ROHM Semiconductor',
        'rohm semiconductor': 'ROHM Semiconductor',
        'toshiba': 'Toshiba',
        'panasonic': 'Panasonic',
        'murata': 'Murata',
        'yageo': 'Yageo',
        'kemet': 'KEMET',
        'avx': 'AVX',
        'kyocera': 'Kyocera',
        'bourns': 'Bourns',
        'littelfuse': 'Littelfuse',
        'samsung': 'Samsung',
        'fairchild': 'Fairchild Semiconductor',
        'fairchild semiconductor': 'Fairchild Semiconductor',
        'idt': 'IDT',
        'cypress': 'Cypress Semiconductor',
        'cypress semiconductor': 'Cypress Semiconductor',
        'freescale': 'Freescale Semiconductor',
        'freescale semiconductor': 'Freescale Semiconductor',
        'broadcom': 'Broadcom',
        'linear technology': 'Linear Technology',
        'lt': 'Linear Technology',
        'ltc': 'Linear Technology',
    }
    
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://api.mouser.com/api/v1"
    
    def normalize_manufacturer(self, manufacturer):
        """Normalize manufacturer name to Mouser's format"""
        if not manufacturer:
            return None
        mfr_lower = manufacturer.lower().strip()
        return self.MANUFACTURER_ALIASES.get(mfr_lower, manufacturer)
        
    def get_pricing_and_stock(self, part_number, manufacturer=None):
        """Get real-time pricing and stock - NO CACHING"""
        
        # Normalize manufacturer name
        normalized_mfr = self.normalize_manufacturer(manufacturer) if manufacturer else None
        
        if normalized_mfr:
            print(f"   💰 Getting pricing from Mouser for {normalized_mfr} {part_number}...")
        else:
            print(f"   💰 Getting pricing from Mouser...")
        
        url = f"{self.base_url}/search/partnumber?apiKey={self.api_key}"
        
        # Always search by part number only
        payload = {
            "SearchByPartRequest": {
                "mouserPartNumber": part_number,
                "partSearchOptions": ""
            }
        }
        
        headers = {
            "Content-Type": "application/json",
            "accept": "application/json"
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, verify=False)
            response.raise_for_status()
            result = response.json()
            
            parts = result.get('SearchResults', {}).get('Parts', [])
            
            if not parts:
                print(f"   ⚠ No parts found in Mouser")
                return None
            
            # If manufacturer specified, find the exact match
            if normalized_mfr:
                normalized_lower = normalized_mfr.lower()
                
                for part in parts:
                    part_mfr = part.get('Manufacturer', '').strip().lower()
                    
                    # Check if manufacturer name contains our search term
                    if normalized_lower in part_mfr:
                        print(f"   ✓ Found match: {part.get('Manufacturer')}")
                        return part
                    
                    # Also check original manufacturer name (before normalization)
                    if manufacturer and manufacturer.lower() in part_mfr:
                        print(f"   ✓ Found match: {part.get('Manufacturer')}")
                        return part
                
                # No match found, use first result
                print(f"   ⚠ '{normalized_mfr}' not found, using: {parts[0].get('Manufacturer', 'Unknown')}")
                return parts[0]
            else:
                # No manufacturer specified, return first result
                print(f"   ✓ Got pricing from Mouser")
                return parts[0]
            
        except Exception as e:
            print(f"   ⚠ Mouser error: {e}")
            return None


# ============================================================================
# SMART DATA MERGER
# ============================================================================

class DataMerger:
    """Intelligently merge data from all 3 APIs"""
    
    @staticmethod
    def merge_part_data(octopart_data, digikey_data, mouser_data):
        """Merge data with priority rules"""
        merged = {}
        
        # Basic info from Octopart
        if octopart_data:
            merged['MPN'] = octopart_data.get('mpn', 'N/A')
            
            manufacturer = octopart_data.get('manufacturer', {})
            merged['Manufacturer'] = manufacturer.get('name', 'N/A') if manufacturer else 'N/A'
            
            merged['Description'] = octopart_data.get('shortDescription', 'N/A')
            
            category = octopart_data.get('category', {})
            merged['Category'] = category.get('name', 'N/A') if category else 'N/A'
            
            # All specifications from Octopart
            specs = octopart_data.get('specs', [])
            for spec in specs:
                attr = spec.get('attribute', {})
                attr_name = attr.get('name', 'Unknown')
                attr_value = spec.get('displayValue', 'N/A')
                merged[f"SPEC_{attr_name}"] = attr_value
        
        # Additional specs from Digi-Key if available
        if digikey_data:
            parameters = digikey_data.get('Parameters', [])
            for param in parameters:
                param_name = param.get('ParameterText', 'Unknown')
                param_value = param.get('ValueText', 'N/A')
                spec_key = f"SPEC_{param_name}"
                # Only add if not already present
                if spec_key not in merged:
                    merged[spec_key] = param_value
        
        # Real-time pricing from Mouser (ALWAYS ADD)
        if mouser_data:
            merged['Mouser_PartNumber'] = mouser_data.get('MouserPartNumber', 'N/A')
            merged['Mouser_Stock'] = mouser_data.get('AvailabilityInStock', 'N/A')
            merged['Mouser_Availability'] = mouser_data.get('Availability', 'N/A')
            merged['Mouser_LeadTime'] = mouser_data.get('LeadTime', 'N/A')
            
            # Price breaks
            if mouser_data.get('PriceBreaks'):
                for pb in mouser_data['PriceBreaks']:
                    qty = pb.get('Quantity', '')
                    price = pb.get('Price', '')
                    currency = pb.get('Currency', '')
                    merged[f"Mouser_Price_Qty{qty}"] = f"{currency} {price}"
            
            merged['Mouser_DataSheet'] = mouser_data.get('DataSheetUrl', 'N/A')
            merged['Mouser_ProductURL'] = mouser_data.get('ProductDetailUrl', 'N/A')

        
        return merged


# ============================================================================
# EXCEL EXPORTER
# ============================================================================

class ExcelExporter:
    """Create beautiful Excel comparison with all 3 APIs"""
    
    @staticmethod
    def create_comparison(parts_data, filename, original_part):
        """Create Excel comparison file"""
        
        if not parts_data:
            print("❌ No data to export")
            return
        
        print(f"\n📊 Creating Excel comparison...")
        
        # Organize attributes
        all_attrs = set()
        for part in parts_data:
            all_attrs.update(part.keys())
        
        # Categorize attributes
        basic = ['MPN', 'Manufacturer', 'Description', 'Category']
        specs = sorted([a for a in all_attrs if a.startswith('SPEC_')])
        mouser = sorted([a for a in all_attrs if a.startswith('Mouser_')])
        
        # Get original part data for filtering
        original_part_data = parts_data[0] if parts_data else {}
        
        # Build filtered attribute list
        attributes = []
        
        # Add section header: GENERAL DETAILS
        attributes.append('=== GENERAL DETAILS ===')
        
        # Basic info
        for attr in basic:
            if attr in all_attrs:
                val = original_part_data.get(attr, 'Not Available')
                if val not in ['N/A', 'Not Available', '', None, '-']:
                    attributes.append(attr)
        
        # Add section header: SPECIFICATIONS
        if specs:
            attributes.append('=== SPECIFICATIONS ===')
            for attr in specs:
                val = original_part_data.get(attr, 'Not Available')
                if val not in ['N/A', 'Not Available', '', None, '-']:
                    # Remove SPEC_ prefix
                    clean_attr = attr.replace('SPEC_', '')
                    attributes.append(clean_attr)
        
        # Add section header: PRICING & AVAILABILITY
        if mouser:
            attributes.append('=== PRICING & AVAILABILITY ===')
            # Order Mouser fields logically
            mouser_order = [
                'Mouser_PartNumber',
                'Mouser_Stock',
                'Mouser_Availability',
                'Mouser_LeadTime'
            ]
            # Add ordered fields first with clean names
            mouser_name_map = {
                'Mouser_PartNumber': 'Mouser Part Number',
                'Mouser_Stock': 'Stock',
                'Mouser_Availability': 'Availability',
                'Mouser_LeadTime': 'LeadTime'
            }
            for mfield in mouser_order:
                if mfield in mouser:
                    attributes.append(mouser_name_map.get(mfield, mfield.replace('Mouser_', '')))
            
            # Add price breaks in sorted order
            price_fields = sorted([m for m in mouser if 'Price_Qty' in m], 
                                 key=lambda x: int(x.split('Qty')[1]))
            for pfield in price_fields:
                qty = pfield.split('Qty')[1]
                attributes.append(f'Price (Qty {qty})')
            
            # Add remaining Mouser fields
            remaining = [m for m in mouser if m not in mouser_order and 'Price_Qty' not in m]
            for mfield in remaining:
                attributes.append(mfield.replace('Mouser_', ''))
        
        # Create workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Comparison"
        
        # Title
        ws['A1'] = f"Component Comparison Report - {original_part}"
        ws['A1'].font = Font(bold=True, size=14, color='FFFFFF')
        ws['A1'].fill = PatternFill(start_color='1F4E78', end_color='1F4E78', fill_type='solid')
        ws.merge_cells(f'A1:{get_column_letter(len(parts_data) + 1)}1')
        ws['A1'].alignment = Alignment(horizontal='center', vertical='center')
        ws.row_dimensions[1].height = 25
        
        # Subtitle
        ws['A2'] = f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Parts: {len(parts_data)} | Sources: Octopart + Digi-Key + Mouser"
        ws['A2'].font = Font(italic=True, size=9, color='666666')
        ws.merge_cells(f'A2:{get_column_letter(len(parts_data) + 1)}2')
        ws['A2'].alignment = Alignment(horizontal='center')
        
        # Headers (row 3)
        ws['A3'] = 'Attribute'
        ws['A3'].font = Font(bold=True, size=11, color='FFFFFF')
        ws['A3'].fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
        ws['A3'].alignment = Alignment(horizontal='left', vertical='center')
        
        for idx, part in enumerate(parts_data, 1):
            col = get_column_letter(idx + 1)
            if idx == 1:
                ws[f'{col}3'] = 'Original'
            else:
                ws[f'{col}3'] = f'Alternative {idx-1}'
            ws[f'{col}3'].font = Font(bold=True, size=11, color='FFFFFF')
            ws[f'{col}3'].fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
            ws[f'{col}3'].alignment = Alignment(horizontal='center', vertical='center')
        
        # Data rows
        row_idx = 4
        for attr in attributes:
            # Check if section header
            if attr.startswith('==='):
                ws[f'A{row_idx}'] = attr.replace('===', '').strip()
                ws[f'A{row_idx}'].font = Font(bold=True, size=11, color='333333')
                ws[f'A{row_idx}'].fill = PatternFill(start_color='E7E6E6', end_color='E7E6E6', fill_type='solid')
                ws[f'A{row_idx}'].alignment = Alignment(horizontal='left', vertical='center')
                ws.merge_cells(f'A{row_idx}:{get_column_letter(len(parts_data) + 1)}{row_idx}')
                ws.row_dimensions[row_idx].height = 25
            else:
                # Map clean attribute name back to original key
                if attr in ['MPN', 'Manufacturer', 'Description', 'Category']:
                    data_key = attr
                elif attr.startswith('Price (Qty'):
                    qty = attr.split('Qty ')[1].rstrip(')')
                    data_key = f'Mouser_Price_Qty{qty}'
                elif attr == 'Mouser Part Number':
                    data_key = 'Mouser_PartNumber'
                elif attr in ['Stock', 'Availability', 'LeadTime', 'DataSheet', 'ProductURL']:
                    data_key = f'Mouser_{attr}'
                else:
                    # Spec attribute
                    data_key = f'SPEC_{attr}'
                
                # Attribute name
                ws[f'A{row_idx}'] = attr
                ws[f'A{row_idx}'].font = Font(bold=True, size=10)
                ws[f'A{row_idx}'].alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)
                
                # Data for each part
                for col_idx, part in enumerate(parts_data, 1):
                    col = get_column_letter(col_idx + 1)
                    value = part.get(data_key, 'Not Available')
                    
                    # Replace all variations with "Not Available"
                    if value in ['N/A', '-', '', None, 'Not Available']:
                        value = 'Not Available'
                    
                    ws[f'{col}{row_idx}'] = str(value)
                    ws[f'{col}{row_idx}'].alignment = Alignment(horizontal='left', vertical='top', wrap_text=True)
                    ws[f'{col}{row_idx}'].font = Font(size=10)
            
            row_idx += 1
        
        # Set column widths
        ws.column_dimensions['A'].width = 35
        for col_idx in range(2, len(parts_data) + 2):
            ws.column_dimensions[get_column_letter(col_idx)].width = 30
        
        # Freeze panes
        ws.freeze_panes = 'B4'
        
        # Add borders to all cells
        thin_border = Border(
            left=Side(style='thin', color='CCCCCC'),
            right=Side(style='thin', color='CCCCCC'),
            top=Side(style='thin', color='CCCCCC'),
            bottom=Side(style='thin', color='CCCCCC')
        )
        
        for row in ws.iter_rows(min_row=3, max_row=row_idx-1, min_col=1, max_col=len(parts_data)+1):
            for cell in row:
                cell.border = thin_border
        
        # Save
        wb.save(filename)
        print(f"✅ Excel saved: {filename}")
        print(f"   Attributes: {len([a for a in attributes if not a.startswith('===')])} (filtered)")


# ============================================================================
# MAIN INTEGRATION FUNCTION
# ============================================================================

def search_component(octopart_id, octopart_secret, digikey_id, digikey_secret, mouser_key, part_number, manufacturer=None, limit=10):
    """Main integration function"""
    
    print("="*80)
    print("3-API COMPONENT SEARCH INTEGRATION")
    print("Octopart (Cached 30 days) + Digi-Key + Mouser (Real-time)")
    print("="*80)
    
    # Initialize clients
    octopart = OctopartClient(octopart_id, octopart_secret)
    digikey = DigiKeyClient(digikey_id, digikey_secret)
    mouser = MouserClient(mouser_key)
    
    # Step 1: Get parts from Octopart - SEARCH BY PART NUMBER ONLY
    print(f"\n📊 Step 1: Searching Octopart for alternatives (part number only)...")
    octopart_parts = octopart.search_part_with_similar(part_number, limit)
    
    if not octopart_parts:
        print("❌ No parts found")
        return
    
    # Step 1.5: If manufacturer specified, prioritize it as first result
    if manufacturer:
        print(f"\n📌 Prioritizing {manufacturer} as 'Original' part...")
        
        # Find the part matching the specified manufacturer
        original_part = None
        other_parts = []
        
        for part in octopart_parts:
            part_mfr = part.get('manufacturer', {}).get('name', '') if part.get('manufacturer') else ''
            if part_mfr.lower() == manufacturer.lower() or manufacturer.lower() in part_mfr.lower():
                if original_part is None:  # Take first match as original
                    original_part = part
                    print(f"   ✓ Found {manufacturer} version as Original")
                else:
                    other_parts.append(part)
            else:
                other_parts.append(part)
        
        # Reorder: Original first, then alternatives from other manufacturers
        if original_part:
            octopart_parts = [original_part] + other_parts
            print(f"   ✓ Reordered: {manufacturer} first, then {len(other_parts)} alternatives")
        else:
            print(f"   ⚠ No exact match for {manufacturer}, showing all results")
    else:
        print(f"\n   ℹ No manufacturer specified, showing all results in default order")
    
    # Step 2: Enhance each part with Digi-Key and Mouser
    print(f"\n📊 Step 2: Enhancing with Digi-Key and Mouser...")
    merged_parts = []
    
    for idx, octo_part in enumerate(octopart_parts, 1):
        mpn = octo_part.get('mpn', '')
        manufacturer_name = octo_part.get('manufacturer', {}).get('name', '') if octo_part.get('manufacturer') else ''
        
        print(f"\n[{idx}/{len(octopart_parts)}] Processing: {mpn} ({manufacturer_name})")
        
        # Check if we need Digi-Key data
        specs_count = len([k for k in octo_part.keys() if k.startswith('specs')])
        digikey_data = None
        if specs_count < 30:  # If less than 30 specs, try Digi-Key
            digikey_data = digikey.search_part(mpn)
        
        # Always get fresh Mouser data - NOW WITH MANUFACTURER
        mouser_data = mouser.get_pricing_and_stock(mpn, manufacturer_name)
        
        # Merge all data
        merged = DataMerger.merge_part_data(octo_part, digikey_data, mouser_data)
        merged_parts.append(merged)
    
    # Step 3: Create Excel
    print(f"\n📊 Step 3: Creating Excel comparison...")
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{part_number}_3api_comparison_{timestamp}.xlsx"
    
    ExcelExporter.create_comparison(merged_parts, filename, part_number)
    
    # Summary
    print("\n" + "="*80)
    print("✅ COMPLETE!")
    print("="*80)
    print(f"Parts found: {len(merged_parts)}")
    print(f"Output file: {filename}")
    print(f"\n💡 Next search for '{part_number}' will use cached Octopart data!")


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

if __name__ == "__main__":
    print("\n3-API Component Search System")
    print("="*80)
    
    # Get credentials
    print("\n🔑 Enter API Credentials:")
    octopart_id = input("Octopart Client ID: ").strip()
    octopart_secret = input("Octopart Client Secret: ").strip()
    
    digikey_id = input("Digi-Key Client ID: ").strip()
    digikey_secret = input("Digi-Key Client Secret: ").strip()
    
    mouser_key = input("Mouser API Key: ").strip()
    
    # Get search parameters
    print("\n🔍 Search Parameters:")
    part_number = input("Part Number: ").strip()
    manufacturer = input("Manufacturer (optional, e.g., 'Texas Instruments', 'STMicroelectronics'): ").strip()
    limit = input("Number of similar parts (default 10): ").strip()
    limit = int(limit) if limit else 10
    
    # Display search strategy
    if manufacturer:
        print(f"\n✓ Strategy:")
        print(f"   - Original: {part_number} from {manufacturer}")
        print(f"   - Alternatives: {part_number} from ANY manufacturer")
    else:
        print(f"\n✓ Searching for: {part_number} (all manufacturers)")
    
    # Execute search - pass manufacturer separately
    search_component(
        octopart_id, octopart_secret,
        digikey_id, digikey_secret,
        mouser_key,
        part_number, manufacturer, limit
    )