import pandas as pd
from openpyxl import load_workbook
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
import os
import re
from datetime import datetime


def compare_values(value1, value2):
    """
    Compare two values and determine if they match
    
    Args:
        value1: First value (reference)
        value2: Second value (comparison)
        
    Returns:
        str: 'match', 'different', 'missing', or 'critical'
    """
    # Handle None and empty values
    if value2 in [None, '', 'Not Available', 'N/A', 'nan']:
        return 'missing'

    if value1 in [None, '', 'Not Available', 'N/A', 'nan']:
        return 'missing'

    # Convert to strings for comparison
    str1 = str(value1).strip().lower()
    str2 = str(value2).strip().lower()

    # Handle 'nan' string
    if str1 == 'nan' or str2 == 'nan':
        return 'missing'

    # Exact match
    if str1 == str2:
        return 'match'

    # Similar match (contains or partial match)
    if str1 in str2 or str2 in str1:
        return 'match'

    # Try numeric comparison for values with units
    try:
        # Extract numeric part
        num1 = re.findall(r'[-+]?\d*\.?\d+', str1)
        num2 = re.findall(r'[-+]?\d*\.?\d+', str2)

        if num1 and num2:
            n1 = float(num1[0])
            n2 = float(num2[0])

            # Avoid division by zero
            if max(abs(n1), abs(n2)) == 0:
                return 'match'

            # If within 10% tolerance, consider it matching
            percent_diff = abs(n1 - n2) / max(abs(n1), abs(n2))

            if percent_diff < 0.1:
                return 'match'
            # If within 30% tolerance, consider it different (warning)
            elif percent_diff < 0.3:
                return 'different'
            else:
                return 'critical'
    except:
        pass

    # Default to different
    return 'different'


def get_column_letter(col_num):
    """
    Convert column number to Excel column letter
    
    Args:
        col_num (int): Column number (1-based)
        
    Returns:
        str: Column letter (A, B, ..., Z, AA, AB, ...)
    """
    result = ""
    while col_num > 0:
        col_num -= 1
        result = chr(65 + (col_num % 26)) + result
        col_num //= 26
    return result


