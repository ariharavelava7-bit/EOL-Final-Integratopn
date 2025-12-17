"""
3-API INTEGRATION: API Clients
Octopart + Digi-Key + Mouser
SSL verification disabled for corporate networks
"""

import requests
import json
import time
from datetime import datetime, timedelta
import hashlib
import os
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class SmartCache:
    """Smart caching system to minimize Octopart API calls"""
    
    def __init__(self, cache_dir=".cache"):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        
    def _get_cache_path(self, key, cache_type):
        """Generate cache file path"""
        key_hash = hashlib.md5(key.encode()).hexdigest()
        return os.path.join(self.cache_dir, f"{cache_type}_{key_hash}.json")
    
    def get(self, key, cache_type="specs", ttl_hours=720):
        """Get from cache if not expired"""
        cache_path = self._get_cache_path(key, cache_type)
        
        if not os.path.exists(cache_path):
            return None
        
        try:
            with open(cache_path, 'r') as f:
                cached_data = json.load(f)
            
            cached_time = datetime.fromisoformat(cached_data['timestamp'])
            if datetime.now() - cached_time > timedelta(hours=ttl_hours):
                return None
            
            return cached_data['data']
            
        except Exception as e:
            print(f"Cache read error: {e}")
            return None
    
    def set(self, key, data, cache_type="specs"):
        """Save to cache"""
        cache_path = self._get_cache_path(key, cache_type)
        
        try:
            cache_entry = {
                'timestamp': datetime.now().isoformat(),
                'key': key,
                'data': data
            }
            
            with open(cache_path, 'w') as f:
                json.dump(cache_entry, f, indent=2)
                
        except Exception as e:
            print(f"Cache write error: {e}")

