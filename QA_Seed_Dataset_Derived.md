# QA Seed Dataset (Derived from LAP BPP JUNI 2026)

## Purpose

This dataset is intended for QA testing and workflow validation.

It is derived from the actual warehouse spreadsheet structure (`LAP BPP JUNI 2026.xlsx`) but does **not** use real stock quantities.

The goal is to provide realistic master data covering:

* Multiple suppliers
* Multiple categories
* Low stock scenarios
* Transfers
* Stock opname
* Reports
* Item history
* QR workflows

---

# Categories

| Code | Name     |
| ---- | -------- |
| STL  | Stall    |
| PNG  | Peninggi |
| FIG  | Figur    |
| MED  | Medali   |
| MRM  | Marmer   |
| AKR  | Akrilik  |
| ETC  | Etching  |

---

# Suppliers

| Code | Name        |
| ---- | ----------- |
| ONX  | ONIX        |
| FUN  | FUNTROPHY   |
| EVN  | EVAN        |
| JRD  | JORDAN      |
| ICI  | IMPORT_CICI |
| INT  | INTERNAL    |

---

# Items

## ONIX

| Category | Supplier | Manual Code | Item Name          | Suggested Item Code |
| -------- | -------- | ----------- | ------------------ | ------------------- |
| Stall    | ONIX     | 040         | Stall 40cm         | STL-ONX-040         |
| Stall    | ONIX     | 050         | Stall 50cm         | STL-ONX-050         |
| Stall    | ONIX     | 060         | Stall 60cm         | STL-ONX-060         |
| Peninggi | ONIX     | B204        | Peninggi B204 8cm  | PNG-ONX-B204        |
| Peninggi | ONIX     | B205        | Peninggi B205 10cm | PNG-ONX-B205        |

---

## FUNTROPHY

| Category | Supplier  | Manual Code | Item Name          | Suggested Item Code |
| -------- | --------- | ----------- | ------------------ | ------------------- |
| Stall    | FUNTROPHY | 040         | Stall 40cm         | STL-FUN-040         |
| Stall    | FUNTROPHY | 050         | Stall 50cm         | STL-FUN-050         |
| Figur    | FUNTROPHY | FT348       | Figur FT348 Gold   | FIG-FUN-FT348       |
| Figur    | FUNTROPHY | FT349       | Figur FT349 Silver | FIG-FUN-FT349       |
| Figur    | FUNTROPHY | FT350       | Figur FT350 Bronze | FIG-FUN-FT350       |

---

## EVAN

| Category | Supplier | Manual Code | Item Name          | Suggested Item Code |
| -------- | -------- | ----------- | ------------------ | ------------------- |
| Peninggi | EVAN     | B204        | Peninggi B204 8cm  | PNG-EVN-B204        |
| Peninggi | EVAN     | B205        | Peninggi B205 10cm | PNG-EVN-B205        |
| Peninggi | EVAN     | B206        | Peninggi B206 12cm | PNG-EVN-B206        |
| Peninggi | EVAN     | J1          | Peninggi J1        | PNG-EVN-J1          |
| Peninggi | EVAN     | J2          | Peninggi J2        | PNG-EVN-J2          |

---

## JORDAN

| Category | Supplier | Manual Code | Item Name       | Suggested Item Code |
| -------- | -------- | ----------- | --------------- | ------------------- |
| Figur    | JORDAN   | BOLA        | Figur Bola      | FIG-JRD-BOLA        |
| Figur    | JORDAN   | BASKET      | Figur Basket    | FIG-JRD-BASKET      |
| Figur    | JORDAN   | FUTSAL      | Figur Futsal    | FIG-JRD-FUTSAL      |
| Figur    | JORDAN   | BADMINTON   | Figur Badminton | FIG-JRD-BADMINTON   |
| Figur    | JORDAN   | VOLI        | Figur Voli      | FIG-JRD-VOLI        |

---

## IMPORT CICI

| Category | Supplier    | Manual Code | Item Name               | Suggested Item Code |
| -------- | ----------- | ----------- | ----------------------- | ------------------- |
| Medali   | IMPORT_CICI | BELANDA     | Medali Tali Belanda     | MED-ICI-BELANDA     |
| Medali   | IMPORT_CICI | BIRKUN      | Medali Tali Biru Kuning | MED-ICI-BIRKUN      |
| Medali   | IMPORT_CICI | MERPUT      | Medali Tali Merah Putih | MED-ICI-MERPUT      |
| Medali   | IMPORT_CICI | POLOS       | Medali Polos            | MED-ICI-POLOS       |
| Medali   | IMPORT_CICI | PREMIUM     | Medali Premium          | MED-ICI-PREMIUM     |

---

## MARMER (INTERNAL)

| Category | Supplier | Manual Code | Item Name        | Suggested Item Code |
| -------- | -------- | ----------- | ---------------- | ------------------- |
| Marmer   | INTERNAL | M03         | Marmer 3cm       | MRM-INT-M03         |
| Marmer   | INTERNAL | M05G        | Marmer 5cm Guci  | MRM-INT-M05G        |
| Marmer   | INTERNAL | M05B        | Marmer 5cm Bulat | MRM-INT-M05B        |
| Marmer   | INTERNAL | M07         | Marmer 7cm       | MRM-INT-M07         |
| Marmer   | INTERNAL | M10         | Marmer 10cm      | MRM-INT-M10         |

---

## AKRILIK (INTERNAL)

| Category | Supplier | Manual Code | Item Name               | Suggested Item Code |
| -------- | -------- | ----------- | ----------------------- | ------------------- |
| Akrilik  | INTERNAL | KOSONG      | Medali Akrilik Kosongan | AKR-INT-KOSONG      |
| Akrilik  | INTERNAL | UV          | Medali Akrilik UV       | AKR-INT-UV          |
| Akrilik  | INTERNAL | UVG         | Akrilik UV Gold         | AKR-INT-UVG         |
| Akrilik  | INTERNAL | UVS         | Akrilik UV Silver       | AKR-INT-UVS         |
| Akrilik  | INTERNAL | UVB         | Akrilik UV Bronze       | AKR-INT-UVB         |

---

## ETCHING (INTERNAL)

| Category | Supplier | Manual Code | Item Name             | Suggested Item Code |
| -------- | -------- | ----------- | --------------------- | ------------------- |
| Etching  | INTERNAL | GOLD        | Medali Etching Gold   | ETC-INT-GOLD        |
| Etching  | INTERNAL | SILVER      | Medali Etching Silver | ETC-INT-SILVER      |
| Etching  | INTERNAL | BRONZE      | Medali Etching Bronze | ETC-INT-BRONZE      |
| Etching  | INTERNAL | ET01        | Etching Premium 1     | ETC-INT-ET01        |
| Etching  | INTERNAL | ET02        | Etching Premium 2     | ETC-INT-ET02        |

---

# QA Notes

* Total Seed Items: 35
* UOM: PCS
* Active: TRUE
* Create stock levels manually during Initial Load.
* Ensure:

  * Some items have zero stock.
  * Some items are below minimum stock.
  * Some items are exactly at minimum stock.
  * Some items have high stock.

This dataset is intended only for testing and validation and is not a production migration dataset.

