#!/usr/bin/env python3
"""
3-API COMPONENT SEARCH INTEGRATION
Octopart + Digi-Key + Mouser
"""

from coordinator import SearchCoordinator, DataExporter
from excel_formatter import FilteredExcelFormatter
from datetime import datetime
import sys


def main():
    """Main integration script"""
    print("="*80)
    print("3-API COMPONENT SEARCH INTEGRATION")
    print("Octopart + Digi-Key + Mouser")
    print("="*80)
    
    print("\n📋 This system will:")
    print("   1. Search Octopart for comprehensive data (cached 30 days)")
    print("   2. Enhance with Digi-Key if needed (fills gaps)")
    print("   3. Get real-time pricing from Mouser (always fresh)")
    print("   4. Export to JSON + Excel (BAI_184126 format)")
    
    # Get API credentials
    print("\n" + "="*80)
    print("API CREDENTIALS")
    print("="*80)
    
    print("\n🔑 OCTOPART AUTHENTICATION:")
    print("   Octopart uses OAuth2 (Client ID + Secret)")
    
    octopart_client_id = input("\n   Enter Octopart Client ID: ").strip()
    if not octopart_client_id:
        print("❌ Octopart Client ID is required!")
        return
    
    octopart_client_secret = input("   Enter Octopart Client Secret: ").strip()
    if not octopart_client_secret:
        print("❌ Octopart Client Secret is required!")
        return
    
    print("\n🔑 DIGI-KEY AUTHENTICATION:")
    print("   Digi-Key uses OAuth2 (Client ID + Secret)")
    
    digikey_id = input("\n   Enter Digi-Key Client ID: ").strip()
    if not digikey_id:
        print("❌ Digi-Key Client ID is required!")
        return
    
    digikey_secret = input("   Enter Digi-Key Client Secret: ").strip()
    if not digikey_secret:
        print("❌ Digi-Key Client Secret is required!")
        return
    
    print("\n🔑 MOUSER AUTHENTICATION:")
    print("   Mouser uses API Key")
    
    mouser_key = input("\n   Enter Mouser API Key: ").strip()
    if not mouser_key:
        print("❌ Mouser API Key is required!")
        return
    
    # Get search query
    print("\n" + "="*80)
    print("SEARCH PARAMETERS")
    print("="*80)
    
    part_number = input("\n🔍 Enter Part Number to search: ").strip()
    if not part_number:
        print("❌ Part number required!")
        return
    
    num_similar = input("📊 Number of similar parts (default 10): ").strip()
    try:
        num_similar = int(num_similar) if num_similar else 10
    except:
        num_similar = 10
    
    # Initialize coordinator
    print("\n" + "="*80)
    print("INITIALIZING SYSTEM")
    print("="*80)
    
    coordinator = SearchCoordinator(
        octopart_client_id=octopart_client_id,
        octopart_client_secret=octopart_client_secret,
        digikey_id=digikey_id,
        digikey_secret=digikey_secret,
        mouser_key=mouser_key
    )
    
    print("✅ All API clients initialized")
    print("✅ Smart caching enabled (30-day TTL)")
    
    # Execute search
    print("\n" + "="*80)
    print("EXECUTING SEARCH")
    print("="*80)
    
    try:
        results = coordinator.search_with_similar_parts(part_number, limit=num_similar)
        
        if not results or not results.get('parts'):
            print("\n❌ No results found")
            return
        
        # Generate filenames
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        safe_filename = part_number.replace('/', '_').replace('\\', '_')
        
        json_filename = f"{safe_filename}_comparison_{timestamp}.json"
        excel_filename = f"{safe_filename}_comparison_{timestamp}.xlsx"
        
        # Export to JSON
        print("\n" + "="*80)
        print("EXPORTING TO JSON")
        print("="*80)
        
        DataExporter.export_to_json(results, json_filename)
        
        # Export to Excel
        print("\n" + "="*80)
        print("EXPORTING TO EXCEL")
        print("="*80)
        
        formatter = FilteredExcelFormatter()
        formatter.create_comparison_excel(results, excel_filename, part_number)
        
        # Print final summary
        print("\n" + "="*80)
        print("✅ SUCCESS!")
        print("="*80)
        
        metadata = results['metadata']
        
        print(f"\n📊 Results:")
        print(f"   Parts found:        {metadata['total_parts']}")
        print(f"   Attributes/part:    {metadata.get('total_attributes', 'N/A')}")
        
        print(f"\n🔢 API Calls Used:")
        api_calls = metadata['api_calls']
        print(f"   Octopart:  {api_calls.get('octopart', 0)}")
        print(f"   Digi-Key:  {api_calls.get('digikey', 0)}")
        print(f"   Mouser:    {api_calls.get('mouser', 0)}")
        print(f"   TOTAL:     {sum(api_calls.values())}")
        
        print(f"\n💾 Output Files:")
        print(f"   JSON:   {json_filename}")
        print(f"   Excel:  {excel_filename}")
        
        print(f"\n💡 Tips:")
        print(f"   • Specifications cached for 30 days")
        print(f"   • Next search for same part will use 0 Octopart calls!")
        print(f"   • Pricing is always real-time from Mouser")
        
        # Show what to do next
        print(f"\n📋 Next Steps:")
        print(f"   1. Open {excel_filename} to see comparison")
        print(f"   2. Check {json_filename} for raw data")
        print(f"   3. Search again - cached parts use 0 Octopart calls!")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Search interrupted by user")
        return
    except Exception as e:
        print(f"\n❌ Error during search: {e}")
        import traceback
        traceback.print_exc()
        return


if __name__ == "__main__":
    main()