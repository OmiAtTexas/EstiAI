// Client-side Excel compression utility
// Works for .xlsx, .xlsm, .xls, .csv
// Reads file in browser, extracts all sheet data as CSV text
// Reduces large files from MB to KB before uploading to Vercel

export async function compressExcelFile(file: File): Promise<{ file: File; wasCompressed: boolean }> {
    const SIZE_LIMIT = 3.5 * 1024 * 1024 // 3.5MB

    // Small files — no compression needed
    if (file.size <= SIZE_LIMIT) {
        return { file, wasCompressed: false }
    }

    try {
        const XLSX = await import("xlsx")
        const buffer = await file.arrayBuffer()

        const workbook = XLSX.read(buffer, {
            type: "array",
            bookVBA: false,
            cellNF: false,
            cellHTML: false,
            cellStyles: false,
        })

        // Convert all sheets to CSV text
        const sheets: string[] = []
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName]
            const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false })
            if (csv.trim()) {
                sheets.push(`=== Sheet: ${sheetName} ===\n${csv}`)
            }
        }

        const csvContent = sheets.join("\n\n")
        const csvBlob = new Blob([csvContent], { type: "text/plain" })

        // Keep original filename but mark as pre-processed
        const compressedFile = new File(
            [csvBlob],
            file.name, // keep original name so server knows what was uploaded
            { type: "text/plain" }
        )

        return { file: compressedFile, wasCompressed: true }

    } catch (err) {
        console.error("Compression failed, uploading original:", err)
        return { file, wasCompressed: false }
    }
}