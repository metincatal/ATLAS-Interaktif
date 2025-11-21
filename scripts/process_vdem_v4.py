import csv
import json
import os
import sys

# Configuration
RAW_DATA_PATH = 'data/raw/V-Dem-CY-Full+Others-v15.csv'
MINDMAP_PATH = 'data/processed/v4/vdem_mindmap_structure.json'
OUTPUT_PATH = 'data/processed/v4/vdem_data.json'

# Increase CSV field size limit just in case
csv.field_size_limit(sys.maxsize)

def load_mindmap_columns(mindmap_path):
    """Extracts all column names referenced in the mindmap structure."""
    try:
        with open(mindmap_path, 'r', encoding='utf-8') as f:
            mindmap = json.load(f)
    except FileNotFoundError:
        print(f"Error: Mindmap file not found at {mindmap_path}")
        sys.exit(1)

    columns = set()

    def traverse(node):
        if 'columns' in node:
            for col in node['columns']:
                columns.add(col)
        if 'children' in node:
            for child in node['children']:
                traverse(child)

    traverse(mindmap)
    return list(columns)

def process_data():
    print(f"Loading mindmap from {MINDMAP_PATH}...")
    required_columns = load_mindmap_columns(MINDMAP_PATH)
    print(f"Found {len(required_columns)} required indicators.")

    # Add essential columns
    essential_columns = ['country_name', 'country_text_id', 'year']
    # Create a set for fast lookup
    required_col_set = set(required_columns)
    
    print(f"Processing raw data from {RAW_DATA_PATH}...")
    
    output_data = {}
    # Initialize structure for all required columns
    for col in required_columns:
        output_data[col] = {
            "min": float('inf'),
            "max": float('-inf'),
            "values": {} 
        }

    try:
        with open(RAW_DATA_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            row_count = 0
            for row in reader:
                row_count += 1
                if row_count % 10000 == 0:
                    print(f"Processed {row_count} rows...", end='\r')

                country_id = row.get('country_text_id')
                year = row.get('year')
                
                if not country_id or not year:
                    continue
                
                # Process each required column
                for col in required_columns:
                    val_str = row.get(col)
                    if val_str and val_str.strip() != '':
                        try:
                            val = float(val_str)
                            
                            # Update min/max
                            if val < output_data[col]["min"]:
                                output_data[col]["min"] = val
                            if val > output_data[col]["max"]:
                                output_data[col]["max"] = val
                            
                            # Store value
                            if year not in output_data[col]["values"]:
                                output_data[col]["values"][year] = {}
                            
                            output_data[col]["values"][year][country_id] = val
                            
                        except ValueError:
                            continue

    except FileNotFoundError:
        print(f"Error: Raw data file not found at {RAW_DATA_PATH}")
        sys.exit(1)
    except Exception as e:
        print(f"Error processing CSV: {e}")
        sys.exit(1)

    print(f"\nProcessed {row_count} rows.")

    # Clean up empty indicators and fix infinite min/max
    final_output = {}
    for col, data in output_data.items():
        if not data["values"]:
            continue
            
        if data["min"] == float('inf'):
            data["min"] = 0
        if data["max"] == float('-inf'):
            data["max"] = 1
            
        final_output[col] = data

    print(f"Saving {len(final_output)} indicators to JSON...")
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(final_output, f, separators=(',', ':'))
        
    print(f"Done! Saved to {OUTPUT_PATH}")
    print(f"File size: {os.path.getsize(OUTPUT_PATH) / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    process_data()