class OctopartClient:
    """Octopart/Nexar API client with OAuth2"""
    
    def __init__(self, client_id, client_secret, cache=None):
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        # CORRECT Nexar endpoints
        self.token_url = "https://identity.nexar.com/connect/token"
        self.api_url = "https://api.nexar.com/graphql"
        self.cache = cache or SmartCache()
        print("   Using Nexar API for Octopart")
    
    def authenticate_oauth2(self):
        """Get OAuth2 access token from Nexar"""
        print("Authenticating with Nexar API...")
        
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": "supply.domain"  # CRITICAL: Must include scope
        }
        
        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        try:
            response = requests.post(self.token_url, data=payload, headers=headers, verify=False)
            
            if response.status_code == 200:
                result = response.json()
                self.access_token = result.get("access_token")
                print("Nexar authentication successful!")
                return True
            else:
                print(f"Nexar auth failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"Nexar auth error: {e}")
            return False
    
    def search_parts(self, query, limit=10):
        """Search for parts using Nexar GraphQL API"""
        cache_key = f"nexar_search_{query}_{limit}"
        cached = self.cache.get(cache_key, cache_type="specs", ttl_hours=720)
        
        if cached:
            print(f"Nexar: Using cached data for '{query}' (saved 1 API call!)")
            return cached
        
        print(f"Nexar: Searching for '{query}'...")
        
        if not self.access_token:
            if not self.authenticate_oauth2():
                return []
        
        # CORRECT GraphQL query for Nexar
        graphql_query = """
        query SearchParts($q: String!, $limit: Int!) {
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
                sellers {
                  company {
                    name
                  }
                  offers {
                    sku
                    inventoryLevel
                    prices {
                      price
                      quantity
                      currency
                    }
                  }
                }
              }
            }
          }
        }
        """
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.access_token}"
        }
        
        payload = {
            "query": graphql_query,
            "variables": {
                "q": query,  # Note: variable name is "q" not "query"
                "limit": limit
            }
        }
        
        try:
            response = requests.post(self.api_url, json=payload, headers=headers, verify=False)
            
            if response.status_code != 200:
                print(f"Nexar API error: {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return []
            
            data = response.json()
            
            # Check for GraphQL errors
            if 'errors' in data:
                print(f"GraphQL errors: {data['errors']}")
                return []
            
            results = data.get('data', {}).get('supSearch', {}).get('results', [])
            
            if not results:
                print(f"No results found in Nexar response")
                return []
            
            parts = []
            for result in results:
                part_data = result.get('part', {})
                if part_data:
                    formatted_part = self._format_nexar_data(part_data)
                    parts.append(formatted_part)
            
            self.cache.set(cache_key, parts, cache_type="specs")
            
            print(f"Nexar: Found {len(parts)} parts (cached for 30 days)")
            return parts
            
        except Exception as e:
            print(f"Nexar error: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _format_nexar_data(self, part_data):
        """Format Nexar API response"""
        formatted = {}
        
        formatted['ManufacturerPartNumber'] = part_data.get('mpn', 'N/A')
        
        manufacturer = part_data.get('manufacturer', {})
        formatted['Manufacturer'] = manufacturer.get('name', 'N/A') if manufacturer else 'N/A'
        
        formatted['Description'] = part_data.get('shortDescription', 'N/A')
        
        category = part_data.get('category', {})
        formatted['Category'] = category.get('name', 'N/A') if category else 'N/A'
        
        specs = part_data.get('specs', [])
        for spec in specs:
            attr = spec.get('attribute', {})
            attr_name = attr.get('name', 'Unknown')
            attr_value = spec.get('displayValue', 'N/A')
            formatted[f"SPEC_{attr_name}"] = attr_value
        
        sellers = part_data.get('sellers', [])
        for seller in sellers:
            company = seller.get('company', {})
            company_name = company.get('name', 'Unknown') if company else 'Unknown'
            
            offers = seller.get('offers', [])
            if offers:
                offer = offers[0]
                formatted[f"Stock_{company_name}"] = offer.get('inventoryLevel', 'N/A')
                formatted[f"SKU_{company_name}"] = offer.get('sku', 'N/A')
                
                prices = offer.get('prices', [])
                if prices:
                    price_info = prices[0]
                    formatted[f"Price_{company_name}"] = f"{price_info.get('currency', '')} {price_info.get('price', 'N/A')}"
        
        formatted['_source'] = 'Nexar'
        formatted['_cached'] = True
        
        return formatted

class DigiKeyClient:
    """Digi-Key API client with automatic token refresh"""
    
    def __init__(self, client_id, client_secret):
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.token_expiry = None
        self.base_url = "https://api.digikey.com"
        
    def authenticate(self, force=False):
        """Get OAuth2 access token. Force re-auth if needed."""
        # If we have a valid token and not forcing, return True
        if not force and self.access_token and self.token_expiry:
            if datetime.now() < self.token_expiry:
                return True
        
        print("[Digi-Key] Authenticating...")
        token_url = "https://api.digikey.com/v1/oauth2/token"
        
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
                # Token typically expires in 1 hour, set expiry to 55 minutes to be safe
                expires_in = result.get("expires_in", 3600)
                self.token_expiry = datetime.now() + timedelta(seconds=expires_in - 300)
                print("[Digi-Key] Authentication successful!")
                return True
            else:
                print(f"[Digi-Key] Auth failed: {response.status_code}")
                print(f"Response: {response.text}")
                self.access_token = None
                self.token_expiry = None
                return False
                
        except Exception as e:
            print(f"[Digi-Key] Auth error: {e}")
            self.access_token = None
            self.token_expiry = None
            return False
    
    def _make_request(self, method, url, **kwargs):
        """Make a request with automatic token refresh on 401"""
        # Ensure we have a token
        if not self.access_token:
            if not self.authenticate():
                return None
        
        headers = kwargs.pop('headers', {})
        headers.update({
            "Authorization": f"Bearer {self.access_token}",
            "X-DIGIKEY-Client-Id": self.client_id,
        })
        
        # First attempt
        response = requests.request(method, url, headers=headers, verify=False, **kwargs)
        
        # If 401, re-authenticate and retry once
        if response.status_code == 401:
            print("[Digi-Key] Token expired, refreshing...")
            if self.authenticate(force=True):
                headers["Authorization"] = f"Bearer {self.access_token}"
                response = requests.request(method, url, headers=headers, verify=False, **kwargs)
            else:
                print("[Digi-Key] Failed to refresh token")
                return None
        
        return response
    
    def search_part(self, part_number):
        """Search for a single part"""
        print(f"[Digi-Key] Searching for '{part_number}'...")
        
        url = f"{self.base_url}/products/v4/search/keyword"
        
        payload = {
            "Keywords": part_number,
            "RecordCount": 1,
            "RecordStartPosition": 0
        }
        
        try:
            response = self._make_request(
                'POST', 
                url, 
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response and response.status_code == 200:
                data = response.json()
                products = data.get('Products', [])
                
                if products:
                    print(f"[Digi-Key] Found product!")
                    return self._format_digikey_data(products[0])
                else:
                    print(f"[Digi-Key] No products found for '{part_number}'")
            elif response:
                print(f"[Digi-Key] Search error: {response.status_code}")
                print(f"Response: {response.text[:300]}")
                    
            return None
            
        except Exception as e:
            print(f"[Digi-Key] Search error: {e}")
            return None

    def get_alternate_packaging(self, product_number, limit=5):
        """
        Get alternate packagings for a given product from Digi-Key.
        Handles token refresh automatically.
        """
        print(f"[Digi-Key] Getting alternate packaging for '{product_number}'...")

        url = f"{self.base_url}/products/v4/search/{product_number}/alternatepackaging"

        try:
            response = self._make_request(
                'GET', 
                url,
                headers={"accept": "application/json"}
            )

            if not response:
                print("[Digi-Key] No response received")
                return []

            if response.status_code != 200:
                print(f"[Digi-Key] Alternate packaging error: {response.status_code}")
                print(f"Response: {response.text[:300]}")
                return []

            data = response.json()
            alt_root = data.get("AlternatePackagings", {})
            alt_list = alt_root.get("AlternatePackaging", []) or []

            recommendations = []
            for alt in alt_list[:limit]:
                rec = {
                    "Source": "Digi-Key",
                    "ProductUrl": alt.get("ProductUrl", ""),
                    "Description": alt.get("Description", ""),
                    "ManufacturerPartNumber": alt.get("ManufacturerProductNumber", ""),
                    "UnitPrice": alt.get("UnitPrice", ""),
                    "QuantityAvailable": alt.get("QuantityAvailable", ""),
                    "DigiKeyProductNumber": alt.get("DigiKeyProductNumber", ""),
                }

                mfr = alt.get("Manufacturer") or {}
                if isinstance(mfr, dict):
                    rec["Manufacturer"] = mfr.get("Name", "")
                    rec["ManufacturerId"] = mfr.get("Id", "")
                else:
                    rec["Manufacturer"] = str(mfr)

                recommendations.append(rec)

            print(f"[Digi-Key] Found {len(recommendations)} alternate packagings")
            return recommendations

        except Exception as e:
            print(f"[Digi-Key] Alternate packaging error: {e}")
            return []
    
    def _format_digikey_data(self, product):
        """Format Digi-Key response"""
        formatted = {}
        
        formatted['ManufacturerPartNumber'] = product.get('ManufacturerProductNumber', 'N/A')
        
        manufacturer = product.get('Manufacturer', {})
        if isinstance(manufacturer, dict):
            formatted['Manufacturer'] = manufacturer.get('Name', 'N/A')
        else:
            formatted['Manufacturer'] = str(manufacturer)
        
        description = product.get('Description', {})
        if isinstance(description, dict):
            formatted['Description'] = description.get('ProductDescription', 'N/A')
        else:
            formatted['Description'] = str(description)
        
        parameters = product.get('Parameters', [])
        for param in parameters:
            param_name = param.get('ParameterText', 'Unknown')
            param_value = param.get('ValueText', 'N/A')
            formatted[f"SPEC_{param_name}"] = param_value
        
        formatted['QuantityAvailable'] = product.get('QuantityAvailable', 'N/A')
        formatted['UnitPrice'] = product.get('UnitPrice', 'N/A')
        formatted['ProductUrl'] = product.get('ProductUrl', 'N/A')
        formatted['DigiKeyPartNumber'] = product.get('DigiKeyPartNumber', 'N/A')
        formatted['_source'] = 'Digi-Key'
        
        print(f"[Digi-Key] Found {len(parameters)} specifications")
        
        return formatted


class MouserClient:
    """Mouser API client"""
    
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://api.mouser.com/api/v1"
        
    def search_part(self, part_number):
        """Search for a single part"""
        print(f"Mouser: Getting real-time data for '{part_number}'...")
        
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
                return self._format_mouser_data(parts[0])
                
            return None
            
        except Exception as e:
            print(f"Mouser error: {e}")
            return None
    
    def _format_mouser_data(self, part):
        """Format Mouser response"""
        formatted = {}
        
        formatted['ManufacturerPartNumber'] = part.get('ManufacturerPartNumber', 'N/A')
        formatted['Manufacturer'] = part.get('Manufacturer', 'N/A')
        formatted['MouserPartNumber'] = part.get('MouserPartNumber', 'N/A')
        formatted['Description'] = part.get('Description', 'N/A')
        formatted['Category'] = part.get('Category', 'N/A')
        
        if part.get('PriceBreaks'):
            price_breaks = []
            for pb in part['PriceBreaks']:
                qty = pb.get('Quantity', '')
                price = pb.get('Price', '')
                currency = pb.get('Currency', '')
                price_breaks.append(f"{qty}@{currency}{price}")
                formatted[f"Price_Qty{qty}"] = f"{currency} {price}"
            
            first_pb = part['PriceBreaks'][0]
            formatted['Price'] = f"{first_pb.get('Currency', '')} {first_pb.get('Price', 'N/A')}"
            formatted['All_Price_Breaks'] = ' | '.join(price_breaks)
        
        formatted['Availability_Mouser'] = part.get('Availability', 'N/A')
        formatted['Stock_Mouser'] = part.get('AvailabilityInStock', 'N/A')
        formatted['LeadTime_Mouser'] = part.get('LeadTime', 'N/A')
        
        formatted['DataSheetUrl'] = part.get('DataSheetUrl', 'N/A')
        formatted['ProductDetailUrl'] = part.get('ProductDetailUrl', 'N/A')
        formatted['ImagePath'] = part.get('ImagePath', 'N/A')
        
        formatted['_source'] = 'Mouser'
        formatted['_timestamp'] = datetime.now().isoformat()
        
        print(f"Mouser: Got real-time pricing and availability")
        
        return formatted