def apply_color_coding_to_excel(input_file, output_file):
    """
    Apply color coding to an existing Octopart Excel file
    
    The Excel should have format:
    - Row 1: Title
    - Row 2: Empty
    - Row 3: Headers (Attribute, Part1, Part2, ...)
    - Row 4+: Data rows
    
    Args:
        input_file (str): Path to input Excel file
        output_file (str): Path to output Excel file
    """
    
    print("=" * 80)
    print("APPLYING COLOR CODING TO OCTOPART EXCEL FILE")
    print("=" * 80)

    # Load the workbook
    print(f"\n[LOADING] File: {input_file}")
    wb = load_workbook(input_file)
    ws = wb.active

    # Define color fills (matching the reference Excel)
    yellow_fill = PatternFill(start_color="FFFFFF00", end_color="FFFFFF00", fill_type="solid")
    gray_fill = PatternFill(start_color="D3D3D3", end_color="D3D3D3", fill_type="solid")
    green_fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
    orange_fill = PatternFill(start_color="FFEB9C", end_color="FFEB9C", fill_type="solid")
    red_fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")

    # Define fonts
    bold_font = Font(bold=True, size=11)
    header_font = Font(bold=True, size=14)

    # Define alignment
    center_align = Alignment(horizontal='center', vertical='center', wrap_text=True)
    left_align = Alignment(horizontal='left', vertical='center', wrap_text=True)

    # Define borders
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    # Get dimensions
    max_row = ws.max_row
    max_col = ws.max_column

    print(f"[INFO] Excel dimensions: {max_row} rows x {max_col} columns")

    # Determine structure
    # Row 1: Title (already exists)
    # Row 2: Empty (already exists)
    # Row 3: Headers
    # Row 4+: Data
    
    title_row = 1
    empty_row = 2
    header_row = 3
    data_start_row = 4

    # Read data to determine reference values (from column B - first part)
    print("\n[INFO] Reading reference values from first part...")
    reference_values = {}

    for row_idx in range(data_start_row, max_row + 1):
        # Get attribute name from column A
        attribute_cell = ws.cell(row=row_idx, column=1)
        attribute_name = attribute_cell.value

        if attribute_name:
            # Get reference value from column B (first part)
            ref_cell = ws.cell(row=row_idx, column=2)
            reference_values[attribute_name] = ref_cell.value

    print(f"[OK] Found {len(reference_values)} attributes")

    # Apply formatting to title row
    print("\n[INFO] Applying color coding...")
    title_cell = ws.cell(row=title_row, column=1)
    title_cell.font = header_font
    title_cell.alignment = center_align

    # Apply yellow to header row (part numbers)
    for col_idx in range(2, max_col + 1):
        cell = ws.cell(row=header_row, column=col_idx)
        cell.fill = yellow_fill
        cell.font = bold_font
        cell.alignment = center_align
        cell.border = thin_border

    # Apply gray to attribute column (column A) and make bold
    for row_idx in range(header_row, max_row + 1):
        cell = ws.cell(row=row_idx, column=1)
        cell.fill = gray_fill
        cell.font = bold_font
        cell.alignment = left_align
        cell.border = thin_border

    # Apply color coding to data cells
    comparison_stats = {
        'match': 0,
        'different': 0,
        'missing': 0,
        'critical': 0
    }

    for row_idx in range(data_start_row, max_row + 1):
        # Get attribute name
        attribute_cell = ws.cell(row=row_idx, column=1)
        attribute_name = attribute_cell.value

        if not attribute_name:
            continue

        # Get reference value
        reference_value = reference_values.get(attribute_name)

        # Color each column
        for col_idx in range(2, max_col + 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            current_value = cell.value

            # Apply alignment and border
            cell.alignment = left_align
            cell.border = thin_border

            # First column (reference) is always green
            if col_idx == 2:
                cell.fill = green_fill
                comparison_stats['match'] += 1
            else:
                # Compare with reference
                comparison = compare_values(reference_value, current_value)

                if comparison == 'match':
                    cell.fill = green_fill
                    comparison_stats['match'] += 1
                elif comparison == 'different':
                    cell.fill = orange_fill
                    comparison_stats['different'] += 1
                elif comparison == 'missing':
                    cell.fill = red_fill
                    comparison_stats['missing'] += 1
                elif comparison == 'critical':
                    cell.fill = red_fill
                    comparison_stats['critical'] += 1

    # Adjust column widths
    print("\n[INFO] Adjusting column widths...")
    ws.column_dimensions['A'].width = 35  # Attribute column
    for col_idx in range(2, max_col + 1):
        col_letter = get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = 25

    # Adjust row heights
    for row_idx in range(1, max_row + 1):
        ws.row_dimensions[row_idx].height = 20
    
    ws.row_dimensions[title_row].height = 30
    ws.row_dimensions[header_row].height = 30

    # Save the workbook
    print(f"\n[SAVING] To: {output_file}")
    wb.save(output_file)
    wb.close()  # Explicitly close the workbook to release file handle

    print("\n" + "=" * 80)
    print("[SUCCESS] COLOR CODING APPLIED SUCCESSFULLY!")
    print("=" * 80)
    print(f"\nStatistics:")
    print(f"  Green (Match):     {comparison_stats['match']} cells")
    print(f"  Orange (Different): {comparison_stats['different']} cells")
    print(f"  Red (Missing):     {comparison_stats['missing']} cells")
    print(f"  Red (Critical):    {comparison_stats['critical']} cells")

    total_comparisons = sum(comparison_stats.values())
    if total_comparisons > 0:
        match_percent = (comparison_stats['match'] / total_comparisons) * 100
        print(f"\n  Match Rate: {match_percent:.1f}%")

    print(f"\n[OK] Output file created: {output_file}")
    print("\n" + "=" * 80)


def main():
    """
    Main function - Apply color coding to Octopart Excel
    """

    # ===============================================================
    # CONFIGURATION: Set your file paths here
    # ===============================================================

    # Base directory where your Octopart files are located
    # Note: User should update this path if running on a different machine
    BASE_DIR = r"C:\Users\40044461\Documents\EOL\API Integration\octopart_integration"

    # Input file: Your existing Octopart Excel file (without colors)
    # Option 1: If you know the exact filename
    INPUT_FILENAME = "LM317T_octopart_similar_20251030_120143.xlsx"

    # Option 2: Or use the latest file with pattern (uncomment to use)
    # import glob
    # excel_files = glob.glob(os.path.join(BASE_DIR, "*_octopart_similar_*.xlsx"))
    # if excel_files:
    #     INPUT_FILENAME = os.path.basename(max(excel_files, key=os.path.getctime))
    # else:
    #     print("❌ No Octopart Excel files found!")
    #     return

    # Build full paths
    INPUT_FILE = os.path.join(BASE_DIR, INPUT_FILENAME)

    # Output file: Add "_COLOR_CODED" to the filename
    output_filename = INPUT_FILENAME.replace('.xlsx', '_COLOR_CODED.xlsx')
    OUTPUT_FILE = os.path.join(BASE_DIR, output_filename)

    # ===============================================================

    print("\n" + "=" * 80)
    print("OCTOPART EXCEL COLOR CODING TOOL")
    print("Automatically apply color coding to compare similar parts")
    print("=" * 80)

    print(f"\n📝 Configuration:")
    print(f"  Base Directory: {BASE_DIR}")
    print(f"  Input File:     {INPUT_FILENAME}")
    print(f"  Output File:    {output_filename}")

    # Check if input file exists
    if not os.path.exists(INPUT_FILE):
        print(f"\n❌ ERROR: Input file not found!")
        print(f"   Looking for: {INPUT_FILE}")
        print(f"\n💡 Available Excel files in directory:")
        try:
            excel_files = [f for f in os.listdir(BASE_DIR) if f.endswith('.xlsx')]
            if excel_files:
                for f in excel_files:
                    print(f"   - {f}")
                print(f"\n💡 Update INPUT_FILENAME in the script to one of the above files.")
            else:
                print(f"   No .xlsx files found in {BASE_DIR}")
        except Exception as e:
            print(f"   Could not list directory: {e}")
        return

    # Apply color coding
    try:
        apply_color_coding_to_excel(INPUT_FILE, OUTPUT_FILE)

        # Print final summary
        print("\n" + "=" * 80)
        print("📂 FILES:")
        print("=" * 80)
        print(f"✅ Input:  {INPUT_FILE}")
        print(f"✅ Output: {OUTPUT_FILE}")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        traceback.print_exc()
        return

if __name__ == "__main__":
    main()