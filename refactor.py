import os
import re

files = [
    "frontend/src/pages/operations/TransfersPage.tsx",
    "frontend/src/pages/operations/StockOpnamePage.tsx",
    "frontend/src/pages/reports/AuditLogReportPage.tsx",
    "frontend/src/pages/reports/InventoryMovementReportPage.tsx",
    "frontend/src/pages/reports/ItemHistoryReportPage.tsx",
    "frontend/src/pages/reports/LowStockReportPage.tsx",
    "frontend/src/pages/reports/StockReportPage.tsx",
    "frontend/src/pages/reports/TransferVarianceReportPage.tsx"
]

def refactor_file(filepath):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}")
        return
        
    with open(filepath, "r") as f:
        content = f.read()
        
    # 1. Add PaginationControl import
    if "PaginationControl" not in content:
        content = re.sub(r"(import .*?;\n)", r"\1import { PaginationControl } from '../../components/ui/PaginationControl';\n", content, count=1)
        
    # 2. Add or update pageSize state
    if "const [pageSize] = useState(10);" in content:
        content = content.replace("const [pageSize] = useState(10);", "const [pageSize, setPageSize] = useState(20);")
    elif "const [pageSize] = useState(20);" in content:
        content = content.replace("const [pageSize] = useState(20);", "const [pageSize, setPageSize] = useState(20);")
    elif "const [pageSize, setPageSize] = useState(20);" not in content:
        content = content.replace("const [page, setPage] = useState(1);", "const [page, setPage] = useState(1);\n  const [pageSize, setPageSize] = useState(20);")

    # 3. Update useQuery hooks that hardcode page_size: 10 to page_size: pageSize
    content = re.sub(r"page_size:\s*10", "page_size: pageSize", content)
    
    # 4. Replace Pagination block
    # We use string matching to find the start of the pagination block.
    # The block usually starts with `{response && totalPages > 1 && (`
    # We will find where it starts and ends by counting braces and parentheses.
    
    lines = content.split('\n')
    out = []
    i = 0
    in_pagination = False
    brace_count = 0
    response_var = "data"
    
    while i < len(lines):
        line = lines[i]
        
        # Avoid matching the PaginationControl we already inserted
        if "<PaginationControl" in line:
            out.append(line)
            i += 1
            continue
            
        match = re.search(r'\{\s*([a-zA-Z0-9_]+)\s*(?:\.?total_pages > 1|&& totalPages > 1|&& [a-zA-Z0-9_\.]+\.total_pages > 1|> 1)?\s*&&\s*\(', line)
        if match and ("> 1" in line or "totalPages" in line or "total_pages" in line) and "{" in line and "&&" in line:
            in_pagination = True
            response_var = match.group(1)
            # if the line contains `transfersResponse.total_pages > 1` the response var might be captured as `transfersResponse.total_pages`. We clean it.
            if ".total_pages" in response_var:
                response_var = response_var.split('.')[0]
                
            brace_count = line.count('{') - line.count('}') + line.count('(') - line.count(')')
            i += 1
            continue
            
        if in_pagination:
            brace_count += line.count('{') - line.count('}') + line.count('(') - line.count(')')
            
            if brace_count <= 0 and ')}' in line:
                in_pagination = False
                
                if response_var == "data":
                    tp_expr = "totalPages"
                    ti_expr = "data.total"
                elif response_var == "transfersResponse":
                    tp_expr = "transfersResponse.total_pages"
                    ti_expr = "transfersResponse.total"
                elif response_var == "opnamesResponse":
                    tp_expr = "opnamesResponse.total_pages"
                    ti_expr = "opnamesResponse.total"
                else:
                    tp_expr = "totalPages"
                    ti_expr = f"{response_var}.total"
                
                out.append("          {/* Pagination Controls */}")
                out.append(f"          {{{response_var} && (")
                out.append("            <PaginationControl")
                out.append("              currentPage={page}")
                out.append(f"              totalPages={{{tp_expr}}}")
                out.append(f"              totalItems={{{ti_expr}}}")
                out.append("              pageSize={pageSize}")
                out.append("              onPageChange={setPage}")
                out.append("              onPageSizeChange={setPageSize}")
                out.append("            />")
                out.append("          )}")
                i += 1
                continue
            i += 1
            continue
            
        out.append(line)
        i += 1
        
    with open(filepath, "w") as f:
        f.write('\n'.join(out))
    print(f"Refactored {filepath}")

for file in files:
    refactor_file(file)
