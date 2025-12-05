#!/usr/bin/env python3
"""
3-API COMPONENT SEARCH INTEGRATION - IMPROVED
Octopart (Nexar) + Digi-Key + Mouser

IMPROVEMENTS:
1. Clean attribute names (remove SPEC_ prefix, clean formatting)
2. Better grouping by category (Basic, Electrical, Physical, Environmental, Pricing)
3. Show blank instead of "N/A" / "Not Available"
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

# Disable SSL warnings
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
# ATTRIBUTE NAME CLEANER
# ============================================================================

class AttributeCleaner:
    """Clean up attribute names for better readability"""
    
    @staticmethod
    def clean_name(attr_name):
        """Clean attribute name"""
        if not attr_name or attr_name.startswith('==='):
            return attr_name
        
        # Remove SPEC_ prefix
        if attr_name.startswith('SPEC_'):
            attr_name = attr_name[5:]
        
        # Remove Mouser_ prefix but keep meaningful prefix
        if attr_name.startswith('Mouser_'):
            attr_name = attr_name[7:]
            # Clean up specific Mouser fields
            if attr_name == 'PartNumber':
                return 'Mouser Part Number'
            elif attr_name == 'LeadTime':
                return 'Lead Time'
            elif attr_name.startswith('Price_Qty'):
                qty = attr_name.replace('Price_Qty', '')
                return f'Price (Qty {qty})'
            elif attr_name == 'DataSheet':
                return 'Datasheet URL'
            elif attr_name == 'ProductURL':
                return 'Mouser Product Page'
        
        # Clean up common patterns
        replacements = {
            ' - ': ' ',
            '(Max)': 'Max',
            '(Min)': 'Min',
            '(Typ)': 'Typ',
            '  ': ' ',
        }
        
        for old, new in replacements.items():
            attr_name = attr_name.replace(old, new)
        
        return attr_name.strip()


# ============================================================================
# ATTRIBUTE CATEGORIZER
# ============================================================================

class AttributeCategorizer:
    """Categorize attributes into logical groups"""
    
    # Define attribute categories with keywords
    CATEGORIES = {
        'basic': {
            'priority': 1,
            'title': '=== BASIC INFORMATION ===',
            'keywords': ['MPN', 'Manufacturer', 'Description', 'Category'],
            'exact_match': True
        },
        'electrical': {
            'priority': 2,
            'title': '=== ELECTRICAL SPECIFICATIONS ===',
            'keywords': ['Voltage', 'Current', 'Power', 'Output', 'Input', 'Dropout', 
                        'Quiescent', 'PSRR', 'Line Regulation', 'Load Regulation',
                        'Noise', 'Ripple']
        },
        'physical': {
            'priority': 3,
            'title': '=== PHYSICAL SPECIFICATIONS ===',
            'keywords': ['Package', 'Mounting', 'Pin', 'Height', 'Length', 'Width',
                        'Case', 'Style', 'Footprint']
        },
        'environmental': {
            'priority': 4,
            'title': '=== ENVIRONMENTAL & COMPLIANCE ===',
            'keywords': ['Temperature', 'RoHS', 'REACH', 'MSL', 'Moisture',
                        'Grade', 'Status', 'Lifecycle']
        },
        'pricing': {
            'priority': 5,
            'title': '=== PRICING & AVAILABILITY ===',
            'keywords': ['Stock', 'Price', 'Availability', 'Lead Time', 'Mouser',
                        'URL', 'Datasheet', 'Product Page']
        }
    }
    
    @staticmethod
    def categorize(attr_name):
        """Determine category for attribute - NEVER return None, always categorize"""
        if attr_name.startswith('==='):
            return None
        
        # Check each category in order
        for category, config in AttributeCategorizer.CATEGORIES.items():
            if config.get('exact_match'):
                # Exact match for basic fields
                if attr_name in config['keywords']:
                    return category
            else:
                # Keyword match for others
                for keyword in config['keywords']:
                    if keyword.lower() in attr_name.lower():
                        return category
        
        # IMPORTANT: If no match, put in electrical (most common for specs)
        # This ensures NO attributes are dropped
        return 'electrical'


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
    
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://api.mouser.com/api/v1"
        
    def get_pricing_and_stock(self, part_number):
        """Get real-time pricing and stock - NO CACHING"""
        print(f"   💰 Getting real-time pricing from Mouser...")
        
        url = f"{self.base_url}/search/partnumber?apiKey={self.api_key}"
        
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
            if parts:
                print(f"   ✓ Got real-time pricing from Mouser")
                return parts[0]
            return None
            
        except Exception as e:
            print(f"   ⚠ Mouser error: {e}")
            return None


# ============================================================================
# SMART DATA MERGER
# ============================================================================

class DataMerger:
    """Intelligently merge data from all 3 APIs"""
    
    @staticmethod
    def clean_value(value):
        """Clean value - return empty string for N/A values"""
        if value in ['N/A', 'Not Available', 'n/a', 'NA', '-', None, '']:
            return ''
        return str(value).strip()
    
    @staticmethod
    def merge_part_data(octopart_data, digikey_data, mouser_data):
        """Merge data with priority rules"""
        merged = {}
        
        # Basic info from Octopart
        if octopart_data:
            merged['MPN'] = DataMerger.clean_value(octopart_data.get('mpn', ''))
            
            manufacturer = octopart_data.get('manufacturer', {})
            merged['Manufacturer'] = DataMerger.clean_value(
                manufacturer.get('name', '') if manufacturer else ''
            )
            
            merged['Description'] = DataMerger.clean_value(
                octopart_data.get('shortDescription', '')
            )
            
            category = octopart_data.get('category', {})
            merged['Category'] = DataMerger.clean_value(
                category.get('name', '') if category else ''
            )
            
            # All specifications from Octopart
            specs = octopart_data.get('specs', [])
            for spec in specs:
                attr = spec.get('attribute', {})
                attr_name = attr.get('name', 'Unknown')
                attr_value = spec.get('displayValue', '')
                # Clean the name
                clean_name = AttributeCleaner.clean_name(f"SPEC_{attr_name}")
                merged[clean_name] = DataMerger.clean_value(attr_value)
        
        # Additional specs from Digi-Key if available
        if digikey_data:
            parameters = digikey_data.get('Parameters', [])
            for param in parameters:
                param_name = param.get('ParameterText', 'Unknown')
                param_value = param.get('ValueText', '')
                clean_name = AttributeCleaner.clean_name(param_name)
                # Only add if not already present
                if clean_name not in merged:
                    merged[clean_name] = DataMerger.clean_value(param_value)
        
        # Real-time pricing from Mouser (ALWAYS ADD)
        if mouser_data:
            merged['Mouser Part Number'] = DataMerger.clean_value(
                mouser_data.get('MouserPartNumber', '')
            )
            merged['Stock'] = DataMerger.clean_value(
                mouser_data.get('AvailabilityInStock', '')
            )
            merged['Availability'] = DataMerger.clean_value(
                mouser_data.get('Availability', '')
            )
            merged['Lead Time'] = DataMerger.clean_value(
                mouser_data.get('LeadTime', '')
            )
            
            # Price breaks
            if mouser_data.get('PriceBreaks'):
                for pb in mouser_data['PriceBreaks']:
                    qty = pb.get('Quantity', '')
                    price = pb.get('Price', '')
                    currency = pb.get('Currency', '')
                    if qty and price:
                        clean_name = AttributeCleaner.clean_name(f'Mouser_Price_Qty{qty}')
                        merged[clean_name] = DataMerger.clean_value(f"{currency} {price}")
            
            merged['Datasheet URL'] = DataMerger.clean_value(
                mouser_data.get('DataSheetUrl', '')
            )
            merged['Mouser Product Page'] = DataMerger.clean_value(
                mouser_data.get('ProductDetailUrl', '')
            )
        
        return merged


# ============================================================================
# IMPROVED EXCEL EXPORTER WITH CATEGORIZATION
# ============================================================================

class ImprovedExcelExporter:
    """Create organized Excel with categorized attributes"""
    
    @staticmethod
    def create_comparison(parts_data, filename, original_part):
        """Create Excel comparison file with improved organization"""
        
        if not parts_data:
            print("❌ No data to export")
            return
        
        print(f"\n📊 Creating organized Excel comparison...")
        
        # Get original part data for filtering
        original_part_data = parts_data[0] if parts_data else {}
        
        # Collect ALL attributes from all parts
        all_attrs = set()
        for part in parts_data:
            all_attrs.update(part.keys())
        
        # Filter: only include if original has data
        filtered_attrs = []
        for attr in all_attrs:
            val = original_part_data.get(attr, '')
            if val and val.strip():  # Original has actual data
                filtered_attrs.append(attr)
        
        print(f"   Total attributes: {len(all_attrs)}")
        print(f"   After filtering (Original has data): {len(filtered_attrs)}")
        
        # Categorize filtered attributes
        categorized_attrs = {
            'basic': [],
            'electrical': [],
            'physical': [],
            'environmental': [],
            'pricing': []
        }
        
        for attr in filtered_attrs:
            category = AttributeCategorizer.categorize(attr)
            if category:
                categorized_attrs[category].append(attr)
        
        # Show how many in each category
        for cat, attrs in categorized_attrs.items():
            print(f"   {cat.capitalize()}: {len(attrs)} attributes")
        
        # Build ordered attribute list with ALL attributes
        attributes = []
        
        for cat_key in ['basic', 'electrical', 'physical', 'environmental', 'pricing']:
            cat_config = AttributeCategorizer.CATEGORIES[cat_key]
            attrs_in_category = categorized_attrs[cat_key]
            
            if attrs_in_category:
                # Add section header
                attributes.append(cat_config['title'])
                # Add sorted attributes - ALL of them
                attributes.extend(sorted(attrs_in_category))
        
        # Create workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Comparison"
        
        # Title
        ws['A1'] = f"Component Comparison Report - {original_part}"
        ws['A1'].font = Font(bold=True, size=14)
        ws.merge_cells(f'A1:{get_column_letter(len(parts_data) + 1)}1')
        
        # Subtitle
        ws['A2'] = f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Parts: {len(parts_data)} | Organized by Category"
        ws['A2'].font = Font(italic=True, size=9)
        ws.merge_cells(f'A2:{get_column_letter(len(parts_data) + 1)}2')
        
        # Headers (row 3)
        ws['A3'] = 'Attribute'
        ws['A3'].font = Font(bold=True, size=11)
        
        for idx, part in enumerate(parts_data, 1):
            col = get_column_letter(idx + 1)
            if idx == 1:
                ws[f'{col}3'] = 'Original'
            else:
                ws[f'{col}3'] = f'Similar {idx-1}'
            ws[f'{col}3'].font = Font(bold=True, size=11)
            ws[f'{col}3'].alignment = Alignment(horizontal='center')
        
        # Data rows
        for row_idx, attr in enumerate(attributes, 4):
            # Attribute name
            ws[f'A{row_idx}'] = attr
            
            # Check if section header
            if attr.startswith('==='):
                ws[f'A{row_idx}'].font = Font(bold=True, size=11, color='FFFFFF')
                ws[f'A{row_idx}'].fill = PatternFill(start_color='4472C4', end_color='4472C4', fill_type='solid')
                # Merge across all columns for section headers
                ws.merge_cells(f'A{row_idx}:{get_column_letter(len(parts_data) + 1)}{row_idx}')
            else:
                ws[f'A{row_idx}'].font = Font(bold=True)
                
                # Data for each part
                for col_idx, part in enumerate(parts_data, 1):
                    col = get_column_letter(col_idx + 1)
                    value = part.get(attr, '')
                    # Show blank for empty values
                    if not value or not value.strip():
                        value = ''
                    ws[f'{col}{row_idx}'] = str(value)
                    ws[f'{col}{row_idx}'].alignment = Alignment(wrap_text=True)
        
        # Set column widths
        ws.column_dimensions['A'].width = 40
        for col_idx in range(2, len(parts_data) + 2):
            ws.column_dimensions[get_column_letter(col_idx)].width = 25
        
        # Freeze panes
        ws.freeze_panes = 'B4'
        
        # Save
        wb.save(filename)
        
        total_data_rows = len([a for a in attributes if not a.startswith('===')])
        print(f"\n✅ Excel saved: {filename}")
        print(f"   Total attributes in Excel: {total_data_rows}")
        print(f"   All attributes preserved with clean names and organization!")


# ============================================================================
# MAIN INTEGRATION FUNCTION
# ============================================================================

def search_component(octopart_id, octopart_secret, digikey_id, digikey_secret, mouser_key, part_number, limit=10):
    """Main integration function"""
    
    print("="*80)
    print("3-API COMPONENT SEARCH INTEGRATION - IMPROVED")
    print("✓ Clean attribute names")
    print("✓ Organized by category")
    print("✓ Blank cells (no N/A)")
    print("="*80)
    
    # Initialize clients
    octopart = OctopartClient(octopart_id, octopart_secret)
    digikey = DigiKeyClient(digikey_id, digikey_secret)
    mouser = MouserClient(mouser_key)
    
    # Step 1: Get parts from Octopart (cached)
    print(f"\n📊 Step 1: Searching Octopart (with 30-day cache)...")
    octopart_parts = octopart.search_part_with_similar(part_number, limit)
    
    if not octopart_parts:
        print("❌ No parts found")
        return
    
    # Step 2: Enhance each part with Digi-Key and Mouser
    print(f"\n📊 Step 2: Enhancing with Digi-Key and Mouser...")
    merged_parts = []
    
    for idx, octo_part in enumerate(octopart_parts, 1):
        mpn = octo_part.get('mpn', '')
        print(f"\n[{idx}/{len(octopart_parts)}] Processing: {mpn}")
        
        # Check if we need Digi-Key data
        specs_count = len(octo_part.get('specs', []))
        digikey_data = None
        if specs_count < 30:  # If less than 30 specs, try Digi-Key
            digikey_data = digikey.search_part(mpn)
        
        # Always get fresh Mouser data
        mouser_data = mouser.get_pricing_and_stock(mpn)
        
        # Merge all data
        merged = DataMerger.merge_part_data(octo_part, digikey_data, mouser_data)
        merged_parts.append(merged)
    
    # Step 3: Create Improved Excel
    print(f"\n📊 Step 3: Creating organized Excel...")
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{part_number}_improved_comparison_{timestamp}.xlsx"
    
    ImprovedExcelExporter.create_comparison(merged_parts, filename, part_number)
    
    # Summary
    print("\n" + "="*80)
    print("✅ COMPLETE!")
    print("="*80)
    print(f"Parts found: {len(merged_parts)}")
    print(f"Output file: {filename}")
    print(f"\n💡 IMPROVEMENTS:")
    print(f"   ✓ Clean attribute names (no SPEC_ prefix)")
    print(f"   ✓ Organized by category (Basic → Electrical → Physical → Environmental → Pricing)")
    print(f"   ✓ Blank cells instead of 'N/A' (cleaner look)")
    print(f"\n💡 Next search for '{part_number}' will use cached Octopart data!")


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

if __name__ == "__main__":
    print("\n3-API Component Search System - IMPROVED")
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
    limit = input("Number of similar parts (default 10): ").strip()
    limit = int(limit) if limit else 10
    
    # Execute search
    search_component(
        octopart_id, octopart_secret,
        digikey_id, digikey_secret,
        mouser_key,
        part_number, limit
    )