# excel_writer.py - Excel Export Functionality
# Handles saving data to Excel in transposed format

import pandas as pd
from openpyxl.styles import Font
from typing import List, Dict
import os
import time

# Import color coding functionality
try:
    from colour import apply_color_coding_to_excel
    COLOR_CODING_AVAILABLE = True
except ImportError:
    COLOR_CODING_AVAILABLE = False
    print("[WARNING] colour.py not found. Color coding will not be applied.")

class ExcelWriter:
    """Handles Excel file creation and formatting"""

    def save_to_excel(self, original_part: str, recommendations: List[Dict], output_file: str, apply_color_coding: bool = True):
        """Save recommendations to Excel in transposed format with optional color coding
        
        Args:
            original_part: Original part number
            recommendations: List of recommendation dictionaries
            output_file: Path to output Excel file
            apply_color_coding: If True, apply color coding from colour.py (default: True)
        """

        # Collect ALL unique fields
        all_fields = set()
        for rec in recommendations:
            all_fields.update(rec.keys())
        all_row_labels = sorted(all_fields)

        # Build transposed data
        excel_data = {'Attribute': all_row_labels}

        for idx, rec in enumerate(recommendations, 1):
            part_num = rec.get('ManufacturerPartNumber', f'Part_{idx}')
            column_values = []
            for label in all_row_labels:
                if label in rec:
                    value = rec[label]
                    if isinstance(value, (list, dict)):
                        value = str(value)
                    column_values.append(value if value not in ['', None] else 'Not Available')
                else:
                    column_values.append('Not Available')
            excel_data[part_num] = column_values

        # Fill remaining columns
        for idx in range(len(recommendations) + 1, 4 + 1):
            excel_data[f'Recommendation_{idx}'] = ['Not Available'] * len(all_row_labels)
        
        df = pd.DataFrame(excel_data)

        # Determine output file paths
        temp_file = output_file if not apply_color_coding else output_file.replace('.xlsx', '_temp.xlsx')
        final_file = output_file

        # Save to Excel with formatting
        with pd.ExcelWriter(temp_file, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Recommendations', index=False)
            
            worksheet = writer.sheets['Recommendations']

            # Add title
            worksheet.insert_rows(1, 2)
            worksheet['A1'] = f'Alternative Parts for: {original_part} (Cross-API Enriched)'
            worksheet['A1'].font = Font(bold=True, size=14)

            # Merge title
            num_cols = len(recommendations) + 1
            end_col = chr(65 + num_cols) if num_cols <= 26 else 'A' + chr(65 + num_cols - 27)
            worksheet.merge_cells(f'A1:{end_col}1')

            # Bold attribute column
            for row in range(3, len(all_row_labels) + 3):
                worksheet[f'A{row}'].font = Font(bold=True)

            # Column widths
            worksheet.column_dimensions['A'].width = 35
            for col_letter in ['B', 'C', 'D']:
                worksheet.column_dimensions[col_letter].width = 30
        
        # Apply color coding if requested and available
        if apply_color_coding and COLOR_CODING_AVAILABLE:
            try:
                print(f"\n[INFO] Applying color coding from colour.py...")
                # Small delay to ensure file is fully written and closed
                time.sleep(0.5)
                apply_color_coding_to_excel(temp_file, final_file)
                
                # Clean up temp file with retry logic for Windows
                if temp_file != final_file and os.path.exists(temp_file):
                    max_retries = 3
                    for attempt in range(max_retries):
                        try:
                            time.sleep(0.3)  # Small delay before cleanup
                            os.remove(temp_file)
                            break
                        except PermissionError as pe:
                            if attempt < max_retries - 1:
                                time.sleep(0.5)
                            else:
                                print(f"[WARNING] Could not delete temp file: {pe}")
                    
                print(f"\n[SAVED] Color-coded recommendations saved to: {final_file}")
            except Exception as e:
                print(f"\n[WARNING] Color coding failed: {e}")
                print(f"[INFO] Falling back to plain Excel")
                # If color coding fails, rename temp to final
                if temp_file != final_file:
                    max_retries = 3
                    for attempt in range(max_retries):
                        try:
                            time.sleep(0.3)
                            if os.path.exists(final_file):
                                os.remove(final_file)
                            os.rename(temp_file, final_file)
                            break
                        except (PermissionError, OSError) as e:
                            if attempt < max_retries - 1:
                                time.sleep(0.5)
                            else:
                                raise
                print(f"\n[SAVED] Recommendations saved to: {final_file}")
        else:
            if not COLOR_CODING_AVAILABLE:
                print(f"\n[INFO] Color coding not available")
            print(f"\n[SAVED] Recommendations saved to: {final_file}")
        
        print(f"Total attributes/specifications: {len(all_row_labels)}")
        print(f"[INFO] Data enriched from multiple APIs")