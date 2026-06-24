import os

files = [
    "frontend/src/pages/reports/AuditLogReportPage.tsx",
    "frontend/src/pages/reports/InventoryMovementReportPage.tsx",
    "frontend/src/pages/reports/ItemHistoryReportPage.tsx",
    "frontend/src/pages/reports/LowStockReportPage.tsx",
    "frontend/src/pages/reports/StockReportPage.tsx",
    "frontend/src/pages/reports/TransferVarianceReportPage.tsx"
]

for filepath in files:
    with open(filepath, "r") as f:
        content = f.read()
    
    content = content.replace("  const pageSize = 20;\n", "")
    
    with open(filepath, "w") as f:
        f.write(content)
