// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================
// LocalStorage key for auto-save functionality

export const STORAGE_KEY = 'propel_onboarding_draft';

// ============================================================================
// DEFAULT CUSTOMNEXT-CANCER GENES
// ============================================================================
// The 85 genes that are pre-selected by default when users choose CustomNext-Cancer.
// These represent the standard CustomNext panel. Users can uncheck genes to remove
// them or check the remaining 5 genes (CFTR, CPA1, CTRC, PRSS1, SPINK1) to add them.
// This list is intentionally separate from the full 90-gene list in reference-data.json
// to allow clinics to see what's included by default while retaining customization.

export const DEFAULT_CUSTOMNEXT_GENES = [
    "AIP", "ALK", "APC", "ATM", "ATRIP", "AXIN2", "BAP1", "BARD1", "BMPR1A", "BRCA1",
    "BRCA2", "BRIP1", "CDC73", "CDH1", "CDK4", "CDKN1B", "CDKN2A", "CEBPA", "CHEK2",
    "CTNNA1", "DDX41", "DICER1", "EGFR", "EGLN1", "EPCAM", "ETV6", "FH", "FLCN",
    "GATA2", "GREM1", "HOXB13", "KIF1B", "KIT", "LZTR1", "MAX", "MBD4", "MEN1", "MET",
    "MITF", "MLH1", "MLH3", "MSH2", "MSH3", "MSH6", "MUTYH", "NF1", "NF2", "NTHL1",
    "PALB2", "PALLD", "PDGFRA", "PHOX2B", "PMS2", "POLD1", "POLE", "POT1", "PRKAR1A",
    "PTCH1", "PTEN", "RAD51B", "RAD51C", "RAD51D", "RB1", "RET", "RNF43", "RPS20",
    "RUNX1", "SDHA", "SDHAF2", "SDHB", "SDHC", "SDHD", "SMAD4", "SMARCA4", "SMARCB1",
    "SMARCE1", "STK11", "SUFU", "TERT", "TMEM127", "TP53", "TSC1", "TSC2", "VHL", "WT1"
];

// Formspree endpoint for backup email notifications
export const FORMSPREE_ENDPOINT = "https://formspree.io/f/mzddpdwg";
