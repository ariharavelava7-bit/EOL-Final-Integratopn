"""
3-API INTEGRATION: Smart Coordinator and Data Merger
Intelligently combines data from all 3 APIs
"""

from api_clients import OctopartClient, DigiKeyClient, MouserClient, SmartCache
from datetime import datetime


class SearchCoordinator:
    """
    Smart coordinator that decides which APIs to call
    Minimizes API usage while maximizing data completeness
    
    All three APIs are REQUIRED.
    """
    
    def __init__(self, octopart_client_id, octopart_client_secret,
                 digikey_id, digikey_secret, mouser_key):
        """
        Initialize coordinator with API credentials
        
        Args:
            octopart_client_id: Octopart OAuth2 Client ID (REQUIRED)
            octopart_client_secret: Octopart OAuth2 Client Secret (REQUIRED)
            digikey_id: Digi-Key Client ID (REQUIRED)
            digikey_secret: Digi-Key Client Secret (REQUIRED)
            mouser_key: Mouser API Key (REQUIRED)
        """
        self.cache = SmartCache()
        
        # Initialize Octopart with OAuth2
        self.octopart = OctopartClient(
            client_id=octopart_client_id,
            client_secret=octopart_client_secret,
            cache=self.cache
        )
        
        # Initialize Digi-Key
        self.digikey = DigiKeyClient(digikey_id, digikey_secret)
        
        # Initialize Mouser
        self.mouser = MouserClient(mouser_key)
        
        self.api_call_count = {
            'octopart': 0,
            'digikey': 0,
            'mouser': 0
        }
    
    def search_with_similar_parts(self, part_number, limit=10):
        """
        Main search function - finds similar parts from all sources
        
        Args:
            part_number: Part to search for
            limit: Number of similar parts to find
            
        Returns:
            Complete data merged from all 3 APIs
        """
        print("\n" + "="*80)
        print(f"🔍 SEARCHING FOR: {part_number}")
        print("="*80)
        
        results = {
            'metadata': {
                'search_query': part_number,
                'search_date': datetime.now().isoformat(),
                'api_calls': {},
                'data_sources': {}
            },
            'parts': []
        }
        
        # Step 1: Get data from Octopart (cached if available)
        print("\n📊 Step 1: Getting comprehensive data from Octopart...")
        octopart_parts = self.octopart.search_parts(part_number, limit=limit)
        
        if octopart_parts:
            self.api_call_count['octopart'] += 1
            print(f"   ✅ Octopart returned {len(octopart_parts)} parts")
        else:
            print("   ⚠️  No Octopart data")
        
        # Step 2: For each part, enhance with real-time Mouser data
        print("\n💰 Step 2: Getting real-time pricing from Mouser...")
        
        for idx, octo_part in enumerate(octopart_parts, 1):
            part_mpn = octo_part.get('ManufacturerPartNumber', '')
            
            print(f"\n   Processing {idx}/{len(octopart_parts)}: {part_mpn}")
            
            # Get Mouser data (always for real-time pricing)
            mouser_data = self.mouser.search_part(part_mpn)
            if mouser_data:
                self.api_call_count['mouser'] += 1
            
            # Check if we need Digi-Key enhancement
            needs_digikey = self._needs_enhancement(octo_part)
            digikey_data = None
            
            if needs_digikey:
                print(f"   🔧 Octopart data incomplete, querying Digi-Key...")
                digikey_data = self.digikey.search_part(part_mpn)
                if digikey_data:
                    self.api_call_count['digikey'] += 1
            
            # Merge all data sources
            merged_part = self._merge_part_data(octo_part, digikey_data, mouser_data)
            results['parts'].append(merged_part)
        
        # Update metadata
        results['metadata']['api_calls'] = self.api_call_count.copy()
        results['metadata']['total_parts'] = len(results['parts'])
        
        # Calculate data sources
        if results['parts']:
            first_part = results['parts'][0]
            results['metadata']['total_attributes'] = len([k for k in first_part.keys() if not k.startswith('_')])
            results['metadata']['data_sources'] = first_part.get('_sources_used', {})
        
        self._print_summary(results)
        
        return results
    
    def _needs_enhancement(self, octo_part):
        """
        Determine if Octopart data needs Digi-Key enhancement
        
        Criteria:
        - Less than 40 total attributes
        - Missing critical specs (voltage, current, temperature)
        """
        # Count attributes
        attr_count = len([k for k in octo_part.keys() if not k.startswith('_')])
        
        # Check for critical specs
        critical_specs = [
            'SPEC_Voltage - Input (Max)',
            'SPEC_Current - Output',
            'SPEC_Operating Temperature'
        ]
        
        has_critical = any(spec in octo_part for spec in critical_specs)
        
        # Need enhancement if:
        # 1. Less than 40 attributes, OR
        # 2. Missing critical specs
        if attr_count < 40 or not has_critical:
            return True
        
        return False
    
    def _merge_part_data(self, octo_data, digikey_data, mouser_data):
        """
        Intelligently merge data from all sources
        
        Priority:
        - Specifications: Digi-Key > Octopart > Mouser
        - Pricing: Mouser (real-time) > Octopart (cached)
        - Availability: Mouser (real-time) > Others
        """
        merged = {}
        sources_used = {
            'octopart': False,
            'digikey': False,
            'mouser': False
        }
        
        # Start with Octopart data (foundation)
        if octo_data:
            merged.update(octo_data)
            sources_used['octopart'] = True
        
        # Enhance with Digi-Key (better specs)
        if digikey_data:
            for key, value in digikey_data.items():
                # Add new specs or replace existing with Digi-Key version
                if key.startswith('SPEC_') and value != 'N/A':
                    merged[key] = value
                    merged[f"{key}_source"] = 'Digi-Key'
                elif key not in merged or merged.get(key) == 'N/A':
                    merged[key] = value
            
            sources_used['digikey'] = True
        
        # Add Mouser real-time data (pricing/availability priority)
        if mouser_data:
            # Always use Mouser pricing (most current)
            pricing_fields = ['Price', 'All_Price_Breaks', 'Price_Qty1', 'Price_Qty10', 
                            'Price_Qty25', 'Price_Qty100']
            for field in pricing_fields:
                if field in mouser_data:
                    merged[field] = mouser_data[field]
                    merged[f"{field}_source"] = 'Mouser'
            
            # Always use Mouser availability (real-time)
            avail_fields = ['Availability_Mouser', 'Stock_Mouser', 'LeadTime_Mouser']
            for field in avail_fields:
                if field in mouser_data:
                    merged[field] = mouser_data[field]
            
            # Add Mouser-specific fields
            mouser_specific = ['MouserPartNumber', 'DataSheetUrl', 'ProductDetailUrl', 'ImagePath']
            for field in mouser_specific:
                if field in mouser_data and mouser_data[field] != 'N/A':
                    # Don't overwrite if already exists
                    if field not in merged or merged[field] == 'N/A':
                        merged[field] = mouser_data[field]
            
            sources_used['mouser'] = True
        
        # Add metadata about sources
        merged['_sources_used'] = sources_used
        merged['_merge_timestamp'] = datetime.now().isoformat()
        
        return merged
    
    def _print_summary(self, results):
        """Print summary of search results"""
        print("\n" + "="*80)
        print("📊 SEARCH SUMMARY")
        print("="*80)
        
        metadata = results['metadata']
        
        print(f"\n✅ Found {metadata['total_parts']} similar parts")
        print(f"📋 Total attributes per part: {metadata.get('total_attributes', 0)}")
        
        print(f"\n🔢 API Calls:")
        api_calls = metadata['api_calls']
        print(f"   Octopart:  {api_calls.get('octopart', 0)}")
        print(f"   Digi-Key:  {api_calls.get('digikey', 0)}")
        print(f"   Mouser:    {api_calls.get('mouser', 0)}")
        print(f"   TOTAL:     {sum(api_calls.values())}")
        
        if results['parts']:
            first_part = results['parts'][0]
            sources = first_part.get('_sources_used', {})
            
            print(f"\n📂 Data Sources Used:")
            for source, used in sources.items():
                status = "✅" if used else "⏭️  Skipped"
                print(f"   {source.capitalize():12s} {status}")
            
            # Count spec types
            spec_count = len([k for k in first_part.keys() if k.startswith('SPEC_')])
            basic_count = len([k for k in first_part.keys() if not k.startswith('SPEC_') and not k.startswith('_')])
            
            print(f"\n📊 Attribute Breakdown:")
            print(f"   Basic Info:      {basic_count} attributes")
            print(f"   Specifications:  {spec_count} attributes")
            print(f"   Total:           {spec_count + basic_count} attributes")


class DataExporter:
    """
    Exports merged data to JSON
    """
    
    @staticmethod
    def export_to_json(results, filename):
        """
        Export results to JSON file
        
        Args:
            results: Search results from coordinator
            filename: Output filename
        """
        import json
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            
            print(f"\n💾 JSON saved: {filename}")
            print(f"   Size: {len(json.dumps(results))} bytes")
            print(f"   Parts: {len(results.get('parts', []))}")
            
            return filename
            
        except Exception as e:
            print(f"❌ Error saving JSON: {e}")
            return None