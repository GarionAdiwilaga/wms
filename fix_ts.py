import os

files = [
    "frontend/src/pages/operations/StockOpnamePage.tsx",
    "frontend/src/pages/reports/InventoryMovementReportPage.tsx",
    "frontend/src/pages/reports/LowStockReportPage.tsx",
    "frontend/src/pages/reports/StockReportPage.tsx",
    "frontend/src/pages/reports/TransferVarianceReportPage.tsx",
    "frontend/src/pages/reports/AuditLogReportPage.tsx",
    "frontend/src/pages/reports/ItemHistoryReportPage.tsx"
]

for filepath in files:
    if not os.path.exists(filepath): continue
    
    with open(filepath, "r") as f:
        content = f.read()
    
    # fix pageSize0
    content = content.replace("page_size: pageSize00", "page_size: 1000")
    content = content.replace("page_size: pageSize0", "page_size: 100")
    
    # fix unused imports
    lines = content.split('\n')
    out = []
    for line in lines:
        # Check if line imports only Button or motion and we want to remove them
        # Sometimes it imports other things too
        if "import { Button }" in line:
            continue
        if "import { motion }" in line:
            continue
        if "import { motion, AnimatePresence }" in line:
            if "StockReportPage" in filepath or "ReportPage" in filepath:
                line = line.replace("import { motion, AnimatePresence }", "import { AnimatePresence }")
                if "import { AnimatePresence } from 'framer-motion';" in line and "AnimatePresence" not in content.replace(line, ""):
                    # if AnimatePresence is also not used, remove it
                    # Just an approximation
                    pass
            # actually we don't care about motion, AnimatePresence if there are no errors
            # The errors were: 'Button' is declared but its value is never read. 'motion' is declared but its value is never read.
            pass
        out.append(line)
        
    content = '\n'.join(out)
    
    # For StockReportPage and others that import both
    content = content.replace("import { Button } from '../../components/ui/button';\n", "")
    content = content.replace("import { motion } from 'framer-motion';\n", "")
    content = content.replace("import { motion, AnimatePresence } from 'framer-motion';\n", "import { AnimatePresence } from 'framer-motion';\n")
    
    with open(filepath, "w") as f:
        f.write(content)
