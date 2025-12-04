import requests
from typing import List, Dict

class OctopartAPI:
    """Octopart/Nexar API Client"""

    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.token_url = "https://identity.nexar.com/connect/token"
        self.api_url = "https://api.nexar.com/graphql"
        self.token = None

    def _get_token(self):
        """Get OAuth token"""
        if not self.token:
            response = requests.post(
                self.token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "scope": "supply.domain",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            self.token = response.json()["access_token"]

    def fetch(self, part_number: str, limit: int = 3) -> List[Dict]:
        """Fetch alternatives from Octopart with ALL specifications.
        
        NOTE: Default limit is intentionally small (3) to reduce API usage.
        """
        print(f"\n[Octopart] Fetching from Octopart (limit: {limit})...")
        
        try:
            self._get_token()

            query = """
            query SearchPart($q: String!, $limit: Int!) {
              supSearch(q: $q, limit: $limit) {
                results {
                  part {
                    mpn
                    manufacturer { name }
                    category { name }
                    shortDescription
                    descriptions { text }
                    specs {
                      attribute {
                        name
                      }
                      displayValue
                    }
                    sellers {
                      company { name }
                      offers {
                        sku
                        inventoryLevel
                        prices {
                          quantity
                          price
                          currency
                        }
                        clickUrl
                        updated
                      }
                    }
                  }
                }
              }
            }
            """

            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            }

            response = requests.post(
                self.api_url,
                json={"query": query, "variables": {"q": part_number, "limit": limit}},
                headers=headers,
            )
            response.raise_for_status()
            result = response.json()

            if 'errors' in result:
                error_msg = result['errors'][0].get('message', 'Unknown error')
                raise Exception(f"GraphQL error: {error_msg}")

            data = result.get('data', {})
            sup_search = data.get('supSearch', {})
            results = sup_search.get('results', [])

            parts = []
            for item in results:
                if not item:
                    continue
                
                part_data = item.get('part')
                if not part_data:
                    continue

                formatted = {
                    'Source': 'Octopart',
                    'ManufacturerPartNumber': part_data.get('mpn', 'Not Available'),
                }

                # Manufacturer
                mfr_obj = part_data.get('manufacturer')
                if mfr_obj and isinstance(mfr_obj, dict):
                    formatted['Manufacturer'] = mfr_obj.get('name', 'Not Available')
                else:
                    formatted['Manufacturer'] = 'Not Available'
                
                # Category
                cat_obj = part_data.get('category')
                if cat_obj and isinstance(cat_obj, dict):
                    formatted['Category'] = cat_obj.get('name', 'Not Available')
                else:
                    formatted['Category'] = 'Not Available'
                
                # Descriptions
                formatted['ShortDescription'] = part_data.get('shortDescription', 'Not Available')
                descriptions = part_data.get('descriptions', [])
                if descriptions and len(descriptions) > 0:
                    desc_obj = descriptions[0]
                    if desc_obj and isinstance(desc_obj, dict):
                        formatted['Description'] = desc_obj.get('text', 'Not Available')
                    else:
                        formatted['Description'] = 'Not Available'
                else:
                    formatted['Description'] = 'Not Available'
                
                # Extract ALL specs
                specs = part_data.get('specs', [])
                if specs:
                    for spec in specs:
                        if spec and isinstance(spec, dict):
                            attr = spec.get('attribute')
                            attr_name = ''
                            if attr and isinstance(attr, dict):
                                attr_name = attr.get('name', '')
                            display_val = spec.get('displayValue', 'Not Available')
                            if attr_name and display_val != 'Not Available':
                                formatted[attr_name] = display_val
                
                # Extract seller information
                sellers = part_data.get('sellers', [])
                if sellers:
                    for seller in sellers:
                        if seller and isinstance(seller, dict):
                            offers = seller.get('offers', [])
                            if offers and len(offers) > 0:
                                offer = offers[0]
                                if offer and isinstance(offer, dict):
                                    formatted['Seller'] = seller.get('company', {}).get('name', 'Not Available')
                                    formatted['SKU'] = offer.get('sku', 'Not Available')
                                    formatted['InventoryLevel'] = offer.get('inventoryLevel', 'Not Available')
                                    formatted['ProductURL'] = offer.get('clickUrl', 'Not Available')
                                    formatted['LastUpdated'] = offer.get('updated', 'Not Available')

                                    prices = offer.get('prices', [])
                                    if prices:
                                        for idx, price_obj in enumerate(prices, 1):
                                            if price_obj and isinstance(price_obj, dict):
                                                formatted[f'PriceBreak_{idx}_Quantity'] = price_obj.get('quantity', 'Not Available')
                                                currency = price_obj.get('currency', 'USD')
                                                price_val = price_obj.get('price', 'Not Available')
                                                formatted[f'PriceBreak_{idx}_Price'] = f"{currency} {price_val}"
                                            break # Only takes the first price break

                # Set defaults if no seller info
                if 'Seller' not in formatted:
                    formatted['Seller'] = 'Not Available'
                    formatted['SKU'] = 'Not Available'
                    formatted['InventoryLevel'] = 'Not Available'
                    formatted['ProductURL'] = 'Not Available'
                    formatted['LastUpdated'] = 'Not Available'

                parts.append(formatted)

            print(f"[OK] Found {len(parts)} parts from Octopart")
            return parts

        except Exception as e:
            print(f"[ERROR] Octopart error: {e}")
            return []
    
    def search_similar_parts(self, part_number: str, limit: int = 3) -> List[Dict]:
        """Search for similar parts (alias for fetch method).
        
        Uses a small default limit (3) to minimize Octopart/Nexar quota usage.
        """
        return self.fetch(part_number, limit)