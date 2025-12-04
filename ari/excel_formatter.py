"""
FILTERED Excel Formatter - Only Essential Component Management Parameters
Removes attributes with too many "Not Available" values
"""

import pandas as pd
import openpyxl
from openpyxl.styles import Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from datetime import datetime


class FilteredExcelFormatter:
    """
    Creates Excel with ONLY essential component management parameters
    Removes attributes where most parts show "Not Available"
    """
    
    # Define essential parameter categories for component management
    ESSENTIAL_PARAMS = {
        'basic': [
            'ManufacturerPartNumber',
            'Manufacturer', 
            'Description',
            'Category',
            'MouserPartNumber',
            'QuantityAvailable'
        ],
        'specs': [
            'SPEC_Voltage - Input (Max)',
            'SPEC_Voltage - Output (Min/Fixed)',
            'SPEC_Voltage - Output (Max)',
            'SPEC_Current - Output',
            'SPEC_Operating Temperature',
            'SPEC_Package / Case',
            'SPEC_Supplier Device Package',
            'SPEC_Mounting Type',
            'SPEC_Output Type',
            'SPEC_Number of Regulators'
        ],
        'pricing': [
            'Price',
            'Price_Qty1',
            'Price_Qty10',
            'Price_Qty100',
            'All_Price_Breaks'
        ],
        'availability': [
            'Stock_Mouser',
            'Availability_Mouser',
            'LeadTime_Mouser'
        ],
        'links': [
            'DataSheetUrl',
            'ProductDetailUrl'
        ]
    }
    
    def create_comparison_excel(self, results, filename, original_part_number):
        """Create filtered Excel comparison file"""
        print(f"\n📊 Creating FILTERED Excel (essential params only)...")
        
        parts = results.get('parts', [])
        if not parts:
            print("❌ No parts to export")
            return None
        
        # Build FILTERED data structure
        data = self._build_filtered_data(parts, original_part_number)
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Write to Excel
        self._write_formatted_excel(df, filename, results, original_part_number)
        
        total_attrs = len(df)
        print(f"✅ Filtered Excel created: {filename}")
        print(f"   Parts: {len(parts)}")
        print(f"   Attributes: {total_attrs} (essential only)")
        print(f"   Removed: ~{results['metadata'].get('total_attributes', 0) - total_attrs} non-essential attributes")
        
        return filename
    
    def _build_filtered_data(self, parts, original_part_number):
        """Build filtered comparison data - only essential attributes"""
        
        # Collect ALL attributes first
        all_attributes = set()
        for part in parts:
            for key in part.keys():
                if not key.startswith('_'):
                    all_attributes.add(key)
        
        # Filter to ESSENTIAL attributes only
        essential_attributes = []
        
        # Add basic info
        for attr in self.ESSENTIAL_PARAMS['basic']:
            if attr in all_attributes:
                essential_attributes.append(attr)
        
        # Add section header
        essential_attributes.append('Specifications')
        
        # Add specifications (all SPEC_ that exist)
        spec_attrs = sorted([a for a in all_attributes if a.startswith('SPEC_')])
        # Prioritize our essential specs
        for spec in self.ESSENTIAL_PARAMS['specs']:
            if spec in spec_attrs:
                essential_attributes.append(spec)
                spec_attrs.remove(spec)
        # Add remaining specs (limit to avoid clutter)
        essential_attributes.extend(spec_attrs[:20])  # Max 20 additional specs
        
        # Add pricing section
        essential_attributes.append('Pricing')
        for attr in self.ESSENTIAL_PARAMS['pricing']:
            if attr in all_attributes:
                essential_attributes.append(attr)
        
        # Add availability section  
        for attr in self.ESSENTIAL_PARAMS['availability']:
            if attr in all_attributes:
                essential_attributes.append(attr)
        
        # Add links section
        essential_attributes.append('Links')
        for attr in self.ESSENTIAL_PARAMS['links']:
            if attr in all_attributes:
                essential_attributes.append(attr)
        
        # CRITICAL: Check Original part (first part) and remove rows where it has "Not Available"
        original_part = parts[0] if parts else {}
        
        filtered_essential = []
        removed_count = 0
        
        for attr in essential_attributes:
            # Always keep section headers
            if attr in ['Specifications', 'Pricing', 'Links']:
                filtered_essential.append(attr)
            else:
                # Check if Original part has this data
                original_value = original_part.get(attr, 'Not Available')
                
                # Keep row only if Original has data
                if original_value not in ['Not Available', 'N/A', '', None, '-']:
                    filtered_essential.append(attr)
                else:
                    removed_count += 1
        
        print(f"   Removed {removed_count} attributes where Original part had 'Not Available'")
        
        # Build data dictionary
        data = {'Attribute': filtered_essential}
        
        # Add column for each part
        for idx, part in enumerate(parts, 1):
            if idx == 1:
                col_name = 'Original'
            else:
                col_name = f'Similar {idx-1}'
            
            col_values = []
            for attr in filtered_essential:
                # Section headers get empty value
                if attr in ['Specifications', 'Pricing', 'Links']:
                    col_values.append('')
                else:
                    value = part.get(attr, 'Not Available')
                    if isinstance(value, (list, dict)):
                        value = str(value)
                    
                    # Use dash for empty values instead of "Not Available"
                    if value in ['', None, 'N/A']:
                        value = '-'
                    
                    col_values.append(value)
            
            data[col_name] = col_values
        
        return data
    
    def _write_formatted_excel(self, df, filename, results, original_part_number):
        """Write DataFrame to Excel with formatting"""
        with pd.ExcelWriter(filename, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Comparison', index=False, startrow=2)
            
            worksheet = writer.sheets['Comparison']
            
            # Add title rows
            metadata = results.get('metadata', {})
            
            worksheet['A1'] = f'Component Comparison Report - {original_part_number} (Filtered)'
            worksheet['A1'].font = Font(bold=True, size=14)
            
            search_date = metadata.get('search_date', datetime.now().isoformat())
            api_calls = metadata.get('api_calls', {})
            total_calls = sum(api_calls.values())
            
            worksheet['A2'] = f'Generated: {search_date[:10]} | Parts: {metadata.get("total_parts", 0)} | Attributes: {len(df)} (Essential Only) | API Calls: {total_calls}'
            worksheet['A2'].font = Font(italic=True, size=9)
            
            # Merge title
            last_col = get_column_letter(len(df.columns))
            worksheet.merge_cells(f'A1:{last_col}1')
            worksheet.merge_cells(f'A2:{last_col}2')
            
            # Format header row
            header_font = Font(bold=True, size=11)
            for col_idx in range(1, len(df.columns) + 1):
                cell = worksheet.cell(row=3, column=col_idx)
                cell.font = header_font
                cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            
            # Format attribute column
            attr_font = Font(bold=True, size=10)
            for row_idx in range(4, len(df) + 4):
                cell = worksheet.cell(row=row_idx, column=2)
                cell.font = attr_font
                cell.alignment = Alignment(horizontal='left', vertical='center')
                
                # Section headers
                attr_value = df.iloc[row_idx - 4]['Attribute']
                if attr_value in ['Specifications', 'Pricing', 'Links']:
                    cell.font = Font(bold=True, size=11)
            
            # Format data cells
            for row_idx in range(4, len(df) + 4):
                for col_idx in range(3, len(df.columns) + 1):
                    cell = worksheet.cell(row=row_idx, column=col_idx)
                    cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            
            # Add borders
            thin_border = Border(
                left=Side(style='thin'),
                right=Side(style='thin'),
                top=Side(style='thin'),
                bottom=Side(style='thin')
            )
            
            for row in range(3, len(df) + 4):
                for col in range(1, len(df.columns) + 1):
                    worksheet.cell(row=row, column=col).border = thin_border
            
            # Set column widths
            worksheet.column_dimensions['A'].width = 2
            worksheet.column_dimensions['B'].width = 40
            
            for col_idx in range(3, len(df.columns) + 1):
                col_letter = get_column_letter(col_idx)
                worksheet.column_dimensions[col_letter].width = 28
            
            # Freeze panes
            worksheet.freeze_panes = 'C4'
            
            print(f"   ✅ Formatting applied: Clean, professional, essential params only")