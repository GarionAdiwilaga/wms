import os
import re

files = [
    "frontend/src/pages/operations/StockOpnamePage.tsx",
    "frontend/src/pages/reports/AuditLogReportPage.tsx",
    "frontend/src/pages/reports/ItemHistoryReportPage.tsx"
]

for filepath in files:
    if not os.path.exists(filepath): continue
    
    with open(filepath, "r") as f:
        content = f.read()
    
    # We just add the imports back near the top if they are missing
    if "import { Button }" not in content:
        content = re.sub(r"(import .*?;\n)", r"\1import { Button } from '../../components/ui/button';\n", content, count=1)
    if "import { motion }" not in content:
        content = re.sub(r"(import .*?;\n)", r"\1import { motion } from 'framer-motion';\n", content, count=1)
    
    with open(filepath, "w") as f:
        f.write(content)
