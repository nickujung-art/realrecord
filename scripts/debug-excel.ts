import fs from "fs";
import * as XLSX from "xlsx";

async function debugExcel() {
    const excelPath = "scripts/kapt_2025_data.csv";

    if (!fs.existsSync(excelPath)) {
        console.error("❌ 파일이 없습니다.");
        return;
    }

    console.log("🔍 [진단 시작] 엑셀 내부 구조를 파헤칩니다...");
    const workbook = XLSX.readFile(excelPath);

    console.log(`📂 발견된 시트 목록: ${workbook.SheetNames.join(", ")}`);

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // 💡 header: 1 옵션은 필터링 없이 엑셀의 모든 줄을 '배열'로 가져옵니다.
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

    console.log(`\n📊 총 ${rawRows.length}개 행이 감지되었습니다.`);
    console.log("📝 [상위 20줄 Raw Data 샘플]");
    console.log("-------------------------------------------");

    // 상위 20줄만 출력해서 실제 데이터가 어디서 시작하는지 확인
    rawRows.slice(0, 20).forEach((row, index) => {
        console.log(`Line ${index + 1}:`, JSON.stringify(row).substring(0, 200));
    });

    console.log("-------------------------------------------");
    console.log("\n💡 위 결과에서 '시도', '시군구'가 몇 번째 라인(Line)에 있는지 확인해 주세요!");
}

debugExcel();