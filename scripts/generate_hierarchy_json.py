import json
import re
import sys

INPUT_FILE = 'data/processed/v4/vdem_codebook_structure.txt'
OUTPUT_FILE = 'data/processed/v4/vdem_mindmap_structure.json'

def parse_hierarchy(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    root = {
        "id": "vdem_root",
        "label": "V-Dem Veri Seti (v15)",
        "type": "root",
        "children": []
    }

    current_level_1 = None # BÖLÜM X
    current_level_2 = None # X.X
    current_level_3 = None # X.X.X (bolded lines ending with :)

    # Regex patterns
    section_pattern = re.compile(r'^###\s*\*\*BÖLÜM\s+(\d+):\s*(.+)\*\*')
    subsection_pattern = re.compile(r'^####\s*\*\*(\d+\.\d+)\s+(.+)\*\*')
    # Sub-subsection is tricky, it's often just bold text like **3.1.1 Genel:**
    subsubsection_pattern = re.compile(r'^\*\*(\d+\.\d+\.\d+)\s+(.+):\*\*')
    
    # Variable pattern: * **var_name:** Description
    variable_pattern = re.compile(r'^\*\s*\*\*([a-zA-Z0-9_]+)(?:,\s*[a-zA-Z0-9_]+)*:\*\*\s*(.+)')
    # Multi-variable pattern (e.g. * **var1, var2, var3**)
    multi_variable_pattern = re.compile(r'^\*\s*\*\*([a-zA-Z0-9_]+(?:,\s*[a-zA-Z0-9_]+)+)\*\*')

    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check for Section (Level 1)
        match = section_pattern.match(line)
        if match:
            section_id = f"section_{match.group(1)}"
            current_level_1 = {
                "id": section_id,
                "label": f"BÖLÜM {match.group(1)}: {match.group(2)}",
                "type": "pillar",
                "children": []
            }
            root["children"].append(current_level_1)
            current_level_2 = None
            current_level_3 = None
            continue

        # Check for Subsection (Level 2)
        match = subsection_pattern.match(line)
        if match:
            if not current_level_1:
                # Fallback if no section defined yet (shouldn't happen with valid file)
                continue
            
            sub_id = f"sub_{match.group(1).replace('.', '_')}"
            current_level_2 = {
                "id": sub_id,
                "label": f"{match.group(1)} {match.group(2)}",
                "type": "category",
                "children": []
            }
            current_level_1["children"].append(current_level_2)
            current_level_3 = None
            continue

        # Check for Sub-subsection (Level 3)
        match = subsubsection_pattern.match(line)
        if match:
            if not current_level_2:
                 # Try to attach to level 1 if level 2 is missing (rare but possible)
                 if current_level_1:
                     # Create a dummy level 2 or just attach to level 1? 
                     # Let's assume strict hierarchy for now, or attach to level 1 if no level 2
                     pass
            
            if current_level_2:
                subsub_id = f"subsub_{match.group(1).replace('.', '_')}"
                current_level_3 = {
                    "id": subsub_id,
                    "label": f"{match.group(1)} {match.group(2)}",
                    "type": "subcategory",
                    "children": []
                }
                current_level_2["children"].append(current_level_3)
            continue

        # Check for Variable
        # Try multi-variable first (e.g. in Section 9.1)
        match_multi = multi_variable_pattern.match(line)
        if match_multi:
            # It's a list of variables
            vars_str = match_multi.group(1)
            variables = [v.strip() for v in vars_str.split(',')]
            
            target_parent = current_level_3 if current_level_3 else (current_level_2 if current_level_2 else current_level_1)
            if target_parent:
                for var in variables:
                    target_parent["children"].append({
                        "id": var,
                        "label": var, # No description available for these usually
                        "type": "indicator",
                        "columns": [var]
                    })
            continue

        # Single variable with description
        match_var = variable_pattern.match(line)
        if match_var:
            var_name = match_var.group(1)
            description = match_var.group(2)
            
            target_parent = current_level_3 if current_level_3 else (current_level_2 if current_level_2 else current_level_1)
            
            if target_parent:
                target_parent["children"].append({
                    "id": var_name,
                    "label": f"{var_name}: {description}",
                    "type": "indicator",
                    "columns": [var_name]
                })
            continue

    return root

def main():
    print(f"Parsing {INPUT_FILE}...")
    try:
        hierarchy = parse_hierarchy(INPUT_FILE)
        
        # Count stats
        def count_nodes(node):
            count = 1
            if "children" in node:
                for child in node["children"]:
                    count += count_nodes(child)
            return count
            
        total_nodes = count_nodes(hierarchy)
        print(f"Generated hierarchy with {total_nodes} nodes.")
        
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(hierarchy, f, indent=2, ensure_ascii=False)
            
        print(f"Saved to {OUTPUT_FILE}")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
